<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import { flattenDepartures, getActiveAlerts } from "../data/transitUtils";
    import type { NearbyDeparturesFromCoordsV2Response } from "../types/birchtypes";
    import type { DisplayItem } from "../types/DisplayItem";
    import type { PaneConfig } from "../types/PaneConfig"; // Ensure this matches usage

    export let config: PaneConfig;
    export let isEditing = false;
    export let style = "";
    export let className = "";
    export let theme = "default";
    export let use24h = true;
    export let deviceLocation: { lat: number; lon: number } | null = null;

    const dispatch = createEventDispatcher();

    // Local Data State
    let nearbyData: NearbyDeparturesFromCoordsV2Response | null = null;
    let loading = true;
    let error: string | null = null;
    let minuteTick = 0;

    // Derived State
    $: effectiveLocation = config.location || deviceLocation;
    $: radius = config.radius || 1500;

    // Fetching Logic
    let dataInterval: NodeJS.Timeout;

    // Initial fetch and interval
    $: {
        if (effectiveLocation) {
            fetchData();
            if (dataInterval) clearInterval(dataInterval);
            dataInterval = setInterval(fetchData, 30000);
        } else {
            loading = false;
            error = "No location configured";
        }
    }

    function fetchData() {
        if (!effectiveLocation) return;
        loading = true;

        // Use effectiveLocation
        const url = `https://birch.catenarymaps.org/nearbydeparturesfromcoordsv2?lat=${effectiveLocation.lat}&lon=${effectiveLocation.lon}&radius=${radius}`;

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
                error = err.message; // localized error
                loading = false;
            });
    }

    // Minute tick for updating relative times
    onMount(() => {
        const tickTimer = setInterval(() => minuteTick++, 30000);
        return () => clearInterval(tickTimer);
    });

    onDestroy(() => {
        if (dataInterval) clearInterval(dataInterval);
    });

    // Compute display items
    $: allDepartures = flattenDepartures(nearbyData, use24h, minuteTick);
    $: activeAlerts = getActiveAlerts(nearbyData);

    function getDisplayItemsFiltered(items: DisplayItem[], config: any) {
        if (config.type !== "departures") return [];

        const allowedModes = config.allowedModes || [];

        let filtered = items;
        if (allowedModes.length > 0) {
            filtered = items.filter(
                (item) =>
                    item.routeType !== undefined &&
                    allowedModes.includes(item.routeType),
            );
        }

        return filtered.slice(0, 50);
    }

    $: displayItems = getDisplayItemsFiltered(allDepartures, config);

    function handleEdit(e: Event) {
        e.stopPropagation();
        dispatch("edit");
    }

    interface DirectionGroup {
        headsign: string;
        items: DisplayItem[];
    }

    interface RouteGroup {
        routeShortName: string;
        routeColor: string;
        routeTextColor: string;
        directions: DirectionGroup[];
    }

    function groupDepartures(items: DisplayItem[]) {
        const routes: Record<string, RouteGroup> = {};

        items.forEach((item) => {
            const routeKey = item.routeShortName;

            if (!routes[routeKey]) {
                routes[routeKey] = {
                    routeShortName: item.routeShortName,
                    routeColor: item.color,
                    routeTextColor: item.textColor,
                    directions: [],
                };
            }

            let dirGroup = routes[routeKey].directions.find(
                (d) => d.headsign === item.headsign,
            );
            if (!dirGroup) {
                dirGroup = { headsign: item.headsign, items: [] };
                routes[routeKey].directions.push(dirGroup);
            }

            if (dirGroup.items.length < 3) {
                dirGroup.items.push(item);
            }
        });

        // Optional: Sort routes if needed, or rely on input order
        return Object.values(routes);
    }

    $: groupedItems =
        config.displayMode === "grouped_by_route"
            ? groupDepartures(displayItems)
            : [];

    $: gapStyle =
        config.simpleListGap !== undefined
            ? `gap: ${parseFloat(config.simpleListGap) * 0.25}rem`
            : "gap: 0.5rem";

    $: paddingStyle =
        config.simplePaddingX !== undefined &&
        config.simplePaddingY !== undefined
            ? `padding: ${parseFloat(config.simplePaddingY) * 0.25}rem ${parseFloat(config.simplePaddingX) * 0.25}rem`
            : config.useRouteColor
              ? "padding: 0.25rem 0.5rem"
              : "padding: 0";
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class={`relative overflow-hidden rounded-lg border border-slate-600 flex flex-col ${className} ${theme === "default" ? "bg-slate-800/50" : ""}`}
    {style}
