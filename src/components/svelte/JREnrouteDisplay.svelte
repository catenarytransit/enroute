<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fly, fade } from "svelte/transition";
    import { flip } from "svelte/animate";
    import type {
        BirchStopTime,
        BirchTripInformation,
        TripInformation,
    } from "../types/TripInformation";
    import {
        fixHeadsignText,
        fixRouteColor,
        fixRouteName,
        fixRouteTextColor,
        fixRunNumber,
        fixStationArt,
        fixStationName,
    } from "../data/agencyspecific";
    import { enunciator } from "../enunciator";
    import type { EnunciatorMessage } from "../types/Enunciator";
    import { EnunciatorState } from "../types/Enunciator";

    // State variables
    let tripInfo: TripInformation | undefined;
    let error: string | null = null;
    let announcementTextChunk: string | null = null;
    let stopsEnunciated: string[] = [];
    let isPortrait = false;
    let currentTime = new Date();

    // Intervals/Timers
    let fetchInterval: any;
    let clockInterval: any;
    let chunkInterval: any;

    // Query params
    let chateau: string | null = null;
    let trip: string | null = null;
    let use24h = true;

    onMount(() => {
        isPortrait = window.innerHeight > window.innerWidth;
        const resizeHandler = () =>
            (isPortrait = window.innerHeight > window.innerWidth);
        window.addEventListener("resize", resizeHandler);

        const query = new URLSearchParams(window.location.search);
        chateau = query.get("chateau");
        trip = query.get("trip");
        const getSetting = (key: string, defaultValue: string = "") =>
            query.get(key) ||
            localStorage.getItem(`enroute_${key}`) ||
            defaultValue;
        use24h = getSetting("24h") !== "false";

        clockInterval = setInterval(() => {
            currentTime = new Date();
        }, 1000);

        fetchTripInfo();
        fetchInterval = setInterval(fetchTripInfo, 1000);

        return () => {
            window.removeEventListener("resize", resizeHandler);
            clearInterval(fetchInterval);
            clearInterval(clockInterval);
            if (chunkInterval) clearInterval(chunkInterval);
        };
    });

    async function fetchTripInfo() {
        try {
            if (!chateau || !trip) {
                // Should we show error? The original code threw error.
                // throw new Error('Trip ID and Chateâu must be provided in the URL query parameters');
                return;
            }

            let raw = await fetch(
                `https://birch.catenarymaps.org/get_trip_information/${chateau}/?trip_id=${trip}`,
            );
            if (raw.status === 404)
                throw new Error(`Trip ${trip} not found in Chateâu ${chateau}`);
            let birchData = (await raw.json()) as BirchTripInformation;

            let nextStopIndex = birchData.stoptimes.findIndex(
                (stopTime: BirchStopTime) =>
                    (stopTime.rt_arrival?.time ||
                        stopTime.scheduled_arrival_time_unix_seconds) >
                    Date.now() / 1000,
            );

            // Handle case where trip might be finished or no next stop found
            if (nextStopIndex === -1)
                nextStopIndex = birchData.stoptimes.length - 1;

            let nextStopName: string = birchData.stoptimes[nextStopIndex].name;
            let lastStopIndex = birchData.stoptimes.length - 1;
            let lastStopName: string = birchData.stoptimes[lastStopIndex].name;
            let timeToStop: number =
                (birchData.stoptimes[nextStopIndex].rt_arrival?.time ||
                    birchData.stoptimes[nextStopIndex]
                        .scheduled_arrival_time_unix_seconds) -
                Date.now() / 1000;
            let isApproachingStop: boolean = timeToStop < 40;

            let stopsToDisplay: {
                name: string;
                minutes: string;
                arrivalTime: string;
                stopId?: string;
                isSpacer?: boolean;
                count?: number;
            }[] = [];

            const addStop = (index: number) => {
                if (index < 0 || index >= birchData.stoptimes.length) return;
                const s = birchData.stoptimes[index];
                const arrivalUnix =
                    s.rt_arrival?.time || s.scheduled_arrival_time_unix_seconds;
                const date = new Date(arrivalUnix * 1000);
                const timeString = date
                    .toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: !use24h,
                    })
                    .toLowerCase()
                    .replace(" ", "");

                stopsToDisplay.push({
                    name: fixStationName(s.name),
                    minutes:
                        isApproachingStop && index === nextStopIndex
                            ? "DUE"
                            : Math.floor(
                                  Math.max(
                                      0,
                                      Math.round(
                                          arrivalUnix - Date.now() / 1000,
                                      ) / 60,
                                  ),
                              ).toString(),
                    arrivalTime: timeString,
                    stopId: s.stop_id,
                    key: s.stop_id,
                });
            };

            const MAX_STOPS_TOTAL = 5;
            let remainingStops = lastStopIndex - nextStopIndex + 1;

            if (remainingStops <= MAX_STOPS_TOTAL) {
                for (let i = nextStopIndex; i <= lastStopIndex; i++) {
                    addStop(i);
                }
            } else {
                for (let i = 0; i < MAX_STOPS_TOTAL; i++) {
                    addStop(nextStopIndex + i);
                }
            }

            let newTripInfo: TripInformation = {
                chateau,
                run: fixRunNumber(
                    chateau,
                    birchData.route_id,
                    birchData.trip_short_name,
                    birchData.vehicle?.id || null,
                    trip,
                ),
                headsign: fixHeadsignText(
                    birchData.trip_headsign || lastStopName,
                    birchData.route_short_name ||
                        birchData.route_long_name ||
                        birchData.route_id,
                ),
                nextStops: stopsToDisplay,
                nextStop: fixStationName(nextStopName),
                nextStopID: birchData.stoptimes[nextStopIndex].stop_id,
                nextStopNumber: nextStopIndex,
                finalStop: fixStationName(lastStopName),
                finalStopID: birchData.stoptimes[lastStopIndex].stop_id,
                isApp: isApproachingStop,
                isTerm: nextStopName === lastStopName,
                route: fixRouteName(
                    chateau,
                    birchData.route_short_name ||
                        birchData.route_long_name ||
                        birchData.route_id,
                    birchData.route_id,
                ),
                routeID: birchData.route_id,
                color: fixRouteColor(
                    chateau,
                    birchData.route_id,
                    birchData.color,
                ),
                textColor: fixRouteTextColor(
                    chateau,
                    birchData.route_id,
                    birchData.text_color,
                ),
                artwork: fixStationArt(chateau, birchData.route_id),
            };

            tripInfo = newTripInfo;

            // Enunciator logic
            if (
                enunciator &&
                !stopsEnunciated.includes(
                    `${newTripInfo.nextStopID}:${newTripInfo.isApp ? EnunciatorState.APPROACHING : EnunciatorState.NEXT}`,
                )
            ) {
                stopsEnunciated.push(
                    `${newTripInfo.nextStopID}:${newTripInfo.isApp ? EnunciatorState.APPROACHING : EnunciatorState.NEXT}`,
                );
                let voicedAnnouncement: EnunciatorMessage | null =
                    await enunciator.sync(
                        chateau,
                        isApproachingStop
                            ? nextStopName === lastStopName
                                ? EnunciatorState.TERMINUS
                                : EnunciatorState.APPROACHING
                            : EnunciatorState.NEXT,
                        null,
                        newTripInfo,
                    );
                if (voicedAnnouncement) {
                    announcementTextChunk = "[MSG]";
                    enunciator.play(voicedAnnouncement);
                    setTimeout(() => {
                        if (voicedAnnouncement) {
                            let chunks =
                                voicedAnnouncement.text.match(/.{1,53}/g);
                            if (chunks) {
                                let nextChunk = chunks.shift();
                                if (nextChunk)
                                    announcementTextChunk = nextChunk;
                                chunkInterval = setInterval(() => {
                                    if (chunks && chunks.length > 0) {
                                        let nextChunk = chunks.shift();
                                        if (nextChunk)
                                            announcementTextChunk = nextChunk;
                                    } else {
                                        clearInterval(chunkInterval);
                                        announcementTextChunk = null;
                                    }
                                }, 3500);
                            }
                        }
                    }, 1600);
                }
            }
            error = null;
        } catch (e: any) {
            error = e.message;
            console.error(e);
        }
    }

    let currentView = "current"; // 'current' or 'next'

    // Transfer data is currently hardcoded in the original file, so I will retain it as static or implied for now.
    // The original code had specific `currentStationData` and `nextStationData` objects, but they seemed to duplicate names.
    // In a real scenario, this should come from the API or a mapping.
    // For now, I will use the placeholders from the original code if `tripInfo` is available.

    // Actually, looking at the render, the transfers are rendered from `data.transfers`.
    // In the React code:
    // const data = currentView === 'current' ? currentStationData : nextStationData;
    // But `tripInfo` is dynamic.
    // The React code seems to have mixed dynamic `tripInfo` with static `currentStationData` for testing/demo?
    // "Transfer at {data.currentStation} Station"
    // "tripInfo.nextStops" is used for the list.

    // The user's request is to "Merge these changes... to the new svelte code".
    // I should prioritize the dynamic `tripInfo` where possible, but if the React code explicitly used static data for transfers, I should include that structure or a TODO.
    // However, the `tripInfo` stops are used in the *Main Render*.
    // The transfers section *only* uses `data.transfers`.
    // Since `data.transfers` was hardcoded in the example, I will keep it hardcoded for now, or maybe empty if not provided.
    // Wait, the user said "Merge these changes from here...". The "changes" might be the *entirety* of the file content provided.
    // So the React file *is* the source of truth.
    // Even if it looks like mock data, I should port it.

    const currentStationData = {
        transfers: [
            {
                name: "Chūō Line Local (for Sendagaya & Yotsuya)",
                color: "bg-yellow-400",
                letter: "JC",
            },
            { name: "Toei Ōedo Line", color: "bg-pink-600", letter: "E" },
        ],
    };

    const nextStationData = {
        transfers: [
            {
                name: "Shōnan-Shinjuku Line",
                color: "bg-gradient-to-r from-orange-500 to-red-600",
                letter: "JS",
            },
            { name: "Rinkai Line", color: "bg-blue-600", letter: "R" },
        ],
    };

    $: data = currentView === "current" ? currentStationData : nextStationData;
    $: status =
        tripInfo && tripInfo.nextStops[0]?.minutes === "DUE"
            ? "Now stopping at"
            : "Next";
