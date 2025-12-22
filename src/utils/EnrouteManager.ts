import type { BirchTripInformation, TripInformation } from "../components/types/TripInformation";
import {
    fixHeadsignText,
    fixRouteColor,
    fixRouteName,
    fixRouteTextColor,
    fixRunNumber,
    fixStationArt,
    fixStationName,
} from "../components/data/agencyspecific";
import { enunciator } from "../components/enunciator";
import { EnunciatorState, type EnunciatorMessage } from "../components/types/Enunciator";
import type { BirchStopTime } from "../components/types/TripInformation";

export class EnrouteManager {
    private stopsEnunciated: string[] = [];

    async fetchTripInfo(
        chateau: string,
        trip: string,
        use24h: boolean,
        isPortrait: boolean
    ): Promise<{
        tripInfo: TripInformation;
        announcement: EnunciatorMessage | null;
        announcementText: string | null;
    }> {
        const raw = await fetch(
            `https://birch.catenarymaps.org/get_trip_information/${chateau}/?trip_id=${trip}`
        );
        if (raw.status === 404)
            throw new Error(`Trip ${trip} not found in Chateâu ${chateau}`);

        const birchData = (await raw.json()) as BirchTripInformation;

        let nextStopIndex = birchData.stoptimes.findIndex(
            (stopTime: BirchStopTime) =>
                (stopTime.rt_arrival?.time ||
                    stopTime.scheduled_arrival_time_unix_seconds) >
                Date.now() / 1000
        );

        // Handle case where trip is finished or invalid index
        if (nextStopIndex === -1 && birchData.stoptimes.length > 0) {
            // Assume at end? Or fallback. Original code didn't handle -1 explicitly but findIndex might return it.
            // If -1, maybe loop? Original code used nextStopIndex assuming it's valid or check logic?
            // "let nextStopName: string = birchData.stoptimes[nextStopIndex].name;" would crash if -1.
            // We'll reproduce original behavior (maybe it crashes or they assume data is valid).
            // Safest is to default to last stop if finished, or 0 if not started?
            // But logic says > now. If all are < now, trip is over.
            // Let's assume valid for now or handle gracefully
            if (nextStopIndex === -1) nextStopIndex = birchData.stoptimes.length - 1;
        }

        const nextStopName: string = birchData.stoptimes[nextStopIndex].name;
        const lastStopIndex = birchData.stoptimes.length - 1;
        const lastStopName: string = birchData.stoptimes[lastStopIndex].name;

        const timeToStop: number =
            (birchData.stoptimes[nextStopIndex].rt_arrival?.time ||
                birchData.stoptimes[nextStopIndex]
                    .scheduled_arrival_time_unix_seconds) -
            Date.now() / 1000;
        const isApproachingStop: boolean = timeToStop < 40;

        // Construct proper list of stops to display
        const stopsToDisplay: {
            name: string;
            minutes: string;
            arrivalTime: string;
            stopId?: string;
            isSpacer?: boolean;
            count?: number;
            key: string;
        }[] = [];

        const addStop = (index: number) => {
            if (index < 0 || index >= birchData.stoptimes.length) return;
            const s = birchData.stoptimes[index];
            const arrivalUnix =
                s.rt_arrival?.time || s.scheduled_arrival_time_unix_seconds;
            const date = new Date(arrivalUnix * 1000);
            const timeString = date
                .toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: !use24h,
                })
                .toLowerCase()
                .replace(" ", "");

            stopsToDisplay.push({
                name: fixStationName(s.name),
                minutes:
                    isApproachingStop && index === nextStopIndex
                        ? "DUE"
                        : Math.floor(
                            Math.max(
                                0,
                                Math.round(
                                    arrivalUnix - Date.now() / 1000
                                ) / 60
                            )
                        ).toString(),
                arrivalTime: timeString,
                stopId: s.stop_id,
                key: `${s.stop_id}-${index}`,
            });
        };

        const MAX_STOPS_TOTAL = isPortrait ? 10 : 8;
        const remainingStops = lastStopIndex - nextStopIndex + 1;

        if (remainingStops <= MAX_STOPS_TOTAL) {
            for (let i = nextStopIndex; i <= lastStopIndex; i++) {
                addStop(i);
            }
        } else {
            const stopsToShowBeforeSpacer = MAX_STOPS_TOTAL - 2;
            for (let i = 0; i < stopsToShowBeforeSpacer; i++) {
                addStop(nextStopIndex + i);
            }

            const highestAddedIndex =
                nextStopIndex + stopsToShowBeforeSpacer - 1;
            const gapSize = lastStopIndex - highestAddedIndex - 1;

            if (gapSize > 0) {
                stopsToDisplay.push({
                    name: `${gapSize} more stops`,
                    count: gapSize,
                    minutes: "",
                    arrivalTime: "",
                    isSpacer: true,
                    key: "spacer",
                });
            }

            addStop(lastStopIndex);
        }

        const newTripInfo: TripInformation = {
            chateau,
            run: fixRunNumber(
                chateau,
                birchData.route_id,
                birchData.trip_short_name,
                birchData.vehicle?.id || null,
                trip
            ),
            headsign: fixHeadsignText(
                birchData.trip_headsign || lastStopName,
                birchData.route_short_name ||
                birchData.route_long_name ||
                birchData.route_id
            ),
            nextStops: stopsToDisplay,
            nextStop: fixStationName(nextStopName),
            nextStopID: birchData.stoptimes[nextStopIndex].stop_id,
            nextStopNumber: nextStopIndex,
            finalStop: fixStationName(lastStopName),
            finalStopID: birchData.stoptimes[lastStopIndex].stop_id,
            isApp: isApproachingStop,
            isTerm: nextStopName === lastStopName,
            route: fixRouteName(
                chateau,
                birchData.route_short_name ||
                birchData.route_long_name ||
                birchData.route_id,
                birchData.route_id
            ),
            routeID: birchData.route_id,
            color: fixRouteColor(
                chateau,
                birchData.route_id,
                birchData.color
            ),
            textColor: fixRouteTextColor(
                chateau,
                birchData.route_id,
                birchData.text_color
            ),
            artwork: fixStationArt(chateau, birchData.route_id),
        };

        let announcement: EnunciatorMessage | null = null;
        let announcementText: string | null = null;

        if (
            enunciator &&
            !this.stopsEnunciated.includes(
                `${newTripInfo.nextStopID}:${newTripInfo.isApp ? EnunciatorState.APPROACHING : EnunciatorState.NEXT}`
            )
        ) {
            this.stopsEnunciated.push(
                `${newTripInfo.nextStopID}:${newTripInfo.isApp ? EnunciatorState.APPROACHING : EnunciatorState.NEXT}`
            );

            const voicedAnnouncement = await enunciator.sync(
                chateau,
                isApproachingStop
                    ? nextStopName === lastStopName
                        ? EnunciatorState.TERMINUS
                        : EnunciatorState.APPROACHING
                    : EnunciatorState.NEXT,
                null,
                newTripInfo
            );

            if (voicedAnnouncement) {
                announcement = voicedAnnouncement;
                announcementText = "[MSG]";
            }
        }

        return { tripInfo: newTripInfo, announcement, announcementText };
    }
}
