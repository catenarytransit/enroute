<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { NearbyDeparturesFromCoordsV2Response } from "../types/birchtypes";

    import type { DisplayItem } from "../types/DisplayItem";

    export let config: {
        id: string;
        type: "departures" | "alerts";
        name?: string;
        allowedModes?: number[];
    };
    export let allDepartures: DisplayItem[] = [];
    export let activeAlerts: string[] = [];
    export let isEditing = false;
    export let style = "";
    export let className = "";

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
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class={`relative overflow-hidden bg-slate-800/50 rounded-lg border border-slate-600 flex flex-col ${className}`}
    {style}
>
    <!-- Header / Config Bar -->
    <div
        class={`flex items-center justify-between px-3 py-1 bg-slate-900/80 border-b border-slate-600 ${isEditing ? "border-yellow-500/50" : ""}`}
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
                    {#each displayItems as item (item.key)}
                        <div
                            class="rounded leading-none flex items-center justify-between cursor-pointer shadow hover:brightness-110 shrink-0"
                            role="button"
                            tabindex="0"
                        >
                            <div class="flex-grow overflow-hidden mr-2">
                                <div
                                    class="flex items-baseline gap-1 overflow-hidden opacity-90 text-[10px]"
                                >
                                    <span class="font-bold whitespace-nowrap"
                                        >{item.routeShortName}</span
                                    >
                                    <span class="opacity-70 truncate"
                                        >to {item.headsign}</span
                                    >
                                </div>
                            </div>
                            <div class="font-bold text-lg whitespace-nowrap">
                                {item.min}<span
                                    class="text-xs font-light ml-0.5">min</span
                                >
                            </div>
                        </div>
                    {/each}
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
