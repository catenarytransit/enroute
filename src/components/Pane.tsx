import React, { useEffect, useMemo, useState } from "react";
import { flattenDepartures, getActiveAlerts, convertStopResponseToNearbyFormat } from "./data/transitUtils";
import {
    getDisplayItemsFiltered,
    groupDepartures,
} from "../utils/PaneLogic";
import type { NearbyDeparturesFromCoordsV2Response, DeparturesAtStopResponse } from "./types/birchtypes";
import type { DisplayItem } from "./types/DisplayItem";
import type { PaneConfig } from "./types/PaneConfig";
import { loadDynamicPanes } from "../utils/DynamicLoader";
import AlertsPane from "./pane/AlertsPane.tsx";
import GroupedByRoute from "./pane/GroupedByRoute.tsx";
import SimpleMode from "components/pane/SimpleMode.tsx";
import TrainDeparture from "components/pane/TrainDeparture.tsx";

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
     nearbyData?: NearbyDeparturesFromCoordsV2Response | null; // Added proper typing for departures
     stopData?: DeparturesAtStopResponse | null; // Add stopData prop for specific stop departures
 }

const Pane: React.FC<PaneProps> = ({
     config,
     isEditing = false,
     style,
     className = "",
     theme = "default",
     use24h = true,
     deviceLocation = null,
     clickableTrips = false,
     onEdit,
     nearbyData: externalNearbyData, // Destructure external nearbyData prop
     stopData: externalStopData, // Destructure external stopData prop
 }) => {
    // Read paneStyle from localStorage/URL
    const getSetting = (key: string) => {
        if (typeof window === "undefined") return null;
        const params = new URLSearchParams(window.location.search);
        return params.get(key) || localStorage.getItem(`enroute_${key}`);
    };
    const paneStyle = (getSetting("pane_style") || "default") as "default" | "flush";
    // Derived Configuration
    const effectiveLocation = config.location || deviceLocation;
    const radius = config.radius || 1500;

    // State
    const [nearbyData, setNearbyData] = useState<NearbyDeparturesFromCoordsV2Response | null>(() => externalNearbyData || null);
    const [stopData, setStopData] = useState<DeparturesAtStopResponse | null>(() => externalStopData || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [minuteTick, setMinuteTick] = useState(0);
    const [dynamicPanes, setDynamicPanes] = useState<any[]>([]);
    const [dynamicDisplaysState, setDynamicDisplays] = useState<any[]>([]);

    // Fetch Logic
    useEffect(() => {
        let mounted = true;
        let intervalId: NodeJS.Timeout;

        // If stopData is provided, use it directly and skip fetching
        if (externalStopData) {
            if (mounted) {
                setStopData(externalStopData);
                setLoading(false);
                setError(null);
            }
            return;
        }

        const fetchData = async () => {
            if (!effectiveLocation) {
                if (mounted) {
                    setLoading(false);
                    // Only show error if no deviceLocation prop was passed at all
                    // If deviceLocation is null but was passed, it means we're waiting for geolocation
                    setError("No location configured");
                }
                return;
            }

            // Clear any previous error when we have a location
            if (mounted) {
                setError(null);
                setLoading(true);
            }

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
        externalStopData,
    ]);

    // Tick Timer
    useEffect(() => {
        const timer = setInterval(() => setMinuteTick((prev) => prev + 1), 30000);
        return () => clearInterval(timer);
    }, []);

    // Memoized Computations
    const activeData = useMemo(() => {
        if (stopData) {
            return convertStopResponseToNearbyFormat(stopData);
        }
        return nearbyData;
    }, [stopData, nearbyData]);
    console.log("Pane activeData:", activeData);
    const allDepartures = useMemo(
        () => flattenDepartures(activeData, use24h, minuteTick, effectiveLocation || undefined, radius),
        [activeData, use24h, minuteTick, effectiveLocation, radius]
    );

    console.log("Pane allDepartures:", allDepartures);
    const activeAlerts = useMemo(() => getActiveAlerts(activeData), [activeData]);

    const displayItems = useMemo(
        () => getDisplayItemsFiltered(allDepartures, config),
        [allDepartures, config]
    );

    console.log("Pane displayItems:", displayItems);

    const groupedItems = useMemo(
        () =>
            config.displayMode === "grouped_by_route"
                ? groupDepartures(displayItems)
                : [],
        [displayItems, config.displayMode]
    );

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

    // Load all available panes on mount
    useEffect(() => {
        async function fetchDynamicPanes() {
            try {
                const panes = await loadDynamicPanes();
                console.log("Dynamic Panes:", panes);
                setDynamicPanes(panes);
            } catch (err) {
                console.error("Error loading dynamic panes:", err);
            }
        }

        fetchDynamicPanes();
    }, []);

    // Find the matching pane component for the current config type
    const getPaneComponent = () => {
        // Check built-in types first
        if (config.type === "departures") {
            const mode = config.displayMode || "simple"; // Default to simple if not specified
            if (mode === "simple") {
                return <SimpleMode displayItems={displayItems} config={config} clickableTrips={clickableTrips} handleTripClick={handleTripClick} paddingStyle={null} />;
            } else if (mode === "grouped_by_route") {
                return <GroupedByRoute groupedItems={groupedItems} config={config} theme={theme} clickableTrips={clickableTrips} handleTripClick={handleTripClick} />;
            } else if (mode === "train_departure") {
                return <TrainDeparture displayItems={displayItems} config={config} theme={theme} clickableTrips={clickableTrips} handleTripClick={handleTripClick} />;
            }
            return <SimpleMode displayItems={displayItems} config={config} clickableTrips={clickableTrips} handleTripClick={handleTripClick} paddingStyle={null} />;
        }

        if (config.type === "alerts") {
            return <AlertsPane config={config} activeAlerts={activeAlerts} theme={theme} isEditing={isEditing} onEdit={onEdit} />;
        }

        // Check dynamic panes for any other type
        const dynamicPane = dynamicPanes.find(pane => pane.metadata.type === config.type);
        if (dynamicPane) {
            const PaneComponent = dynamicPane.component;
            // Filter out departures-specific display properties, but keep location
            const cleanConfig = { ...config };
            delete cleanConfig.allowedModes;
            delete cleanConfig.displayMode;
            delete cleanConfig.groupingTheme;
            delete cleanConfig.useRouteColor;
            delete cleanConfig.showTripShortName;
            delete cleanConfig.showRouteShortName;
            delete cleanConfig.simplePaddingX;
            delete cleanConfig.simplePaddingY;
            delete cleanConfig.simpleListGap;
            return <PaneComponent {...cleanConfig} />;
        }

        // Fallback: show message if pane type not found
        return (
            <div className="flex items-center justify-center h-full p-4">
                <span className="text-slate-400 text-xs text-center">Pane type "{config.type}" not found</span>
            </div>
        );
    };

    return (
        <div
            className={`relative overflow-hidden ${paneStyle === "flush" ? "" : "rounded-lg border"} ${theme === "blue_white" ? "border-white" : paneStyle === "flush" ? "" : "border-slate-600"} flex flex-col ${className} ${paneStyle === "flush" ? "bg-transparent" : theme === "default" ? "bg-slate-800/50" : ""
                }`}
            style={style}
        >
            {/* Header / Config Bar */}
            {isEditing && (
                <div
                    className={`flex items-center justify-between px-3 py-1 ${paneStyle === "flush" ? "" : "border-b"} ${theme === "blue_white" ? "border-white" : paneStyle === "flush" ? "" : "border-slate-600"} border-yellow-500/50 ${paneStyle === "flush" ? "bg-transparent" : theme === "default" ? "bg-slate-900/80" : ""}`}
                >
                    <span className="font-bold text-sm text-slate-300 truncate">
                        {`${config.type.charAt(0).toUpperCase() + config.type.slice(1)}`}
                    </span>
                    <button
                        onClick={handleEdit}
                        className="text-[10px] uppercase font-bold bg-yellow-600 text-black px-2 py-0.5 rounded ml-2 hover:bg-yellow-500"
                    >
                        Edit
                    </button>
                </div>
            )}

            {/* Content */}
            <div className="grow overflow-auto scrollbar-hide" style={{ padding: "var(--compact-padding)" }}>
                {loading && !activeData ? (
                    <div className="flex items-center justify-center h-full">
                        <span className="text-white/50 text-xs animate-pulse">Loading data...</span>
                    </div>
                ) : error && (config.type === "departures" || config.type === "alerts") ? (
                    <div className="flex items-center justify-center h-full text-center" style={{ padding: "var(--compact-padding)" }}>
                        <span className="text-red-400 text-xs">{error}</span>
                    </div>
                ) : config.type === "departures" && displayItems.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-center" style={{ padding: "var(--compact-padding)" }}>
                        <span className="text-slate-400 text-xs">No departures available</span>
                    </div>
                ) : (
                    getPaneComponent()
                )}
            </div>

            {/* Overlay */}
            {isEditing && (
                <div
                    onClick={handleEdit}
                    className="absolute inset-0 bg-black/10 hover:bg-black/20 cursor-pointer transition-colors z-50 flex items-center justify-center opacity-0 hover:opacity-100"
                    role="button"
                    tabIndex={0}
                >
                    <span className="bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold pointer-events-none">Configure Pane</span>
                </div>
            )}
        </div>
    );
};

export default Pane;
