import { useCallback, useEffect, useState, type JSX } from "react";
import Pane from "../Pane";
import type { PaneConfig } from "../types/PaneConfig";
import { getAvailablePaneTypes } from "utils/DynamicLoader.ts";
import { DisplayHeader } from "../common/DisplayHeader";
import { usePaneEditor } from "../context/PaneEditorContext";
import { PaneEditorSetup } from "../PaneEditorSetup";


// theres a bug where we can't have a display called "Default" because of the file name conflicting with the default export

function DefaultDisplayContent(): JSX.Element {
    const { isEditing, setIsEditing, setEditingPane, setOnPaneSaved } = usePaneEditor();

    // Global State
    const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [innerWidth, setInnerWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
    const [innerHeight, setInnerHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 0);

    const isPortrait = innerHeight > innerWidth;

    // Layout State
    const [layout, setLayout] = useState<{ rows: number; cols: number; panes: PaneConfig[] }>({
        rows: 1,
        cols: 1,
        panes: [
            {
                id: "p1",
                type: "departures",
                useRouteColor: true,
            }
        ]
    });


    // Settings
    const getSetting = (key: string) => {
        if (typeof window === "undefined") return null;
        const params = new URLSearchParams(window.location.search);
        return params.get(key) || localStorage.getItem(`enroute_${key}`);
    };

    const use24h = getSetting("24h") !== "false";
    const theme = getSetting("theme") || "standard";
    const clickableTrips = getSetting("clickable_trips") === "true";

    // Window Resize & Initial Setup
    useEffect(() => {
        const handleResize = () => {
            setInnerWidth(window.innerWidth);
            setInnerHeight(window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        // Load Layout
        const savedLayout = localStorage.getItem("enroute_layout_v2");
        if (savedLayout) {
            try {
                const parsed = JSON.parse(savedLayout);
                if (parsed.rows && parsed.cols && Array.isArray(parsed.panes)) {
                    setLayout(parsed);
                }
            } catch (e) {
                console.error("Failed to load layout", e);
            }
        }

        // Clock
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Dynamic Panes - only load if no saved layout exists
        if (!savedLayout) {
            getAvailablePaneTypes().then((availablePaneTypes) => {
                if (availablePaneTypes.length > 0) {
                    // Create one pane per available type (or customize as needed)
                    const initialPanes = availablePaneTypes.slice(0, 1).map((paneType) => ({
                        id: `pane-${paneType.type}-${Date.now()}`,
                        type: paneType.type,
                    }));
                    setLayout((prevLayout) => ({
                        ...prevLayout,
                        panes: initialPanes.length > 0 ? initialPanes : prevLayout.panes,
                    }));
                }
            });
        }

        return () => {
            window.removeEventListener("resize", handleResize);
            clearInterval(timer);
        };
    }, []);

    // Geolocation - separate effect to ensure it always runs
    useEffect(() => {
        let mounted = true;

        const tryIPGeolocation = () => {
            fetch("https://cf-object.quacksire.workers.dev/")
                .then((res) => res.json())
                .then((data) => {
                    if (mounted && data.latitude && data.longitude) {
                        setDeviceLocation({
                            lat: parseFloat(data.latitude),
                            lon: parseFloat(data.longitude),
                        });
                    }
                })
                .catch((err) => {
                    console.error("IP geolocation fallback failed", err);
                });
        };

        const urlLat = getSetting("lat");
        const urlLon = getSetting("lon");

        if (urlLat && urlLon) {
            if (mounted) {
                setDeviceLocation({
                    lat: parseFloat(urlLat),
                    lon: parseFloat(urlLon),
                });
            }
        } else if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (mounted) {
                        setDeviceLocation({
                            lat: position.coords.latitude,
                            lon: position.coords.longitude,
                        });
                    }
                },
                (err) => {
                    console.error("Geolocation error, falling back to IP geolocation", err);
                    tryIPGeolocation();
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            // No geolocation API, use IP-based fallback directly
            tryIPGeolocation();
        }

        return () => {
            mounted = false;
        };
    }, []);

    // Handlers
    const saveLayout = (newLayout: typeof layout) => {
        setLayout(newLayout);
        localStorage.setItem("enroute_layout_v2", JSON.stringify(newLayout));
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

    const resetLayout = () => {
        const defaultLayout = {
            rows: 1,
            cols: 1,
            panes: [{ id: "p1", type: "departures", useRouteColor: true }],
        };
        saveLayout(defaultLayout);
    };

    const updatePaneConfig = useCallback((id: string, updates: Partial<PaneConfig>) => {
        setLayout(prevLayout => {
            const newPanes = prevLayout.panes.map((p) =>
                p.id === id ? { ...p, ...updates } : p
            );
            const newLayout = { ...prevLayout, panes: newPanes };
            localStorage.setItem("enroute_layout_v2", JSON.stringify(newLayout));
            return newLayout;
        });
    }, []);

    // Set up global pane save handler for this display
    const handlePaneSave = useCallback((paneId: string, config: Partial<PaneConfig>) => {
        updatePaneConfig(paneId, config);
    }, [updatePaneConfig]);

    useEffect(() => {
        console.log('DefaultDisplay: registering handlePaneSave', { handlePaneSaveExists: !!handlePaneSave });
        setOnPaneSaved(() => handlePaneSave);
        return () => {
            console.log('DefaultDisplay: clearing handlePaneSave');
            setOnPaneSaved(null);
        };
    }, [handlePaneSave]);

    return (
        <div
            className="fixed top-0 left-0 w-screen h-screen overflow-hidden font-sans"
            style={{ backgroundColor: "var(--catenary-background)" }}
        >
            <DisplayHeader
                title="Enroute Screen"
                isEditing={isEditing}
                onEditToggle={setIsEditing}
                gridRows={layout.rows}
                gridCols={layout.cols}
                onGridChange={updateGridSize}
                onReset={resetLayout}
                showGridControls={true}
            />

            {/* Main Content Area */}
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
                            config={pane}
                            isEditing={isEditing}
                            theme={theme}
                            use24h={use24h}
                            deviceLocation={deviceLocation}
                            clickableTrips={clickableTrips}
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

            {/* Background Art */}
            {theme === "standard" && (
                <div
                    className="fixed top-0 left-0 w-screen h-screen bg-cover bg-center opacity-30 pointer-events-none -z-10"
                    style={{ backgroundImage: "url(/art/default.png)" }}
                ></div>
            )}
        </div>
    );
}

export function DefaultDisplay(): JSX.Element {
    return (
        <PaneEditorSetup>
            <DefaultDisplayContent />
        </PaneEditorSetup>
    );
}

export default DefaultDisplay;
