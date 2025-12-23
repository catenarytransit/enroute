import React, {useEffect, useState, useRef} from "react";
import type { JSX } from "react";
import { fixStationName } from "../data/agencyspecific";
import { fetchSwiftlyArrivals } from "../data/stationdemo";
import type { Arrival } from "../types/StationInformation";
import { StationAnnouncer } from "../../utils/StationAnnouncer";
import { loadDynamicPanes } from "../../utils/DynamicLoader";
import type { PaneConfig } from "../types/PaneConfig";

export default function Station(): JSX.Element {
    const getSetting = (key: string, defaultValue = "") => {
        if (typeof window === "undefined") return defaultValue;
        const params = new URLSearchParams(window.location.search);
        return params.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;
    };

    const use24h = getSetting("24h") !== "false";

    const [arrivals, setArrivals] = useState<Arrival[]>([]);
    const [activeAlerts, setActiveAlerts] = useState<string[]>([]);
    const [stopName, setStopName] = useState("Loading...");
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [announcementTextChunk, setAnnouncementTextChunk] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [innerWidth, setInnerWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
    const [innerHeight, setInnerHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 0);
    const isPortrait = innerHeight > innerWidth;

    const vUnit = isPortrait ? "vw" : "vh";
    const hUnit = isPortrait ? "vh" : "vw";

    const announcerRef = useRef<any>(null);

    useEffect(() => {
         announcerRef.current = new StationAnnouncer((chunk: string | null) => {
            if (chunk) setAnnouncementTextChunk(chunk);
        });
    }, []);

    useEffect(() => {
        const handleResize = () => {
             setInnerWidth(window.innerWidth);
             setInnerHeight(window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const tickTimer = setInterval(() => setTick(new Date().getSeconds() % 2 === 0), 5000);

        let mounted = true;
        const params = new URLSearchParams(window.location.search);
        const selectedRegion = params.get("chateau");
        const selectedStop = params.get("stop");
        const selectedRoutes = params.get("routes")?.split(",") || ["Metro A Line"];

        const fetchData = async () => {
             if (!selectedRegion || !selectedStop) {
                 if (mounted) setError("Chateâu ID and stop must be provided.");
                 return;
             }
             try {
                 const data = await fetchSwiftlyArrivals(selectedRegion, selectedRoutes, selectedStop, use24h);
                 if (mounted && data) {
                     setStopName(data.name);
                     if (data.trips) setArrivals(data.trips);
                     setActiveAlerts(data.alerts || []);
                     setLoading(false);
                 }
             } catch (err: any) {
                 if (mounted) setError(err.message);
             }
        };

        const dataInterval = setInterval(fetchData, 4000);
        fetchData(); // Initial

        const announceInterval = setInterval(() => {
             const params = new URLSearchParams(window.location.search);
             const selectedRegion = params.get("chateau");
             if (selectedRegion && announcerRef.current) announcerRef.current.announce(selectedRegion);
        }, 60000);

        return () => {
            mounted = false;
            window.removeEventListener("resize", handleResize);
            clearInterval(timer);
            clearInterval(tickTimer);
            clearInterval(dataInterval);
            clearInterval(announceInterval);
        };
    }, [use24h]);

    useEffect(() => {
        loadDynamicPanes().then((loadedPanes) => {
            const paneConfigs: PaneConfig[] = loadedPanes.map((pane) => ({
                id: pane.metadata.title,
                type: pane.metadata.type as PaneConfig['type'],
                description: pane.metadata.description,
            }));
            console.log("Loaded Panes:", paneConfigs);
        });
    }, []);

    return (
        <div className="w-screen h-screen overflow-hidden relative font-sans" style={{ backgroundColor: "var(--catenary-background)" }}>
            {arrivals.length >= 1 ? (
                <>
                    <div
                        className="fixed top-0 left-0 w-full text-white flex items-center justify-between z-50 border-b-2 border-slate-500"
                        style={{
                            height: `6${vUnit}`,
                            paddingLeft: isPortrait ? "5vw" : "3vw",
                            paddingRight: isPortrait ? "5vw" : "3vw",
                            backgroundColor: "var(--catenary-darksky)",
                        }}
                    >
                        <span className="font-bold truncate" style={{ fontSize: `3${vUnit}`, maxWidth: `65${hUnit}` }}>
                            {fixStationName(stopName)}
                        </span>
                        <span className="font-medium font-mono" style={{ fontSize: `3${vUnit}` }}>
                            {currentTime.toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: !use24h,
                            })}
                        </span>
                    </div>

                    <div className="fixed top-0 left-0 w-screen h-screen bg-cover bg-center opacity-30 pointer-events-none -z-10" style={{ backgroundImage: "url(/art/default.png)" }} />

                    {arrivals.slice(0, 8).map((arrival) => (
                        <div
                            key={arrival.key}
                            onClick={() => {
                                const params = new URLSearchParams(window.location.search);
                                const chateau = params.get("chateau");
                                window.location.href = `/?mode=enroute&chateau=${chateau}&trip=${arrival.key}`;
                            }}
                            className="rounded-lg leading-none flex items-center justify-between shadow-lg cursor-pointer hover:brightness-110 transition-all duration-300"
                            style={{
                                backgroundColor: arrival.color,
                                color: arrival.text,
                                height: isPortrait ? `14${vUnit}` : `9.2${vUnit}`,
                                paddingLeft: `1.6${hUnit}`,
                                paddingRight: `0.8${hUnit}`,
                            }}
                            role="button"
                            tabIndex={0}
                        >
                            <div className="overflow-hidden">
                                <div className="truncate" style={{ fontSize: `2.2${vUnit}`, paddingBottom: `0.2${vUnit}` }}>
                                    {arrival.route}
                                    {arrival.run !== "" && arrival.run} to:
                                </div>
                                <div className="font-bold whitespace-nowrap truncate" style={{ fontSize: `3.5${vUnit}`, width: isPortrait ? `55${hUnit}` : `30${hUnit}` }}>
                                    {fixStationName(arrival.headsign)}
                                </div>
                            </div>

                            <span className="text-right font-bold flex flex-row items-center justify-end" style={{ minWidth: `15${hUnit}`, gap: `1.5${hUnit}` }}>
                                <span style={{ fontSize: `5${vUnit}`, lineHeight: 1 }}>
                                    {arrival.min <= 0 ? <span className="animate-pulse">DUE</span> : (
                                        <>
                                            {arrival.min}
                                            <span className="font-light" style={{ fontSize: `2.4${vUnit}` }}>min</span>
                                        </>
                                    )}
                                </span>
                            </span>
                        </div>
                    ))}

                </>
            ) : (
                <div className="w-screen h-screen flex items-center justify-center">Loading...</div>
            )}
        </div>
    );
}
