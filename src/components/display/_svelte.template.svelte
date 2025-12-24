<script>
  import { onMount } from 'svelte';

  // Metadata for the display
  export const displayMetadata = {
    title: 'Display Title',
    description: 'Description of the display.',
  };

  // Props type for the display
  export let config;
  export let data;

  let use24h = true;

  const getSetting = (key, defaultValue = "") => {
    if (typeof window === "undefined") return defaultValue;
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;
  };

  onMount(() => {
    use24h = getSetting("24h") !== "false";
  });
</script>

<div class="w-screen h-screen overflow-hidden relative font-sans" style="background-color: var(--catenary-background);">
  <!-- Header would go here - Svelte component equivalents can be created as needed -->
  <div style="padding-top: 6vh; padding: 20px;">
    <!-- Display content goes here -->
    <h1>{displayMetadata.title}</h1>
    <p>{displayMetadata.description}</p>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>
