<script lang="ts">
    import { onMount } from "svelte";
    import EnrouteDisplay from "./EnrouteDisplay.svelte";
    import JREnrouteDisplay from "./JREnrouteDisplay.svelte";
    import StationDisplay from "./StationDisplay.svelte";
    import DefaultDisplay from "./DefaultDisplay.svelte";
    import ConfigModal from "./ConfigModal.svelte";

    let mode: string | null = null;
    let showConfig = false;

    onMount(() => {
        const query = new URLSearchParams(window.location.search);
        mode = query.get("mode");

        // function handleKeyDown(e: KeyboardEvent) {
        //     if (e.key.toLowerCase() === "c") {
        //         showConfig = !showConfig;
        //     }
        // }

        // window.addEventListener("keydown", handleKeyDown);
        // return () => window.removeEventListener("keydown", handleKeyDown);
    });
</script>

{#if mode === "enroute"}
    <EnrouteDisplay />
{:else if mode === "jr-enroute"}
    <JREnrouteDisplay />
{:else if mode === "station"}
    <StationDisplay />
{:else}
    <DefaultDisplay on:openConfig={() => (showConfig = true)} />
    <div
        class="fixed top-0 left-0 h-[56.25vw] w-screen -z-20 bg-cover bg-no-repeat bg-center"
        style="background-image: url(/art/default.png)"
    ></div>
{/if}

{#if showConfig}
    <ConfigModal onClose={() => (showConfig = false)} />
{/if}
