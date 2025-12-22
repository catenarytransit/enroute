<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fade, fly, scale } from "svelte/transition";
    import { flip } from "svelte/animate";

    import {
        fixRouteColor,
        fixStationArt,
        fixStationName,
    } from "../data/agencyspecific";
    import { fetchSwiftlyArrivals } from "../data/stationdemo";
    import type { Arrival } from "../types/StationInformation";
    import { enunciator } from "../enunciator";
    import { EnunciatorState } from "../types/Enunciator";

    // Config
    const params = new URLSearchParams(window.location.search);
    const getSetting = (key: string, defaultValue: string = "") =>
        params.get(key) ||
        localStorage.getItem(`enroute_${key}`) ||
        defaultValue;

    const use24h = getSetting("24h") !== "false";
    let selectedRegion = params.get("chateau");
    let selectedStop = params.get("stop");
    let selectedRoutes = params.get("routes")?.split(",") || ["Metro A Line"];

    // State
    let arrivals: Arrival[] = [];
    let activeAlerts: string[] = [];
    let stopName = "Loading...";
    let loading = true;
    let tick = false;
    let error: string | null = null;
    let announcementTextChunk: string | null = null;

    let innerWidth = 0;
    let innerHeight = 0;
    $: isPortrait = innerHeight > innerWidth;

    // Computed V/H units
    $: vUnit = isPortrait ? "vw" : "vh";
    $: hUnit = isPortrait ? "vh" : "vw";

    // Clock
    let currentTime = new Date();

    // Announcement Loop
    let announcementActive = false;

    const stationAnnounce = async (arrival?: Arrival) => {
        let voicedAnnouncement;
        if (arrival) {
            voicedAnnouncement = await enunciator.sync(
                selectedRegion || "",
                EnunciatorState.STATION,
                arrival,
                null,
            );
        } else {
            voicedAnnouncement = await enunciator.sync(
                selectedRegion || "",
                EnunciatorState.STATION,
                null,
                null,
            );
        }

        if (voicedAnnouncement) {
            if (announcementActive) {
                // Retry logic if busy
                let reCheckForAnnouncement = setInterval(() => {
                    if (!announcementActive) {
                        clearInterval(reCheckForAnnouncement);
                        if (arrival) {
                            stationAnnounce(arrival);
                        } else {
                            setTimeout(() => stationAnnounce(), 3000);
                        }
                    }
                }, 2000);
            } else {
                announcementActive = true;
                announcementTextChunk = "[MSG]";

                setTimeout(() => {
                    if (voicedAnnouncement) {
                        let chunks = voicedAnnouncement.text.match(/.{1,53}/g);
                        if (chunks) {
                            let nextChunk = chunks.shift();
                            if (nextChunk) announcementTextChunk = nextChunk;

                            let chunkInterval = setInterval(() => {
                                if (chunks && chunks.length > 0) {
                                    let nextChunk = chunks.shift();
                                    if (nextChunk)
                                        announcementTextChunk = nextChunk;
                                } else {
                                    if (!announcementActive) {
                                        clearInterval(chunkInterval);
                                        announcementTextChunk = null;
                                    }
                                }
                            }, 3500);
                        }
                    }
                }, 1600);

                enunciator.play(voicedAnnouncement).then(() => {
                    announcementActive = false;
                    // Note: The original logic cleared text chunk here or via the interval logic?
                    // The interval logic clears it if !announcementActive.
                    // So setting it to false here allows the interval to clear and exit.
                });
            }
        }
    };

    onMount(() => {
        // Clock
        const timer = setInterval(() => (currentTime = new Date()), 1000);

        // Tick for alternating Display (Time vs Min)
        const tickTimer = setInterval(() => {
            tick = new Date().getSeconds() % 2 === 0;
        }, 5000);

        let dataInterval: NodeJS.Timeout;
        let announceInterval: NodeJS.Timeout;

        const init = async () => {
            try {
                if (!selectedRegion || !selectedStop || !selectedRoutes)
                    throw new Error(
                        "Chateâu ID, stop, and at least one route name must be provided in the URL query parameters",
                    );

                // Initial fetch
                let data = await fetchSwiftlyArrivals(
                    selectedRegion,
                    selectedRoutes,
                    selectedStop,
                    use24h,
                );
                if (data) {
                    stopName = data.name;
                    if (data.trips) arrivals = data.trips;
                    activeAlerts = data.alerts || [];
                    loading = false;
                }

                // Polling
                dataInterval = setInterval(async () => {
                    let data = await fetchSwiftlyArrivals(
                        selectedRegion!,
                        selectedRoutes,
                        selectedStop!,
                        use24h,
                    );
                    if (data) {
                        stopName = data.name;
                        if (data.trips) arrivals = data.trips;
                        activeAlerts = data.alerts || [];
                    }
                }, 4000);

                // Periodic Announcement
                announceInterval = setInterval(async () => {
                    stationAnnounce();
                }, 60000);
            } catch (err: any) {
                error = err.message;
            }
        };

        init();

        return () => {
            clearInterval(timer);
            clearInterval(tickTimer);
            if (dataInterval) clearInterval(dataInterval);
            if (announceInterval) clearInterval(announceInterval);
        };
    });
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div
    class="w-screen h-screen overflow-hidden relative font-sans"
    style="background-color: var(--catenary-background)"
