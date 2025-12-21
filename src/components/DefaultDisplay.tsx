import { useEffect, useState } from 'react';
import type { NearbyDeparturesFromCoordsV2Response } from './types/birchtypes';
import { fixHeadsignText, fixRouteColor, fixRouteName, fixRouteTextColor, fixStationName } from './data/agencyspecific';
import { motion, AnimatePresence } from "motion/react"

/**
 * @typedef {Object} DisplayItem
 * @property {string} key - Unique identifier for the display item.
 * @property {string} routeShortName - Short name of the route.
 * @property {string} headsign - Destination headsign for the trip.
 * @property {string} formattedTime - Formatted arrival time.
 * @property {number} min - Minutes until arrival.
 * @property {string} color - Route color.
 * @property {string} textColor - Route text color.
 * @property {string} stopName - Name of the stop.
 * @property {string} chateau - Chateau ID (agency identifier).
 * @property {string} tripId - ID of the trip.
 * @property {string} stopId - ID of the stop.
 */
type DisplayItem = {
    key: string;
    routeShortName: string;
    headsign: string;
    formattedTime: string;
    min: number;
    color: string;
    textColor: string;
    stopName: string;
    chateau: string;
    tripId: string;
    stopId: string;
}

/**
 * DefaultDisplay component for showing nearby transit departures.
 * It fetches location, then retrieves and displays nearby transit data,
 * including departures, alerts, and real-time updates.
 */
