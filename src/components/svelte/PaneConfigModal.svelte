<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import maplibregl from "maplibre-gl";
    import "maplibre-gl/dist/maplibre-gl.css";
    import type { PaneConfig } from "../types/PaneConfig";

    export let pane: PaneConfig;

    const dispatch = createEventDispatcher();

    let name = pane.name || "";
    let type = pane.type;
    let allowedModes: number[] = pane.allowedModes || [];
    let displayMode: "simple" | "train_departure" | "grouped_by_route" =
        pane.displayMode || "simple";
    let groupingTheme: "default" | "ratp" = pane.groupingTheme || "default";
    let useRouteColor = pane.useRouteColor || false;
    let showTripShortName = pane.showTripShortName ?? true;
    let showRouteShortName = pane.showRouteShortName ?? true;
    let simplePaddingX = pane.simplePaddingX || "2";
    let simplePaddingY = pane.simplePaddingY || "1";
    let simpleListGap = pane.simpleListGap || "2";

    // Location & Filtering
    let customLat = pane.location?.lat ? pane.location.lat.toString() : "";
    let customLon = pane.location?.lon ? pane.location.lon.toString() : "";
    let customRadius = pane.radius || 100;

    // Map logic
    let mapContainer: HTMLDivElement;
    let map: maplibregl.Map | null = null;
    let marker: maplibregl.Marker | null = null;

    onMount(() => {
        // Init map if container exists
        if (mapContainer) {
            // Default center: Configured or Los Angeles default
            const startLat = customLat ? parseFloat(customLat) : 34.0522;
            const startLon = customLon ? parseFloat(customLon) : -118.2437;

            map = new maplibregl.Map({
                container: mapContainer,
                style: "https://maps.catenarymaps.org/light-style.json",
                center: [startLon, startLat],
                zoom: 14,
            });

            map.on("load", () => {
                map?.addSource("radius-circle", {
                    type: "geojson",
                    data: createCircleGeoJSON(startLat, startLon, customRadius),
                });
                map?.addLayer({
                    id: "radius-fill",
                    type: "fill",
                    source: "radius-circle",
                    paint: {
                        "fill-color": "#4299e1",
                        "fill-opacity": 0.2,
                    },
                });
                map?.addLayer({
                    id: "radius-outline",
                    type: "line",
                    source: "radius-circle",
                    paint: {
                        "line-color": "#4299e1",
                        "line-width": 2,
                    },
                });

                updateMapVisuals();
            });

            map.on("click", (e) => {
                const { lng, lat } = e.lngLat;
                customLat = lat.toFixed(6);
                customLon = lng.toFixed(6);
                updateMapVisuals();
            });
        }
    });

    $: {
        const _deps = [customRadius, customLat, customLon]; // Dependency tracking
        if (map && map.isStyleLoaded()) {
            updateMapVisuals();
        }
    }

    // Reactively update map when inputs change
    $: {
        // Watch lat/lon changes
        if (customLat && customLon && map) {
            // Logic handled in updateMapVisuals mostly, but flyTo might be nice if manually edited
        }
    }

    function createCircleGeoJSON(
        lat: number,
        lon: number,
        radiusMeters: number,
    ) {
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

    function updateMapVisuals() {
        if (!map) return;
        const lat = parseFloat(customLat);
        const lon = parseFloat(customLon);
        const radius = customRadius;

        if (isNaN(lat) || isNaN(lon)) {
            if (marker) {
                marker.remove();
                marker = null;
            }
            // Hide circle
            if (map.getSource("radius-circle")) {
                (
                    map.getSource("radius-circle") as maplibregl.GeoJSONSource
                ).setData({
                    type: "FeatureCollection",
                    features: [],
                });
            }
            return;
        }

        // Update Marker
        if (!marker) {
            marker = new maplibregl.Marker().setLngLat([lon, lat]).addTo(map);
        } else {
            marker.setLngLat([lon, lat]);
        }

        // Update Circle
        if (map.getSource("radius-circle")) {
            (
                map.getSource("radius-circle") as maplibregl.GeoJSONSource
            ).setData(createCircleGeoJSON(lat, lon, radius));
        }
    }

    function useCurrentLocation() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((pos) => {
                customLat = pos.coords.latitude.toFixed(6);
                customLon = pos.coords.longitude.toFixed(6);
                if (map) {
                    map.flyTo({
                        center: [parseFloat(customLon), parseFloat(customLat)],
                        zoom: 13,
                    });
                    updateMapVisuals();
                }
            });
        }
    }

    function resetLocation() {
        customLat = "";
        customLon = "";
        if (marker) {
            marker.remove();
            marker = null;
        }
        updateMapVisuals();
    }

    function toggleMode(id: number) {
        if (allowedModes.includes(id)) {
            allowedModes = allowedModes.filter((m) => m !== id);
        } else {
            allowedModes = [...allowedModes, id];
        }
    }

    function save() {
        const location =
            customLat && customLon
                ? { lat: parseFloat(customLat), lon: parseFloat(customLon) }
                : undefined;

        dispatch("save", {
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
    }

    function close() {
        dispatch("close");
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
    on:click={close}
    role="button"
    tabindex="0"
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        on:click|stopPropagation
        role="button"
        tabindex="0"
    >
        <div
            class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 shrink-0"
        >
            <h3 class="font-bold text-lg text-white">Configure Pane</h3>
            <button on:click={close} class="text-slate-400 hover:text-white"
                >&times;</button
            >
        </div>

        <div
            class="flex-grow overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
            <!-- Left Config Column -->
            <div class="space-y-6">
                <div>
                    <label
                        class="block text-xs font-bold text-slate-400 mb-1"
                        for="paneName">Pane Name (Optional)</label
                    >
                    <input
                        type="text"
                        id="paneName"
                        class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                        placeholder={type === "departures"
                            ? "Departures"
                            : "Alerts"}
                        bind:value={name}
                    />
                </div>

                <div>
                    <label
                        class="block text-xs font-bold text-slate-400 mb-1"
                        for="type">Type</label
                    >
                    <div class="flex gap-2" id="type">
                        <button
                            on:click={() => (type = "departures")}
                            class="flex-1 py-2 rounded text-sm font-bold border transition-colors {type ===
                            'departures'
                                ? 'bg-blue-600 border-blue-400 text-white'
                                : 'bg-slate-900 border-slate-600 text-slate-400 hover:bg-slate-700'}"
                        >
                            Departures
                        </button>
                        <button
                            on:click={() => (type = "alerts")}
                            class="flex-1 py-2 rounded text-sm font-bold border transition-colors {type ===
                            'alerts'
                                ? 'bg-yellow-600 border-yellow-400 text-black'
                                : 'bg-slate-900 border-slate-600 text-slate-400 hover:bg-slate-700'}"
                        >
                            Alerts
                        </button>
                    </div>
                </div>

                {#if type === "departures"}
                    <div>
                        <label
                            class="block text-xs font-bold text-slate-400 mb-2"
                            >Filter Modes</label
                        >
                        <div class="grid grid-cols-2 gap-2">
                            {#each [{ id: 3, label: "Bus" }, { id: 2, label: "Rail" }, { id: 1, label: "Subway" }, { id: 0, label: "Tram" }, { id: 4, label: "Ferry" }] as mode}
                                <label
                                    class="flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors {allowedModes.includes(
                                        mode.id,
                                    )
                                        ? 'bg-blue-900/50 border-blue-500/50'
                                        : 'bg-slate-900 border-slate-700 hover:bg-slate-700'}"
                                    for="mode-{mode.id}"
                                >
                                    <input
                                        type="checkbox"
                                        id="mode-{mode.id}"
                                        checked={allowedModes.includes(mode.id)}
                                        on:change={() => toggleMode(mode.id)}
                                        class="rounded border-slate-500 bg-slate-900 text-blue-500"
                                    />
                                    <span
                                        class="text-xs font-bold {allowedModes.includes(
                                            mode.id,
                                        )
                                            ? 'text-white'
                                            : 'text-slate-400'}"
                                        >{mode.label}</span
                                    >
                                </label>
                            {/each}
                        </div>
                    </div>
                {/if}

                <div>
                    <label
                        class="block text-xs font-bold text-slate-400 mb-2"
                        for="displayMode">Display Mode</label
                    >
                    <select
                        id="displayMode"
                        bind:value={displayMode}
                        class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500 mb-2"
                    >
                        <option value="simple">Simple (CTA)</option>
                        <option value="train_departure">Train Departure</option>
                        <option value="grouped_by_route"
                            >Grouped by Route</option
                        >
                    </select>

                    {#if displayMode === "grouped_by_route"}
                        <label
                            class="block text-xs font-bold text-slate-400 mb-2 mt-2"
                            for="groupingTheme">Grouping Theme</label
                        >
                        <select
                            id="groupingTheme"
                            bind:value={groupingTheme}
                            class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white outline-none focus:border-blue-500 mb-2"
                        >
                            <option value="default">Standard</option>
                            <option value="ratp">RATP Style</option>
                        </select>
                    {/if}

                    {#if displayMode === "simple"}
                        <div class="border-t border-slate-700 pt-3 mt-3">
                            <label
                                class="block text-xs font-bold text-slate-400 mb-2"
                                >Spacing Configuration</label
                            >
                            <div class="grid grid-cols-3 gap-2">
                                <div>
                                    <label
                                        class="block text-[10px] text-slate-500 mb-1"
                                        for="simplePaddingX">H. Padding</label
                                    >
                                    <select
                                        id="simplePaddingX"
                                        bind:value={simplePaddingX}
                                        class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
                                    >
                                        {#each ["0", "0.5", "1", "1.5", "2", "3", "4", "5", "6"] as val}
                                            <option value={val}>{val}</option>
                                        {/each}
                                    </select>
                                </div>
                                <div>
                                    <label
                                        class="block text-[10px] text-slate-500 mb-1"
                                        for="simplePaddingY">V. Padding</label
                                    >
                                    <select
                                        id="simplePaddingY"
                                        bind:value={simplePaddingY}
                                        class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
                                    >
                                        {#each ["0", "0.5", "1", "1.5", "2", "3", "4", "5", "6"] as val}
                                            <option value={val}>{val}</option>
                                        {/each}
                                    </select>
                                </div>
                                <div>
                                    <label
                                        class="block text-[10px] text-slate-500 mb-1"
                                        for="simpleListGap">Item Gap</label
                                    >
                                    <select
                                        id="simpleListGap"
                                        bind:value={simpleListGap}
                                        class="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
                                    >
                                        {#each ["0", "0.5", "1", "1.5", "2", "3", "4"] as val}
                                            <option value={val}>{val}</option>
                                        {/each}
                                    </select>
                                </div>
                            </div>
                        </div>
                    {/if}

                    <label
                        class="flex items-center space-x-2 cursor-pointer mt-4"
                    >
                        <input
                            type="checkbox"
                            bind:checked={useRouteColor}
                            class="rounded border-slate-500 bg-slate-900 text-blue-500"
                        />
                        <span class="text-xs font-bold text-slate-300"
                            >Use Route Colour as Background</span
                        >
                    </label>

                    {#if displayMode === "train_departure"}
                        <label
                            class="flex items-center space-x-2 cursor-pointer mt-2"
                            for="showTripShortName"
                        >
                            <input
                                type="checkbox"
                                id="showTripShortName"
                                bind:checked={showTripShortName}
                                class="rounded border-slate-500 bg-slate-900 text-blue-500"
                            />
                            <span class="text-xs font-bold text-slate-300"
                                >Show Trip Short Name</span
                            >
                        </label>

                        <label
                            class="flex items-center space-x-2 cursor-pointer"
                            for="showRouteShortName"
                        >
                            <input
                                type="checkbox"
                                id="showRouteShortName"
                                bind:checked={showRouteShortName}
                                class="rounded border-slate-500 bg-slate-900 text-blue-500"
                            />
                            <span class="text-xs font-bold text-slate-300"
                                >Show Route Short Name</span
                            >
                        </label>
                    {/if}
                </div>
            </div>

            <!-- Right Location Column -->
            <div class="flex flex-col space-y-4 h-full">
                <div class="flex items-center justify-between">
                    <label class="block text-xs font-bold text-slate-400"
                        >Location Override</label
                    >
                    <div class="flex gap-2">
                        <button
                            on:click={useCurrentLocation}
                            class="text-[10px] bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white"
                            >Use My Location</button
                        >
                        <button
                            on:click={resetLocation}
                            class="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white"
                            >Reset</button
                        >
                    </div>
                </div>

                <div
                    class="relative w-full h-[300px] bg-black rounded-lg border border-slate-600 overflow-hidden"
                >
                    <div bind:this={mapContainer} class="w-full h-full"></div>
                </div>

                <div class="flex gap-2 text-xs font-mono">
                    <div
                        class="bg-slate-900 border border-slate-600 px-2 py-1 rounded flex-1 text-center"
                    >
                        LAT: {customLat
                            ? parseFloat(customLat).toFixed(4)
                            : "AUTO"}
                    </div>
                    <div
                        class="bg-slate-900 border border-slate-600 px-2 py-1 rounded flex-1 text-center"
                    >
                        LON: {customLon
                            ? parseFloat(customLon).toFixed(4)
                            : "AUTO"}
                    </div>
                </div>

                <div class="space-y-2 pt-2 border-t border-slate-700">
                    <div class="flex justify-between">
                        <label class="text-xs font-bold text-slate-400"
                            >Search Radius</label
                        >
                        <span class="text-xs font-bold text-white"
                            >{customRadius}m</span
                        >
                    </div>
                    <input
                        type="range"
                        bind:value={customRadius}
                        min="10"
                        max="2000"
                        step="10"
                        class="w-full accent-blue-500"
                    />
                    <p class="text-[10px] text-slate-500">
                        Distance to search for departures.
                    </p>
                </div>
            </div>
        </div>

        <div
            class="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3 shrink-0"
        >
            <button
                on:click={close}
                class="px-4 py-2 rounded text-sm font-bold text-slate-400 hover:text-white"
                >Cancel</button
            >
            <button
                on:click={save}
                class="px-6 py-2 rounded text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg"
            >
                Save Changes
            </button>
        </div>
    </div>
</div>