>
    <!-- Header / Config Bar -->
    <div
        class={`flex items-center justify-between px-3 py-1 border-b border-slate-600 ${isEditing ? "border-yellow-500/50" : ""} ${theme === "default" ? "bg-slate-900/80" : ""}`}
    >
        <span class="font-bold text-sm text-slate-300 truncate">
            {config.name ||
                (config.type === "departures" ? "Departures" : "Alerts")}
        </span>
        {#if isEditing}
            <button
                on:click={handleEdit}
                class="text-[10px] uppercase font-bold bg-yellow-600 text-black px-2 py-0.5 rounded ml-2 hover:bg-yellow-500"
            >
                Edit
            </button>
        {/if}
    </div>

    <!-- Content -->
    <div class="flex-grow overflow-auto p-2 scrollbar-hide">
        {#if loading && !nearbyData}
            <div class="flex items-center justify-center h-full">
                <span class="text-white/50 text-xs animate-pulse"
                    >Loading data...</span
                >
            </div>
        {:else if error}
            <div
                class="flex items-center justify-center h-full p-4 text-center"
            >
                <span class="text-red-400 text-xs">{error}</span>
            </div>
        {:else if config.type === "departures"}
            <div class="flex flex-col" style={gapStyle}>
                {#if displayItems.length > 0}
                    {#if config.displayMode === "train_departure"}
                        <!-- Train Departure Mode -->
                        <!-- Train Departure Mode -->
                        <div class="overflow-x-auto">
                            <table
                                class="w-full text-left font-mono text-sm border-spacing-0"
                            >
                                <thead>
                                    <tr
                                        class="text-xs font-bold text-slate-400 border-b border-slate-700"
                                    >
                                        {#if config.showRouteShortName !== false}
                                            <th class="px-2 py-1">Rte</th>
                                        {/if}
                                        <th class="px-2 py-1">Time</th>
                                        {#if config.showTripShortName !== false}
                                            <th class="px-2 py-1">Trip</th>
                                        {/if}
                                        <th class="px-2 py-1 w-full"
                                            >Direction</th
                                        >
                                        <th class="px-2 py-1 text-right"
                                            >Plat</th
                                        >
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each displayItems as item (item.key)}
                                        <tr
                                            class="items-center {config.useRouteColor
                                                ? 'text-white font-bold'
                                                : 'border-b border-slate-700 last:border-0'}"
                                            style={config.useRouteColor
                                                ? `background-color: ${item.color}; color: ${item.textColor}`
                                                : ""}
                                        >
                                            {#if config.showRouteShortName !== false}
                                                <td class="px-2 py-1 font-bold">
                                                    {item.routeShortName}
                                                </td>
                                            {/if}
                                            <td
                                                class="px-2 py-1 whitespace-nowrap"
                                            >
                                                {item.formattedTime}
                                            </td>
                                            {#if config.showTripShortName !== false}
                                                <td class="px-2 py-1 font-bold">
                                                    {item.tripShortName}
                                                </td>
                                            {/if}
                                            <td
                                                class="px-2 py-1 truncate max-w-[100px]"
                                            >
                                                {item.headsign}
                                            </td>
                                            <td class="px-2 py-1 text-right">
                                                {item.platform || "-"}
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    {:else if config.displayMode === "grouped_by_route"}
                        <!-- Grouped by Route Mode (Unified Layout) -->
                        <div class="flex flex-col gap-2">
                            {#each groupedItems as group}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="flex rounded overflow-hidden border border-slate-600 bg-slate-800/50"
                                >
                                    <!-- Route Badge (Left Sidebar) -->
                                    <div
                                        class="w-12 flex items-center justify-center font-bold text-2xl shrink-0 p-2 border-r border-slate-700"
                                        style={config.groupingTheme === "ratp"
                                            ? `background-color: ${group.routeColor}; color: ${group.routeTextColor}`
                                            : "background-color: rgba(30, 41, 59, 0.5);"}
                                    >
                                        {#if config.groupingTheme === "ratp"}
                                            <!-- RATP Style: Circular Badge -->
                                            <div
                                                class="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center"
                                            >
                                                {group.routeShortName.replace(
                                                    " Line",
                                                    "",
                                                )}
                                            </div>
                                        {:else}
                                            <!-- Standard Style: Simple Text -->
                                            <span
                                                class="text-white"
                                                style="color: {group.routeColor}"
                                                >{group.routeShortName.replace(
                                                    " Line",
                                                    "",
                                                )}</span
                                            >
                                        {/if}
                                    </div>

                                    <!-- Directions (Right Content) -->
                                    <div
                                        class="flex flex-col flex-grow text-xs"
                                    >
                                        {#each group.directions as direction, idx}
                                            <div
                                                class="flex items-center justify-between p-2 gap-2 {idx <
                                                group.directions.length - 1
                                                    ? 'border-b border-slate-700'
                                                    : ''} {idx % 2 === 0
                                                    ? 'bg-white/5'
                                                    : ''}"
                                            >
                                                <!-- Direction Name -->
                                                <div
                                                    class="font-bold truncate text-sm flex-grow"
                                                >
                                                    {direction.headsign}
                                                </div>

                                                <!-- Times -->
                                                <div
                                                    class="flex items-center gap-2 shrink-0"
                                                >
                                                    {#each direction.items as item}
                                                        <div
                                                            class={config.groupingTheme ===
                                                            "ratp"
                                                                ? "bg-black/40 rounded px-1.5 py-0.5 min-w-[3rem] text-center"
                                                                : ""}
                                                        >
                                                            <span
                                                                class="font-bold text-lg leading-none"
                                                                class:text-yellow-500={config.groupingTheme ===
                                                                    "ratp"}
                                                                class:text-white={config.groupingTheme !==
                                                                    "ratp"}
                                                            >
                                                                {item.min}
                                                            </span>
                                                            <span
                                                                class="text-[9px] opacity-70 ml-0.2 leading-none"
                                                                >min</span
                                                            >
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <!-- Simple (Default) Mode -->
                        {#each displayItems as item (item.key)}
                            <div
                                class="rounded leading-none flex items-center justify-between cursor-pointer shadow hover:brightness-110 shrink-0"
                                style={(config.useRouteColor
                                    ? `background-color: ${item.color}; color: ${item.textColor}; `
                                    : "") + paddingStyle}
                                role="button"
                                tabindex="0"
                            >
                                <div class="flex-grow overflow-hidden mr-2">
                                    <div
                                        class="flex items-baseline gap-1 overflow-hidden"
                                    >
                                        <span
                                            class="font-bold whitespace-nowrap"
                                            >{item.routeShortName}</span
                                        >
                                        <span class="font-medium truncate"
                                            >to {item.headsign}</span
                                        >
                                    </div>
                                </div>
                                <div
                                    class="font-bold text-lg whitespace-nowrap"
                                >
                                    {item.min}<span
                                        class="text-xs font-light ml-0.5"
                                        >min</span
                                    >
                                </div>
                            </div>
                        {/each}
                    {/if}
                {:else}
                    <div class="text-white/50 text-center text-sm py-4">
                        No departures found.
                    </div>
                {/if}
            </div>
        {:else}
            <!-- Alerts View -->
            <div class="flex flex-col gap-2">
                {#if activeAlerts.length > 0}
                    {#each activeAlerts as alert, idx}
                        <div
                            class="bg-yellow-900/40 border border-yellow-700/50 p-2 rounded text-sm text-yellow-100"
                        >
                            {alert}
                        </div>
                    {/each}
                {:else}
                    <div class="text-white/50 text-center text-sm py-4">
                        No active alerts.
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <!-- Overlay -->
    {#if isEditing}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            on:click={handleEdit}
            class="absolute inset-0 bg-black/10 hover:bg-black/20 cursor-pointer transition-colors z-10 flex items-center justify-center opacity-0 hover:opacity-100"
            role="button"
            tabindex="0"
        >
            <span
                class="bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold pointer-events-none"
                >Configure Pane</span
            >
        </div>
    {/if}
</div>