export function DefaultDisplay() {
    const [nearbyData, setNearbyData] = useState<NearbyDeparturesFromCoordsV2Response | null>(null);
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isPortrait] = useState(window.innerHeight > window.innerWidth);

    const query = new URLSearchParams(window.location.search);

    /**
     * Retrieves a setting value, prioritizing URL parameters, then localStorage, then a default value.
     * @param {string} key - The key for the setting.
     * @param {string} [defaultValue=""] - The default value if the setting is not found.
     * @returns {string} The retrieved setting value.
     */
    const getSetting = (key: string, defaultValue: string = "") => query.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;

    const use24h = getSetting('24h') !== 'false';

    /**
     * Effect hook for initial location resolution.
     * Prioritizes URL/LocalStorage overrides before falling back to browser geolocation.
     * Sets loading state and handles potential errors.
     */
    useEffect(() => {
        const urlLat = getSetting('lat');
        const urlLon = getSetting('lon');

        if (urlLat && urlLon) {
            setLocation({ lat: parseFloat(urlLat), lon: parseFloat(urlLon) });
            setLoading(false);
        } else if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            }, (err) => {
                setError("Unable to retrieve location");
                setLoading(false);
            }, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        } else {
            setError("Geolocation is not supported");
            setLoading(false);
        }
    }, []);

    /**
     * Effect hook for updating the current time every second.
     * Used for displaying a real-time clock in the header.
     */
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    /**
     * Effect hook for fetching nearby transit data.
     * Triggers whenever the `location` state changes.
     * Sets loading state, handles API calls, and updates `nearbyData` or `error` states.
     */
    useEffect(() => {
        if (!location) return;
        setLoading(true);
        const url = `https://birch.catenarymaps.org/nearbydeparturesfromcoordsv2?lat=${location.lat}&lon=${location.lon}&radius=1500`;
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(data => {
                setNearbyData(data);
                setLoading(false);
                setError(null);
            })
            .catch((err: any) => {
                console.error(err);
                setError(`Failed to fetch nearby transit data: ${err.message}`);
                setLoading(false);
            });
    }, [location]);



    // Process and sort departures
    type DisplayItem = {
        key: string;
        routeShortName: string;
        headsign: string;
        formattedTime: string;
        min: number;
        color: string;
        textColor: string;
        stopName: string;
        chateau: string;
        tripId: string;
        stopId: string;
    }

    const items: DisplayItem[] = [];
    if (nearbyData) {
        const rawModes = getSetting('modes');
        let allowedModes: number[] = [];
        if (rawModes) {
            try {
                if (rawModes.startsWith('[')) {
                    allowedModes = JSON.parse(rawModes);
                } else {
                    allowedModes = rawModes.split(',').map(Number);
                }
            } catch (e) {
                allowedModes = [];
            }
        }

        nearbyData.departures.forEach(dep => {
            if (dep.route_type !== undefined && allowedModes.length > 0 && !allowedModes.includes(dep.route_type)) {
                return;
            }
            const routeName = fixRouteName(dep.chateau_id, dep.short_name || dep.long_name || dep.route_id, dep.route_id);

            Object.keys(dep.directions).map(key => dep.directions[key]).forEach(directionGroup => {
                Object.keys(directionGroup).map(key => directionGroup[key]).forEach(dir => {
                    dir.trips.forEach(trip => {
                        const stopInfo = nearbyData.stop[dep.chateau_id]?.[trip.stop_id];
                        const stopName = stopInfo ? fixStationName(stopInfo.name) : "Unknown Stop";

                        const arrivalTime = trip.departure_realtime || trip.departure_schedule;
                        if (!arrivalTime) return;

                        const now = Date.now() / 1000;
                        const min = Math.floor((arrivalTime - now) / 60);
                        if (min < -2) return;

                        items.push({
                            key: `${dep.chateau_id}-${trip.trip_id}-${trip.stop_id}`,
                            routeShortName: routeName,
                            headsign: fixHeadsignText(dir.headsign),
                            formattedTime: new Date(arrivalTime * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !use24h }),
                            min: min,
                            color: fixRouteColor(dep.chateau_id, dep.route_id, dep.color),
                            textColor: fixRouteTextColor(dep.chateau_id, dep.route_id, dep.text_color),
                            stopName: stopName,
                            chateau: dep.chateau_id,
                            tripId: trip.trip_id,
                            stopId: trip.stop_id
                        });
                    });
                });
            });
        });
        items.sort((a, b) => a.min - b.min);
    }

    const displayItems = items.slice(0, isPortrait ? 24 : 16);

    const activeAlerts: string[] = [];
    if (nearbyData?.alerts) {
        Object.values(nearbyData.alerts).forEach(agencyAlerts => {
            Object.values(agencyAlerts).forEach(alert => {
                const text = alert.header_text?.translation?.[0]?.text || alert.description_text?.translation?.[0]?.text;
                if (text) activeAlerts.push(text);
            });
        });
    }

    const vUnit = isPortrait ? 'vw' : 'vh';
    const hUnit = isPortrait ? 'vh' : 'vw';

    return (
        <div className="fixed top-0 left-0 w-screen h-screen bg-slate-900 overflow-hidden font-sans">
            {/* Header Bar */}
            <div className={`absolute top-0 left-0 w-full bg-[#1a4475] text-white flex items-center justify-between z-10 border-b-2 border-slate-500`} style={{ height: isPortrait ? '5vh' : '6vh', paddingLeft: isPortrait ? '3vw' : '3vw', paddingRight: isPortrait ? '3vw' : '3vw' }}>
                <span className={`font-bold truncate`} style={{ fontSize: isPortrait ? '2.5vh' : '3vh' }}>Nearby Departures</span>
                <span className={`font-medium font-mono`} style={{ fontSize: isPortrait ? '2.5vh' : '3vh' }}>{currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: !use24h })}</span>
            </div>

            {/* Main Content Area */}
            <div className="absolute left-0 right-0 bottom-0" style={{ top: isPortrait ? '6vh' : '8vh' }}>
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full p-10 text-center text-white">
                        <p className='font-semibold text-red-400 text-[3vw] mb-4'>Error: {error}</p>
                        <button onClick={() => window.location.reload()} className="bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-600 transition-colors">Retry</button>
                        <p className="opacity-40 mt-10 text-sm italic">Press 'C' to open configuration</p>
                    </div>
                ) : (!nearbyData) ? (
                    <div className="flex flex-col items-center justify-center h-full text-white">
                        <p className='font-semibold text-seashore text-[2vw] animate-pulse'>Finding nearby stops...</p>
                        <p className="opacity-30 mt-4 text-sm italic">Searching based on {getSetting('lat') ? 'Manual Override' : 'Current Location'}</p>
                    </div>
                ) : (
                    <div className={`absolute flex flex-col`} style={{
                        top: `0`,
                        left: isPortrait ? '2vw' : '2vw',
                        right: isPortrait ? '2vw' : '55vw',
                        gap: isPortrait ? '0.6vh' : '0.45vh'
                    }}>
                        <AnimatePresence mode='popLayout'>
                            {displayItems.map(item => (
                                <motion.div key={item.key}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className='rounded-lg leading-none flex items-center justify-between cursor-pointer shadow-lg hover:brightness-110'
                                    style={{
                                        backgroundColor: item.color,
                                        color: item.textColor,
                                        height: isPortrait ? '6.5vh' : '4.9vh',
                                        paddingLeft: isPortrait ? '3vw' : '1.2vw',
                                        paddingRight: isPortrait ? '3vw' : '0.8vw'
                                    }}
                                    onClick={() => {
                                        window.location.href = `/?mode=enroute&chateau=${item.chateau}&trip=${item.tripId}`;
                                    }}
                                >
                                    <div className="flex-grow overflow-hidden">
                                        <div className='font-medium opacity-90' style={{ fontSize: isPortrait ? '1.4vh' : '1.1vh', marginBottom: isPortrait ? '0.2vh' : '0.1vh' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.location.href = `/?mode=station&chateau=${item.chateau}&stop=${item.stopId}`;
                                            }}
                                        >
                                            <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{item.routeShortName}</span> <span className="opacity-70">towards</span>
                                        </div>
                                        <div className='font-bold truncate leading-tight' style={{ fontSize: isPortrait ? '2.2vh' : '2.6vh' }}>{item.headsign}</div>
                                    </div>
                                    <div className='font-bold text-right' style={{ fontSize: isPortrait ? '2.8vh' : '3.5vh', minWidth: isPortrait ? '20vw' : '9vw' }}>
                                        {item.min <= 0 ? <span className="animate-pulse text-yellow-300">DUE</span> : <>{item.min} <span className="font-light opacity-80" style={{ fontSize: isPortrait ? '1.6vh' : '1.8vh' }}>min</span></>}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {displayItems.length === 0 && <div className="text-white mt-[2vw]" style={{ fontSize: isPortrait ? '3vh' : '2vh' }}>No convenient departures found nearby.</div>}
                    </div>
                )}
            </div>



            {/* Background Art placeholder */}
            <div className="fixed top-0 left-0 w-screen h-screen bg-cover bg-center opacity-30 pointer-events-none -z-10" style={{ backgroundImage: 'url(/art/default.png)' }}></div>

            {activeAlerts.length > 0 && (
                <div className="absolute bottom-0 left-0 w-full bg-yellow-600 text-black font-bold whitespace-nowrap overflow-hidden z-20 border-t-4 border-yellow-800" style={{ padding: `0.5${vUnit}`, fontSize: `1.8${vUnit}` }}>
                    <div className={`animate-marquee inline-block px-[100${hUnit}]`}>
                        {activeAlerts.join(" • ")}
                    </div>
                </div>
            )}
        </div>
    );

}