>
    {#if arrivals.length >= 1}
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
                style="font-size: 3{vUnit}; max-width: 65{hUnit}"
                >{fixStationName(stopName)}</span
            >
            <span class="font-medium font-mono" style="font-size: 3{vUnit}"
                >{currentTime.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: !use24h,
                })}</span
            >
        </div>

        <!-- Background Art placeholder -->
        <div
            class="fixed top-0 left-0 w-screen h-screen bg-cover bg-center opacity-30 pointer-events-none -z-10"
            style="background-image: url(/art/default.png)"
        ></div>

        <!-- Alerts Ticker -->
        {#if activeAlerts.length > 0}
            <div
                class="fixed bottom-0 left-0 w-full text-white font-bold whitespace-nowrap overflow-hidden z-20 border-t-2 border-white"
                style="padding: 0.5{vUnit}; font-size: 1.8{vUnit}; background-color: var(--catenary-darksky)"
            >
                <div class="animate-marquee inline-block px-[100{hUnit}]">
                    {activeAlerts.join(" • ")}
                </div>
            </div>
        {/if}

        <!-- Announcement Overlay -->
        {#if announcementTextChunk}
            <div
                class="fixed bottom-0 left-0 w-screen bg-[#f9e300] text-black z-[100]"
                style="font-size: 4{vUnit}; padding: 0.5{vUnit} 2{hUnit}"
                transition:fade
            >
                <span class="font-semibold">
                    {#if announcementTextChunk === "[MSG]"}
                        <span class="font-bold pulse"
                            >&rarr; Your attention please</span
                        >
                    {/if}
                    {announcementTextChunk.replace("[MSG]", "")}
                </span>
            </div>
        {/if}

        <!-- Arrivals List -->
        <div
            class="fixed grid grid-cols-1 z-10"
            style="
            left: 2.5{hUnit};
            top: 7{vUnit};
            width: {isPortrait ? `95${hUnit}` : `45${hUnit}`};
            gap: 0.5{vUnit}
        "
        >
            {#each arrivals.slice(0, 8) as arrival (arrival.key)}
                <div animate:flip={{ duration: 300 }}>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        transition:fly|local={{ x: -20, duration: 300 }}
                        on:click={() => {
                            stationAnnounce(arrival);
                            window.location.href = `/?mode=enroute&chateau=${selectedRegion}&trip=${arrival.key}`;
                        }}
                        class="rounded-lg leading-none flex items-center justify-between shadow-lg cursor-pointer hover:brightness-110 transition-all"
                        style:background-color={arrival.color}
                        style:color={arrival.text}
                        style:height={isPortrait ? `14${vUnit}` : `9.2${vUnit}`}
                        style:padding-left={`1.6${hUnit}`}
                        style:padding-right={`0.8${hUnit}`}
                        role="button"
                        tabindex="0"
                    >
                        <div class="overflow-hidden">
                            <div
                                class="truncate pb-[0.2{vUnit}]"
                                style="font-size: 2.2{vUnit}"
                            >
                                {arrival.route}
                                {#if arrival.run !== ""}{arrival.run}{/if} to:
                            </div>
                            <div
                                class="font-bold whitespace-nowrap truncate"
                                style="font-size: 3.5{vUnit}; width: {isPortrait
                                    ? `55${hUnit}`
                                    : `30${hUnit}`}"
                            >
                                {fixStationName(arrival.headsign)}
                            </div>
                        </div>

                        <span
                            class="text-right font-bold flex flex-row items-center justify-end gap-[1.5{hUnit}]"
                            style="min-width: 15{hUnit}"
                        >
                            <span style="font-size: 5{vUnit}; line-height: 1">
                                {#if (tick && arrival.time !== "") || arrival.time === ""}
                                    {#if arrival.min <= 0}
                                        <span class="pulse">DUE</span>
                                    {:else}
                                        {arrival.min}
                                        <span
                                            class="font-light"
                                            style="font-size: 2.4{vUnit}"
                                            >min</span
                                        >
                                    {/if}
                                {/if}
                                {#if !tick && arrival.time !== ""}
                                    {#if use24h}
                                        {arrival.time}
                                    {:else}
                                        {arrival.time
                                            .replace("AM", "")
                                            .replace("PM", "")}
                                        <span
                                            class="font-light"
                                            style="font-size: 2.4{vUnit}"
                                        >
                                            {arrival.time.split(" ")[1] &&
                                                arrival.time
                                                    .split(" ")[1]
                                                    .toLowerCase()}
                                        </span>
                                    {/if}
                                {/if}
                            </span>
                            <div style="line-height: 1">
                                {#if arrival.live}
                                    <svg
                                        style="height: 2.6{vUnit}; width: 2.6{vUnit}"
                                        viewBox="0 -960 960 960"
                                        fill={arrival.text}
                                        ><path
                                            d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z"
                                        /></svg
                                    >
                                {:else}
                                    <svg
                                        style="height: 2.6{vUnit}; width: 2.6{vUnit}"
                                        viewBox="0 -960 960 960"
                                        fill={arrival.text}
                                        ><path
                                            d="M440-120v-264L254-197l-57-57 187-186H120v-80h264L197-706l57-57 186 187v-264h80v264l186-187 57 57-187 186h264v80H576l187 186-57 57-186-187v264h-80Z"
                                        /></svg
                                    >
                                {/if}
                            </div>
                        </span>
                    </div>
                </div>
            {/each}
        </div>

        {#if !isPortrait}
            <div
                class="fixed right-0 z-0 bg-cover bg-center"
                style="top: 6{vUnit}; bottom: 3{vUnit}; width: 50{hUnit}; background-image: url(/alert/pride.png)"
            ></div>
        {/if}
        {#if isPortrait}
            <div
                class="fixed bottom-0 left-0 h-[30vh] w-screen -z-10 bg-cover opacity-30 pointer-events-none"
                style="background-image: url(/alert/pride.png); background-position: center bottom"
            ></div>
        {/if}
    {/if}

    {#if arrivals.length < 1}
        <div
            class="fixed top-0 left-0 w-full text-white flex items-center justify-between z-50 border-b-2 border-slate-500"
            style="height: 6{vUnit}; padding-left: {isPortrait
                ? '5vw'
                : '3vw'}; padding-right: {isPortrait
                ? '5vw'
                : '3vw'}; background-color: var(--catenary-darksky)"
        >
            <span class="font-bold truncate" style="font-size: 3{vUnit}"
                >Loading...</span
            >
            <span class="font-medium font-mono" style="font-size: 3{vUnit}"
                >{currentTime.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: !use24h,
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
        {:else if loading}
            <p
                class="font-semibold text-white w-screen h-screen flex items-center justify-center"
                style="font-size: 2{vUnit}; color: var(--catenary-seashore)"
            >
                Loading...
            </p>
        {:else}
            <p
                class="font-semibold text-white w-screen h-screen flex items-center justify-center"
                style="font-size: 2{vUnit}"
            >
                No upcoming departures scheduled.
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
