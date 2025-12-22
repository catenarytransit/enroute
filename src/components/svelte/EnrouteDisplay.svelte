<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fade, fly, scale } from "svelte/transition";
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

    // State
    let tripInfo: TripInformation | undefined = undefined;
    let error: string | null = null;
    let announcementTextChunk: string | null = null;

    let stopsEnunciated: string[] = [];

    // Config
    const params = new URLSearchParams(window.location.search);
    const getSetting = (key: string, defaultValue: string = "") =>
        params.get(key) ||
        localStorage.getItem(`enroute_${key}`) ||
        defaultValue;

    const use24h = getSetting("24h") !== "false";
    let chateau = params.get("chateau");
    let trip = params.get("trip");

    // Responsiveness
    let innerWidth = 0;
    let innerHeight = 0;
    $: isPortrait = innerHeight > innerWidth;

    // Clock
    let currentTime = new Date();
    onMount(() => {
        const timer = setInterval(() => (currentTime = new Date()), 1000);
        return () => clearInterval(timer);
    });

    // Fetch logic
    async function fetchTripInfo() {
        try {
            if (!chateau || !trip)
                throw new Error(
                    "Trip ID and Chateâu must be provided in the URL query parameters",
                );
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
            let nextStopName: string = birchData.stoptimes[nextStopIndex].name;

            let lastStopIndex = birchData.stoptimes.length - 1;
            let lastStopName: string = birchData.stoptimes[lastStopIndex].name;

            let timeToStop: number =
                (birchData.stoptimes[nextStopIndex].rt_arrival?.time ||
                    birchData.stoptimes[nextStopIndex]
                        .scheduled_arrival_time_unix_seconds) -
                Date.now() / 1000;
            let isApproachingStop: boolean = timeToStop < 40;

            // Construct proper list of stops to display
            let stopsToDisplay: {
                name: string;
                minutes: string;
                arrivalTime: string;
                stopId?: string;
                isSpacer?: boolean;
                count?: number;
                key: string;
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
                    key: `${s.stop_id}-${index}`, // Ensure unique key
                });
            };

            const MAX_STOPS_TOTAL = isPortrait ? 10 : 8;

            let remainingStops = lastStopIndex - nextStopIndex + 1;

            if (remainingStops <= MAX_STOPS_TOTAL) {
                for (let i = nextStopIndex; i <= lastStopIndex; i++) {
                    addStop(i);
                }
            } else {
                const stopsToShowBeforeSpacer = MAX_STOPS_TOTAL - 2;
                for (let i = 0; i < stopsToShowBeforeSpacer; i++) {
                    addStop(nextStopIndex + i);
                }

                let highestAddedIndex =
                    nextStopIndex + stopsToShowBeforeSpacer - 1;
                let gapSize = lastStopIndex - highestAddedIndex - 1;

                if (gapSize > 0) {
                    stopsToDisplay.push({
                        name: `${gapSize} more stops`,
                        count: gapSize,
                        minutes: "",
                        arrivalTime: "",
                        isSpacer: true,
                        key: "spacer",
                    });
                }

                addStop(lastStopIndex);
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
                                let chunkInterval = setInterval(() => {
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
        } catch (err: any) {
            error = err.message;
        }
    }

    onMount(() => {
        const interval = setInterval(fetchTripInfo, 1000);
        fetchTripInfo();
        return () => clearInterval(interval);
    });

    // Computed styles helper
    $: vUnit = isPortrait ? "vw" : "vh";
    $: hUnit = isPortrait ? "vh" : "vw";
    $: routeLineStr = isPortrait ? "0" : `min(5${hUnit}, 32px)`;
    $: timelineLeftStr = isPortrait ? "0" : `min(2.5${hUnit}, 16px)`;
    $: timelineCircleSizeStr = isPortrait ? "0" : `min(5${hUnit}, 32px)`;
    $: listPaddingLeft = isPortrait ? 3 : 10;

    // Timeline metrics
    let stopMetrics: any[] = [];
    let lineHeight = 0;
    const CONTAINER_TOP = 7;
    const CONTAINER_PAD = 1;

    $: {
        if (tripInfo) {
            let cursor = CONTAINER_TOP + CONTAINER_PAD;
            stopMetrics = tripInfo.nextStops.map((stop) => {
                const isSpacer = stop.isSpacer;
                const height = isSpacer ? 4 : isPortrait ? 9 : 9.375;
                const marginTop = isSpacer ? 0 : isPortrait ? 0.4 : 0.6;
                const marginBottom = isSpacer ? 0 : isPortrait ? 0.4 : 0.6;

                cursor += marginTop;
                const center = cursor + height / 2;
                cursor += height;
                cursor += marginBottom;

                return {
                    center,
                    height,
                    cursor: cursor - height - marginBottom,
                    isSpacer: isSpacer || false,
                };
            });

            const lastMetric = stopMetrics[stopMetrics.length - 1];
            if (lastMetric) {
                lineHeight = lastMetric.center - CONTAINER_TOP;
            }
        }
    }
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="w-screen h-screen overflow-hidden relative font-sans">
    {#if tripInfo}
        <!-- Header Bar -->
        <div
            class="fixed top-0 left-0 w-full text-white flex items-center justify-between z-50 border-b-2 border-slate-500"
            style="height: 6{vUnit}; padding-left: {isPortrait
                ? '5vw'
                : '3vw'}; padding-right: {isPortrait
                ? '5vw'
                : '3vw'}; background-color: var(--catenary-darksky)"
        >
            <span
                class="font-bold truncate"
                style="max-width: 70{hUnit}; font-size: 3{vUnit}"
            >
                {tripInfo.route}
                {#if tripInfo.run}<span class="font-normal"
                        >#{tripInfo.run}</span
                    >{/if}
                to {fixStationName(tripInfo.finalStop)}
            </span>
            <span class="font-medium font-mono" style="font-size: 3{vUnit}">
                {currentTime.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: !use24h,
                })}
            </span>
        </div>

        <!-- Stop List -->
        <div
            class="fixed grid grid-cols-1 p-[1{hUnit}]"
            style="top: 7{vUnit};
                    right: {isPortrait ? `2${vUnit}` : `1${hUnit}`};
                    width: {isPortrait
                ? `calc(100vw - 4${vUnit})`
                : `90${hUnit}`};
                    left: {isPortrait ? `2${vUnit}` : 'auto'}"
        >
            {#each tripInfo.nextStops as stop, index (stop.key)}
                <div animate:flip={{ duration: 300 }}>
                    {#if stop.isSpacer}
                        <div
                            transition:scale|local
                            class="flex items-center justify-center text-slate-300 italic font-bold"
                            style="height: 4{vUnit}; padding-left: {isPortrait
                                ? '5vw'
                                : '10vw'}"
                        >
                            <span
                                style="font-size: {isPortrait
                                    ? `3.5${vUnit}`
                                    : `2.5${vUnit}`}"
                                >{stop.count || stop.name.split(" ")[0]} more stops</span
                            >
                        </div>
                    {:else}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            transition:fly|local={{ y: 30, duration: 300 }}
                            class="rounded-lg leading-none flex items-center justify-start cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all"
                            style:gap={isPortrait ? `3vw` : `2${hUnit}`}
                            style:background-color={tripInfo.color}
                            style:color={tripInfo.textColor}
                            style:height={isPortrait
                                ? `9${vUnit}`
                                : `${56.25 / 6}${vUnit}`}
                            style:padding-left={isPortrait
                                ? `4vw`
                                : `${listPaddingLeft}${hUnit}`}
                            style:padding-right={`0.8${hUnit}`}
                            style:margin={`${isPortrait ? 0.4 : 0.6}${vUnit} 0.3${hUnit}`}
                            on:click={() => {
                                if (stop.stopId) {
                                    window.location.href = `/?mode=station&chateau=${tripInfo.chateau}&stop=${stop.stopId}`;
                                }
                            }}
                            role="button"
                            tabindex="0"
                        >
                            <span
                                class="text-left font-bold whitespace-nowrap"
                                style="font-size: {isPortrait
                                    ? `5${vUnit}`
                                    : `5${vUnit}`}; min-width: {isPortrait
                                    ? `22vw`
                                    : `20${hUnit}`}"
                            >
                                {#if stop.minutes === "DUE"}
                                    <span class="pulse">NOW</span>
                                {:else}
                                    {stop.arrivalTime}
                                {/if}
                                {#if stop.minutes !== "DUE"}
                                    <svg
                                        class="inline mx-[0.6{hUnit}] p-0"
                                        style="height: {isPortrait
                                            ? `2.8${vUnit}`
                                            : `2.3${vUnit}`}; width: {isPortrait
                                            ? `2.8${vUnit}`
                                            : `2.3${vUnit}`}"
                                        viewBox="0 -960 960 960"
                                        font-weight="bold"
                                        fill={tripInfo.textColor}
                                        ><path
                                            d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z"
                                        /></svg
                                    >
                                {/if}
                            </span>
                            <div class="overflow-hidden flex-grow">
                                <div
                                    class="font-bold whitespace-nowrap truncate"
                                    style="font-size: {isPortrait
                                        ? `5.5${vUnit}`
                                        : `5${vUnit}`}"
                                >
                                    {fixStationName(stop.name)}
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>

        {#if !isPortrait}
            <div
                class="fixed z-20 shadow-lg"
                style="
                left: {timelineLeftStr};
                width: {routeLineStr};
                top: 7{vUnit};
                background: {tripInfo.color};
                height: {lineHeight}{vUnit};
            "
            ></div>

            {#each tripInfo.nextStops as stop, index (stop.key)}
                {#if stopMetrics[index]}
                    {@const metric = stopMetrics[index]}
                    {#if stop.isSpacer}
                        {#each [0.2, 0.5, 0.8] as pos, i}
                            <div
                                class="z-30 fixed rounded-full transform -translate-y-1/2 -translate-x-1/2"
                                style="
                                    width: calc({timelineCircleSizeStr} / 6);
                                    height: calc({timelineCircleSizeStr} / 6);
                                    left: calc({timelineLeftStr} + ({timelineCircleSizeStr} / 2));
                                    background: {tripInfo.textColor};
                                    opacity: 0.6;
                                    top: calc(({metric.cursor}{vUnit}) + ({metric.height}{vUnit} * {pos}));
                                "
                            ></div>
                        {/each}
                    {:else}
                        <div
                            class="z-30 fixed rounded-full transform -translate-y-1/2"
                            style="
                                width: {timelineCircleSizeStr};
                                height: {timelineCircleSizeStr};
                                border-width: min(0.5{vUnit}, 4px);
                                box-sizing: border-box;
                                left: {timelineLeftStr};
                                background: {tripInfo.color};
                                border-color: {tripInfo.textColor};
                                top: {metric.center}{vUnit};
                             "
                        ></div>
                    {/if}
                {/if}
            {/each}
        {/if}

        {#if announcementTextChunk}
            <div
                class="fixed bottom-0 left-0 w-full px-[10{hUnit}] py-[1.5{vUnit}] text-center z-[100]"
                style="background: rgba(0,0,0,0.85); color: white"
                transition:fade
            >
                <span
                    class="font-bold tracking-tight"
                    style="font-size: 3.5{vUnit}"
                >
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

        <div
            class="fixed top-0 left-0 w-screen h-screen -z-10 bg-cover bg-center opacity-50"
            style="background-image: url({tripInfo.artwork})"
        ></div>
    {/if}

    {#if !tripInfo}
        <div
            class="fixed top-0 left-0 w-full text-white flex items-center justify-between px-[2{hUnit}] z-50 border-b-2 border-slate-500"
            style="height: 6{vUnit}; background-color: var(--catenary-darksky)"
        >
            <span class="font-bold truncate" style="font-size: 3{vUnit}"
                >Loading...</span
            >
            <span class="font-medium font-mono" style="font-size: 3{vUnit}"
                >{currentTime.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                })}</span
            >
        </div>
        {#if error}
            <p
                class="font-semibold text-red-500 w-screen h-screen flex items-center justify-center"
                style="font-size: 2{vUnit}"
            >
                {error}
            </p>
        {:else}
            <p
                class="font-semibold text-seashore w-screen h-screen flex items-center justify-center"
                style="font-size: 2{vUnit}"
            >
                Loading...
            </p>
        {/if}
    {/if}
</div>

<style>
    .pulse {
        animation: pulse 1s infinite;
    }
    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
</style>
