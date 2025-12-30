import React, {useCallback, useEffect, useState, useRef} from "react";
import type { JSX } from "react";
import { fixStationName } from "../data/agencyspecific";
import { fetchSwiftlyArrivals } from "../data/stationdemo";
import type { Arrival } from "../types/StationInformation";
import { StationAnnouncer } from "utils/StationAnnouncer.ts";
import { loadDynamicPanes } from "utils/DynamicLoader.ts";
import type { PaneConfig } from "../types/PaneConfig";
import type { DeparturesAtStopResponse } from "../types/birchtypes";
import type { NearbyDeparturesFromCoordsV2Response } from "../types/birchtypes";
import Pane from "../Pane";
import { DisplayHeader } from "../common/DisplayHeader";
import { usePaneEditor } from "../context/PaneEditorContext";
import { PaneEditorSetup } from "../PaneEditorSetup";

function StationContent(): JSX.Element {
    const getSetting = (key: string, defaultValue = "") => {
         if (typeof window === "undefined") return defaultValue;
         const params = new URLSearchParams(window.location.search);
         return params.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;
     };

     const use24h = getSetting("24h") !== "false";
     const theme = getSetting("theme") || "default";

    const [arrivals, setArrivals] = useState<Arrival[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<string[]>([]);
    const [stopName, setStopName] = useState("Loading...");
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [announcementTextChunk, setAnnouncementTextChunk] = useState<string | null>(null);
    const [stopCoords, setStopCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [nearbyDepartures, setNearbyDepartures] = useState<NearbyDeparturesFromCoordsV2Response | null>(null);
    const [stopDepartures, setStopDepartures] = useState<DeparturesAtStopResponse | null>(null);

    const [innerWidth, setInnerWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
    const [innerHeight, setInnerHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 0);
    const isPortrait = innerHeight > innerWidth;

    const vUnit = isPortrait ? "vw" : "vh";
    const hUnit = isPortrait ? "vh" : "vw";

    const { isEditing, setIsEditing, editingPane, setEditingPane, closeEditingPane, setOnPaneSaved } = usePaneEditor();

    const defaultLayout = {
        rows: 1,
        cols: 2,
        panes: [
            {
                id: "station-departures",
                type: "departures",
                displayMode: "simple",
                useRouteColor: true,
            },
            {
                id: "station-image",
                type: "image",
                imageUrl: "/alert/pride.png",
            }
        ]
    };

    const [layout, setLayout] = useState<{ rows: number; cols: number; panes: PaneConfig[] }>(() => {
         if (typeof window === "undefined") return defaultLayout;
         const saved = localStorage.getItem("enroute_station_layout_v2");
         if (saved) {
             try {
                 const parsed = JSON.parse(saved);
                 if (parsed.rows && parsed.cols && Array.isArray(parsed.panes)) {
                     return parsed;
                 }
             } catch (e) {
                 console.error("Failed to load station layout", e);
             }
         }
         return defaultLayout;
     });

    const announcerRef = useRef<any>(null);

    useEffect(() => {
         announcerRef.current = new StationAnnouncer((chunk: string | null) => {
            if (chunk) setAnnouncementTextChunk(chunk);
        });
    }, []);

    useEffect(() => {
        const handleResize = () => {
             setInnerWidth(window.innerWidth);
             setInnerHeight(window.innerHeight);
        };
        window.addEventListener("resize", handleResize);
        let mounted = true;
        const params = new URLSearchParams(window.location.search);
        const selectedRegion = params.get("chateau");
        const selectedStop = params.get("stop");
        const selectedRoutes = params.get("routes")?.split(",") || ["Metro A Line"];

        const fetchData = async () => {
             if (!selectedRegion || !selectedStop) {
                 if (mounted) setError("Chateâu ID and stop must be provided.");
                 return;
             }
             try {
                 const data = await fetchSwiftlyArrivals(selectedRegion, selectedRoutes, selectedStop, use24h);
                 if (mounted && data) {
                     setStopName(data.name);
                     if (data.trips) setArrivals(data.trips);
                     setActiveAlerts(data.alerts || []);
                     setLoading(false);
                 }
             } catch (err: any) {
                 if (mounted) setError(err.message);
             }
        };

        const fetchStopCoords = async () => {
             if (!selectedRegion || !selectedStop) return;
             try {
                 const now = Math.floor(Date.now() / 1000);
                 const oneHourLater = now + 3600 * 2;
                 const url = `https://birchdeparturesfromstop.catenarymaps.org/departures_at_stop?stop_id=${selectedStop}&chateau_id=${selectedRegion}&greater_than_time=${now}&less_than_time=${oneHourLater}&include_shapes=false`;

                 const response = await fetch(url);
                 if (!response.ok) throw new Error(`Failed to fetch stop coords: ${response.status}`);

                 const data: DeparturesAtStopResponse = await response.json();
                 if (mounted && data.primary) {
                     setStopCoords({ lat: data.primary.stop_lat, lon: data.primary.stop_lon });
                     setStopDepartures(data);
                 }
             } catch (err: any) {
                 console.error("Error fetching stop coordinates:", err);
             }
        };

        const dataInterval = setInterval(fetchData, 4000);
        fetchData(); // Initial

        // Fetch stop coordinates at once
        fetchStopCoords();

        const announceInterval = setInterval(() => {
             const params = new URLSearchParams(window.location.search);
             const selectedRegion = params.get("chateau");
             if (selectedRegion && announcerRef.current) announcerRef.current.announce(selectedRegion);
        }, 60000);

        return () => {
            mounted = false;
            window.removeEventListener("resize", handleResize);
            clearInterval(dataInterval);
            clearInterval(announceInterval);
        };
    }, [use24h]);



    const saveLayout = (newLayout: typeof layout) => {
        setLayout(newLayout);
        localStorage.setItem("enroute_station_layout_v2", JSON.stringify(newLayout));
    };

    const updateGridSize = (rows: number, cols: number) => {
        const newPanes = [...layout.panes];
        const targetCount = rows * cols;

        if (newPanes.length < targetCount) {
            for (let i = newPanes.length; i < targetCount; i++) {
                newPanes.push({
                    id: `p${Date.now()}-${Math.random()}`,
                    type: "departures",
                    useRouteColor: true,
                });
            }
        } else if (newPanes.length > targetCount) {
            newPanes.splice(targetCount);
        }

        saveLayout({ rows, cols, panes: newPanes });
    };

    const updatePaneConfig = useCallback((id: string, updates: Partial<PaneConfig>) => {
        setLayout(prevLayout => {
            const newPanes = prevLayout.panes.map((p) =>
                p.id === id ? { ...p, ...updates } : p
            );
            const newLayout = { ...prevLayout, panes: newPanes };
            localStorage.setItem("enroute_station_layout_v2", JSON.stringify(newLayout));
            return newLayout;
        });
    }, []);

    // Set up global pane save handler for this display
    const handlePaneSave = useCallback((paneId: string, config: Partial<PaneConfig>) => {
        updatePaneConfig(paneId, config);
    }, [updatePaneConfig]);

    useEffect(() => {
        setOnPaneSaved(() => handlePaneSave);
        return () => setOnPaneSaved(null);
    }, [handlePaneSave]);

    const resetLayout = () => {
        // @ts-ignore
        saveLayout(defaultLayout);
    };

    useEffect(() => {
         loadDynamicPanes().then((loadedPanes) => {
             const paneConfigs: PaneConfig[] = loadedPanes.map((pane) => ({
                 id: pane.metadata.title,
                 type: pane.metadata.type as PaneConfig['type'],
                 description: pane.metadata.description,
             }));
             console.log("Loaded Panes:", paneConfigs);
         });
     }, []);



    return (
        <div className="w-screen h-screen overflow-hidden relative font-sans" style={{ backgroundColor: "var(--catenary-background)" }}>
            <DisplayHeader
                 title={fixStationName(stopName)}
                 isEditing={isEditing}
                 onEditToggle={setIsEditing}
                 onReset={resetLayout}
                 gridRows={layout.rows}
                 gridCols={layout.cols}
                 onGridChange={updateGridSize}
                 showGridControls={true}
             />

            <div className="fixed top-0 left-0 w-screen h-screen bg-cover bg-center opacity-30 pointer-events-none -z-10" style={{ backgroundImage: "url(/art/default.png)" }} />

            {/* Loading state */}
            {!stopCoords ? (
                <div className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center" style={{ paddingTop: "6vh" }}>
                    <span className="text-white/50 animate-pulse">Loading station data...</span>
                </div>
            ) : (
                <div
                    className="absolute left-0 right-0 bottom-0 overflow-hidden"
                    style={{
                        top: "6vh",
                        padding: isEditing ? "20px" : "0",
                    }}
                >
                    <div
                        className="w-full h-full grid gap-2 p-2 transition-all duration-300"
                        style={{
                            gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
                            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                        }}
                    >
                        {layout.panes.map((pane) => (
                            <Pane
                                key={pane.id}
                                config={{
                                    ...pane,
                                    location: pane.type === 'departures' ? stopCoords : pane.location,
                                    radius: pane.type === 'departures' ? 500 : pane.radius,
                                }}
                                isEditing={isEditing}
                                theme={theme}
                                use24h={use24h}
                                deviceLocation={stopCoords}
                                stopData={pane.type === 'departures' ? stopDepartures : undefined}
                                className={
                                    isEditing
                                        ? "border-dashed border-2 border-yellow-500/50 bg-slate-800/80"
                                        : ""
                                }
                                onEdit={() => setEditingPane({
                                    paneId: pane.id,
                                    config: pane,
                                    displayName: `Pane: ${pane.id}`
                                })}
                            />
                        ))}
                    </div>
                </div>
            )}


        </div>
    );
}

export default function Station(): JSX.Element {
    return (
        <PaneEditorSetup>
            <StationContent />
        </PaneEditorSetup>
    );
}
