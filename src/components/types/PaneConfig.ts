export type PaneConfig = {
    id: string;
    type: 'departures' | 'alerts';
    name?: string;
    allowedModes?: number[];
}
