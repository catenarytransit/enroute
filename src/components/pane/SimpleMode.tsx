import React from "react";
import type { DisplayItem } from "../types/DisplayItem";
import type { PaneConfig } from "../types/PaneConfig";

interface Props {
    displayItems: DisplayItem[];
    config: PaneConfig;
    clickableTrips: boolean;
    paddingStyle: React.CSSProperties | null;
    handleTripClick: (item: DisplayItem) => void;
}

export const metadata = {
    type: "departures" as const,
    displayMode: "simple" as const,
    title: "Simple Departures",
    description: "Shows departures in a simple list format."
};

export default function SimpleMode({ displayItems, config, clickableTrips, paddingStyle, handleTripClick }: Props) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--compact-gap)" }}>
            {displayItems.map((item) => (
                <div
                    key={item.key}
                    className={`rounded leading-none flex items-center justify-between shadow hover:brightness-110 shrink-0 ${clickableTrips ? "cursor-pointer" : "cursor-default"}`}
                    style={{ 
                        padding: "var(--compact-padding)",
                        ...(config.useRouteColor ? { backgroundColor: item.color, color: item.textColor } : {}), 
                        ...paddingStyle 
                    }}
                    onClick={() => handleTripClick(item)}
                    role="button"
                    tabIndex={0}
                >
                    <div className="flex-grow overflow-hidden" style={{ marginRight: "var(--compact-gap)" }}>
                        <div className="flex items-baseline overflow-hidden" style={{ gap: "var(--compact-gap)" }}>
                            <span className="font-bold whitespace-nowrap">{item.routeShortName}</span>
                            <span className="font-medium truncate">to {item.headsign}</span>
                        </div>
                    </div>
                    <div className="font-bold text-lg whitespace-nowrap">
                        {item.min}
                        <span className="text-xs font-light" style={{ marginLeft: "var(--compact-gap)" }}>min</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
