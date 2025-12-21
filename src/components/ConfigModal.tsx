import { useEffect, useState, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export function ConfigModal({ onClose }: { onClose: () => void }) {
    const [configLat, setConfigLat] = useState("");
    const [configLon, setConfigLon] = useState("");
    const [primaryColor, setPrimaryColor] = useState("");
    const [secondaryColor, setSecondaryColor] = useState("");
    const [allowedModes, setAllowedModes] = useState<number[]>([]);
    const [use24HourTime, setUse24HourTime] = useState(true);

    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const marker = useRef<maplibregl.Marker | null>(null);

    // Initialize Map
    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        const lat = configLat ? parseFloat(configLat) : 34.0522;
        const lon = configLon ? parseFloat(configLon) : -118.2437;

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://maps.catenarymaps.org/light-style.json',
            center: [lon, lat],
            zoom: 13
        });

        map.current.on('click', (e) => {
            const { lng, lat } = e.lngLat;
            setConfigLat(lat.toFixed(6));
            setConfigLon(lng.toFixed(6));
        });
    }, []);

    // Update map/marker when coords change
    useEffect(() => {
        if (!map.current) return;
        const lat = parseFloat(configLat);
        const lon = parseFloat(configLon);

        if (!isNaN(lat) && !isNaN(lon)) {
            if (!marker.current) {
                marker.current = new maplibregl.Marker()
                    .setLngLat([lon, lat])
                    .addTo(map.current);
            } else {
                marker.current.setLngLat([lon, lat]);
            }
            map.current.flyTo({ center: [lon, lat], zoom: 13, essential: true });
        } else {
            if (marker.current) {
                marker.current.remove();
                marker.current = null;
            }
        }
    }, [configLat, configLon]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);

        // Helper to get from URL or LocalStorage
        const getSetting = (key: string) => params.get(key) || localStorage.getItem(`enroute_${key}`);

        const urlLat = getSetting('lat');
        const urlLon = getSetting('lon');
        const urlPrimary = getSetting('primary');
        const urlSecondary = getSetting('secondary');
        const urlModes = getSetting('modes');
        const url24h = getSetting('24h') !== 'false';
        if (urlModes) {
            // Handle both legacy JSON and new CSV formats
            try {
                if (urlModes.startsWith('[')) {
                    setAllowedModes(JSON.parse(urlModes));
                } else {
                    setAllowedModes(urlModes.split(',').map(Number));
                }
            } catch (e) {
                setAllowedModes([0, 1, 2, 3, 4]);
            }
        } else {
            setAllowedModes([0, 1, 2, 3, 4]); // Default to all modes
        }
        if (urlLat) setConfigLat(urlLat);
        if (urlLon) setConfigLon(urlLon);
        if (urlPrimary) setPrimaryColor(urlPrimary);
        if (urlSecondary) setSecondaryColor(urlSecondary);
        setUse24HourTime(url24h);
    }, []);

    /**
     * Persists configuration to LocalStorage and redirects to the home view.
     * Preserves global identity parameters (chateau, etc.) while clearing view-specific overrides.
     */
    const saveConfig = () => {
        const prefix = "enroute_";
        localStorage.setItem(`${prefix}primary`, primaryColor);
        localStorage.setItem(`${prefix}secondary`, secondaryColor);
        localStorage.setItem(`${prefix}24h`, use24HourTime.toString());
        localStorage.setItem(`${prefix}modes`, allowedModes.join(','));
        localStorage.setItem(`${prefix}lat`, configLat);
        localStorage.setItem(`${prefix}lon`, configLon);

        // Build redirect URL preserving global parameters
        const params = new URLSearchParams(window.location.search);
        // Parameters are preserved via window.location.search during redirect

        // Finalize redirect to home with updated settings
        window.location.href = '/' + window.location.search;
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-6" onClick={onClose}>
            <div
                className="w-full max-w-5xl rounded-lg overflow-hidden border-2 border-slate-700 shadow-2xl"
                style={{ backgroundColor: 'var(--catenary-darksky)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className='flex justify-between items-start px-8 pt-8'>
                    <div className="flex flex-col">
                        <h2 className="text-3xl font-bold  leading-none">Configuration</h2>
                        <div className="flex items-center gap-6 mt-3">
                            <span className="text-[10px] font-bold text-seashore opacity-90" style={{ color: 'var(--catenary-seashore)' }}>System Preferences</span>
                            <button
                                onClick={() => {
                                    const params = new URLSearchParams(window.location.search);
                                    ['mode', 'trip', 'chateau', 'stop'].forEach(p => params.delete(p));
                                    window.location.search = params.toString();
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-[10px] font-black px-4 py-1.5 rounded-md transition-all active:scale-95 shadow-md border border-blue-400/30"
                                style={{ backgroundColor: 'var(--catenary-seashore)', color: 'var(--catenary-darksky)' }}
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                    <button onClick={onClose} className='opacity-30 hover:opacity-100 text-4xl font-thin transition-all p-2 hover:rotate-90 leading-none'>&times;</button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Left Column: Location */}
                    <div className="space-y-4">
                        <label className="block text-sm font-bold opacity-80">Location Override (Click Map)</label>
                        <div className="h-[32vh] w-full rounded-lg overflow-hidden border-2 border-slate-500 relative z-0">
                            <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
                        </div>
                        <div className="flex justify-between items-center bg-slate-900/40 p-3 rounded-lg border border-slate-500 text-sm font-mono">
                            <div className="flex space-x-6">
                                <span>LAT: {configLat ? parseFloat(configLat).toFixed(4) : 'AUTO'}</span>
                                <span>LON: {configLon ? parseFloat(configLon).toFixed(4) : 'AUTO'}</span>
                            </div>
                            {(configLat || configLon) && <button onClick={() => { setConfigLat(""); setConfigLon("") }} className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded border border-slate-500 text-[10px] font-bold transition-colors">Reset</button>}
                        </div>
                    </div>

                    {/* Right Column: Settings */}
                    <div className="flex flex-col justify-between">
                        <div className="space-y-8">
                            {/* Color Pickers */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold mb-2 opacity-80">Primary Color</label>
                                    <div className="flex items-center space-x-3 bg-slate-900/40 p-2 rounded-lg border border-slate-500">
                                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-10 rounded cursor-pointer border-none bg-transparent" />
                                        <span className="text-xs font-mono truncate">{primaryColor}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-2 opacity-80">Secondary Color</label>
                                    <div className="flex items-center space-x-3 bg-slate-900/40 p-2 rounded-lg border border-slate-500">
                                        <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-12 h-10 rounded cursor-pointer border-none bg-transparent" />
                                        <span className="text-xs font-mono truncate">{secondaryColor}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Mode Filters */}
                            <div>
                                <label className="block text-xs font-bold mb-3 opacity-80">Agency / Mode Filters</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 3, label: "Bus" },
                                        { id: 2, label: "Rail" },
                                        { id: 1, label: "Subway" },
                                        { id: 0, label: "Tram" },
                                        { id: 4, label: "Ferry" }
                                    ].map(mode => (
                                        <label key={mode.id} className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${allowedModes.includes(mode.id) ? 'bg-blue-500 border-white' : 'bg-slate-900/40 border-slate-500 hover:bg-slate-700/40'}`}>
                                            <input
                                                type="checkbox"
                                                checked={allowedModes.includes(mode.id)}
                                                onChange={() => {
                                                    setAllowedModes(prev =>
                                                        prev.includes(mode.id)
                                                            ? prev.filter(id => id !== mode.id)
                                                            : [...prev, mode.id]
                                                    );
                                                }}
                                                className="form-checkbox h-4 w-4 text-blue-500 rounded border-slate-500 bg-slate-900"
                                            />
                                            <span className="text-xs font-bold ">{mode.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Options */}
                            <div className="pt-2">
                                <label className="flex items-center space-x-4 p-4 rounded-lg border border-slate-500 bg-slate-900/40 hover:bg-slate-700/40 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={use24HourTime}
                                        onChange={() => setUse24HourTime(!use24HourTime)}
                                        className="form-checkbox h-6 w-6 text-blue-500 rounded border-slate-500 bg-slate-900"
                                    />
                                    <div>
                                        <span className="block text-sm font-bold ">24-Hour Time</span>
                                        <span className="block text-[10px] opacity-60">Display hours 00-23 without AM/PM</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="p-8 border-t border-slate-700/50 bg-black/20">
                    <button
                        onClick={saveConfig}
                        className="w-full py-4 text-xs font-bold  rounded-lg transition-all active:scale-[0.98] shadow-lg border-2 border-white/10 hover:border-white/30"
                        style={{ backgroundColor: 'var(--catenary-seashore)', color: 'var(--catenary-darksky)' }}
                    >
                        Save & Apply Settings
                    </button>
                </div>

                {/* Footer Info */}
                <div className="bg-slate-900/60 py-3 px-8 border-t border-slate-500 flex justify-between items-center text-[10px] font-bold tracking-widest opacity-60">
                    <span>Catenary Enroute Screen • v2.0</span>
                    <span>All changes saved to LocalStorage</span>
                </div>
            </div>
        </div>
    );
}
