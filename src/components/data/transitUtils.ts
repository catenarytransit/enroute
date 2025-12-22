
import type { NearbyDeparturesFromCoordsV2Response } from "../types/birchtypes";
import type { DisplayItem } from "../types/DisplayItem";
import {
    fixHeadsignText,
    fixRouteColor,
    fixRouteName,
    fixRouteTextColor,
    fixStationName,
} from "./agencyspecific";

export function flattenDepartures(
    data: NearbyDeparturesFromCoordsV2Response | null,
    use24h: boolean,
    tick: number, // kept for reactivity triggers, though unused in logic directly (except maybe for ensuring re-run?)
    // actually in DefaultDisplay it was unused inside the function but passed to trigger Svelte reactivity. 
    // Typescript might complain if unused. I'll remove it from args if not used, or keep it.
    // In DefaultDisplay: `min` calculation uses `Date.now()`, which is independent of `tick` unless `tick` forces re-eval.
    // I should create 'min' based on current time. 
    // In DefaultDisplay, `tick` changed every 30s. 
    // The function uses `Date.now()`. So calling it again re-calculates mins.
    // I'll keep it as is, or maybe just remove it and let the caller handle reactivity.
    // I'll keep `Date.now()` logic.
): DisplayItem[] {
    if (!data) return [];

    const items: DisplayItem[] = [];

    data.departures.forEach((dep) => {
        const routeName = fixRouteName(
            dep.chateau_id,
            dep.short_name || dep.long_name || dep.route_id,
            dep.route_id,
        );

        Object.keys(dep.directions)
            .map((key) => dep.directions[key])
            .forEach((directionGroup) => {
                Object.keys(directionGroup)
                    .map((key) => directionGroup[key])
                    .forEach((dir) => {
                        dir.trips.forEach((trip) => {
                            const stopInfo =
                                data.stop[dep.chateau_id]?.[trip.stop_id];
                            const stopName = stopInfo
                                ? fixStationName(stopInfo.name)
                                : "Unknown Stop";

                            const arrivalTime =
                                trip.departure_realtime ||
                                trip.departure_schedule;
                            if (!arrivalTime) return;

                            const now = Date.now() / 1000;
                            const min = Math.floor(
                                (arrivalTime - now) / 60,
                            );
                            if (min < -2) return;

                            items.push({
                                key: `${dep.chateau_id}-${trip.trip_id}-${trip.stop_id}`,
                                routeShortName: routeName,
                                headsign: fixHeadsignText(dir.headsign),
                                formattedTime: new Date(
                                    arrivalTime * 1000,
                                ).toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: !use24h,
                                }),
                                min: min,
                                color: fixRouteColor(
                                    dep.chateau_id,
                                    dep.route_id,
                                    dep.color,
                                ),
                                textColor: fixRouteTextColor(
                                    dep.chateau_id,
                                    dep.route_id,
                                    dep.text_color,
                                ),
                                stopName: stopName,
                                chateau: dep.chateau_id,
                                tripId: trip.trip_id,
                                stopId: trip.stop_id,
                                routeType: dep.route_type,
                                tripShortName: trip.trip_short_name,
                                platform:
                                    (trip.platform ??
                                        stopInfo?.platform_code) ||
                                    undefined,
                                directionId: dir.direction_id,
                            });
                        });
                    });
            });
    });

    // Deduplicate
    const uniqueItems = new Map();
    items.forEach((item) => {
        if (uniqueItems.has(item.key)) {
            const existing = uniqueItems.get(item.key);
            if (item.min < existing.min) {
                uniqueItems.set(item.key, item);
            }
        } else {
            uniqueItems.set(item.key, item);
        }
    });

    const sortedItems = Array.from(uniqueItems.values());
    sortedItems.sort((a, b) => a.min - b.min);
    return sortedItems;
}

export function getActiveAlerts(nearbyData: NearbyDeparturesFromCoordsV2Response | null): string[] {
    const alerts: string[] = [];
    if (nearbyData?.alerts) {
        Object.values(nearbyData.alerts).forEach((agencyAlerts) => {
            Object.values(agencyAlerts).forEach((alert) => {
                const text =
                    alert.header_text?.translation?.[0]?.text ||
                    alert.description_text?.translation?.[0]?.text;
                if (text) alerts.push(text);
            });
        });
    }
    return alerts;
}
