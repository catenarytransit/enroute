import React, { useEffect, useState, useRef, type JSX } from "react";
import type { BirchStopTime, BirchTripInformation, TripInformation } from "../types/TripInformation";
import {
    fixHeadsignText,
    fixRouteColor,
    fixRouteName,
    fixRouteTextColor,
    fixRunNumber,
    fixStationArt,
    fixStationName,
} from "../data/agencyspecific";
import { DisplayHeader } from "../common/DisplayHeader";


export default function JREnroute(): JSX.Element {
    const [tripInfo, setTripInfo] = useState<TripInformation | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [announcementTextChunk, setAnnouncementTextChunk] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [isPortrait, setIsPortrait] = useState(typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false);

    const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const stopsEnunciatedRef = useRef<string[]>([]);

    const getSetting = (key: string, defaultValue = "") => {
        if (typeof window === "undefined") return defaultValue;
        const params = new URLSearchParams(window.location.search);
        return params.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;
    };
    const use24h = getSetting("24h") !== "false";

    useEffect(() => {
        const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const chateau = params.get("chateau");
        const trip = params.get("trip");

        if (!chateau || !trip) return;

        const fetchTripInfo = async () => {
            try {
                const raw = await fetch(`https://birch.catenarymaps.org/get_trip_information/${chateau}/?trip_id=${trip}`);
                if (raw.status === 404) throw new Error(`Trip ${trip} not found in Chateâu ${chateau}`);
                const birchData = (await raw.json()) as BirchTripInformation;

                let nextStopIndex = birchData.stoptimes.findIndex(
                    (stopTime: BirchStopTime) =>
                        (stopTime.rt_arrival?.time || stopTime.scheduled_arrival_time_unix_seconds) > Date.now() / 1000
                );

                if (nextStopIndex === -1) nextStopIndex = birchData.stoptimes.length - 1;

                const nextStopName = birchData.stoptimes[nextStopIndex].name;
                const lastStopIndex = birchData.stoptimes.length - 1;
                const lastStopName = birchData.stoptimes[lastStopIndex].name;

                const arrivalUnix = birchData.stoptimes[nextStopIndex].rt_arrival?.time || birchData.stoptimes[nextStopIndex].scheduled_arrival_time_unix_seconds;
                const timeToStop = arrivalUnix - Date.now() / 1000;
                const isApproachingStop = timeToStop < 40;

                const stopsToDisplay: any[] = [];
                const addStop = (index: number) => {
                    if (index < 0 || index >= birchData.stoptimes.length) return;
                    const s = birchData.stoptimes[index];
                    const sArrivalUnix = s.rt_arrival?.time || s.scheduled_arrival_time_unix_seconds;

                    stopsToDisplay.push({
                        name: fixStationName(s.name),
                        minutes: (isApproachingStop && index === nextStopIndex) ? "DUE" : Math.floor(Math.max(0, (sArrivalUnix - Date.now() / 1000) / 60)).toString(),
                        arrivalTime: new Date(sArrivalUnix * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !use24h }).toLowerCase().replace(' ', ''),
                        stopId: s.stop_id,
                        key: s.stop_id
                    });
                };

                const MAX_STOPS_TOTAL = 5;
                const remainingStops = lastStopIndex - nextStopIndex + 1;

                if (remainingStops <= MAX_STOPS_TOTAL) {
                    for (let i = nextStopIndex; i <= lastStopIndex; i++) {
                        addStop(i);
                    }
                } else {
                    for (let i = 0; i < MAX_STOPS_TOTAL; i++) {
                        addStop(nextStopIndex + i);
                    }
                }

                const newTripInfo: TripInformation = {
                    chateau,
                    run: fixRunNumber(chateau, birchData.route_id, birchData.trip_short_name, birchData.vehicle?.id || null, trip),
                    headsign: fixHeadsignText(birchData.trip_headsign || lastStopName, birchData.route_short_name || birchData.route_long_name || birchData.route_id),
                    nextStops: stopsToDisplay,
                    nextStop: fixStationName(nextStopName),
                    nextStopID: birchData.stoptimes[nextStopIndex].stop_id,
                    nextStopNumber: nextStopIndex,
                    finalStop: fixStationName(lastStopName),
                    finalStopID: birchData.stoptimes[lastStopIndex].stop_id,
                    isApp: isApproachingStop,
                    isTerm: nextStopName === lastStopName,
                    route: fixRouteName(chateau, birchData.route_short_name || birchData.route_long_name || birchData.route_id, birchData.route_id),
                    routeID: birchData.route_id,
                    color: fixRouteColor(chateau, birchData.route_id, birchData.color),
                    textColor: fixRouteTextColor(chateau, birchData.route_id, birchData.text_color),
                    artwork: fixStationArt(chateau, birchData.route_id),
                };

                setTripInfo(newTripInfo);
            } catch (e: any) {
                setError(e.message);
            }
        };

        const interval = setInterval(fetchTripInfo, 1000);
        fetchTripInfo(); // Initial call

        return () => {
            clearInterval(interval);
            if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
        };
    }, [use24h]);


    if (!tripInfo) {
        return (
            <div className="w-screen h-screen overflow-hidden relative font-sans flex items-center justify-center" style={{ backgroundColor: "var(--catenary-background)" }}>
                <div className="text-center">
                    <p className="text-slate-400 text-sm">{error || "Loading trip information..."}</p>
                </div>
            </div>
        );
    }

    const tripTitle = `${tripInfo.route}${tripInfo.run ? ` #${tripInfo.run}` : ''} to ${tripInfo.finalStop}`;

    return (
        <div className="w-screen h-screen overflow-hidden relative font-sans" style={{ backgroundColor: "var(--catenary-background)" }}>
            <DisplayHeader
                title={tripTitle}
                showGridControls={false}
            />

            <div style={{ top: '6vh' }} className="absolute left-0 right-0 bottom-0 overflow-auto">
                <div className="p-4 space-y-4">
                    {tripInfo.nextStops.map((s) => (
                        <div key={s.key} className="p-3 rounded shadow-lg bg-white/10 text-white">
                            <div className="font-bold">{s.name}</div>
                            <div className="text-sm opacity-80">{s.arrivalTime} • {s.minutes}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}












