import { useEffect, useMemo, useState } from "react"
import { fixRouteColor, fixStationArt, fixStationName } from "./data/agencyspecific"
import { fetchSwiftlyArrivals } from "./data/stationdemo"
import type { Arrival } from "./types/StationInformation"
import { enunciator } from "./enunciator"
import { EnunciatorState } from "./types/Enunciator"
import { motion, AnimatePresence } from "motion/react"

export function StationDisplay() {
    const query = new URLSearchParams(window.location.search);
    const getSetting = (key: string, defaultValue: string = "") => query.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;

    const use24h = getSetting('24h') !== 'false';

    let selectedRegion = query.get('chateau')
    let selectedStop = query.get('stop')
    let selectedRoutes = query.get('routes')?.split(',') || ['Metro A Line']

    // State management for station information and visual appearance
    let [announcementTextChunk, setAnnouncementTextChunk] = useState<string | null>(null);
    let [arrivals, setArrivals] = useState<Arrival[]>([])
    let [activeAlerts, setActiveAlerts] = useState<string[]>([])
    let [stopName, setStopName] = useState<string>('Loading...')
    let [loading, setLoading] = useState<boolean>(true)
    let [tick, setTick] = useState<boolean>(false)
    let [stationArt, setStationArt] = useState<string>('')
    let [colorsGradient, setColorsGradient] = useState<string>('')
    let [error, setError] = useState<string | null>(null);
    let [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

    useEffect(() => {
        const resizeHandler = () => setIsPortrait(window.innerHeight > window.innerWidth);
        window.addEventListener('resize', resizeHandler);
        return () => window.removeEventListener('resize', resizeHandler);
    }, []);

    /**
     * Synchronizes and plays station-specific enunciator announcements.
     * @param arrival Optional arrival object for vehicle-specific announcements.
     */
    const stationAnnounce = async (arrival?: Arrival) => {
        let voicedAnnouncement;
        if (arrival) {
            voicedAnnouncement = await enunciator.sync(selectedRegion || '', EnunciatorState.STATION, arrival, null)
        } else {
            voicedAnnouncement = await enunciator.sync(selectedRegion || '', EnunciatorState.STATION, null, null)
        }
        if (voicedAnnouncement) {
            if ((window as any).announcementActive) {
                let reCheckForAnnouncement = setInterval(() => {
                    if (!((window as any).announcementActive)) {
                        clearInterval(reCheckForAnnouncement)
                        if (arrival) {
                            stationAnnounce(arrival)
                        } else {
                            setTimeout(() => stationAnnounce(), 3000)
                        }
                    }
                }, 2000)
            } else {
                (window as any).announcementActive = true;
                setAnnouncementTextChunk('[MSG]');
                setTimeout(() => {
                    if (voicedAnnouncement) {
                        let chunks = voicedAnnouncement.text.match(/.{1,53}/g);
                        if (chunks) {
                            let nextChunk = chunks.shift();
                            if (nextChunk) setAnnouncementTextChunk(nextChunk);
                            let chunkInterval = setInterval(() => {
                                if (chunks && chunks.length > 0) {
                                    let nextChunk = chunks.shift();
                                    if (nextChunk) setAnnouncementTextChunk(nextChunk);
                                } else {
                                    if (!((window as any).announcementActive)) {
                                        clearInterval(chunkInterval);
                                        setAnnouncementTextChunk(null);
                                    }
                                }
                            }, 3500);
                        }
                    }
                }, 1600);
                enunciator.play(voicedAnnouncement).then((success) => {
                    (window as any).announcementActive = false
                })
            }
        }
    }

    useMemo(async () => {
        try {
            if (!selectedRegion || !selectedStop || !selectedRoutes) throw new Error('Chateâu ID, stop, and at least one route name must be provided in the URL query parameters')

            setInterval(() => {
                new Date().getSeconds() % 2 === 0 ? setTick(true) : setTick(false)
            }, 5000)

            let data = await fetchSwiftlyArrivals(selectedRegion!, selectedRoutes, selectedStop!, use24h)

            if (data) {
                setStopName(data.name)
                setArrivals(data.trips)
                setActiveAlerts(data.alerts || []) // Handle potential undefined if fetch fails slightly
                setLoading(false)

                if (data.trips.length > 0) {
                    setStationArt(fixStationArt(selectedRegion, data.trips[0].routeId))
                    let allRouteColors = data.trips.map((trip) => fixRouteColor(selectedRegion, trip.routeId)).filter((arrival, index, array) => array.findIndex(v2 => (v2 === arrival)) === index)
                    setColorsGradient(allRouteColors.length > 1 ? `linear-gradient(to right, ${allRouteColors.join(', ')})` : allRouteColors[0])
                }
            }

            setInterval(async () => {
                let data = await fetchSwiftlyArrivals(selectedRegion!, selectedRoutes, selectedStop!, use24h)
                if (data) {
                    setStopName(data.name)
                    setArrivals(data.trips)
                    setActiveAlerts(data.alerts || [])
                }
            }, 4000)

            setInterval(async () => {
                stationAnnounce()
            }, 60000)
        } catch (error: any) {
            setError(error.message)
        }
    }, [selectedRegion, selectedRoutes, selectedStop, use24h, stationAnnounce]);

    // Current time for header
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const vUnit = isPortrait ? 'vw' : 'vh';
    const hUnit = isPortrait ? 'vh' : 'vw';

    return <div className="w-screen h-screen overflow-hidden relative bg-slate-900">
        {arrivals.length >= 1 && <>
            {/* Header Bar */}
            <div className={`fixed top-0 left-0 w-full bg-[#1a4475] text-white flex items-center justify-between z-50 border-b-2 border-slate-500`} style={{ height: `6${vUnit}`, paddingLeft: isPortrait ? '5vw' : '3vw', paddingRight: isPortrait ? '5vw' : '3vw' }}>
                <span className={`font-bold truncate`} style={{ fontSize: `3${vUnit}`, maxWidth: `65${hUnit}` }}>{fixStationName(stopName)}</span>
                <span className={`font-medium font-mono`} style={{ fontSize: `3${vUnit}` }}>{currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: !use24h })}</span>
            </div>

            {/* Background Art placeholder */}
            <div className="fixed top-0 left-0 w-screen h-screen bg-cover bg-center opacity-30 pointer-events-none -z-10" style={{ backgroundImage: 'url(/art/default.png)' }}></div>

            {/* Alerts Ticker */}
            {activeAlerts.length > 0 && (
                <div className={`fixed bottom-0 left-0 w-full bg-[#1a4475] text-white font-bold whitespace-nowrap overflow-hidden z-20 border-t-2 border-white`} style={{ padding: `0.5${vUnit}`, fontSize: `1.8${vUnit}` }}>
                    <div className={`animate-marquee inline-block px-[100${hUnit}]`}>
                        {activeAlerts.join(" • ")}
                    </div>
                </div>
            )}

            {/* Announcement Overlay (only if active) */}
            {announcementTextChunk &&
                <div className={`fixed bottom-0 left-0 w-screen bg-[#f9e300] text-black z-[100]`} style={{ fontSize: `4${vUnit}`, padding: `0.5${vUnit} 2${hUnit}` }}>
                    <span className='font-semibold'>{announcementTextChunk === '[MSG]' && <span className='font-bold pulse'>&rarr; Your attention please</span>} {announcementTextChunk.replace('[MSG]', '')}</span>
                </div>
            }

            {/* Arrivals List */}
            <div className={`fixed grid grid-cols-1 z-10`} style={{
                left: `2.5${hUnit}`,
                top: `7${vUnit}`,
                width: isPortrait ? `95${hUnit}` : `45${hUnit}`,
                gap: `0.5${vUnit}`
            }}>
                <AnimatePresence mode='popLayout'>
                    {arrivals.slice(0, 8).map((arrival, index) => {
                        return (
                            <motion.div key={arrival.key}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => {
                                    stationAnnounce(arrival);
                                    window.location.href = `/?mode=enroute&chateau=${selectedRegion}&trip=${arrival.key}`;
                                }}
                                className='rounded-lg leading-none flex items-center justify-between shadow-lg cursor-pointer hover:brightness-110 transition-all'
                                style={{
                                    backgroundColor: arrival.color,
                                    color: arrival.text,
                                    height: isPortrait ? `14${vUnit}` : `9.2${vUnit}`, // Adjusted to fit 8
                                    paddingLeft: `1.6${hUnit}`,
                                    paddingRight: `0.8${hUnit}`
                                }}>
                                <div className="overflow-hidden">
                                    <div className='truncate pb-[0.2${vUnit}]' style={{ fontSize: `2.2${vUnit}` }}>
                                        {arrival.route} {arrival.run !== '' && arrival.run} to:
                                    </div>
                                    <div className='font-bold whitespace-nowrap truncate' style={{ fontSize: `3.5${vUnit}`, width: isPortrait ? `55${hUnit}` : `30${hUnit}` }}>
                                        {fixStationName(arrival.headsign)}
                                    </div>
                                </div>
                                <span className='text-right font-bold flex flex-row items-center justify-end gap-[1.5${hUnit}]' style={{ minWidth: `15${hUnit}` }}>
                                    <span style={{ fontSize: `5${vUnit}`, lineHeight: 1 }}>
                                        {((tick && arrival.time !== '') || arrival.time === '') && <>{arrival.min <= 0 ? <span className="pulse">DUE</span> : <>{arrival.min} <span className="font-light" style={{ fontSize: `2.4${vUnit}` }}>min</span></>}</>}
                                        {(!tick && arrival.time !== '') && (
                                            use24h ?
                                                arrival.time :
                                                <>{arrival.time.replace('AM', '').replace('PM', '')} <span className="font-light" style={{ fontSize: `2.4${vUnit}` }}>{arrival.time.split(' ')[1] && arrival.time.split(' ')[1].toLowerCase()}</span></>
                                        )}
                                    </span>
                                    <div style={{ lineHeight: 1 }}>
                                        {arrival.live && <svg style={{ height: `2.6${vUnit}`, width: `2.6${vUnit}` }} viewBox="0 -960 960 960" fill={arrival.text}><path d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z" /></svg>}
                                        {!arrival.live && <svg style={{ height: `2.6${vUnit}`, width: `2.6${vUnit}` }} viewBox="0 -960 960 960 960" fill={arrival.text}><path d="M440-120v-264L254-197l-57-57 187-186H120v-80h264L197-706l57-57 186 187v-264h80v264l186-187 57 57-187 186h264v80H576l187 186-57 57-186-187v264h-80Z" /></svg>}
                                    </div>
                                </span>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
            {!isPortrait && (
                <div className='fixed right-0 z-0 bg-cover bg-center' style={{ top: `6${vUnit}`, bottom: `3${vUnit}`, width: `50${hUnit}`, backgroundImage: 'url(/alert/pride.png)' }}></div>
            )}
            {isPortrait && (
                <div className='fixed bottom-0 left-0 h-[30vh] w-screen -z-10 bg-cover opacity-30 pointer-events-none' style={{ backgroundImage: 'url(/alert/pride.png)', backgroundPosition: 'center bottom' }}></div>
            )}
        </>}
        {arrivals.length < 1 && <>
            <div className={`fixed top-0 left-0 w-full bg-[#1a4475] text-white flex items-center justify-between z-50 border-b-2 border-slate-500`} style={{ height: `6${vUnit}`, paddingLeft: isPortrait ? '5vw' : '3vw', paddingRight: isPortrait ? '5vw' : '3vw' }}>
                <span className={`font-bold truncate`} style={{ fontSize: `3${vUnit}` }}>Loading...</span>
                <span className={`font-medium font-mono`} style={{ fontSize: `3${vUnit}` }}>{currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: !use24h })}</span>
            </div>
            {error && <p className={`font-semibold text-danger w-screen h-screen flex items-center justify-center`} style={{ fontSize: `2${vUnit}` }}>{error}</p>}
            {(!error && loading) && <p className={`font-semibold text-seashore w-screen h-screen flex items-center justify-center`} style={{ fontSize: `2${vUnit}` }}>Loading...</p>}
            {(!error && !loading && arrivals.length === 0) && <p className={`font-semibold text-white w-screen h-screen flex items-center justify-center`} style={{ fontSize: `2${vUnit}` }}>No upcoming departures scheduled.</p>}
        </>}
    </div>
}