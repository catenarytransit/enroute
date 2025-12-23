export type PaneConfig = {
    id: string;
    type: 'departures' | 'alerts' | 'info' | 'bike' | 'weather' | 'custom';
    name?: string;
    allowedModes?: number[];
    displayMode?: 'simple' | 'train_departure' | 'grouped_by_route';
    groupingTheme?: 'default' | 'ratp';
    useRouteColor?: boolean;
    showTripShortName?: boolean;
    showRouteShortName?: boolean;
    simplePaddingX?: string;
    simplePaddingY?: string;
    simpleListGap?: string;
    location?: { lat: number; lon: number };
    radius?: number;
    metadata?: {
        title: string;
        description: string;
        type: PaneConfig["type"];
    };
}
