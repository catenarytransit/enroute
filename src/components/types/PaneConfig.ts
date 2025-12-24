export interface ConfigFieldDefinition {
    key: string;
    label: string;
    type: 'text' | 'number' | 'checkbox' | 'select' | 'textarea' | 'url';
    description?: string;
    placeholder?: string;
    options?: Array<{ value: string | number; label: string }>;
    defaultValue?: any;
    required?: boolean;
}

export type PaneConfig = {
    id: string;
    type: string; // Now accepts any string - dynamically discovered types
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
        type: string;
    };
    // Allow any custom config fields for dynamic panes
    [key: string]: any;
}
