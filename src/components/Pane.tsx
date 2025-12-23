import React, { useEffect, useMemo, useState } from "react";
import { flattenDepartures, getActiveAlerts } from "./data/transitUtils";
import {
    getDisplayItemsFiltered,
    groupDepartures,
} from "../utils/PaneLogic";
import type { NearbyDeparturesFromCoordsV2Response } from "./types/birchtypes";
import type { DisplayItem } from "./types/DisplayItem";
import type { PaneConfig } from "./types/PaneConfig";
import { loadDynamicPanes } from "../utils/DynamicLoader";
import AlertsPane from "./pane/AlertsPane.tsx";
import {EnroutePane} from "./pane/EnroutePane.tsx";
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
}) => {
    // Derived Configuration
    const effectiveLocation = config.location || deviceLocation;
    const radius = config.radius || 1500;

    // State
    const [nearbyData, setNearbyData] = useState<NearbyDeparturesFromCoordsV2Response | null>(() => externalNearbyData || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [minuteTick, setMinuteTick] = useState(0);
    const [dynamicPanes, setDynamicPanes] = useState<any[]>([]);
    const [dynamicDisplaysState, setDynamicDisplays] = useState<any[]>([]);

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
    console.log("Pane nearbyData:", nearbyData);
    const allDepartures = useMemo(
        () => flattenDepartures(nearbyData, use24h, minuteTick),
        [nearbyData, use24h, minuteTick]
    );

    console.log("Pane allDepartures:", allDepartures);
    const activeAlerts = useMemo(() => getActiveAlerts(nearbyData), [nearbyData]);

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
                    {config.id || `${config.type.charAt(0).toUpperCase() + config.type.slice(1)}`}
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
            <div className="grow overflow-auto p-2 scrollbar-hide">
                {loading && !nearbyData ? (
                    <div className="flex items-center justify-center h-full">
                        <span className="text-white/50 text-xs animate-pulse">Loading data...</span>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center h-full p-4 text-center">
                        <span className="text-red-400 text-xs">{error}</span>
                    </div>
                ) : config.type === "departures" ? (
                    config.displayMode === "simple" ? (
                        <SimpleMode displayItems={displayItems} config={config} clickableTrips={clickableTrips}
                                    handleTripClick={handleTripClick} paddingStyle={null} />
                    ) : config.displayMode === "grouped_by_route" ? (
                        <GroupedByRoute groupedItems={groupedItems} config={config} theme={theme} clickableTrips={clickableTrips} handleTripClick={handleTripClick} />
                    ) : config.displayMode === "train_departure" ? (
                        <TrainDeparture displayItems={displayItems} config={config} theme={theme} clickableTrips={clickableTrips} handleTripClick={handleTripClick} />
                    ) : null
                ) : config.type === "alerts" ? (
                    <AlertsPane
                        config={config}
                        activeAlerts={activeAlerts}
                        theme={theme}
                        isEditing={isEditing}
                        onEdit={onEdit}
                    />
                ) : (
                    dynamicPanes.map((pane, index) => {
                        const PaneComponent = pane.component;
                        return <PaneComponent key={index} {...pane.metadata} />;
                    })
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
                    <span className="bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold pointer-events-none">Configure Pane</span>
                </div>
            )}
        </div>
    );
};

export default Pane;
