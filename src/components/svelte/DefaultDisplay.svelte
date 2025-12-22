<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import type { NearbyDeparturesFromCoordsV2Response } from "../types/birchtypes";
    import type { PaneConfig } from "../types/PaneConfig";

    import Pane from "./Pane.svelte";
    import PaneConfigModal from "./PaneConfigModal.svelte";

    type PaneConfigType = {
        id: string;
        type: "departures" | "alerts";
        name?: string;
        allowedModes?: number[];
    };

    let nearbyData: NearbyDeparturesFromCoordsV2Response | null = null;
    let location: { lat: number; lon: number } | null = null;
    let error: string | null = null;
    let loading = true;
    let minuteTick = 0;

    let innerWidth = 0;
    let innerHeight = 0;
    $: isPortrait = innerHeight > innerWidth;

    // Layout State
    let layout: { rows: number; cols: number; panes: PaneConfigType[] } = {
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

        // Location
        const urlLat = getSetting("lat");
        const urlLon = getSetting("lon");

        if (urlLat && urlLon) {
            location = { lat: parseFloat(urlLat), lon: parseFloat(urlLon) };
            loading = false;
        } else if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    location = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    };
                },
                (err) => {
                    error = "Unable to retrieve location";
                    loading = false;
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
            );
        } else {
            error = "Geolocation is not supported";
            loading = false;
        }

        return () => {
            clearInterval(timer);
            clearInterval(tickTimer);
        };
    });

    // Data Fetching
    let dataInterval: NodeJS.Timeout;

    $: {
        if (location) {
            fetchData();
            if (dataInterval) clearInterval(dataInterval);
            dataInterval = setInterval(fetchData, 30000);
        }
    }

    function fetchData() {
        if (!location) return;
        loading = true;
        const url = `https://birch.catenarymaps.org/nearbydeparturesfromcoordsv2?lat=${location.lat}&lon=${location.lon}&radius=1500`;

        fetch(url)
            .then((res) => {
                if (!res.ok)
                    throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                nearbyData = data;
                loading = false;
                error = null;
            })
            .catch((err: any) => {
                console.error(err);
                error = `Failed to fetch nearby transit data: ${err.message}`;
                loading = false;
            });
    }

    onDestroy(() => {
        if (dataInterval) clearInterval(dataInterval);
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

    function updatePaneConfig(id: string, updates: Partial<PaneConfigType>) {
        const newPanes = layout.panes.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
        );
        saveLayout({ ...layout, panes: newPanes });
    }

    // Active alerts
    $: activeAlerts = (() => {
        const alerts: string[] = [];
        if (nearbyData?.alerts) {
            Object.values(nearbyData.alerts).forEach((agencyAlerts) => {
                Object.values(agencyAlerts).forEach((alert) => {
                    const text =
                        alert.header_text?.translation?.[0]?.text ||
                        alert.description_text?.translation?.[0]?.text;
                    if (text) alerts.push(text);
                });
            });
        }
        return alerts;
    })();

    $: vUnit = isPortrait ? "vw" : "vh";
    $: hUnit = isPortrait ? "vh" : "vw";
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div
    class="fixed top-0 left-0 w-screen h-screen bg-slate-900 overflow-hidden font-sans"
>
    <!-- Header Bar -->
    <div
        class="absolute top-0 left-0 w-full bg-[#1a4475] text-white flex items-center justify-between z-20 border-b-2 border-slate-500 shadow-md"
        style="height: {isPortrait ? '5vh' : '6vh'}; padding-left: {isPortrait
            ? '3vw'
            : '1.5vw'}; padding-right: {isPortrait ? '3vw' : '1.5vw'}"
    >
        <div class="flex items-center gap-4">
            <span
                class="font-bold truncate"
                style="font-size: {isPortrait ? '2.5vh' : '3vh'}"
                >Nearby Departures</span
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
                    class="flex items-center gap-2 ml-4 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-600 shadow-lg"
                >
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
        {#if error}
            <div
                class="flex flex-col items-center justify-center h-full p-10 text-center text-white"
            >
                <p class="font-semibold text-red-400 text-[3vw] mb-4">
                    Error: {error}
                </p>
                <button
                    on:click={() => window.location.reload()}
                    class="bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-600 transition-colors"
                    >Retry</button
                >
            </div>
        {:else if !nearbyData && loading}
            <div
                class="flex flex-col items-center justify-center h-full text-white"
            >
                <p class="font-semibold text-seashore text-[2vw] animate-pulse">
                    Finding nearby stops...
                </p>
                <p class="opacity-30 mt-4 text-sm italic">
                    Searching based on {getSetting("lat")
                        ? "Manual Override"
                        : "Current Location"}
                </p>
            </div>
        {:else}
            <div
                class={`w-full h-full grid gap-2 p-2 transition-all duration-300`}
                style="grid-template-rows: repeat({layout.rows}, minmax(0, 1fr));
                        grid-template-columns: repeat({layout.cols}, minmax(0, 1fr));"
            >
                {#each layout.panes as pane (pane.id)}
                    <Pane
                        config={pane}
                        data={nearbyData}
                        {isEditing}
                        className={isEditing
                            ? "border-dashed border-2 border-yellow-500/50 bg-slate-800/80"
                            : ""}
                        {use24h}
                        on:edit={() => (editingPaneId = pane.id)}
                        {minuteTick}
                    />
                {/each}
            </div>
        {/if}
    </div>

    <!-- Background Art -->
    <div
        class="fixed top-0 left-0 w-screen h-screen bg-cover bg-center opacity-30 pointer-events-none -z-10"
        style="background-image: url(/art/default.png)"
    ></div>

    <!-- Global Alerts Ticker -->
    {#if activeAlerts.length > 0 && !layout.panes.some((p) => p.type === "alerts")}
        <div
            class="absolute bottom-0 left-0 w-full bg-yellow-600 text-black font-bold whitespace-nowrap overflow-hidden z-20 border-t-4 border-yellow-800"
            style="padding: 0.5{vUnit}; font-size: 1.8{vUnit}"
        >
            <div class="animate-marquee inline-block px-[100{hUnit}]">
                {activeAlerts.join(" • ")}
            </div>
        </div>
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
