export interface DisplayItem {
    key: string;
    routeShortName: string;
    headsign: string;
    formattedTime: string;
    min: number;
    color: string;
    textColor: string;
    stopName: string;
    chateau: string;
    tripId: string;
    stopId: string;
    routeType?: number;
    tripShortName?: string;
    platform?: string;
    directionId?: string;
    distance?: number; // Distance in meters from the pane's location
    cancelled?: boolean; // Trip is cancelled
    delayMinutes?: number; // Minutes delayed (if realtime differs from schedule)
}
