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
        <div className="overflow-x-auto w-full p-2">
            <table className="w-full text-left font-mono text-sm border-spacing-0" style={{ tableLayout: 'auto' }}>
                <thead>
                    <tr className={`text-xs pb-1 font-bold text-slate-400 border-b ${theme === "blue_white" ? "border-white" : "border-slate-700"}`}>
                        {config.showRouteShortName !== false && (
                            <th className="whitespace-nowrap pl-2">Rte</th>
                        )}
                        <th className="whitespace-nowrap">Time</th>
                        {config.showTripShortName !== false && (
                            <th className="whitespace-nowrap">Trip</th>
                        )}
                        <th>Direction</th>
                        <th className="whitespace-nowrap"></th>
                        {
                            /* remove plaform is no displayItems have platform info */
                            displayItems.some(item => item.platform) && <th className="text-right whitespace-nowrap pr-2">Plat</th>
                        }
                    </tr>
                </thead>
                <tbody>
                    {displayItems.map((item) => (
                        <tr
                            key={item.key}
                            className={`items-center ${config.useRouteColor
                                    ? "text-white font-bold"
                                    : `border-b ${theme === "blue_white" ? "border-white" : "border-slate-700"} last:border-0`
                                } ${clickableTrips ? "cursor-pointer hover:bg-white/10" : ""} ${item.cancelled ? "opacity-60 line-through" : ""}`}
                            style={config.useRouteColor ? { backgroundColor: item.color, color: item.textColor } : {}}
                            onClick={() => handleTripClick(item)}
                        >
                            {config.showRouteShortName !== false && (
                                <td className="font-bold whitespace-nowrap pl-2">{item.routeShortName}</td>
                            )}
                            <td className={`whitespace-nowrap`}>
                                <span className={`${item.cancelled ? "line-through text-red-600" : ""}`}>
                                    {item.formattedTime}
                                </span>
                                {item.delayMinutes && !item.cancelled && (<span className="ml-1 text-yellow-400">⚠️</span>)}
                                {item.cancelled && (<span className="text-red-400 ml-1">✕</span>)}
                            </td>
                            {config.showTripShortName !== false && (
                                <td className="font-bold whitespace-nowrap">{item.tripShortName}</td>
                            )}
                            <td>{item.headsign}</td>
                            <td className="whitespace-nowrap">
                                {item.delayMinutes && !item.cancelled && (
                                    <div className="flex items-center gap-1">
                                        <span>Delayed {item.delayMinutes} mins</span>
                                    </div>
                                )}
                                {item.cancelled && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-red-400">Canceled</span>
                                    </div>
                                )}
                            </td>
                            {
                                displayItems.some(item => item.platform) && <td className="text-right whitespace-nowrap pr-2">{item.platform || "-"}</td>
                            }
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
