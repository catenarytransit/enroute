import type { DisplayItem } from "../components/types/DisplayItem";
import type { PaneConfig } from "../components/types/PaneConfig";

export interface DirectionGroup {
    headsign: string;
    items: DisplayItem[];
}

export interface RouteGroup {
    routeShortName: string;
    routeColor: string;
    routeTextColor: string;
    directions: DirectionGroup[];
}

export function getDisplayItemsFiltered(items: DisplayItem[], config: PaneConfig): DisplayItem[] {
    if (config.type !== "departures") return [];

    const allowedModes = config.allowedModes || [];

    let filtered = items;
    if (allowedModes.length > 0) {
        filtered = items.filter(
            (item) =>
                item.routeType !== undefined &&
                allowedModes.includes(item.routeType),
        );
    }

    // Limit to 3 departures per stop to show variety of stops
    const stopCounts: Record<string, number> = {};
    const limited = filtered.filter((item) => {
        const stopKey = item.stopId;
        if (!stopCounts[stopKey]) {
            stopCounts[stopKey] = 0;
        }
        if (stopCounts[stopKey] < 3) {
            stopCounts[stopKey]++;
            return true;
        }
        return false;
    });

    return limited;
}

export function groupDepartures(items: DisplayItem[]): RouteGroup[] {
    const routes: Record<string, RouteGroup> = {};

    items.forEach((item) => {
        const routeKey = item.routeShortName;

        if (!routes[routeKey]) {
            routes[routeKey] = {
                routeShortName: item.routeShortName,
                routeColor: item.color,
                routeTextColor: item.textColor,
                directions: [],
            };
        }

        let dirGroup = routes[routeKey].directions.find(
            (d) => d.headsign === item.headsign,
        );
        if (!dirGroup) {
            dirGroup = { headsign: item.headsign, items: [] };
            routes[routeKey].directions.push(dirGroup);
        }

        if (dirGroup.items.length < 3) {
            dirGroup.items.push(item);
        }
    });

    // Optional: Sort routes if needed, or rely on input order
    return Object.values(routes);
}
