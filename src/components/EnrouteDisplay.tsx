import React, { useEffect, useState, useMemo, useRef } from "react";
import { EnrouteDisplayLogic } from "../utils/EnrouteDisplayLogic";
import type { TripInformation } from "./types/TripInformation";
import { fixStationName } from "./data/agencyspecific";

export const EnrouteDisplay: React.FC = () => {
    // State
    const [tripInfo, setTripInfo] = useState<TripInformation | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [announcementTextChunk, setAnnouncementTextChunk] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    const [innerWidth, setInnerWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
    const [innerHeight, setInnerHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 0);
    const isPortrait = innerHeight > innerWidth;

    // Logic Instance
    const logicRef = useRef(new EnrouteDisplayLogic());
    
    // Config
    const getSetting = (key: string, defaultValue = "") => {
        if (typeof window === "undefined") return defaultValue;
        const params = new URLSearchParams(window.location.search);
        return params.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;
    };

    const use24h = getSetting("24h") !== "false";
    
    // Resize Handler
    useEffect(() => {
        const handleResize = () => {
            setInnerWidth(window.innerWidth);
            setInnerHeight(window.innerHeight);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Main Fetch Loop
    useEffect(() => {
        let mounted = true;
        const params = new URLSearchParams(window.location.search);
        const chateau = params.get("chateau");
        const trip = params.get("trip");
        
        const fetchIt = async () => {
            const result = await logicRef.current.fetchTripInfo(
                chateau,
                trip,
                use24h,
                isPortrait,
                (text) => {
                    if (mounted) setAnnouncementTextChunk(text);
                }
            );

            if (mounted) {
                if (result.error) {
                    setError(result.error);
                } else {
                    if (result.tripInfo) setTripInfo(result.tripInfo);
                    // Explicitly handle announcement text init if provided immediately (though callback handles updates)
                    if (result.announcementTextChunk !== undefined) {
                         setAnnouncementTextChunk(result.announcementTextChunk);
                    }
                }
            }
        };

        const interval = setInterval(fetchIt, 1000);
        fetchIt();

        return () => {
            mounted = false;
            clearInterval(interval);
            logicRef.current.cleanup();
        };
    }, [use24h, isPortrait]);

    // Computed Units & Metrics
    const vUnit = isPortrait ? "vw" : "vh";
    const hUnit = isPortrait ? "vh" : "vw";
    
    // Helper to get unit string value
    const getVal = (val: number, unit: string) => `${val}${unit}`;

    const routeLineStr = isPortrait ? "0" : `min(5${hUnit}, 32px)`;
    const timelineLeftStr = isPortrait ? "0" : `min(2.5${hUnit}, 16px)`;
    const timelineCircleSizeStr = isPortrait ? "0" : `min(5${hUnit}, 32px)`;
    const listPaddingLeft = isPortrait ? 3 : 10;

    // Timeline metrics
    const { stopMetrics, lineHeight } = useMemo(() => {
        if (!tripInfo) return { stopMetrics: [], lineHeight: 0 };

        const CONTAINER_TOP = 7;
        const CONTAINER_PAD = 1;
        let cursor = CONTAINER_TOP + CONTAINER_PAD;

        const metrics = tripInfo.nextStops.map((stop) => {
            const isSpacer = stop.isSpacer;
            const height = isSpacer ? 4 : isPortrait ? 9 : 9.375;
            const marginTop = isSpacer ? 0 : isPortrait ? 0.4 : 0.6;
            const marginBottom = isSpacer ? 0 : isPortrait ? 0.4 : 0.6;

            cursor += marginTop;
            const center = cursor + height / 2;
            cursor += height;
            cursor += marginBottom;

            return {
                center,
                height,
                cursor: cursor - height - marginBottom,
                isSpacer: isSpacer || false,
            };
        });

        const lastMetric = metrics[metrics.length - 1];
        const lh = lastMetric ? lastMetric.center - CONTAINER_TOP : 0;

        return { stopMetrics: metrics, lineHeight: lh };
    }, [tripInfo, isPortrait]);

    return (
        <div className="w-screen h-screen overflow-hidden relative font-sans">
            {tripInfo ? (
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
                            style={{ maxWidth: `70${hUnit}`, fontSize: `3${vUnit}` }}
                        >
                            {tripInfo.route}
                            {tripInfo.run && <span className="font-normal">#{tripInfo.run}</span>}
                             {" to "} 
                            {fixStationName(tripInfo.finalStop)}
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

                    {/* Stop List */}
                    <div
                        className="fixed grid grid-cols-1 p-[1hUnit]" // Note: manual replacement of unit in style object below
                        style={{
                            top: `7${vUnit}`,
                            right: isPortrait ? `2${vUnit}` : `1${hUnit}`,
                            width: isPortrait ? `calc(100vw - 4${vUnit})` : `90${hUnit}`,
                            left: isPortrait ? `2${vUnit}` : "auto",
                            padding: `1${hUnit}`
                        }}
                    >
                        {tripInfo.nextStops.map((stop, index) => (
                            <div key={stop.key || index} className="transition-all duration-300"> 
                                {stop.isSpacer ? (
                                    <div
                                        className="flex items-center justify-center text-slate-300 italic font-bold"
                                        style={{
                                            height: `4${vUnit}`,
                                            paddingLeft: isPortrait ? "5vw" : "10vw",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: isPortrait ? `3.5${vUnit}` : `2.5${vUnit}`,
                                            }}
                                        >
                                            {stop.count || stop.name.split(" ")[0]} more stops
                                        </span>
                                    </div>
                                ) : (
                                    <div
                                        className="rounded-lg leading-none flex items-center justify-start cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all"
                                        style={{
                                            gap: isPortrait ? "3vw" : `2${hUnit}`,
                                            backgroundColor: tripInfo.color,
                                            color: tripInfo.textColor,
                                            height: isPortrait ? `9${vUnit}` : `${56.25 / 6}${vUnit}`,
                                            paddingLeft: isPortrait ? "4vw" : `${listPaddingLeft}${hUnit}`,
                                            paddingRight: `0.8${hUnit}`,
                                            margin: `${isPortrait ? 0.4 : 0.6}${vUnit} 0.3${hUnit}`,
                                        }}
                                        onClick={() => {
                                            if (stop.stopId) {
                                                window.location.href = `/?mode=station&chateau=${tripInfo.chateau}&stop=${stop.stopId}`;
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <span
                                            className="text-left font-bold whitespace-nowrap"
                                            style={{
                                                fontSize: `5${vUnit}`,
                                                minWidth: isPortrait ? "22vw" : `20${hUnit}`,
                                            }}
                                        >
                                            {stop.minutes === "DUE" ? (
                                                <span className="animate-pulse">NOW</span>
                                            ) : (
                                                stop.arrivalTime
                                            )}
                                            {stop.minutes !== "DUE" && (
                                                <svg
                                                    className="inline p-0"
                                                    style={{
                                                        height: isPortrait ? `2.8${vUnit}` : `2.3${vUnit}`,
                                                        width: isPortrait ? `2.8${vUnit}` : `2.3${vUnit}`,
                                                        margin: `0 0.6${hUnit}`
                                                    }}
                                                    viewBox="0 -960 960 960"
                                                    fontWeight="bold"
                                                    fill={tripInfo.textColor}
                                                >
                                                    <path d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z" />
                                                </svg>
                                            )}
                                        </span>
                                        <div className="overflow-hidden flex-grow">
                                            <div
                                                className="font-bold whitespace-nowrap truncate"
                                                style={{ fontSize: isPortrait ? `5.5${vUnit}` : `5${vUnit}` }}
                                            >
                                                {fixStationName(stop.name)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Timeline (Landscape Only) */}
                    {!isPortrait && (
                        <>
                            <div
                                className="fixed z-20 shadow-lg"
                                style={{
                                    left: timelineLeftStr,
                                    width: routeLineStr,
                                    top: `7${vUnit}`,
                                    background: tripInfo.color,
                                    height: `${lineHeight}${vUnit}`,
                                }}
                            ></div>
                            {tripInfo.nextStops.map((stop, index) => {
                                const metric = stopMetrics[index];
                                if (!metric) return null;
                                return (
                                    <React.Fragment key={index}>
                                        {stop.isSpacer ? (
                                            [0.2, 0.5, 0.8].map((pos, i) => (
                                                <div
                                                    key={i}
                                                    className="z-30 fixed rounded-full transform -translate-y-1/2 -translate-x-1/2"
                                                    style={{
                                                        width: `calc(${timelineCircleSizeStr} / 6)`,
                                                        height: `calc(${timelineCircleSizeStr} / 6)`,
                                                        left: `calc(${timelineLeftStr} + (${timelineCircleSizeStr} / 2))`,
                                                        background: tripInfo.textColor,
                                                        opacity: 0.6,
                                                        top: `calc((${metric.cursor}${vUnit}) + (${metric.height}${vUnit} * ${pos}))`,
                                                    }}
                                                />
                                            ))
                                        ) : (
                                            <div
                                                className="z-30 fixed rounded-full transform -translate-y-1/2"
                                                style={{
                                                    width: timelineCircleSizeStr,
                                                    height: timelineCircleSizeStr,
                                                    borderWidth: `min(0.5${vUnit}, 4px)`,
                                                    boxSizing: "border-box",
                                                    left: timelineLeftStr,
                                                    background: tripInfo.color,
                                                    borderColor: tripInfo.textColor,
                                                    top: `${metric.center}${vUnit}`,
                                                }}
                                            />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </>
                    )}

                    {/* Announcement Banner */}
                    {announcementTextChunk && (
                        <div
                            className="fixed bottom-0 left-0 w-full text-center z-[100] transition-opacity duration-300"
                            style={{
                                padding: `1.5${vUnit} 10${hUnit}`,
                                background: "rgba(0,0,0,0.85)",
                                color: "white",
                            }}
                        >
                            <span
                                className="font-bold tracking-tight"
                                style={{ fontSize: `3.5${vUnit}` }}
                            >
                                {announcementTextChunk === "[MSG]" ? (
                                    <span className="animate-pulse opacity-70 italic">
                                        &rarr; Announcement approaching
                                    </span>
                                ) : (
                                    announcementTextChunk.replace("[MSG]", "")
                                )}
                            </span>
                        </div>
                    )}

                    {/* Background Art */}
                    <div
                        className="fixed top-0 left-0 w-screen h-screen -z-10 bg-cover bg-center opacity-50"
                        style={{ backgroundImage: `url(${tripInfo.artwork})` }}
                    />
                </>
            ) : (
                /* Loading / Error State */
                <>
                    <div
                        className="fixed top-0 left-0 w-full text-white flex items-center justify-between z-50 border-b-2 border-slate-500"
                        style={{
                            height: `6${vUnit}`,
                            paddingLeft: `2${hUnit}`,
                            paddingRight: `2${hUnit}`,
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
                    ) : (
                        <p
                            className="font-semibold text-seashore w-screen h-screen flex items-center justify-center"
                            style={{ fontSize: `2${vUnit}` }}
                        >
                            Loading...
                        </p>
                    )}
                </>
            )}
        </div>
    );
};
