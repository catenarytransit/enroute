type VehicleRouteCache = {
    route_short_name: string;
    route_long_name: string;
    route_colour: string;
    route_text_colour: string;
    route_type: number;
    route_desc: string | null;
};

export interface Trip {
    trip_id: string
    gtfs_frequency_start_time: string | null
    gtfs_schedule_start_day: string
    is_frequency: boolean
    departure_schedule: number | null
    departure_realtime: number | null
    arrival_schedule: number | null
    arrival_realtime: number | null
    stop_id: string
    trip_short_name: string
    tz: string
    is_interpolated: boolean
    cancelled: boolean
    deleted: boolean
    platform: string | null
    level_id: string | null
}

type Vehicle = {
    id: string;
    label: string;
    license_plate: string | null;
    wheelchair_accessible: boolean | null;
};

type Position = {
    latitude: number;
    longitude: number;
    bearing: number;
    odometer: number | null;
    speed: number | null;
};

export type VehiclePosition = {
    trip: Trip;
    vehicle: Vehicle;
    position: Position;
    timestamp: number;
    route_type: number;
    current_stop_sequence: number;
    current_status: string | null;
    congestion_level: string | null;
    occupancy_status: string | null;
    occupancy_percentage: number | null;
};

export type VehiclePositions = {
    [key: string]: VehiclePosition;
};

export type BirchRealtimeLocations = {
    vehicle_route_cache: {
        [key: string]: VehicleRouteCache;
    };
    vehicle_positions: VehiclePositions;
    hash_of_routes: number;
    last_updated_time_ms: number;
};

interface StopTime {
    stop_id: string;
    name: string;
    translations: null;
    platform_code: string;
    timezone: null;
    code: string;
    longitude: number;
    latitude: number;
    scheduled_arrival_time_unix_seconds: number;
    scheduled_departure_time_unix_seconds: number;
    rt_arrival: null;
    rt_departure: null;
    schedule_relationship: null;
    gtfs_stop_sequence: number;
    interpolated_stoptime_unix_seconds: null;
}

export interface TripDetails {
    stoptimes: StopTime[];
    tz: string;
    block_id: null;
    bikes_allowed: number;
    wheelchair_accessible: number;
    has_frequencies: boolean;
    route_id: string;
    trip_headsign: string;
    route_short_name: string;
    trip_short_name: null;
    route_long_name: string;
    color: string;
    text_color: string;
    vehicle: null;
    route_type: number;
    stop_id_to_alert_ids: Record<string, unknown>;
    alert_id_to_alert: Record<string, unknown>;
    alert_ids_for_this_route: any[];
    alert_ids_for_this_trip: any[];
    shape_polyline: string;
}

export type Route = {
    onestop_feed_id: string;
    attempt_id: string;
    route_id: string;
    short_name: string;
    short_name_translations: string | null;
    long_name: string;
    long_name_translations: string | null;
    gtfs_desc: string | null;
    gtfs_desc_translations: string | null;
    route_type: number;
    url: string;
    url_translations: string | null;
    agency_id: string;
    gtfs_order: number | null;
    color: string;
    text_color: string;
    continuous_pickup: number;
    continuous_drop_off: number;
    shapes_list: string[];
    chateau: string;
};

export type RouteStop = {
    id: string;
    code: string;
    name: string;
    description: string | null;
    location_type: number;
    parent_station: string | null;
    zone_id: string;
    longitude: number;
    latitude: number;
    timezone: string;
};

export type RouteStopMap = Record<string, RouteStop>;

export type DirectionPatternMetadata = {
    chateau: string;
    direction_pattern_id: string;
    headsign_or_destination: string;
    gtfs_shape_id: string;
    fake_shape: boolean;
    onestop_feed_id: string;
    attempt_id: string;
    route_id: string;
    route_type: number;
    direction_id: boolean;
    stop_headsigns_unique_list: string[] | null;
};

export type DirectionPatternRow = {
    chateau: string;
    direction_pattern_id: string;
    stop_id: string;
    stop_sequence: number;
    arrival_time_since_start: number;
    departure_time_since_start: number;
    interpolated_time_since_start: number | null;
    onestop_feed_id: string;
    attempt_id: string;
    stop_headsign_idx: number | null;
};

export type DirectionPatternEntry = {
    direction_pattern: DirectionPatternMetadata;
    rows: DirectionPatternRow[];
};

export type DirectionPatternMap = Record<string, DirectionPatternEntry>;

