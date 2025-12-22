
import React, { useEffect, useState } from "react";

interface ConfigModalProps {
    onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ onClose }) => {
    const [themePreference, setThemePreference] = useState("default");
    const [use24HourTime, setUse24HourTime] = useState(true);
    const [fontPreference, setFontPreference] = useState("barlow");
    const [clickableTrips, setClickableTrips] = useState(false);

    useEffect(() => {
        // Load initial state
        const getSetting = (key: string) => {
            if (typeof window === "undefined") return null;
            const params = new URLSearchParams(window.location.search);
            return params.get(key) || localStorage.getItem(`enroute_${key}`);
        };

        const urlTheme = getSetting("theme");
        const url24h = getSetting("24h") !== "false";
        const urlClickable = getSetting("clickable_trips") === "true";

        if (urlTheme) setThemePreference(urlTheme);
        setUse24HourTime(url24h);
        setClickableTrips(urlClickable);

        const storedFont = localStorage.getItem("enroute_font");
        if (storedFont) setFontPreference(storedFont);
    }, []);

    const saveConfig = () => {
        const prefix = "enroute_";
        localStorage.setItem(`${prefix}theme`, themePreference);
        localStorage.setItem(`${prefix}24h`, use24HourTime.toString());
        localStorage.setItem(`${prefix}font`, fontPreference);
        localStorage.setItem(`${prefix}clickable_trips`, clickableTrips.toString());

        // Reload to apply
        window.location.reload();
    };

    const goHome = () => {
        const params = new URLSearchParams(window.location.search);
        ["mode", "trip", "chateau", "stop"].forEach((p) => params.delete(p));
        window.location.search = params.toString();
    };

    return (
        <div
            className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="w-full max-w-2xl rounded-lg overflow-hidden border-2 border-slate-700 shadow-2xl cursor-default"
                style={{ backgroundColor: "var(--catenary-darksky)" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex justify-between items-start px-8 pt-8">
                    <div className="flex flex-col">
                        <h2 className="text-3xl font-bold leading-none text-white">Configuration</h2>
                        <div className="flex items-center gap-6 mt-3">
                            <span
                                className="text-[10px] font-bold opacity-90"
                                style={{ color: "var(--catenary-seashore)" }}
                            >
                                System Preferences
                            </span>
                            <button
                                onClick={goHome}
                                className="text-[10px] font-black px-4 py-1.5 rounded-md transition-all active:scale-95 shadow-md border border-blue-400/30"
                                style={{
                                    backgroundColor: "var(--catenary-seashore)",
                                    color: "var(--catenary-darksky)",
                                }}
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white opacity-30 hover:opacity-100 text-4xl font-thin transition-all p-2 hover:rotate-90 leading-none"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Settings */}
                    {/* Theme Selection */}
                    <div>
                        <label
                            className="block text-xs font-bold mb-2 opacity-80 text-white"
                            htmlFor="themeSelect"
                        >
                            Color Theme
                        </label>
                        <select
                            id="themeSelect"
                            value={themePreference}
                            onChange={(e) => setThemePreference(e.target.value)}
                            className="w-full bg-slate-900/40 border border-slate-500 rounded-lg p-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                        >
                            <option value="default">Default Catenary</option>
                            <option value="blue_white">White on Blue (Swiss & German)</option>
                            <option value="ns_light">NS Light (Dutch)</option>
                            <option value="ns_dark">NS Dark</option>
                            <option value="midnight">Midnight (White on Black)</option>
                        </select>
                    </div>

                    {/* Options */}
                    <div className="pt-2 space-y-2">
                        <label className="flex items-center space-x-4 p-4 rounded-lg border border-slate-500 bg-slate-900/40 hover:bg-slate-700/40 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={use24HourTime}
                                onChange={(e) => setUse24HourTime(e.target.checked)}
                                className="form-checkbox h-6 w-6 text-blue-500 rounded border-slate-500 bg-slate-900"
                            />
                            <div className="text-white">
                                <span className="block text-sm font-bold">24-Hour Time</span>
                                <span className="block text-[10px] opacity-60">
                                    Display hours 00-23 without AM/PM
                                </span>
                            </div>
                        </label>

                        <label className="flex items-center space-x-4 p-4 rounded-lg border border-slate-500 bg-slate-900/40 hover:bg-slate-700/40 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={clickableTrips}
                                onChange={(e) => setClickableTrips(e.target.checked)}
                                className="form-checkbox h-6 w-6 text-red-500 rounded border-slate-500 bg-slate-900"
                            />
                            <div className="text-white">
                                <span className="block text-sm font-bold text-red-400">
                                    Clickable Trips (Debug)
                                </span>
                                <span className="block text-[10px] opacity-60">
                                    (For debugging only) Click to open Enroute view
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Font Selection */}
                    <div>
                        <label
                            className="block text-xs font-bold mb-2 opacity-80 text-white"
                            htmlFor="fontSelect"
                        >
                            Font Family
                        </label>
                        <select
                            id="fontSelect"
                            value={fontPreference}
                            onChange={(e) => setFontPreference(e.target.value)}
                            className="w-full bg-slate-900/40 border border-slate-500 rounded-lg p-3 text-sm font-bold text-white focus:outline-none focus:border-blue-500 transition-colors"
                        >
                            <option value="barlow">Barlow (Default)</option>
                            <option value="helvetica">Helvetica</option>
                        </select>
                    </div>
                </div>

                {/* Save Button */}
                <div className="p-8 border-t border-slate-700/50 bg-black/20">
                    <button
                        onClick={saveConfig}
                        className="w-full py-4 text-xs font-bold rounded-lg transition-all active:scale-[0.98] shadow-lg border-2 border-white/10 hover:border-white/30"
                        style={{
                            backgroundColor: "var(--catenary-seashore)",
                            color: "var(--catenary-darksky)",
                        }}
                    >
                        Save & Apply Settings
                    </button>
                </div>

                {/* Footer Info */}
                <div className="bg-slate-900/60 py-3 px-8 border-t border-slate-500 flex justify-between items-center text-[10px] font-bold tracking-widest opacity-60 text-white">
                    <span>Catenary Enroute Screen • v2.0</span>
                    <span>All changes saved to LocalStorage</span>
                </div>
            </div>
        </div>
    );
};
