import React from "react";
import type { DisplayItem } from "../types/DisplayItem";
import type { PaneConfig } from "../types/PaneConfig";

interface Props {
    displayItems: DisplayItem[];
    config: PaneConfig;
    theme: string;
    clickableTrips: boolean;
    handleTripClick: (item: DisplayItem) => void;
}

export const metadata = {
    type: "departures" as const,
    displayMode: "train_departure" as const,
    title: "Train Departures",
    description: "Shows departures in a train station board format."
};

export default function TrainDeparture({ displayItems, config, theme, clickableTrips, handleTripClick }: Props) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm border-spacing-0">
                <thead>
                    <tr className={`text-xs font-bold text-slate-400 border-b ${theme === "blue_white" ? "border-white" : "border-slate-700"}`}>
                        {config.showRouteShortName !== false && (
                            <th className="px-2 py-1">Rte</th>
                        )}
                        <th className="px-2 py-1">Time</th>
                        {config.showTripShortName !== false && (
                            <th className="px-2 py-1">Trip</th>
                        )}
                        <th className="px-2 py-1 w-full">Direction</th>
                        <th className="px-2 py-1 text-right">Plat</th>
                    </tr>
                </thead>
                <tbody>
                    {displayItems.map((item) => (
                        <tr
                            key={item.key}
                            className={`items-center ${config.useRouteColor
                                    ? "text-white font-bold"
                                    : `border-b ${theme === "blue_white" ? "border-white" : "border-slate-700"} last:border-0`
                                } ${clickableTrips ? "cursor-pointer hover:bg-white/10" : ""}`}
                            style={config.useRouteColor ? { backgroundColor: item.color, color: item.textColor } : {}}
                            onClick={() => handleTripClick(item)}
                        >
                            {config.showRouteShortName !== false && (
                                <td className="px-2 py-1 font-bold">{item.routeShortName}</td>
                            )}
                            <td className="px-2 py-1 whitespace-nowrap">{item.formattedTime}</td>
                            {config.showTripShortName !== false && (
                                <td className="px-2 py-1 font-bold">{item.tripShortName}</td>
                            )}
                            <td className="px-2 py-1 truncate max-w-[100px]">{item.headsign}</td>
                            <td className="px-2 py-1 text-right">{item.platform || "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