</script>

{#if !tripInfo}
    <div></div>
{:else}
    <div class="min-h-screen bg-gray-100 p-8">
        <div class="max-w-5xl mx-auto">
            <!-- Control buttons -->
            <div class="mb-4 flex gap-2">
                <button
                    on:click={() => (currentView = "current")}
                    class="px-4 py-2 rounded {currentView === 'current'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300'}"
                >
                    Current Station
                </button>
                <button
                    on:click={() => (currentView = "next")}
                    class="px-4 py-2 rounded {currentView === 'next'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300'}"
                >
                    Next Station
                </button>
            </div>

            <!-- Main display -->
            <div class="bg-white border-4 border-black">
                <!-- Header -->
                <div class="bg-gray-800 text-white flex items-stretch">
                    <div class="p-4 pr-0 flex items-center">
                        <div class="text-left">
                            <div class="text-sm">Bound for</div>
                            <div
                                class="text-2xl font-bold leading-tight whitespace-pre-line"
                            >
                                {tripInfo.finalStop}
                            </div>
                        </div>
                    </div>
                    <div class="w-12 bg-green-500"></div>
                    <div class="flex-1 flex items-center justify-between px-8">
                        <div class="text-left">
                            <div class="text-2xl mb-2">{status}</div>
                            <div class="text-7xl font-bold overflow-hidden">
                                {tripInfo.nextStop}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-5xl font-bold mb-1">
                                {currentTime.toLocaleTimeString([], {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: !use24h,
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Station list -->
                <div class="bg-gray-50 p-8 flex">
                    <!-- Station names -->
                    <div class="flex-1 flex flex-col items-end pr-8">
                        {#each tripInfo.nextStops as arrival, index (index)}
                            <div
                                class="flex items-center justify-end text-black {index ===
                                0
                                    ? 'h-20 text-6xl font-bold'
                                    : 'h-24 text-4xl'}"
                            >
                                {fixStationName(arrival.name)}
                            </div>
                        {/each}
                    </div>

                    <!-- Green line with indicators -->
                    <div class="relative flex flex-col items-center">
                        <div
                            class="absolute inset-y-0 left-1/2 w-3 bg-green-500 transform -translate-x-1/2"
                        ></div>

                        <!-- Red chevron pointing down for next station view -->
                        {#if currentView === "next"}
                            <div
                                class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8 z-20"
                            >
                                <svg width="80" height="50" viewBox="0 0 80 50">
                                    <polygon
                                        points="0,0 80,0 40,50"
                                        fill="#dc2626"
                                    />
                                </svg>
                            </div>
                        {/if}

                        {#each tripInfo.nextStops as arrival, index (index)}
                            <div
                                class="relative z-10 flex items-center justify-center {index ===
                                0
                                    ? 'h-20'
                                    : 'h-24'}"
                            >
                                {#if index === 0 && arrival.minutes === "DUE"}
                                    <!-- Pentagon shape for current station -->
                                    <svg
                                        width="80"
                                        height="80"
                                        viewBox="0 0 80 80"
                                        class="relative"
                                    >
                                        <polygon
                                            points="10,10 70,10 70,60 40,80 10,60"
                                            fill="#dc2626"
                                            stroke="white"
                                            stroke-width="4"
                                        />
                                        <circle
                                            cx="40"
                                            cy="40"
                                            r="8"
                                            fill="white"
                                        />
                                    </svg>
                                {:else if index === 0 && arrival.minutes !== "DUE"}
                                    <div
                                        class="w-16 h-16 bg-yellow-400 border-4 border-white rounded-full flex items-center justify-center"
                                    >
                                        <span
                                            class="text-2xl font-bold text-black"
                                            >{arrival.minutes}</span
                                        >
                                    </div>
                                {:else}
                                    <div
                                        class="w-16 h-16 bg-white border-4 border-gray-800 rounded-full flex items-center justify-center"
                                    >
                                        <span
                                            class="text-2xl font-bold text-black"
                                            >{arrival.minutes}</span
                                        >
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>

                    <!-- Minutes indicator -->
                    <div class="flex flex-col items-start pl-2">
                        {#each tripInfo.nextStops as arrival, index (index)}
                            <div
                                class="flex items-center {index === 0
                                    ? 'h-20'
                                    : 'h-24'}"
                            >
                                {#if arrival.minutes && index !== 0}
                                    <span class="text-xl text-black">(min)</span
                                    >
                                {/if}
                            </div>
                        {/each}
                    </div>

                    <!-- Right section - transfers -->
                    <div class="flex-1 pl-8 flex flex-col justify-center">
                        <div class="text-2xl font-bold mb-4 text-black">
                            Transfer at<br />{tripInfo.nextStop} Station
                        </div>
                        <div class="space-y-2">
                            {#each data.transfers as transfer}
                                <div class="flex items-center gap-2">
                                    {#if transfer.letter}
                                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                                        <div
                                            class="w-8 h-8 {transfer.color} text-white rounded-full flex items-center justify-center font-bold"
                                        >
                                            {transfer.letter}
                                        </div>
                                    {/if}
                                    <div
                                        class="h-8 {transfer.color} px-3 flex items-center"
                                    >
                                        <span
                                            class="font-bold {transfer.letter
                                                ? 'text-black'
                                                : 'text-white'}"
                                        >
                                            {transfer.name}
                                        </span>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            {#if error}
                <div
                    class="fixed bottom-0 left-0 w-full bg-red-600 text-white p-2 text-center font-bold"
                >
                    {error}
                </div>
            {/if}

            {#if announcementTextChunk}
                <div
                    class="fixed bottom-0 left-0 w-full px-10 py-6 text-center z-[100] bg-black/85 text-white"
                >
                    <span class="font-bold tracking-tight text-4xl">
                        {#if announcementTextChunk === "[MSG]"}
                            <span class="pulse opacity-70 italic"
                                >&rarr; Announcement approaching</span
                            >
                        {:else}
                            {announcementTextChunk.replace("[MSG]", "")}
                        {/if}
                    </span>
                </div>
            {/if}
        </div>
    </div>
{/if}
