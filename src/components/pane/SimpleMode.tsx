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
  title: "Simple Mode Pane",
  description: "Displays a simplified view of data."
};

export default function SimpleMode({ displayItems, config, clickableTrips, paddingStyle, handleTripClick }: Props) {
    return (
        <>
            {displayItems.map((item) => (
                <div
                    key={item.key}
                    className={`rounded leading-none flex items-center justify-between shadow hover:brightness-110 shrink-0 ${clickableTrips ? "cursor-pointer" : "cursor-default"}`}
                    style={{ ...(config.useRouteColor ? { backgroundColor: item.color, color: item.textColor } : {}), ...paddingStyle }}
                    onClick={() => handleTripClick(item)}
                    role="button"
                    tabIndex={0}
                >
                    <div className="flex-grow overflow-hidden mr-2">
                        <div className="flex items-baseline gap-1 overflow-hidden">
                            <span className="font-bold whitespace-nowrap">{item.routeShortName}</span>
                            <span className="font-medium truncate">to {item.headsign}</span>
                        </div>
                    </div>
                    <div className="font-bold text-lg whitespace-nowrap">
                        {item.min}
                        <span className="text-xs font-light ml-0.5">min</span>
                    </div>
                </div>
            ))}
        </>
    );
}