export type RouteShapePolylineMap = Record<string, string>;

export type RouteDetailed = {
    agency_name: string;
    agency_id: string;
    short_name: string;
    long_name: string;
    url: string | null;
    color: string;
    text_color: string;
    route_type: number;
    pdf_url: string | null;
    stops: RouteStopMap;
    direction_patterns: DirectionPatternMap;
    shapes_polyline: RouteShapePolylineMap;
    alert_ids_for_this_route: string[];
    alert_id_to_alert: Record<string, unknown>;
    stop_id_to_alert_ids: Record<string, string[]>;
    onestop_feed_id: string;
};

export interface NearbyDeparturesResponse {
    number_of_stops_searched_through: number
    bus_limited_metres: number
    rail_and_other_limited_metres: number
    departures: Departure[]
    stop: Record<string, Record<string, Stop>>
    debug: DebugInfo
}

export interface Departure {
    chateau_id: string
    route_id: string
    color: string
    text_color: string
    short_name: string
    long_name: string
    route_type: number
    directions: Record<string, Direction>
    closest_distance: number
}

export interface Direction {
    headsign: string
    direction_id: string
    trips: Trip[]
}

export interface Stop {
    gtfs_id: string
    name: string
    lat: number
    lon: number
    timezone: string
    url: string | null
}

export interface DebugInfo {
    stop_lookup_ms: number
    directions_ms: number
    itinerary_meta_ms: number
    itinerary_row_ms: number
    trips_ms: number
    route_and_cal_ms: number
    total_time_ms: number
}

export interface SearchResultRankingEntry {
    gtfs_id: string;
    score: number;
    chateau: string;
}

export interface SearchResultResponse {
    stops_section: {
        stops: Record<string, Record<string, SearchResultStop>>;
        routes: Record<string, Record<string, SearchResultRoute>>;
        ranking: SearchResultRankingEntry[];
    };
}

export interface SearchResultStop {
    gtfs_id: string;
    name: string;
    url: string | null;
    timezone: string;
    point: {
        x: number;
        y: number;
    };
    level_id: string | null;
    primary_route_type: number | null;
    platform_code: string | null;
    routes: string[];
    route_types: number[];
    children_ids: string[];
    children_route_types: number[];
    station_feature: boolean;
    wheelchair_boarding: number;
    name_translations: Record<string, string> | null;
    parent_station: string | null;
}

export interface SearchResultRoute {
    onestop_feed_id: string;
    attempt_id: string;
    route_id: string;
    short_name: string | null;
    short_name_translations: Record<string, string> | null;
    long_name: string | null;
    long_name_translations: Record<string, string> | null;
    gtfs_desc: string | null;
    gtfs_desc_translations: Record<string, string> | null;
    route_type: number;
    url: string | null;
    url_translations: Record<string, string> | null;
    agency_id: string;
    gtfs_order: number | null;
    color: string;
    text_color: string;
    continuous_pickup: number;
    continuous_drop_off: number;
    shapes_list: string[];
    chateau: string;
}

// ---------------------------------------------------------------------------
// nearbydeparturesfromcoordsv2
// ---------------------------------------------------------------------------

export interface NearbyDeparturesFromCoordsV2Response {
    number_of_stops_searched_through: number;
    bus_limited_metres: number;
    rail_and_other_limited_metres: number;
    departures: NearbyDepartureV2[];
    // same stop structure as v1, keyed by chateau_id then stop_id
    stop: Record<string, Record<string, Stop>>;
    // alerts keyed by chateau_id then alert_id
    alerts: Record<string, Record<string, AlertV2>>;
}

export interface NearbyDepartureV2 {
    chateau_id: string;
    route_id: string;
    color: string;
    text_color: string;
    short_name: string | null;
    long_name: string | null;
    route_type: number;
    /**
     * directions[direction_id][group_key] -> NearbyDirectionV2
     * group_key is often "None" in the sample payloads.
     */
    directions: Record<string, Record<string, NearbyDirectionV2>>;
    closest_distance: number;
}

export interface NearbyDirectionV2 {
    headsign: string;
    direction_id: string;
    trips: Trip[];
}

// ---------------------------------------------------------------------------
// Alerts used by nearbydeparturesfromcoordsv2
// ---------------------------------------------------------------------------

export interface AlertV2 {
    active_period?: Array<{
        start: number;
        end: number | null;
    }>;
    informed_entity?: AlertInformedEntityV2[];
    cause?: number | null;
    effect?: number | null;

