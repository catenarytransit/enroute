<script lang="ts">
    import { createEventDispatcher } from "svelte";

    export let pane: {
        id: string;
        type: "departures" | "alerts";
        name?: string;
        allowedModes?: number[];
    };

    const dispatch = createEventDispatcher();

    let name = pane.name || "";
    let type = pane.type;
    let allowedModes: number[] = pane.allowedModes || [];

    function toggleMode(id: number) {
        if (allowedModes.includes(id)) {
            allowedModes = allowedModes.filter((m) => m !== id);
        } else {
            allowedModes = [...allowedModes, id];
        }
    }

    function save() {
        dispatch("save", { name, type, allowedModes });
    }

    function close() {
        dispatch("close");
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
    on:click={close}
    role="button"
    tabindex="0"
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
        on:click|stopPropagation
        role="button"
        tabindex="0"
    >
        <div
            class="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900"
        >
            <h3 class="font-bold text-lg text-white">Configure Pane</h3>
            <button on:click={close} class="text-slate-400 hover:text-white"
                >&times;</button
            >
        </div>
        <div class="p-6 space-y-6">
            <div>
                <label
                    class="block text-xs font-bold text-slate-400 mb-1"
                    for="paneName">Pane Name (Optional)</label
                >
                <input
                    type="text"
                    id="paneName"
                    class="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-600 focus:border-blue-500 outline-none"
                    placeholder={type === "departures"
                        ? "Departures"
                        : "Alerts"}
                    bind:value={name}
                />
            </div>

            <div>
                <label
                    class="block text-xs font-bold text-slate-400 mb-1"
                    for="type">Type</label
                >
                <div class="flex gap-2" id="type">
                    <button
                        on:click={() => (type = "departures")}
                        class="flex-1 py-2 rounded text-sm font-bold border transition-colors {type ===
                        'departures'
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-900 border-slate-600 text-slate-400 hover:bg-slate-700'}"
                    >
                        Departures
                    </button>
                    <button
                        on:click={() => (type = "alerts")}
                        class="flex-1 py-2 rounded text-sm font-bold border transition-colors {type ===
                        'alerts'
                            ? 'bg-yellow-600 border-yellow-400 text-black'
                            : 'bg-slate-900 border-slate-600 text-slate-400 hover:bg-slate-700'}"
                    >
                        Alerts
                    </button>
                </div>
            </div>

            {#if type === "departures"}
                <div>
                    <label class="block text-xs font-bold text-slate-400 mb-2"
                        >Filter Modes</label
                    >
                    <div class="grid grid-cols-2 gap-2">
                        {#each [{ id: 3, label: "Bus" }, { id: 2, label: "Rail" }, { id: 1, label: "Subway" }, { id: 0, label: "Tram" }, { id: 4, label: "Ferry" }] as mode}
                            <label
                                class="flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors {allowedModes.includes(
                                    mode.id,
                                )
                                    ? 'bg-blue-900/50 border-blue-500/50'
                                    : 'bg-slate-900 border-slate-700 hover:bg-slate-800'}"
                            >
                                <input
                                    type="checkbox"
                                    checked={allowedModes.includes(mode.id)}
                                    on:change={() => toggleMode(mode.id)}
                                    class="rounded border-slate-500 bg-slate-900 text-blue-500"
                                />
                                <span
                                    class="text-xs font-bold {allowedModes.includes(
                                        mode.id,
                                    )
                                        ? 'text-white'
                                        : 'text-slate-400'}">{mode.label}</span
                                >
                            </label>
                        {/each}
                    </div>
                    <p class="text-[10px] text-slate-500 mt-2 italic">
                        Leave all unchecked to show all modes.
                    </p>
                </div>
            {/if}
        </div>
        <div
            class="p-4 bg-slate-900 border-t border-slate-700 flex justify-end gap-3"
        >
            <button
                on:click={close}
                class="px-4 py-2 rounded text-sm font-bold text-slate-400 hover:text-white"
                >Cancel</button
            >
            <button
                on:click={save}
                class="px-6 py-2 rounded text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg"
            >
                Save Changes
            </button>
        </div>
    </div>
</div>
