<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    export let onClose: () => void;

    let themePreference = "default";
    let use24HourTime = true;
    let fontPreference = "barlow";
    let clickableTrips = false;

    onMount(() => {
        // Load initial state
        const params = new URLSearchParams(window.location.search);
        const getSetting = (key: string) =>
            params.get(key) || localStorage.getItem(`enroute_${key}`);

        const urlTheme = getSetting("theme");
        const url24h = getSetting("24h") !== "false";
        const urlClickable = getSetting("clickable_trips") === "true";

        if (urlTheme) themePreference = urlTheme;
        use24HourTime = url24h;
        clickableTrips = urlClickable;

        const storedFont = localStorage.getItem("enroute_font");
        if (storedFont) fontPreference = storedFont;
    });

    function saveConfig() {
        const prefix = "enroute_";
        localStorage.setItem(`${prefix}theme`, themePreference);
        localStorage.setItem(`${prefix}24h`, use24HourTime.toString());
        localStorage.setItem(`${prefix}font`, fontPreference);
        localStorage.setItem(
            `${prefix}clickable_trips`,
            clickableTrips.toString(),
        );

        // Reload to apply
        window.location.reload();
    }

    function goHome() {
        const params = new URLSearchParams(window.location.search);
        ["mode", "trip", "chateau", "stop"].forEach((p) => params.delete(p));
        window.location.search = params.toString();
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6"
    on:click={onClose}
    role="button"
    tabindex="0"
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="w-full max-w-2xl rounded-lg overflow-hidden border-2 border-slate-700 shadow-2xl"
        style="background-color: var(--catenary-darksky); cursor: default;"
        on:click|stopPropagation
        role="button"
        tabindex="0"
    >
        <!-- Modal Header -->
        <div class="flex justify-between items-start px-8 pt-8">
            <div class="flex flex-col">
                <h2 class="text-3xl font-bold leading-none">Configuration</h2>
                <div class="flex items-center gap-6 mt-3">
                    <span
                        class="text-[10px] font-bold opacity-90"
                        style="color: var(--catenary-seashore)"
                        >System Preferences</span
                    >
                    <button
                        on:click={goHome}
                        class="bg-blue-600 hover:bg-blue-500 text-[10px] font-black px-4 py-1.5 rounded-md transition-all active:scale-95 shadow-md border border-blue-400/30"
                        style="background-color: var(--catenary-seashore); color: var(--catenary-darksky)"
                    >
                        Go Home
                    </button>
                </div>
            </div>
            <button
                on:click={onClose}
                class="opacity-30 hover:opacity-100 text-4xl font-thin transition-all p-2 hover:rotate-90 leading-none"
                >&times;</button
            >
        </div>

        <div class="p-8 space-y-8">
            <!-- Settings -->
            <!-- Theme Selection -->
            <div>
                <label
                    class="block text-xs font-bold mb-2 opacity-80"
                    for="themeSelect">Color Theme</label
                >
                <select
                    id="themeSelect"
                    bind:value={themePreference}
                    class="w-full bg-slate-900/40 border border-slate-500 rounded-lg p-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition-colors"
                >
                    <option value="default">Default Catenary</option>
                    <option value="blue_white"
                        >White on Blue (Swiss & German)</option
                    >
                    <option value="ns_light">NS Light (Dutch)</option>
                    <option value="ns_dark">NS Dark</option>
                    <option value="midnight">Midnight (White on Black)</option>
                </select>
            </div>

            <!-- Options -->
            <div class="pt-2 space-y-2">
                <label
                    class="flex items-center space-x-4 p-4 rounded-lg border border-slate-500 bg-slate-900/40 hover:bg-slate-700/40 cursor-pointer transition-colors"
                >
                    <input
                        type="checkbox"
                        bind:checked={use24HourTime}
                        class="form-checkbox h-6 w-6 text-blue-500 rounded border-slate-500 bg-slate-900"
                    />
                    <div>
                        <span class="block text-sm font-bold">24-Hour Time</span
                        >
                        <span class="block text-[10px] opacity-60"
                            >Display hours 00-23 without AM/PM</span
                        >
                    </div>
                </label>

                <label
                    class="flex items-center space-x-4 p-4 rounded-lg border border-slate-500 bg-slate-900/40 hover:bg-slate-700/40 cursor-pointer transition-colors"
                >
                    <input
                        type="checkbox"
                        bind:checked={clickableTrips}
                        class="form-checkbox h-6 w-6 text-red-500 rounded border-slate-500 bg-slate-900"
                    />
                    <div>
                        <span class="block text-sm font-bold text-red-400"
                            >Clickable Trips (Debug)</span
                        >
                        <span class="block text-[10px] opacity-60"
                            >(For debugging only) Click to open Enroute view</span
                        >
                    </div>
                </label>
            </div>

            <!-- Font Selection -->
            <div>
                <label
                    class="block text-xs font-bold mb-2 opacity-80"
                    for="fontSelect">Font Family</label
                >
                <select
                    id="fontSelect"
                    bind:value={fontPreference}
                    class="w-full bg-slate-900/40 border border-slate-500 rounded-lg p-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition-colors"
                >
                    <option value="barlow">Barlow (Default)</option>
                    <option value="helvetica">Helvetica</option>
                </select>
            </div>
        </div>

        <!-- Save Button -->
        <div class="p-8 border-t border-slate-700/50 bg-black/20">
            <button
                on:click={saveConfig}
                class="w-full py-4 text-xs font-bold rounded-lg transition-all active:scale-[0.98] shadow-lg border-2 border-white/10 hover:border-white/30"
                style="background-color: var(--catenary-seashore); color: var(--catenary-darksky)"
            >
                Save & Apply Settings
            </button>
        </div>

        <!-- Footer Info -->
        <div
            class="bg-slate-900/60 py-3 px-8 border-t border-slate-500 flex justify-between items-center text-[10px] font-bold tracking-widest opacity-60"
        >
            <span>Catenary Enroute Screen • v2.0</span>
            <span>All changes saved to LocalStorage</span>
        </div>
    </div>
</div>