    url?: AlertTranslationBlockV2 | null;
    header_text?: AlertTranslationBlockV2 | null;
    description_text?: AlertTranslationBlockV2 | null;
    tts_header_text?: AlertTranslationBlockV2 | null;
    tts_description_text?: AlertTranslationBlockV2 | null;

    severity_level?: number | null;
    image?: string | null;
    image_alternative_text?: string | null;

    cause_detail?: string | null;
    effect_detail?: string | null;
}

export interface AlertInformedEntityV2 {
    agency_id?: string | null;
    route_id?: string | null;
    route_type?: number | null;
    trip?: string | null;
    stop_id?: string | null;
    direction_id?: string | null;
}

export interface AlertTranslationBlockV2 {
    translation: Array<{
        text: string;
        language: string | null;
    }>;
}

export interface DeparturesAtStopResponse {
    primary: BirchStopPrimary;
    parent: BirchStopPrimary | null;
    children_and_related: BirchStopPrimary[];
    events: BirchStopEvent[];
    routes: Record<string, Record<string, BirchRoute>>;
    shapes: Record<string, Record<string, unknown>>;
    alerts: Record<string, Record<string, BirchAlert>>;
    agencies: Record<string, Record<string, BirchAgency>>;
}

export interface BirchStopPrimary {
    chateau: string;
    stop_id: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
    stop_code: string;
    level_id: string | null;
    platform_code: string | null;
    parent_station: string | null;
    children_ids: string[];
    timezone: string;
    stop_name_translations: Record<string, string> | null;
}

export interface BirchStopEvent {
    scheduled_arrival: number;
    scheduled_departure: number;

    realtime_arrival: number | null;
    realtime_departure: number | null;

    trip_modified: boolean;
    stop_cancelled: boolean;
    trip_cancelled: boolean;
    trip_deleted: boolean;

    trip_id: string;
    headsign: string;
    route_id: string;
    chateau: string;
    stop_id: string;

    uses_primary_stop: boolean;
    unscheduled_trip: boolean;

    moved_info: string | null;
    platform_string_realtime: string | null;

    level_id: string | null;
    platform_code: string | null;
    vehicle_number: string | null;

    trip_short_name: string;
    service_date: string;
    last_stop: boolean;

    scheduled_trip_shape_id: string;
}

export interface BirchRoute {
    onestop_feed_id: string;
    attempt_id: string;
    route_id: string;

    short_name: string | null;
    short_name_translations: Record<string, string> | null;

    long_name: string | null;
    long_name_translations: Record<string, string> | null;

    gtfs_desc: string | null;
    gtfs_desc_translations: Record<string, string> | null;

    route_type: number;

    url: string | null;
    url_translations: Record<string, string> | null;

    agency_id: string;
    gtfs_order: number | null;

    color: string;
    text_color: string;

    continuous_pickup: number;
    continuous_drop_off: number;

    shapes_list: string[];

    chateau: string;
}

export interface BirchAlert {
    active_period: BirchAlertActivePeriod[];
    informed_entity: BirchAlertInformedEntity[];
    cause: number | null;
    effect: number | null;

    url: BirchAlertTranslationBlock | null;
    header_text: BirchAlertTranslationBlock | null;
    description_text: BirchAlertTranslationBlock | null;

    tts_header_text: BirchAlertTranslationBlock | null;
    tts_description_text: BirchAlertTranslationBlock | null;

    severity_level: number | null;
    image: string | null;
    image_alternative_text: string | null;

    cause_detail: string | null;
    effect_detail: string | null;
}

export interface BirchAlertActivePeriod {
    start: number;
    end: number | null;
}

export interface BirchAlertInformedEntity {
    agency_id: string | null;
    route_id: string | null;
    route_type: number | null;
    trip: string | null;
    stop_id: string | null;
    direction_id: string | null;
}

export interface BirchAlertTranslationBlock {
    translation: Array<{
        text: string;
        language: string;
    }>;
}

export interface BirchAgency {
    static_onestop_id: string;
    agency_id: string;
    attempt_id: string;

    agency_name: string;
    agency_name_translations: Record<string, string> | null;

    agency_url: string;
    agency_url_translations: Record<string, string> | null;

    agency_timezone: string;
    agency_lang: string;
    agency_phone: string;

    agency_fare_url: string | null;
    agency_fare_url_translations: Record<string, string> | null;

    chateau: string;
}

export type BirchShapes = Record<string, unknown>;
