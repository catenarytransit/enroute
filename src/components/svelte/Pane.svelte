<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { NearbyDeparturesFromCoordsV2Response } from "../types/birchtypes";
    import {
        fixHeadsignText,
        fixRouteColor,
        fixRouteName,
        fixRouteTextColor,
        fixStationName,
    } from "../data/agencyspecific";

    export let config: {
        id: string;
        type: "departures" | "alerts";
        name?: string;
        allowedModes?: number[];
    };
    export let data: NearbyDeparturesFromCoordsV2Response | null;
    export let isEditing = false;
    export let use24h = true;
    export let style = "";
    export let className = "";
    export let minuteTick = 0; // Trigger reactivity

    const dispatch = createEventDispatcher();

    function getDisplayItems(
        data: NearbyDeparturesFromCoordsV2Response | null,
        config: any,
        use24h: boolean,
        tick: number,
    ) {
        if (!data || config.type !== "departures") return [];

        const items: any[] = [];
        const allowedModes = config.allowedModes || [];

        data.departures.forEach((dep) => {
            if (
                dep.route_type !== undefined &&
                allowedModes.length > 0 &&
                !allowedModes.includes(dep.route_type)
            ) {
                return;
            }
            const routeName = fixRouteName(
                dep.chateau_id,
                dep.short_name || dep.long_name || dep.route_id,
                dep.route_id,
            );

            Object.keys(dep.directions)
                .map((key) => dep.directions[key])
                .forEach((directionGroup) => {
                    Object.keys(directionGroup)
                        .map((key) => directionGroup[key])
                        .forEach((dir) => {
                            dir.trips.forEach((trip) => {
                                const stopInfo =
                                    data.stop[dep.chateau_id]?.[trip.stop_id];
                                const stopName = stopInfo
                                    ? fixStationName(stopInfo.name)
                                    : "Unknown Stop";

                                const arrivalTime =
                                    trip.departure_realtime ||
                                    trip.departure_schedule;
                                if (!arrivalTime) return;

                                const now = Date.now() / 1000;
                                const min = Math.floor(
                                    (arrivalTime - now) / 60,
                                );
                                if (min < -2) return;

                                items.push({
                                    key: `${dep.chateau_id}-${trip.trip_id}-${trip.stop_id}`,
                                    routeShortName: routeName,
                                    headsign: fixHeadsignText(dir.headsign),
                                    formattedTime: new Date(
                                        arrivalTime * 1000,
                                    ).toLocaleTimeString([], {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: !use24h,
                                    }),
                                    min: min,
                                    color: fixRouteColor(
                                        dep.chateau_id,
                                        dep.route_id,
                                        dep.color,
                                    ),
                                    textColor: fixRouteTextColor(
                                        dep.chateau_id,
                                        dep.route_id,
                                        dep.text_color,
                                    ),
                                    stopName: stopName,
                                    chateau: dep.chateau_id,
                                    tripId: trip.trip_id,
                                    stopId: trip.stop_id,
                                });
                            });
                        });
                });
        });

        // Deduplicate
        const uniqueItems = new Map();
        items.forEach((item) => {
            if (uniqueItems.has(item.key)) {
                const existing = uniqueItems.get(item.key);
                if (item.min < existing.min) {
                    uniqueItems.set(item.key, item);
                }
            } else {
                uniqueItems.set(item.key, item);
            }
        });

        const sortedItems = Array.from(uniqueItems.values());
        sortedItems.sort((a, b) => a.min - b.min);
        return sortedItems.slice(0, 50);
    }

    function getActiveAlerts(
        data: NearbyDeparturesFromCoordsV2Response | null,
        config: any,
    ) {
        if (!data || config.type !== "alerts") return [];
        const alerts: string[] = [];
        if (data.alerts) {
            Object.values(data.alerts).forEach((agencyAlerts) => {
                Object.values(agencyAlerts).forEach((alert) => {
                    const text =
                        alert.header_text?.translation?.[0]?.text ||
                        alert.description_text?.translation?.[0]?.text;
                    if (text) alerts.push(text);
                });
            });
        }
        return alerts;
    }

    $: displayItems = getDisplayItems(data, config, use24h, minuteTick);
    $: activeAlerts = getActiveAlerts(data, config);

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
                            style:background-color={item.color}
                            style:color={item.textColor}
                            style:min-height="40px"
                            style:padding="0 8px"
                            on:click={() => {
                                window.location.href = `/?mode=enroute&chateau=${item.chateau}&trip=${item.tripId}`;
                            }}
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
