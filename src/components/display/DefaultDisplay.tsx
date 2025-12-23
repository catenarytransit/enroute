import React, { useEffect, useState, type JSX } from "react";
import Pane from "../Pane";
import { PaneConfigModal } from "../PaneConfigModal";
import type { PaneConfig } from "../types/PaneConfig";
import { loadDynamicPanes } from "utils/DynamicLoader.ts";


// theres a bug where we can't have a display called "Default" because of the file name conflicting with the default export

export function DefaultDisplay(): JSX.Element {
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
        panes: [{ id: "p1", type: "alerts" }],
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editingPaneId, setEditingPaneId] = useState<string | null>(null);

    // Settings
    const getSetting = (key: string) => {
        if (typeof window === "undefined") return null;
        const params = new URLSearchParams(window.location.search);
        return params.get(key) || localStorage.getItem(`enroute_${key}`);
    };

    const use24h = getSetting("24h") !== "false";
    const theme = getSetting("theme") || "standard";
    const clickableTrips = getSetting("clickable_trips") === "true";

    // Initialization and Timer
    useEffect(() => {
        // Window Resize
        const handleResize = () => {
            setInnerWidth(window.innerWidth);
            setInnerHeight(window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        // Load Layout
        const savedLayout = localStorage.getItem("enroute_layout_v1");
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

        // Geolocation
        const urlLat = getSetting("lat");
        const urlLon = getSetting("lon");

        if (urlLat && urlLon) {
            setDeviceLocation({
                lat: parseFloat(urlLat),
                lon: parseFloat(urlLon),
            });
        } else if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setDeviceLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                },
                (err) => {
                    console.error("Geolocation error", err);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }

        // Dynamic Panes
        loadDynamicPanes().then((loadedPanes) => {
            setLayout((prevLayout) => ({
                ...prevLayout,
                panes: loadedPanes.map((pane) => ({
                    id: pane.metadata.title,
                    type: pane.metadata.type as PaneConfig['type'], // Cast type to match PaneConfig['type']
                })),
            }));
        });

        return () => {
            window.removeEventListener("resize", handleResize);
            clearInterval(timer);
        };
    }, []);

    // Handlers
    const saveLayout = (newLayout: typeof layout) => {
        setLayout(newLayout);
        localStorage.setItem("enroute_layout_v1", JSON.stringify(newLayout));
    };

    const updateGridSize = (rows: number, cols: number) => {
        const newPanes = [...layout.panes];
        const targetCount = rows * cols;

        if (newPanes.length < targetCount) {
            for (let i = newPanes.length; i < targetCount; i++) {
                newPanes.push({
                    id: `p${Date.now()}-${Math.random()}`,
                    type: "departures",
                });
            }
        } else if (newPanes.length > targetCount) {
            newPanes.splice(targetCount);
        }

        saveLayout({ rows, cols, panes: newPanes });
    };

    const updatePaneConfig = (id: string, updates: Partial<PaneConfig>) => {
        const newPanes = layout.panes.map((p) =>
            p.id === id ? { ...p, ...updates } : p
        );
        saveLayout({ ...layout, panes: newPanes });
    };

    return (
        <div
            className="fixed top-0 left-0 w-screen h-screen overflow-hidden font-sans"
            style={{ backgroundColor: "var(--catenary-background)" }}
        >
            {/* Header Bar */}
            <div
                className="absolute top-0 left-0 w-full  flex items-center justify-between z-20 border-b-2 border-slate-500 shadow-md"
                style={{
                    height: isPortrait ? "5vh" : "6vh",
                    paddingLeft: isPortrait ? "3vw" : "1.5vw",
                    paddingRight: isPortrait ? "3vw" : "1.5vw",
                    backgroundColor: "var(--catenary-darksky)",
                }}
            >
                <div className="flex items-center gap-4">
                    <span
                        className="font-bold truncate"
                        style={{ fontSize: isPortrait ? "2.5vh" : "3vh" }}
                    >
                        Enroute Screen
                    </span>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`text-xs px-2 py-1 rounded border border-white/20 transition-colors ${
                            isEditing
                                ? "bg-yellow-500 text-black font-bold"
                                : "bg-white/10 hover:bg-white/20"
                        }`}
                    >
                        {isEditing ? "Done Editing" : "Edit Layout"}
                    </button>

                    {isEditing && (
                        <div className="flex items-center gap-2 ml-4 px-2 py-0.5 rounded border border-slate-600 shadow-lg" style={{backgroundColor: 'rgba(30, 41, 59, 0.8)'}}>
                            <button
                                onClick={() => {
                                     const event = new CustomEvent("openConfig");
                                     window.dispatchEvent(event);
                                }}
                                className="text-[10px] font-bold  px-2 py-0.5 rounded transition-colors border border-slate-500"
                            >
                                Overall settings
                            </button>
                            <div className="w-px h-4 bg-slate-600 mx-1"></div>
                            <span className="text-[10px] font-bold text-slate-400">GRID</span>
                            <div className="flex items-center gap-1">
                                <label className="text-xs " htmlFor="rows">Rows</label>
                                <select
                                    id="rows"
                                    className="bg-slate-700 rounded px-1 py-0.5 text-xs  border border-slate-600 outline-none hover:bg-slate-600"
                                    value={layout.rows}
                                    onChange={(e) => updateGridSize(parseInt(e.target.value), layout.cols)}
                                >
                                    {[1, 2, 3, 4].map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <span className="text-slate-600 font-bold">×</span>
                            <div className="flex items-center gap-1">
                                <label className="text-xs " htmlFor="cols">Cols</label>
                                <select
                                    id="cols"
                                    className="bg-slate-700 rounded px-1 py-0.5 text-xs  border border-slate-600 outline-none hover:bg-slate-600"
                                    value={layout.cols}
                                    onChange={(e) => updateGridSize(layout.rows, parseInt(e.target.value))}
                                >
                                    {[1, 2, 3, 4].map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Header Clock */}
                <span
                    className="font-medium font-mono"
                    style={{ fontSize: isPortrait ? "2.5vh" : "3vh" }}
                >
                    {currentTime.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: !use24h,
                    })}
                </span>
            </div>

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
                            onEdit={() => setEditingPaneId(pane.id)}
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


            {/* Pane Config Modal */}
            {isEditing && editingPaneId && (
                <PaneConfigModal
                    pane={layout.panes.find((p) => p.id === editingPaneId)!}
                    onSave={(config) => {
                        updatePaneConfig(editingPaneId, config);
                        setEditingPaneId(null);
                    }}
                    onClose={() => setEditingPaneId(null)}
                />
            )}
        </div>
    );
}
