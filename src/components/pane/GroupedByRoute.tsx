import React from "react";
import type { RouteGroup, DirectionGroup } from "utils/PaneLogic.ts";
import type { DisplayItem } from "../types/DisplayItem";
import type { PaneConfig } from "../types/PaneConfig";

interface Props {
    groupedItems: RouteGroup[];
    config: PaneConfig;
    theme: string;
    clickableTrips: boolean;
    handleTripClick: (item: DisplayItem) => void;
}

export const metadata = {
  title: "Grouped By Route Pane",
  description: "Displays data grouped by route."
};

export default function GroupedByRoute({ groupedItems, config, theme, clickableTrips, handleTripClick }: Props) {
    return (
        <div className="flex flex-col gap-2">
            {groupedItems.map((group: RouteGroup) => (
                <div key={group.routeShortName} className="flex rounded overflow-hidden border border-slate-600 bg-slate-800/50">
                    <div
                        className={`w-12 flex items-center justify-center font-bold text-2xl shrink-0 p-2 border-r ${theme === "blue_white" ? "border-white" : "border-slate-700"}`}
                        style={{
                            backgroundColor: config.groupingTheme === "ratp" ? group.routeColor : "rgba(30, 41, 59, 0.5)",
                            color: config.groupingTheme === "ratp" ? group.routeTextColor : group.routeColor,
                        }}
                    >
                        {config.groupingTheme === "ratp" ? (
                            <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center">{group.routeShortName.replace(" Line", "")}</div>
                        ) : (
                            <span className="text-white" style={{ color: group.routeColor }}>{group.routeShortName.replace(" Line", "")}</span>
                        )}
                    </div>

                    <div className="flex flex-col grow text-xs">
                        {group.directions.map((direction: DirectionGroup, idx: number) => (
                            <div
                                key={direction.headsign}
                                className={`flex items-center justify-between p-2 gap-2 ${idx < group.directions.length - 1 ? `border-b ${theme === "blue_white" ? "border-white" : "border-slate-700"}` : ""} ${idx % 2 === 0 ? "bg-white/5" : ""}`}
                            >
                                <div className="font-bold truncate text-sm grow">{direction.headsign}</div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {direction.items.map((item: DisplayItem) => (
                                        <div
                                            key={item.key}
                                            className={config.groupingTheme === "ratp" ? "bg-black/40 rounded px-1.5 py-0.5 min-w-[3rem] text-center" : ""}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleTripClick(item);
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            style={clickableTrips ? { cursor: "pointer", opacity: 0.8 } : {}}
                                        >
                                            <span className={`font-bold text-lg leading-none ${config.groupingTheme === "ratp" ? "text-yellow-500" : "text-white"}`}>{item.min}</span>
                                            <span className="text-[9px] opacity-70 ml-0.5 leading-none">min</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
