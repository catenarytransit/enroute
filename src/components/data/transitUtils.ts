import type {AlertV2, NearbyDeparturesFromCoordsV2Response, NearbyDepartureV2} from "../types/birchtypes";
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
    tick: number
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

export function getActiveAlerts(nearbyData: NearbyDeparturesFromCoordsV2Response | null): AlertV2[] {
    const alerts: AlertV2[] = [];
    if (nearbyData?.alerts) {
        Object.values(nearbyData.alerts).forEach((agencyAlerts) => {
            Object.values(agencyAlerts).forEach((alert) => {
                alerts.push(alert);
            });
        });
    }
    return alerts;
}

export function getAlertColor(alert: AlertV2): string {
    // Effect-driven colors (what riders experience)
    switch (alert.effect) {
        case 1: // NO_SERVICE
            return "bg-red-600/20 border-red-500 text-red-200";
        case 2: // REDUCED_SERVICE
            return "bg-orange-500/20 border-orange-400 text-orange-100";
        case 3: // SIGNIFICANT_DELAYS
            return "bg-yellow-500/20 border-yellow-400 text-yellow-100";
        case 4: // DETOUR
            return "bg-blue-500/20 border-blue-400 text-blue-100";
        case 5: // ADDITIONAL_SERVICE
            return "bg-green-500/20 border-green-400 text-green-100";
        case 6: // MODIFIED_SERVICE
            return "bg-emerald-500/20 border-emerald-400 text-emerald-100";
    }

    // Cause-based fallback
    switch (alert.cause) {
        case 1: // ACCIDENT
        case 2: // CONSTRUCTION
            return "bg-orange-500/20 border-orange-400 text-orange-100";
        case 3: // WEATHER
            return "bg-indigo-500/20 border-indigo-400 text-indigo-100";
    }

    return "bg-slate-700 border-slate-600 text-slate-200";
}
