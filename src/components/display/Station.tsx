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

    const defaultDeparturesConfig: PaneConfig = {
        id: "station-departures",
        type: "departures",
        displayMode: "simple",
    };
    const defaultImageConfig: PaneConfig = {
        id: "station-image",
        type: "image",
        imageUrl: "/alert/pride.png",
    };

    const [departuresConfig, setDeparturesConfig] = useState<PaneConfig>(defaultDeparturesConfig);
    const [imageConfig, setImageConfig] = useState<PaneConfig>(defaultImageConfig);

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



    // Set up global pane save handler for this display
    const handlePaneSave = useCallback((paneId: string, config: Partial<PaneConfig>) => {
        if (paneId === 'departures') {
            setDeparturesConfig(prev => ({ ...prev, ...config }));
        } else if (paneId === 'image') {
            setImageConfig(prev => ({ ...prev, ...config }));
        }
    }, []);

    useEffect(() => {
        setOnPaneSaved(() => handlePaneSave);
        return () => setOnPaneSaved(null);
    }, [handlePaneSave]);

    const resetLayout = () => {
        setDeparturesConfig(defaultDeparturesConfig);
        setImageConfig(defaultImageConfig);
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
                 showGridControls={false}
             />

            <div className="fixed top-0 left-0 w-screen h-screen bg-cover bg-center opacity-30 pointer-events-none -z-10" style={{ backgroundImage: "url(/art/default.png)" }} />

            {/* Loading state */}
            {!stopCoords ? (
                <div className="fixed top-0 left-0 w-screen h-screen flex items-center justify-center" style={{ paddingTop: "6vh" }}>
                    <span className="text-white/50 animate-pulse">Loading station data...</span>
                </div>
            ) : (
                <>
                    {/* Departures Pane - Left half */}
                     <div className="fixed left-0" style={{
                         top: "6vh",
                         height: "calc(100vh - 6vh)",
                         width: isPortrait ? "100%" : "50%",
                         padding: "10px",
                         zIndex: 10,
                     }}>
                         <Pane
                             config={{
                                 ...departuresConfig,
                                 location: stopCoords,
                                 radius: 500, // Only show departures at this specific stop
                             }}
                             theme="default"
                             use24h={use24h}
                             deviceLocation={stopCoords}
                             stopData={stopDepartures}
                             isEditing={isEditing}
                             onEdit={() => setEditingPane({
                                 paneId: 'departures',
                                 config: { ...departuresConfig, location: stopCoords, radius: 500 },
                                 displayName: 'Departures'
                             })}
                         />
                     </div>

                    {/* Image Pane - Right half (landscape only) */}
                    {!isPortrait && (
                        <div className="fixed right-0" style={{
                            top: "6vh",
                            height: "calc(100vh - 6vh)",
                            width: "50%",
                            padding: "10px",
                            zIndex: 10,
                        }}>
                            <Pane
                                config={imageConfig}
                                theme="default"
                                use24h={use24h}
                                isEditing={isEditing}
                                onEdit={() => setEditingPane({
                                    paneId: 'image',
                                    config: imageConfig,
                                    displayName: 'Image'
                                })}
                            />
                        </div>
                    )}
                </>
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
