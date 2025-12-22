import React, { useEffect, useMemo, useState } from "react";
import { flattenDepartures, getActiveAlerts } from "./data/transitUtils";
import {
    getDisplayItemsFiltered,
    groupDepartures,
    type RouteGroup,
} from "../utils/PaneLogic";
import type { NearbyDeparturesFromCoordsV2Response } from "./types/birchtypes";
import type { DisplayItem } from "./types/DisplayItem";
import type { PaneConfig } from "./types/PaneConfig";

interface PaneProps {
    config: PaneConfig;
    isEditing?: boolean;
    style?: React.CSSProperties;
    className?: string;
    theme?: string;
    use24h?: boolean;
    deviceLocation?: { lat: number; lon: number } | null;
    clickableTrips?: boolean;
    onEdit?: () => void;
}

export const Pane: React.FC<PaneProps> = ({
    config,
    isEditing = false,
    style,
    className = "",
    theme = "default",
    use24h = true,
    deviceLocation = null,
    clickableTrips = false,
    onEdit,
}) => {
    // Derived Configuration
    const effectiveLocation = config.location || deviceLocation;
    const radius = config.radius || 1500;

    // State
    const [nearbyData, setNearbyData] = useState<NearbyDeparturesFromCoordsV2Response | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [minuteTick, setMinuteTick] = useState(0);

    // Fetch Logic
    useEffect(() => {
        let mounted = true;
        let intervalId: NodeJS.Timeout;

        const fetchData = async () => {
            if (!effectiveLocation) {
                if (mounted) {
                    setLoading(false);
                    setError("No location configured");
                }
                return;
            }

            if (mounted) setLoading(true);

            const url = `https://birch.catenarymaps.org/nearbydeparturesfromcoordsv2?lat=${effectiveLocation.lat}&lon=${effectiveLocation.lon}&radius=${radius}`;

            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                if (mounted) {
                    setNearbyData(data);
                    setLoading(false);
                    setError(null);
                }
            } catch (err: any) {
                console.error(err);
                if (mounted) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        if (effectiveLocation) {
            fetchData();
            intervalId = setInterval(fetchData, 30000);
        } else {
            setLoading(false);
            setError("No location configured");
        }

        return () => {
            mounted = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [
        // Using stringified effectiveLocation to avoid deep dependency issues if object ref changes
        effectiveLocation ? `${effectiveLocation.lat},${effectiveLocation.lon}` : null,
        radius,
    ]);

    // Tick Timer
    useEffect(() => {
        const timer = setInterval(() => setMinuteTick((prev) => prev + 1), 30000);
        return () => clearInterval(timer);
    }, []);

    // Memoized Computations
    const allDepartures = useMemo(
        () => flattenDepartures(nearbyData, use24h, minuteTick),
        [nearbyData, use24h, minuteTick]
    );

    const activeAlerts = useMemo(() => getActiveAlerts(nearbyData), [nearbyData]);

    const displayItems = useMemo(
        () => getDisplayItemsFiltered(allDepartures, config),
        [allDepartures, config]
    );

    const groupedItems = useMemo(
        () =>
            config.displayMode === "grouped_by_route"
                ? groupDepartures(displayItems)
                : [],
        [displayItems, config.displayMode]
    );

    const gapStyle: React.CSSProperties =
        config.simpleListGap !== undefined
            ? { gap: `${parseFloat(config.simpleListGap) * 0.25}rem` }
            : { gap: "0.5rem" };

    const paddingStyle: React.CSSProperties =
        config.simplePaddingX !== undefined && config.simplePaddingY !== undefined
            ? {
                  padding: `${parseFloat(config.simplePaddingY) * 0.25}rem ${parseFloat(
                      config.simplePaddingX
                  ) * 0.25}rem`,
              }
            : config.useRouteColor
            ? { padding: "0.25rem 0.5rem" }
            : { padding: 0 };

    // Handlers
    const handleTripClick = (item: DisplayItem) => {
        if (!clickableTrips) return;
        if (item.tripId && item.chateau) {
            window.location.href = `/?mode=enroute&trip=${item.tripId}&chateau=${item.chateau}&24h=${use24h}&theme=${theme}`;
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit?.();
    };

    return (
        <div
            className={`relative overflow-hidden rounded-lg border ${theme === "blue_white" ? "border-white" : "border-slate-600"} flex flex-col ${className} ${
                theme === "default" ? "bg-slate-800/50" : ""
            }`}
            style={style}
        >
            {/* Header / Config Bar */}
            <div
                className={`flex items-center justify-between px-3 py-1 border-b ${theme === "blue_white" ? "border-white" : "border-slate-600"} ${
                    isEditing ? "border-yellow-500/50" : ""
                } ${theme === "default" ? "bg-slate-900/80" : ""}`}
            >
                <span className="font-bold text-sm text-slate-300 truncate">
                    {config.name || (config.type === "departures" ? "Departures" : "Alerts")}
                </span>
                {isEditing && (
                    <button
                        onClick={handleEdit}
                        className="text-[10px] uppercase font-bold bg-yellow-600 text-black px-2 py-0.5 rounded ml-2 hover:bg-yellow-500"
                    >
                        Edit
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="flex-grow overflow-auto p-2 scrollbar-hide">
                {loading && !nearbyData ? (
                    <div className="flex items-center justify-center h-full">
                        <span className="text-white/50 text-xs animate-pulse">Loading data...</span>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full p-4 text-center">
                        <span className="text-red-400 text-xs">{error}</span>
                    </div>
                ) : config.type === "departures" ? (
                    <div className="flex flex-col" style={gapStyle}>
                        {displayItems.length > 0 ? (
                            <>
                                {config.displayMode === "train_departure" ? (
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
                                                        className={`items-center ${
                                                            config.useRouteColor
                                                                    ? "text-white font-bold"
                                                                    : `border-b ${theme === "blue_white" ? "border-white" : "border-slate-700"} last:border-0`
                                                        } ${
                                                            clickableTrips
                                                                ? "cursor-pointer hover:bg-white/10"
                                                                : ""
                                                        }`}
                                                        style={
                                                            config.useRouteColor
                                                                ? {
                                                                      backgroundColor: item.color,
                                                                      color: item.textColor,
                                                                  }
                                                                : {}
                                                        }
                                                        onClick={() => handleTripClick(item)}
                                                    >
                                                        {config.showRouteShortName !== false && (
                                                            <td className="px-2 py-1 font-bold">
                                                                {item.routeShortName}
                                                            </td>
                                                        )}
                                                        <td className="px-2 py-1 whitespace-nowrap">
                                                            {item.formattedTime}
                                                        </td>
                                                        {config.showTripShortName !== false && (
                                                            <td className="px-2 py-1 font-bold">
                                                                {item.tripShortName}
                                                            </td>
                                                        )}
                                                        <td className="px-2 py-1 truncate max-w-[100px]">
                                                            {item.headsign}
                                                        </td>
                                                        <td className="px-2 py-1 text-right">
                                                            {item.platform || "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : config.displayMode === "grouped_by_route" ? (
                                    <div className="flex flex-col gap-2">
                                        {groupedItems.map((group) => (
                                            <div
                                                key={group.routeShortName}
                                                className="flex rounded overflow-hidden border border-slate-600 bg-slate-800/50"
                                            >
                                                {/* Route Badge */}
                                                <div
                                                    className={`w-12 flex items-center justify-center font-bold text-2xl shrink-0 p-2 border-r ${theme === "blue_white" ? "border-white" : "border-slate-700"}`}
                                                    style={{
                                                        backgroundColor:
                                                            config.groupingTheme === "ratp"
                                                                ? group.routeColor
                                                                : "rgba(30, 41, 59, 0.5)",
                                                        color:
                                                            config.groupingTheme === "ratp"
                                                                ? group.routeTextColor
                                                                : group.routeColor,
                                                    }}
                                                >
                                                    {config.groupingTheme === "ratp" ? (
                                                        <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center">
                                                            {group.routeShortName.replace(" Line", "")}
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className="text-white"
                                                            style={{ color: group.routeColor }}
                                                        >
                                                            {group.routeShortName.replace(" Line", "")}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Directions */}
                                                <div className="flex flex-col flex-grow text-xs">
                                                    {group.directions.map((direction, idx) => (
                                                        <div
                                                            key={direction.headsign}
                                                            className={`flex items-center justify-between p-2 gap-2 ${
                                                                idx < group.directions.length - 1
                                                                    ? `border-b ${theme === "blue_white" ? "border-white" : "border-slate-700"}`
                                                                    : ""
                                                            } ${idx % 2 === 0 ? "bg-white/5" : ""}`}
                                                        >
                                                            <div className="font-bold truncate text-sm flex-grow">
                                                                {direction.headsign}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {direction.items.map((item) => (
                                                                    <div
                                                                        key={item.key}
                                                                        className={
                                                                            config.groupingTheme ===
                                                                            "ratp"
                                                                                ? "bg-black/40 rounded px-1.5 py-0.5 min-w-[3rem] text-center"
                                                                                : ""
                                                                        }
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleTripClick(item);
                                                                        }}
                                                                        role="button"
                                                                        tabIndex={0}
                                                                        style={clickableTrips ? {cursor: "pointer", opacity: 0.8} : {}}

                                                                    >
                                                                        <span
                                                                            className={`font-bold text-lg leading-none ${
                                                                                config.groupingTheme ===
                                                                                "ratp"
                                                                                    ? "text-yellow-500"
                                                                                    : "text-white"
                                                                            }`}
                                                                        >
                                                                            {item.min}
                                                                        </span>
                                                                        <span className="text-[9px] opacity-70 ml-0.5 leading-none">
                                                                            min
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* Simple Mode */
                                    displayItems.map((item) => (
                                        <div
                                            key={item.key}
                                            className={`rounded leading-none flex items-center justify-between shadow hover:brightness-110 shrink-0 ${
                                                clickableTrips ? "cursor-pointer" : "cursor-default"
                                            }`}
                                            style={{
                                                ...(config.useRouteColor
                                                    ? {
                                                          backgroundColor: item.color,
                                                          color: item.textColor,
                                                      }
                                                    : {}),
                                                ...paddingStyle,
                                            }}
                                            onClick={() => handleTripClick(item)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div className="flex-grow overflow-hidden mr-2">
                                                <div className="flex items-baseline gap-1 overflow-hidden">
                                                    <span className="font-bold whitespace-nowrap">
                                                        {item.routeShortName}
                                                    </span>
                                                    <span className="font-medium truncate">
                                                        to {item.headsign}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="font-bold text-lg whitespace-nowrap">
                                                {item.min}
                                                <span className="text-xs font-light ml-0.5">min</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </>
                        ) : (
                            <div className="text-white/50 text-center text-sm py-4">
                                No departures found.
                            </div>
                        )}
                    </div>
                ) : (
                    /* Alerts View */
                    <div className="flex flex-col gap-2">
                        {activeAlerts.length > 0 ? (
                            activeAlerts.map((alert, idx) => (
                                <div
                                    key={idx}
                                    className="bg-yellow-900/40 border border-yellow-700/50 p-2 rounded text-sm text-yellow-100"
                                >
                                    {alert}
                                </div>
                            ))
                        ) : (
                            <div className="text-white/50 text-center text-sm py-4">
                                No active alerts.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Overlay */}
            {isEditing && (
                <div
                    onClick={handleEdit}
                    className="absolute inset-0 bg-black/10 hover:bg-black/20 cursor-pointer transition-colors z-10 flex items-center justify-center opacity-0 hover:opacity-100"
                    role="button"
                    tabIndex={0}
                >
                    <span className="bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold pointer-events-none">
                        Configure Pane
                    </span>
                </div>
            )}
        </div>
    );
};
