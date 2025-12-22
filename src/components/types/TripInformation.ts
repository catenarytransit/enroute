export type TripInformation = {
    chateau: string;
    nextStops: {
        name: string;
        minutes: string;
        arrivalTime: string;
        isSpacer?: boolean;
        count?: number;
        stopId?: string;
        key: string;
    }[];
    nextStop: string;
    nextStopID: string;
    nextStopNumber: number;
    finalStop: string;
    finalStopID: string;
    isApp: boolean;
    isTerm: boolean;
    run: string | null;
    headsign: string;
    route: string;
    routeID: string;
    color: string;
    textColor: string;
    artwork: string;
}

export type BirchTripInformation = {
    stoptimes: BirchStopTime[];
    tz: string;
    block_id: string;
    bikes_allowed: number;
    wheelchair_accessible: number;
    has_frequencies: boolean;
    route_id: string;
    trip_headsign: string | null;
    route_short_name: string | null;
    trip_short_name: string | null;
    route_long_name: string | null;
    color: string;
    text_color: string;
    vehicle: {
        id: string;
        label: string | null;
        license_plate: string | null;
        wheelchair_accessible: number | null;
    } | null
}

export type BirchStopTime = {
    stop_id: string;
    name: string;
    translations: null;
    platform_code: null;
    timezone: null;
    code: string;
    longitude: number;
    latitude: number;
    scheduled_arrival_time_unix_seconds: number;
    scheduled_departure_time_unix_seconds: number;
    rt_arrival: {
        delay: number;
        time: number;
        uncertainty: number;
    } | null;
    rt_departure: {
        delay: number;
        time: number;
        uncertainty: number;
    } | null;
    schedule_relationship: number | null;
    gtfs_stop_sequence: number;
}