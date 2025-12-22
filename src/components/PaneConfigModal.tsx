import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PaneConfig } from "./types/PaneConfig";

interface PaneConfigModalProps {
    pane: PaneConfig;
    onSave: (config: Partial<PaneConfig>) => void;
    onClose: () => void;
}

export const PaneConfigModal: React.FC<PaneConfigModalProps> = ({
    pane,
    onSave,
    onClose,
}) => {
    // Form State
    const [name, setName] = useState(pane.name || "");
    const [type, setType] = useState(pane.type);
    const [allowedModes, setAllowedModes] = useState<number[]>(pane.allowedModes || []);
    const [displayMode, setDisplayMode] = useState<"simple" | "train_departure" | "grouped_by_route">(
        pane.displayMode || "simple"
    );
    const [groupingTheme, setGroupingTheme] = useState<"default" | "ratp">(
        pane.groupingTheme || "default"
    );
    const [useRouteColor, setUseRouteColor] = useState(pane.useRouteColor || false);
    const [showTripShortName, setShowTripShortName] = useState(pane.showTripShortName ?? true);
    const [showRouteShortName, setShowRouteShortName] = useState(pane.showRouteShortName ?? true);
    const [simplePaddingX, setSimplePaddingX] = useState(pane.simplePaddingX || "2");
    const [simplePaddingY, setSimplePaddingY] = useState(pane.simplePaddingY || "1");
    const [simpleListGap, setSimpleListGap] = useState(pane.simpleListGap || "2");

    // Location State
    const [customLat, setCustomLat] = useState(
        pane.location?.lat ? pane.location.lat.toString() : ""
    );
    const [customLon, setCustomLon] = useState(
        pane.location?.lon ? pane.location.lon.toString() : ""
    );
    const [customRadius, setCustomRadius] = useState(pane.radius || 100);

    // Map Refs
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);

    // Initial Map Setup
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const startLat = customLat ? parseFloat(customLat) : 34.0522;
        const startLon = customLon ? parseFloat(customLon) : -118.2437;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: "https://maps.catenarymaps.org/light-style.json",
            center: [startLon, startLat],
            zoom: 14,
        });

        // Add source and layers on load
        map.on("load", () => {
            map.addSource("radius-circle", {
                type: "geojson",
                data: createCircleGeoJSON(startLat, startLon, customRadius),
            });

            map.addLayer({
                id: "radius-fill",
                type: "fill",
                source: "radius-circle",
                paint: {
                    "fill-color": "#4299e1",
                    "fill-opacity": 0.2,
                },
            });

            map.addLayer({
                id: "radius-outline",
                type: "line",
                source: "radius-circle",
                paint: {
                    "line-color": "#4299e1",
                    "line-width": 2,
                },
            });

            updateMapVisuals(map, markerRef.current, customLat, customLon, customRadius);
        });

        map.on("click", (e) => {
            const { lng, lat } = e.lngLat;
            setCustomLat(lat.toFixed(6));
            setCustomLon(lng.toFixed(6));
            // Visuals will update via effect below
        });

        mapRef.current = map;

        return () => {
            map.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount

    // Update Map Visuals when state changes
    useEffect(() => {
        if (mapRef.current && mapRef.current.isStyleLoaded()) {
            updateMapVisuals(
                mapRef.current,
                markerRef.current,
                customLat,
                customLon,
                customRadius
            );
        }
    }, [customLat, customLon, customRadius]);

    function createCircleGeoJSON(lat: number, lon: number, radiusMeters: number) {
        const points = 64;
        const coords = [];
        const km = radiusMeters / 1000;

        const distanceX = km / (111.32 * Math.cos((lat * Math.PI) / 180));
        const distanceY = km / 110.574;

        for (let i = 0; i < points; i++) {
            const theta = (i / points) * (2 * Math.PI);
            const thetaX = distanceX * Math.cos(theta);
            const thetaY = distanceY * Math.sin(theta);
            coords.push([lon + thetaX, lat + thetaY]);
        }
        coords.push(coords[0]);

        return {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [coords],
                    },
                    properties: {},
                },
            ],
        } as any;
    }

    function updateMapVisuals(
        map: maplibregl.Map,
        marker: maplibregl.Marker | null,
        latStr: string,
        lonStr: string,
        radius: number
    ) {
        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);

        if (isNaN(lat) || isNaN(lon)) {
            if (marker) {
                marker.remove();
                markerRef.current = null;
            }
            const source = map.getSource("radius-circle") as maplibregl.GeoJSONSource;
            if (source) {
                source.setData({
                    type: "FeatureCollection",
                    features: [],
                });
            }
            return;
        }

        // Update Marker
        if (!markerRef.current) {
            markerRef.current = new maplibregl.Marker().setLngLat([lon, lat]).addTo(map);
        } else {
            markerRef.current.setLngLat([lon, lat]);
        }

        // Update Circle
        const source = map.getSource("radius-circle") as maplibregl.GeoJSONSource;
        if (source) {
            source.setData(createCircleGeoJSON(lat, lon, radius) as any);
        }
    }

    const useCurrentLocation = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const newLat = pos.coords.latitude.toFixed(6);
                const newLon = pos.coords.longitude.toFixed(6);
                setCustomLat(newLat);
                setCustomLon(newLon);

                if (mapRef.current) {
                    mapRef.current.flyTo({
                        center: [parseFloat(newLon), parseFloat(newLat)],
                        zoom: 13,
                    });
                }
            });
        }
    };

    const resetLocation = () => {
        setCustomLat("");
        setCustomLon("");
    };

    const toggleMode = (id: number) => {
        if (allowedModes.includes(id)) {
            setAllowedModes(allowedModes.filter((m) => m !== id));
        } else {
            setAllowedModes([...allowedModes, id]);
        }
    };

    const handleSave = () => {
        const location =
            customLat && customLon
                ? { lat: parseFloat(customLat), lon: parseFloat(customLon) }
                : undefined;

        onSave({
            name,
            type,
            allowedModes,
            displayMode,
            groupingTheme,
            useRouteColor,
            showTripShortName,
            showRouteShortName,
            simplePaddingX,
            simplePaddingY,
            simpleListGap,
            location,
            radius: customRadius,
        });
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
        >
            <div
                className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 shrink-0">
                    <h3 className="font-bold text-lg text-white">Configure Pane</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        &times;
                    </button>
                </div>

                <div className="flex-grow overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Config Column */}
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1" htmlFor="paneName">
                                Pane Name (Optional)
                            </label>
                            <input
                                type="text"
                                id="paneName"
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                                placeholder={type === "departures" ? "Departures" : "Alerts"}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Type</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setType("departures")}
                                    className={`flex-1 py-2 rounded text-sm font-bold border transition-colors ${
                                        type === "departures"
                                            ? "bg-blue-600 border-blue-400 text-white"
                                            : "bg-slate-900 border-slate-600 text-slate-400 hover:bg-slate-700"
                                    }`}
                                >
                                    Departures
                                </button>
                                <button
                                    onClick={() => setType("alerts")}
                                    className={`flex-1 py-2 rounded text-sm font-bold border transition-colors ${
                                        type === "alerts"
                                            ? "bg-yellow-600 border-yellow-400 text-black"
                                            : "bg-slate-900 border-slate-600 text-slate-400 hover:bg-slate-700"
                                    }`}
                                >
                                    Alerts
                                </button>
                            </div>
                        </div>

                        {type === "departures" && (
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2">
                                    Filter Modes
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 3, label: "Bus" },
                                        { id: 2, label: "Rail" },
                                        { id: 1, label: "Subway" },
                                        { id: 0, label: "Tram" },
                                        { id: 4, label: "Ferry" },
                                    ].map((mode) => (
                                        <label
                                            key={mode.id}
                                            className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                                                allowedModes.includes(mode.id)
                                                    ? "bg-blue-900/50 border-blue-500/50"
                                                    : "bg-slate-900 border-slate-700 hover:bg-slate-700"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={allowedModes.includes(mode.id)}
                                                onChange={() => toggleMode(mode.id)}
                                                className="rounded border-slate-500 bg-slate-900 text-blue-500"
                                            />
                                            <span
                                                className={`text-xs font-bold ${
                                                    allowedModes.includes(mode.id)
                                                        ? "text-white"
                                                        : "text-slate-400"
                                                }`}
                                            >
                                                {mode.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2" htmlFor="displayMode">
                                Display Mode
                            </label>
                            <select
                                id="displayMode"
                                value={displayMode}
                                onChange={(e) =>
                                    setDisplayMode(e.target.value as "simple" | "train_departure" | "grouped_by_route")
                                }
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500 mb-2"
                            >
                                <option value="simple">Simple (CTA)</option>
                                <option value="train_departure">Train Departure</option>
                                <option value="grouped_by_route">Grouped by Route</option>
                            </select>

                            {displayMode === "grouped_by_route" && (
                                <>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 mt-2" htmlFor="groupingTheme">
                                        Grouping Theme
                                    </label>
                                    <select
                                        id="groupingTheme"
                                        value={groupingTheme}
                                        onChange={(e) => setGroupingTheme(e.target.value as "default" | "ratp")}
                                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500 mb-2"
                                    >
                                        <option value="default">Standard</option>
                                        <option value="ratp">RATP Style</option>
                                    </select>
                                </>
                            )}

                            {displayMode === "simple" && (
                                <div className="border-t border-slate-700 pt-3 mt-3">
                                    <label className="block text-xs font-bold text-slate-400 mb-2">
                                        Spacing Configuration
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">
                                                H. Padding
                                            </label>
                                            <select
                                                value={simplePaddingX}
                                                onChange={(e) => setSimplePaddingX(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
                                            >
                                                {["0", "0.5", "1", "1.5", "2", "3", "4", "5", "6"].map((val) => (
                                                    <option key={val} value={val}>
                                                        {val}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">
                                                V. Padding
                                            </label>
                                            <select
                                                value={simplePaddingY}
                                                onChange={(e) => setSimplePaddingY(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
                                            >
                                                {["0", "0.5", "1", "1.5", "2", "3", "4", "5", "6"].map((val) => (
                                                    <option key={val} value={val}>
                                                        {val}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-slate-500 mb-1">
                                                Item Gap
                                            </label>
                                            <select
                                                value={simpleListGap}
                                                onChange={(e) => setSimpleListGap(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
                                            >
                                                {["0", "0.5", "1", "1.5", "2", "3", "4"].map((val) => (
                                                    <option key={val} value={val}>
                                                        {val}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <label className="flex items-center space-x-2 cursor-pointer mt-4">
                                <input
                                    type="checkbox"
                                    checked={useRouteColor}
                                    onChange={(e) => setUseRouteColor(e.target.checked)}
                                    className="rounded border-slate-500 bg-slate-900 text-blue-500"
                                />
                                <span className="text-xs font-bold text-slate-300">
                                    Use Route Colour as Background
                                </span>
                            </label>

                            {displayMode === "train_departure" && (
                                <>
                                    <label className="flex items-center space-x-2 cursor-pointer mt-2">
                                        <input
                                            type="checkbox"
                                            checked={showTripShortName}
                                            onChange={(e) => setShowTripShortName(e.target.checked)}
                                            className="rounded border-slate-500 bg-slate-900 text-blue-500"
                                        />
                                        <span className="text-xs font-bold text-slate-300">
                                            Show Trip Short Name
                                        </span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer mt-2">
                                        <input
                                            type="checkbox"
                                            checked={showRouteShortName}
                                            onChange={(e) => setShowRouteShortName(e.target.checked)}
                                            className="rounded border-slate-500 bg-slate-900 text-blue-500"
                                        />
                                        <span className="text-xs font-bold text-slate-300">
                                            Show Route Short Name
                                        </span>
                                    </label>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Location Column */}
                    <div className="flex flex-col space-y-4 h-full">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-slate-400">Location Override</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={useCurrentLocation}
                                    className="text-[10px] bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white"
                                >
                                    Use My Location
                                </button>
                                <button
                                    onClick={resetLocation}
                                    className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        <div className="relative w-full h-[300px] bg-black rounded-lg border border-slate-600 overflow-hidden">
                            <div ref={mapContainerRef} className="w-full h-full"></div>
                        </div>

                        <div className="flex gap-2 text-xs font-mono">
                            <div className="bg-slate-900 border border-slate-600 px-2 py-1 rounded flex-1 text-center">
                                LAT: {customLat ? parseFloat(customLat).toFixed(4) : "AUTO"}
                            </div>
                            <div className="bg-slate-900 border border-slate-600 px-2 py-1 rounded flex-1 text-center">
                                LON: {customLon ? parseFloat(customLon).toFixed(4) : "AUTO"}
                            </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-700">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-slate-400">Search Radius</label>
                                <span className="text-xs font-bold text-white">{customRadius}m</span>
                            </div>
                            <input
                                type="range"
                                value={customRadius}
                                onChange={(e) => setCustomRadius(parseInt(e.target.value))}
                                min="10"
                                max="2000"
                                step="10"
                                className="w-full accent-blue-500"
                            />
                            <p className="text-[10px] text-slate-500">Distance to search for departures.</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded text-sm font-bold text-slate-400 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
