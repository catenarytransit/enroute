<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import type { PaneConfig } from "../types/PaneConfig";

    import Pane from "./Pane.svelte";
    import PaneConfigModal from "./PaneConfigModal.svelte";

    const dispatch = createEventDispatcher();

    // Re-declare for local use if needed, but imported PaneConfig handles it
    // type PaneConfigType is in types/PaneConfig, imported above.

    // Global State
    let deviceLocation: { lat: number; lon: number } | null = null;
    let loadingLocation = true;
    let locationError: string | null = null;
    let minuteTick = 0;

    let innerWidth = 0;
    let innerHeight = 0;
    $: isPortrait = innerHeight > innerWidth;

    // Layout State
    // Using PaneConfig type from import which now has location/radius
    let layout: { rows: number; cols: number; panes: PaneConfig[] } = {
        rows: 1,
        cols: 1,
        panes: [{ id: "p1", type: "departures" }],
    };
    let isEditing = false;
    let editingPaneId: string | null = null;

    const params = new URLSearchParams(window.location.search);
    const getSetting = (key: string) =>
        params.get(key) || localStorage.getItem(`enroute_${key}`);
    const use24h = getSetting("24h") !== "false";
    const theme = getSetting("theme") || "default";

    // Clock
    let currentTime = new Date();

    onMount(() => {
        // Load layout
        const savedLayout = localStorage.getItem("enroute_layout_v1");
        if (savedLayout) {
            try {
                const parsed = JSON.parse(savedLayout);
                if (parsed.rows && parsed.cols && Array.isArray(parsed.panes)) {
                    layout = parsed;
                }
            } catch (e) {
                console.error("Failed to load layout", e);
            }
        }

        // Clock
        const timer = setInterval(() => (currentTime = new Date()), 1000);

        // Minute tick
        const tickTimer = setInterval(() => minuteTick++, 30000);

        // Geolocation for "Device Location" fallback
        // We no longer read "lat" / "lon" from URL as a global setting for specific location overriding,
        // but we might still want to optionally support it as "Device Location" override?
        // The user said "Move global location information".
        // If the URL has lat/lon, maybe we treat that as "Device Location".
        const urlLat = getSetting("lat");
        const urlLon = getSetting("lon");

        if (urlLat && urlLon) {
            deviceLocation = {
                lat: parseFloat(urlLat),
                lon: parseFloat(urlLon),
            };
            loadingLocation = false;
        } else if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    deviceLocation = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    };
                    loadingLocation = false;
                },
                (err) => {
                    console.error("Geolocation error", err);
                    locationError = "Unable to retrieve device location";
                    loadingLocation = false;
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
            );
        } else {
            locationError = "Geolocation is not supported";
            loadingLocation = false;
        }

        return () => {
            clearInterval(timer);
            clearInterval(tickTimer);
        };
    });

    function saveLayout(newLayout: typeof layout) {
        layout = newLayout;
        localStorage.setItem("enroute_layout_v1", JSON.stringify(newLayout));
    }

    function updateGridSize(rows: number, cols: number) {
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
    }

    function updatePaneConfig(id: string, updates: Partial<PaneConfig>) {
        const newPanes = layout.panes.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
        );
        saveLayout({ ...layout, panes: newPanes });
    }
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div
    class="fixed top-0 left-0 w-screen h-screen overflow-hidden font-sans"
    style="background-color: var(--catenary-background)"
