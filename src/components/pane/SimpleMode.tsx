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
                    className={`rounded-lg leading-none flex items-center justify-between shadow-lg hover:brightness-110 shrink-0 ${clickableTrips ? "cursor-pointer" : "cursor-default"}`}
                    style={{
                        padding: "var(--compact-padding)",
                        ...(config.useRouteColor ? { backgroundColor: item.color, color: item.textColor } : {}),
                        ...paddingStyle,
                    }}
                    onClick={() => clickableTrips && handleTripClick(item)}
                    role="button"
                    tabIndex={0}
                >
                    <div className="flex-grow overflow-hidden">
                        <div className="font-medium opacity-90" style={{ marginBottom: "0.2vh" }}>
                            <span className="font-bold">{item.routeShortName}</span> <span className="opacity-70">towards</span>
                        </div>
                        <div className="font-bold truncate" style={{ fontSize: "1.2em" }}>
                            {item.headsign}
                        </div>
                    </div>
                    <div className="font-bold text-right" style={{ fontSize: "1.2em", minWidth: "5em" }}>
                        {item.min <= 0 ? (
                            <span className="animate-pulse">DUE</span>
                        ) : (
                            <>
                                {item.min} <span className="font-light opacity-80">min</span>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

