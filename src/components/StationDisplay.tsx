
import React, { useEffect, useState, useRef } from "react";
import { fixStationName } from "./data/agencyspecific";
import { fetchSwiftlyArrivals } from "./data/stationdemo";
import type { Arrival } from "./types/StationInformation";
import { StationAnnouncer } from "../utils/StationAnnouncer";

export const StationDisplay: React.FC = () => {
    // Config
    const getSetting = (key: string, defaultValue = "") => {
        if (typeof window === "undefined") return defaultValue;
        const params = new URLSearchParams(window.location.search);
        return params.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;
    };

    const use24h = getSetting("24h") !== "false";
    
    // State
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

    // Computed Units
    const vUnit = isPortrait ? "vw" : "vh";
    const hUnit = isPortrait ? "vh" : "vw";

    const announcerRef = useRef<StationAnnouncer | null>(null);

    useEffect(() => {
         announcerRef.current = new StationAnnouncer((chunk) => {
            setAnnouncementTextChunk(chunk);
        });
    }, []);

    const stationAnnounce = (arrival?: Arrival) => {
        const params = new URLSearchParams(window.location.search);
        const selectedRegion = params.get("chateau");
        if (!selectedRegion || !announcerRef.current) return;
        announcerRef.current.announce(selectedRegion, arrival);
    };

    useEffect(() => {
        const handleResize = () => {
             setInnerWidth(window.innerWidth);
             setInnerHeight(window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const tickTimer = setInterval(() => setTick(new Date().getSeconds() % 2 === 0), 5000);

        // Data fetching
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

        // Announcement loop
        const announceInterval = setInterval(() => {
             stationAnnounce();
        }, 60000);

        return () => {
            mounted = false;
            window.removeEventListener("resize", handleResize);
            clearInterval(timer);
            clearInterval(tickTimer);
            clearInterval(dataInterval);
            clearInterval(announceInterval);
        };
    }, [use24h]); // Dependency on usage preference

    return (
        <div
            className="w-screen h-screen overflow-hidden relative font-sans"
            style={{ backgroundColor: "var(--catenary-background)" }}
        >
            {arrivals.length >= 1 ? (
                <>
                    {/* Header Bar */}
                    <div
                        className="fixed top-0 left-0 w-full text-white flex items-center justify-between z-50 border-b-2 border-slate-500"
                        style={{
                            height: `6${vUnit}`,
                            paddingLeft: isPortrait ? "5vw" : "3vw",
                            paddingRight: isPortrait ? "5vw" : "3vw",
                            backgroundColor: "var(--catenary-darksky)",
                        }}
                    >
                        <span
                            className="font-bold truncate"
                            style={{ fontSize: `3${vUnit}`, maxWidth: `65${hUnit}` }}
                        >
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

                    {/* Background Art */}
                    <div
                         className="fixed top-0 left-0 w-screen h-screen bg-cover bg-center opacity-30 pointer-events-none -z-10"
                         style={{ backgroundImage: "url(/art/default.png)" }}
                    ></div>

                    {/* Alerts Ticker */}
                    {activeAlerts.length > 0 && (
                        <div
                            className="fixed bottom-0 left-0 w-full text-white font-bold whitespace-nowrap overflow-hidden z-20 border-t-2 border-white"
                            style={{
                                padding: `0.5${vUnit}`,
                                fontSize: `1.8${vUnit}`,
                                backgroundColor: "var(--catenary-darksky)",
                            }}
                        >
                             <div className="animate-marquee inline-block" style={{ paddingLeft: `100${hUnit}`}}>
                                 {activeAlerts.join(" • ")}
                             </div>
                        </div>
                    )}

                    {/* Announcement Overlay */}
                    {announcementTextChunk && (
                        <div
                            className="fixed bottom-0 left-0 w-screen bg-[#f9e300] text-black z-[100]"
                            style={{
                                fontSize: `4${vUnit}`,
                                padding: `0.5${vUnit} 2${hUnit}`,
                            }}
                        >
                            <span className="font-semibold">
                                {announcementTextChunk === "[MSG]" ? (
                                    <span className="font-bold animate-pulse">
                                        &rarr; Your attention please
                                    </span>
                                ) : (
                                    announcementTextChunk.replace("[MSG]", "")
                                )}
                            </span>
                        </div>
                    )}

                    {/* Arrivals List */}
                    <div
                        className="fixed grid grid-cols-1 z-10 transition-all"
                        style={{
                            left: `2.5${hUnit}`,
                            top: `7${vUnit}`,
                            width: isPortrait ? `95${hUnit}` : `45${hUnit}`,
                            gap: `0.5${vUnit}`,
                        }}
                    >
                        {arrivals.slice(0, 8).map((arrival) => (
                             <div
                                key={arrival.key}
                                onClick={() => {
                                    stationAnnounce(arrival);
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
                                     <div
                                        className="truncate"
                                        style={{ fontSize: `2.2${vUnit}`, paddingBottom: `0.2${vUnit}`}}
                                     >
                                         {arrival.route}
                                         {arrival.run !== "" && arrival.run} to:
                                     </div>
                                     <div
                                         className="font-bold whitespace-nowrap truncate"
                                         style={{
                                             fontSize: `3.5${vUnit}`,
                                             width: isPortrait ? `55${hUnit}` : `30${hUnit}`,
                                         }}
                                     >
                                         {fixStationName(arrival.headsign)}
                                     </div>
                                 </div>

                                 <span
                                     className="text-right font-bold flex flex-row items-center justify-end"
                                     style={{ minWidth: `15${hUnit}`, gap: `1.5${hUnit}` }}
                                 >
                                     <span style={{ fontSize: `5${vUnit}`, lineHeight: 1 }}>
                                        {((tick && arrival.time !== "") || arrival.time === "") && (
                                            arrival.min <= 0 ? (
                                                 <span className="animate-pulse">DUE</span>
                                            ) : (
                                                <>
                                                 {arrival.min}
                                                 <span className="font-light" style={{ fontSize: `2.4${vUnit}`}}>min</span>
                                                </>
                                            )
                                        )}
                                        {(!tick && arrival.time !== "") && (
                                             use24h ? arrival.time : (
                                                 <>
                                                     {arrival.time.replace("AM", "").replace("PM", "")}
                                                     <span className="font-light" style={{ fontSize: `2.4${vUnit}`}}>
                                                         {arrival.time.split(" ")[1]?.toLowerCase()}
                                                     </span>
                                                 </>
                                             )
                                        )}
                                     </span>
                                     <div style={{ lineHeight: 1 }}>
                                         {arrival.live ? (
                                              <svg
                                              style={{ height: `2.6${vUnit}`, width: `2.6${vUnit}` }}
                                              viewBox="0 -960 960 960"
                                              fill={arrival.text}
                                              ><path
                                                  d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z"
                                              /></svg>
                                         ) : (
                                            <svg
                                            style={{ height: `2.6${vUnit}`, width: `2.6${vUnit}` }}
                                            viewBox="0 -960 960 960"
                                            fill={arrival.text}
                                            ><path
                                                d="M440-120v-264L254-197l-57-57 187-186H120v-80h264L197-706l57-57 186 187v-264h80v264l186-187 57 57-187 186h264v80H576l187 186-57 57-186-187v264h-80Z"
                                            /></svg>
                                         )}
                                     </div>
                                 </span>
                             </div>
                        ))}
                    </div>
                </>
            ) : (
                /* Loading / Empty State */
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
                        <span className="font-bold truncate" style={{ fontSize: `3${vUnit}` }}>
                            Loading...
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

                    {error ? (
                        <p
                            className="font-semibold text-red-500 w-screen h-screen flex items-center justify-center"
                            style={{ fontSize: `2${vUnit}` }}
                        >
                            {error}
                        </p>
                    ) : loading ? (
                         <p
                            className="font-semibold w-screen h-screen flex items-center justify-center"
                            style={{ fontSize: `2${vUnit}`, color: "var(--catenary-seashore)" }}
                        >
                            Loading...
                        </p>
                    ) : (
                        <p
                            className="font-semibold text-white w-screen h-screen flex items-center justify-center"
                            style={{ fontSize: `2${vUnit}` }}
                        >
                            No upcoming departures scheduled.
                        </p>
                    )}
                </>
            )}
        </div>
    );
};