>
    <!-- Header Bar -->
    <div
        class="absolute top-0 left-0 w-full text-white flex items-center justify-between z-20 border-b-2 border-slate-500 shadow-md"
        style="height: {isPortrait ? '5vh' : '6vh'}; padding-left: {isPortrait
            ? '3vw'
            : '1.5vw'}; padding-right: {isPortrait
            ? '3vw'
            : '1.5vw'}; background-color: var(--catenary-darksky)"
    >
        <div class="flex items-center gap-4">
            <span
                class="font-bold truncate"
                style="font-size: {isPortrait ? '2.5vh' : '3vh'}"
                >Enroute Screen</span
            >
            <button
                on:click={() => (isEditing = !isEditing)}
                class="text-xs px-2 py-1 rounded border border-white/20 transition-colors {isEditing
                    ? 'bg-yellow-500 text-black font-bold'
                    : 'bg-white/10 hover:bg-white/20'}"
            >
                {isEditing ? "Done Editing" : "Edit Layout"}
            </button>

            {#if isEditing}
                <div
                    class="flex items-center gap-2 ml-4 px-2 py-0.5 rounded border border-slate-600 shadow-lg"
                >
                    <button
                        on:click={() => dispatch("openConfig")}
                        class="text-[10px] font-bold text-white px-2 py-0.5 rounded transition-colors border border-slate-500"
                    >
                        Overall settings
                    </button>
                    <div class="w-px h-4 bg-slate-600 mx-1"></div>
                    <span class="text-[10px] font-bold text-slate-400"
                        >GRID</span
                    >
                    <div class="flex items-center gap-1">
                        <label class="text-xs" for="rows">Rows</label>
                        <select
                            id="rows"
                            class="bg-slate-700 rounded px-1 py-0.5 text-xs text-white border border-slate-600 outline-none hover:bg-slate-600"
                            value={layout.rows}
                            on:change={(e) =>
                                updateGridSize(
                                    parseInt(e.currentTarget.value),
                                    layout.cols,
                                )}
                        >
                            {#each [1, 2, 3, 4] as n}
                                <option value={n}>{n}</option>
                            {/each}
                        </select>
                    </div>
                    <span class="text-slate-600 font-bold">×</span>
                    <div class="flex items-center gap-1">
                        <label class="text-xs" for="cols">Cols</label>
                        <select
                            id="cols"
                            class="bg-slate-700 rounded px-1 py-0.5 text-xs text-white border border-slate-600 outline-none hover:bg-slate-600"
                            value={layout.cols}
                            on:change={(e) =>
                                updateGridSize(
                                    layout.rows,
                                    parseInt(e.currentTarget.value),
                                )}
                        >
                            {#each [1, 2, 3, 4] as n}
                                <option value={n}>{n}</option>
                            {/each}
                        </select>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Header Clock -->
        <span
            class="font-medium font-mono"
            style="font-size: {isPortrait ? '2.5vh' : '3vh'}"
        >
            {currentTime.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: !use24h,
            })}
        </span>
    </div>

    <!-- Main Content Area -->
    <div
        class="absolute left-0 right-0 bottom-0 overflow-hidden"
        style="top: 6vh; padding: {isEditing ? '20px' : '0'}"
    >
        <div
            class={`w-full h-full grid gap-2 p-2 transition-all duration-300`}
            style="grid-template-rows: repeat({layout.rows}, minmax(0, 1fr));
                    grid-template-columns: repeat({layout.cols}, minmax(0, 1fr));"
        >
            {#each layout.panes as pane (pane.id)}
                <Pane
                    config={pane}
                    {isEditing}
                    {theme}
                    {use24h}
                    {deviceLocation}
                    className={isEditing
                        ? "border-dashed border-2 border-yellow-500/50 bg-slate-800/80"
                        : ""}
                    on:edit={() => (editingPaneId = pane.id)}
                />
            {/each}
        </div>
    </div>

    <!-- Background Art -->
    {#if theme === "default"}
        <div
            class="fixed top-0 left-0 w-screen h-screen bg-cover bg-center opacity-30 pointer-events-none -z-10"
            style="background-image: url(/art/default.png)"
        ></div>
    {/if}

    <!-- Pane Config Modal -->
    {#if isEditing && editingPaneId}
        {@const pane = layout.panes.find((p) => p.id === editingPaneId)}
        {#if pane}
            <PaneConfigModal
                {pane}
                on:save={(e) => {
                    updatePaneConfig(editingPaneId, e.detail);
                    editingPaneId = null;
                }}
                on:close={() => (editingPaneId = null)}
            />
        {/if}
    {/if}
</div>
