import type { AlertV2, NearbyDeparturesFromCoordsV2Response, NearbyDepartureV2, DeparturesAtStopResponse } from "../types/birchtypes";
import type { DisplayItem } from "../types/DisplayItem";
import {
    fixHeadsignText,
    fixRouteColor,
    fixRouteName,
    fixRouteTextColor,
    fixStationName,
} from "./agencyspecific";

/**
 * Convert DeparturesAtStopResponse to NearbyDeparturesFromCoordsV2Response format
 */
export function convertStopResponseToNearbyFormat(
    data: DeparturesAtStopResponse
): NearbyDeparturesFromCoordsV2Response {
    const departures: NearbyDepartureV2[] = [];
    const stopMap: Record<string, Record<string, any>> = {};

    // Build stop map
    stopMap[data.primary.chateau] = {
        [data.primary.stop_id]: {
            gtfs_id: data.primary.stop_id,
            name: data.primary.stop_name,
            lat: data.primary.stop_lat,
            lon: data.primary.stop_lon,
            timezone: data.primary.timezone,
            url: null,
            platform_code: data.primary.platform_code,
        }
    };

    // Group events by route and direction
    const groupedByRoute: Record<string, Record<string, any>> = {};

    data.events.forEach((event) => {
        const routeKey = `${event.chateau}-${event.route_id}`;
        if (!groupedByRoute[routeKey]) {
            const route = data.routes[event.chateau]?.[event.route_id];
            if (!route) return;

            groupedByRoute[routeKey] = {
                chateau_id: event.chateau,
                route_id: event.route_id,
                color: route.color,
                text_color: route.text_color,
                short_name: route.short_name,
                long_name: route.long_name,
                route_type: route.route_type,
                directions: {},
                closest_distance: 0,
            };
        }

        const departure = groupedByRoute[routeKey];
        const dirKey = "0"; // Default direction key

        if (!departure.directions[dirKey]) {
            departure.directions[dirKey] = {};
        }

        const groupKey = "None";
        if (!departure.directions[dirKey][groupKey]) {
            departure.directions[dirKey][groupKey] = {
                headsign: event.headsign,
                direction_id: dirKey,
                trips: [],
            };
        }

        departure.directions[dirKey][groupKey].trips.push({
            trip_id: event.trip_id,
            gtfs_frequency_start_time: null,
            gtfs_schedule_start_day: event.service_date,
            is_frequency: false,
            departure_schedule: event.scheduled_departure,
            departure_realtime: event.realtime_departure,
            arrival_schedule: event.scheduled_arrival,
            arrival_realtime: event.realtime_arrival,
            stop_id: event.stop_id,
            trip_short_name: event.trip_short_name,
            tz: data.primary.timezone,
            is_interpolated: false,
            cancelled: event.trip_cancelled,
            deleted: event.trip_deleted,
            platform: event.platform_code,
            level_id: event.level_id,
        });
    });

    Object.values(groupedByRoute).forEach((dep) => {
        departures.push(dep);
    });

    return {
        number_of_stops_searched_through: 1,
        bus_limited_metres: 0,
        rail_and_other_limited_metres: 0,
        departures,
        stop: stopMap,
        alerts: data.alerts || {},
    };
}

/**
 * Helper function to calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function flattenDepartures(
    data: NearbyDeparturesFromCoordsV2Response | null,
    use24h: boolean,
    tick: number,
    userLocation?: { lat: number; lon: number },
    radiusMeters?: number
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

                            // Calculate distance if user location is provided and stop info is available
                            let distance: number | undefined = undefined;
                            if (userLocation && stopInfo) {
                                distance = calculateDistance(
                                    userLocation.lat,
                                    userLocation.lon,
                                    stopInfo.lat,
                                    stopInfo.lon
                                );
                            }

                            // Calculate delay in minutes
                            let delayMinutes: number | undefined = undefined;
                            if (trip.departure_realtime && trip.departure_schedule) {
                                const delaySeconds = trip.departure_realtime - trip.departure_schedule;
                                if (delaySeconds > 0) {
                                    delayMinutes = Math.floor(delaySeconds / 60);
                                }
                            }

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
                                distance: distance,
                                cancelled: trip.cancelled,
                                delayMinutes: delayMinutes,
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
    // Sort by time first (soonest departures), then by distance (closer stops)
    sortedItems.sort((a, b) => {
        // Sort by time first
        if (a.min !== b.min) {
            return a.min - b.min;
        }
        // If times are equal, sort by distance (closer stops first)
        if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
        }
        return 0;
    });
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
