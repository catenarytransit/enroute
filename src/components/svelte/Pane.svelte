<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { NearbyDeparturesFromCoordsV2Response } from "../types/birchtypes";

    import type { DisplayItem } from "../types/DisplayItem";

    export let config: {
        id: string;
        type: "departures" | "alerts";
        name?: string;
        allowedModes?: number[];
        displayMode?: "simple" | "train_departure" | "grouped_by_route";
        useRouteColor?: boolean;
        showTripShortName?: boolean;
        showRouteShortName?: boolean;
    };
    export let allDepartures: DisplayItem[] = [];
    export let activeAlerts: string[] = [];
    export let isEditing = false;
    export let style = "";
    export let className = "";
    export let theme = "default";

    const dispatch = createEventDispatcher();

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

    function groupDepartures(items: DisplayItem[]) {
        const groups: Record<
            string,
            { route: DisplayItem; next: DisplayItem[] }
        > = {};
        items.forEach((item) => {
            const key = `${item.routeShortName}-${item.headsign}`;
            if (!groups[key]) {
                groups[key] = { route: item, next: [] };
            }
            if (groups[key].next.length < 3) {
                groups[key].next.push(item);
            }
        });
        return Object.values(groups);
    }

    $: groupedItems =
        config.displayMode === "grouped_by_route"
            ? groupDepartures(displayItems)
            : [];
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
        {#if config.type === "departures"}
            <div class="flex flex-col gap-2">
                {#if displayItems.length > 0}
                    {#if config.displayMode === "train_departure"}
                        <!-- Train Departure Mode -->
                        <div class="grid font-mono text-sm">
                            <div
                                class="grid gap-x-4 px-2 py-1 text-xs font-bold text-slate-400 border-b border-slate-700"
                                style="grid-template-columns: {config.showRouteShortName !==
                                false
                                    ? 'auto'
                                    : ''} auto {config.showTripShortName !==
                                false
                                    ? 'auto'
                                    : ''} 1fr auto"
                            >
                                {#if config.showRouteShortName !== false}
                                    <span>Rte</span>
                                {/if}
                                <span>Time</span>
                                {#if config.showTripShortName !== false}
                                    <span>Trip</span>
                                {/if}
                                <span>Direction</span>
                                <span>Plat</span>
                            </div>
                            {#each displayItems as item (item.key)}
                                <div
                                    class="grid gap-x-4 px-2 py-1 items-center {config.useRouteColor
                                        ? 'text-white font-bold'
                                        : 'border-b border-slate-700 last:border-0'}"
                                    style="{config.useRouteColor
                                        ? `background-color: ${item.color}; color: ${item.textColor};`
                                        : ''} grid-template-columns: {config.showRouteShortName !==
                                    false
                                        ? 'auto'
                                        : ''} auto {config.showTripShortName !==
                                    false
                                        ? 'auto'
                                        : ''} 1fr auto"
                                >
                                    {#if config.showRouteShortName !== false}
                                        <div class="font-bold">
                                            {item.routeShortName}
                                        </div>
                                    {/if}
                                    <div class="whitespace-nowrap">
                                        {item.formattedTime}
                                    </div>
                                    {#if config.showTripShortName !== false}
                                        <div class="font-bold">
                                            {item.tripShortName}
                                        </div>
                                    {/if}
                                    <div class="truncate">
                                        {item.headsign}
                                    </div>
                                    <div class="text-right">
                                        {item.platform || "-"}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else if config.displayMode === "grouped_by_route"}
                        <!-- Grouped by Route Mode -->
                        <div class="flex flex-col gap-2">
                            {#each groupedItems as group}
                                <div
                                    class="flex flex-col rounded overflow-hidden border border-slate-600 bg-slate-800/50"
                                >
                                    <div
                                        class="px-2 py-1 font-bold flex justify-between items-center"
                                        style="background-color: {group.route
                                            .color}; color: {group.route
                                            .textColor}"
                                    >
                                        <div class="flex items-center gap-2">
                                            <span class="text-lg"
                                                >{group.route
                                                    .routeShortName}</span
                                            >
                                            <span class="text-sm opacity-90"
                                                >to {group.route.headsign}</span
                                            >
                                        </div>
                                    </div>
                                    <div
                                        class="flex items-center p-2 gap-4 text-sm"
                                    >
                                        {#each group.next as item, i}
                                            <div class="flex flex-col">
                                                <span
                                                    class="font-bold whitespace-nowrap"
                                                >
                                                    {item.min}<span
                                                        class="text-[10px] font-normal"
                                                        >min</span
                                                    >
                                                </span>
                                                <span
                                                    class="text-[10px] opacity-50"
                                                >
                                                    {item.formattedTime}
                                                </span>
                                            </div>
                                            {#if i < group.next.length - 1}
                                                <div
                                                    class="w-px h-6 bg-slate-600"
                                                ></div>
                                            {/if}
                                        {/each}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <!-- Simple (Default) Mode -->
                        {#each displayItems as item (item.key)}
                            <div
                                class="rounded leading-none flex items-center justify-between cursor-pointer shadow hover:brightness-110 shrink-0 {config.useRouteColor
                                    ? 'px-2 py-1'
                                    : ''}"
                                style={config.useRouteColor
                                    ? `background-color: ${item.color}; color: ${item.textColor}`
                                    : ""}
                                role="button"
                                tabindex="0"
                            >
                                <div class="flex-grow overflow-hidden mr-2">
                                    <div
                                        class="flex items-baseline gap-1 overflow-hidden opacity-90 text-[10px]"
                                    >
                                        <span
                                            class="font-bold whitespace-nowrap"
                                            >{item.routeShortName}</span
                                        >
                                        <span class="opacity-70 truncate"
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
