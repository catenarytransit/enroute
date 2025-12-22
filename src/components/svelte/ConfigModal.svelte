<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import maplibregl from "maplibre-gl";
    import "maplibre-gl/dist/maplibre-gl.css";

    const dispatch = createEventDispatcher();

    export let onClose: () => void;

    let configLat = "";
    let configLon = "";
    let primaryColor = "";
    let secondaryColor = "";
    let use24HourTime = true;
    let fontPreference = "barlow";

    let mapContainer: HTMLDivElement;
    let map: maplibregl.Map | null = null;
    let marker: maplibregl.Marker | null = null;

    onMount(() => {
        // Load initial state
        const params = new URLSearchParams(window.location.search);
        const getSetting = (key: string) =>
            params.get(key) || localStorage.getItem(`enroute_${key}`);

        const urlLat = getSetting("lat");
        const urlLon = getSetting("lon");
        const urlPrimary = getSetting("primary");
        const urlSecondary = getSetting("secondary");
        const url24h = getSetting("24h") !== "false";

        if (urlLat) configLat = urlLat;
        if (urlLon) configLon = urlLon;
        if (urlPrimary) primaryColor = urlPrimary;
        if (urlSecondary) secondaryColor = urlSecondary;
        use24HourTime = url24h;

        const storedFont = localStorage.getItem("enroute_font");
        if (storedFont) fontPreference = storedFont;

        // Initialize Map
        const lat = configLat ? parseFloat(configLat) : 34.0522;
        const lon = configLon ? parseFloat(configLon) : -118.2437;

        if (mapContainer) {
            map = new maplibregl.Map({
                container: mapContainer,
                style: "https://maps.catenarymaps.org/light-style.json",
                center: [lon, lat],
                zoom: 13,
            });

            map.on("click", (e) => {
                const { lng, lat } = e.lngLat;
                configLat = lat.toFixed(6);
                configLon = lng.toFixed(6);
            });

            // Initial marker
            updateMarker(lat, lon);
        }
    });

    $: {
        if (map) {
            const lat = parseFloat(configLat);
            const lon = parseFloat(configLon);
            updateMarker(lat, lon);
        }
    }

    function updateMarker(lat: number, lon: number) {
        if (!map) return;
        if (!isNaN(lat) && !isNaN(lon)) {
            if (!marker) {
                marker = new maplibregl.Marker()
                    .setLngLat([lon, lat])
                    .addTo(map);
            } else {
                marker.setLngLat([lon, lat]);
            }
            map.flyTo({ center: [lon, lat], zoom: 13, essential: true });
        } else {
            if (marker) {
                marker.remove();
                marker = null;
            }
        }
    }

    function saveConfig() {
        const prefix = "enroute_";
        localStorage.setItem(`${prefix}primary`, primaryColor);
        localStorage.setItem(`${prefix}secondary`, secondaryColor);
        localStorage.setItem(`${prefix}24h`, use24HourTime.toString());
        localStorage.setItem(`${prefix}font`, fontPreference);

        localStorage.setItem(`${prefix}lat`, configLat);
        localStorage.setItem(`${prefix}lon`, configLon);

        // Redirect preserving search params but clearing specific ones is done elsewhere if needed
        // The original logic was:
        // window.location.href = '/' + window.location.search;
        // which implies reloading the page with current params + localstorage saving.
        // Actually, reloading is good to apply changes.
        window.location.reload();
    }

    function resetLocation() {
        configLat = "";
        configLon = "";
    }

    function goHome() {
        const params = new URLSearchParams(window.location.search);
        ["mode", "trip", "chateau", "stop"].forEach((p) => params.delete(p));
        window.location.search = params.toString();
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6"
    on:click={onClose}
    role="button"
    tabindex="0"
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="w-full max-w-5xl rounded-lg overflow-hidden border-2 border-slate-700 shadow-2xl"
        style="background-color: var(--catenary-darksky); cursor: default;"
        on:click|stopPropagation
        role="button"
        tabindex="0"
    >
        <!-- Modal Header -->
        <div class="flex justify-between items-start px-8 pt-8">
            <div class="flex flex-col">
                <h2 class="text-3xl font-bold leading-none">Configuration</h2>
                <div class="flex items-center gap-6 mt-3">
                    <span
                        class="text-[10px] font-bold opacity-90"
                        style="color: var(--catenary-seashore)"
                        >System Preferences</span
                    >
                    <button
                        on:click={goHome}
                        class="bg-blue-600 hover:bg-blue-500 text-[10px] font-black px-4 py-1.5 rounded-md transition-all active:scale-95 shadow-md border border-blue-400/30"
                        style="background-color: var(--catenary-seashore); color: var(--catenary-darksky)"
                    >
                        Go Home
                    </button>
                </div>
            </div>
            <button
                on:click={onClose}
                class="opacity-30 hover:opacity-100 text-4xl font-thin transition-all p-2 hover:rotate-90 leading-none"
                >&times;</button
            >
        </div>

        <div class="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
            <!-- Left Column: Location -->
            <div class="space-y-4">
                <label class="block text-sm font-bold opacity-80" for="map"
                    >Location Override (Click Map)</label
                >
                <div
                    class="h-[32vh] w-full rounded-lg overflow-hidden border-2 border-slate-500 relative z-0"
                >
                    <div
                        bind:this={mapContainer}
                        style="height: 100%; width: 100%"
                        id="map"
                    />
                </div>
                <div
                    class="flex justify-between items-center bg-slate-900/40 p-3 rounded-lg border border-slate-500 text-sm font-mono"
                >
                    <div class="flex space-x-6">
                        <span
                            >LAT: {configLat
                                ? parseFloat(configLat).toFixed(4)
                                : "AUTO"}</span
                        >
                        <span
                            >LON: {configLon
                                ? parseFloat(configLon).toFixed(4)
                                : "AUTO"}</span
                        >
                    </div>
                    {#if configLat || configLon}
                        <button
                            on:click={resetLocation}
                            class="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded border border-slate-500 text-[10px] font-bold transition-colors"
                            >Reset</button
                        >
                    {/if}
                </div>
            </div>

            <!-- Right Column: Settings -->
            <div class="flex flex-col justify-between">
                <div class="space-y-8">
                    <!-- Color Pickers -->
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <label
                                class="block text-xs font-bold mb-2 opacity-80"
                                for="primaryColor">Primary Color</label
                            >
                            <div
                                class="flex items-center space-x-3 bg-slate-900/40 p-2 rounded-lg border border-slate-500"
                            >
                                <input
                                    type="color"
                                    bind:value={primaryColor}
                                    id="primaryColor"
                                    class="w-12 h-10 rounded cursor-pointer border-none bg-transparent"
                                />
                                <span class="text-xs font-mono truncate"
                                    >{primaryColor}</span
                                >
                            </div>
                        </div>
                        <div>
                            <label
                                class="block text-xs font-bold mb-2 opacity-80"
                                for="secondaryColor">Secondary Color</label
                            >
                            <div
                                class="flex items-center space-x-3 bg-slate-900/40 p-2 rounded-lg border border-slate-500"
                            >
                                <input
                                    type="color"
                                    bind:value={secondaryColor}
                                    id="secondaryColor"
                                    class="w-12 h-10 rounded cursor-pointer border-none bg-transparent"
                                />
                                <span class="text-xs font-mono truncate"
                                    >{secondaryColor}</span
                                >
                            </div>
                        </div>
                    </div>

                    <!-- Options -->
                    <div class="pt-2">
                        <label
                            class="flex items-center space-x-4 p-4 rounded-lg border border-slate-500 bg-slate-900/40 hover:bg-slate-700/40 cursor-pointer transition-colors"
                        >
                            <input
                                type="checkbox"
                                bind:checked={use24HourTime}
                                class="form-checkbox h-6 w-6 text-blue-500 rounded border-slate-500 bg-slate-900"
                            />
                            <div>
                                <span class="block text-sm font-bold"
                                    >24-Hour Time</span
                                >
                                <span class="block text-[10px] opacity-60"
                                    >Display hours 00-23 without AM/PM</span
                                >
                            </div>
                        </label>
                    </div>

                    <!-- Font Selection -->
                    <div>
                        <label
                            class="block text-xs font-bold mb-2 opacity-80"
                            for="fontSelect">Font Family</label
                        >
                        <select
                            id="fontSelect"
                            bind:value={fontPreference}
                            class="w-full bg-slate-900/40 border border-slate-500 rounded-lg p-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition-colors"
                        >
                            <option value="barlow">Barlow (Default)</option>
                            <option value="helvetica">Helvetica</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- Save Button -->
        <div class="p-8 border-t border-slate-700/50 bg-black/20">
            <button
                on:click={saveConfig}
                class="w-full py-4 text-xs font-bold rounded-lg transition-all active:scale-[0.98] shadow-lg border-2 border-white/10 hover:border-white/30"
                style="background-color: var(--catenary-seashore); color: var(--catenary-darksky)"
            >
                Save & Apply Settings
            </button>
        </div>

        <!-- Footer Info -->
        <div
            class="bg-slate-900/60 py-3 px-8 border-t border-slate-500 flex justify-between items-center text-[10px] font-bold tracking-widest opacity-60"
        >
            <span>Catenary Enroute Screen • v2.0</span>
            <span>All changes saved to LocalStorage</span>
        </div>
    </div>
</div>
