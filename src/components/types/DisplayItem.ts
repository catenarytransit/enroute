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
}
