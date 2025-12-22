
import React, { useEffect, useState, useRef } from "react";
import type { BirchStopTime, BirchTripInformation, TripInformation } from "./types/TripInformation";
import {
    fixHeadsignText,
    fixRouteColor,
    fixRouteName,
    fixRouteTextColor,
    fixRunNumber,
    fixStationArt,
    fixStationName,
} from "./data/agencyspecific";
import { enunciator } from "./enunciator";
import { EnunciatorState } from "./types/Enunciator";

export const JREnrouteDisplay: React.FC = () => {
    // State
    const [tripInfo, setTripInfo] = useState<TripInformation | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [announcementTextChunk, setAnnouncementTextChunk] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currentView, setCurrentView] = useState<"current" | "next">("current");

    const [isPortrait, setIsPortrait] = useState(typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false);
    
    // Refs for intervals
    const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const stopsEnunciatedRef = useRef<string[]>([]);
    
    // Config
    const getSetting = (key: string, defaultValue = "") => {
         if (typeof window === "undefined") return defaultValue;
         const params = new URLSearchParams(window.location.search);
         return params.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;
    };
    const use24h = getSetting("24h") !== "false";
    
    // Resize Handler
    useEffect(() => {
        const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Logic
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const chateau = params.get("chateau");
        const trip = params.get("trip");

        if (!chateau || !trip) return;

        const fetchTripInfo = async () => {
             try {
                const raw = await fetch(`https://birch.catenarymaps.org/get_trip_information/${chateau}/?trip_id=${trip}`);
                if (raw.status === 404) throw new Error(`Trip ${trip} not found in Chateâu ${chateau}`);
                const birchData = (await raw.json()) as BirchTripInformation;
                
                let nextStopIndex = birchData.stoptimes.findIndex(
                    (stopTime: BirchStopTime) =>
                        (stopTime.rt_arrival?.time || stopTime.scheduled_arrival_time_unix_seconds) > Date.now() / 1000
                );
                
                if (nextStopIndex === -1) nextStopIndex = birchData.stoptimes.length - 1;
                
                const nextStopName = birchData.stoptimes[nextStopIndex].name;
                const lastStopIndex = birchData.stoptimes.length - 1;
                const lastStopName = birchData.stoptimes[lastStopIndex].name;
                
                const arrivalUnix = birchData.stoptimes[nextStopIndex].rt_arrival?.time || birchData.stoptimes[nextStopIndex].scheduled_arrival_time_unix_seconds;
                const timeToStop = arrivalUnix - Date.now() / 1000;
                const isApproachingStop = timeToStop < 40;
                
                const stopsToDisplay: any[] = [];
                const addStop = (index: number) => {
                     if (index < 0 || index >= birchData.stoptimes.length) return;
                     const s = birchData.stoptimes[index];
                     const sArrivalUnix = s.rt_arrival?.time || s.scheduled_arrival_time_unix_seconds;
                     
                     stopsToDisplay.push({
                         name: fixStationName(s.name),
                         minutes: (isApproachingStop && index === nextStopIndex) ? "DUE" : Math.floor(Math.max(0, (sArrivalUnix - Date.now() / 1000) / 60)).toString(),
                         // Simplified time handling compared to Svelte for brevity, matching logic
                         arrivalTime: new Date(sArrivalUnix * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !use24h }).toLowerCase().replace(' ', ''),
                         stopId: s.stop_id,
                         key: s.stop_id
                     });
                };
                
                const MAX_STOPS_TOTAL = 5;
                const remainingStops = lastStopIndex - nextStopIndex + 1;
                
                if (remainingStops <= MAX_STOPS_TOTAL) {
                    for (let i = nextStopIndex; i <= lastStopIndex; i++) {
                        addStop(i);
                    }
                } else {
                    for (let i = 0; i < MAX_STOPS_TOTAL; i++) {
                         addStop(nextStopIndex + i);
                    }
                }
                
                const newTripInfo: TripInformation = {
                    chateau,
                    run: fixRunNumber(chateau, birchData.route_id, birchData.trip_short_name, birchData.vehicle?.id || null, trip),
                    headsign: fixHeadsignText(birchData.trip_headsign || lastStopName, birchData.route_short_name || birchData.route_long_name || birchData.route_id),
                    nextStops: stopsToDisplay,
                    nextStop: fixStationName(nextStopName),
                    nextStopID: birchData.stoptimes[nextStopIndex].stop_id,
                    nextStopNumber: nextStopIndex,
                    finalStop: fixStationName(lastStopName),
                    finalStopID: birchData.stoptimes[lastStopIndex].stop_id,
                    isApp: isApproachingStop,
                    isTerm: nextStopName === lastStopName,
                    route: fixRouteName(chateau, birchData.route_short_name || birchData.route_long_name || birchData.route_id, birchData.route_id),
                    routeID: birchData.route_id,
                    color: fixRouteColor(chateau, birchData.route_id, birchData.color),
                    textColor: fixRouteTextColor(chateau, birchData.route_id, birchData.text_color),
                    artwork: fixStationArt(chateau, birchData.route_id),
                };
                
                setTripInfo(newTripInfo);
                
                // Enunciator Logic
                const stateKey = `${newTripInfo.nextStopID}:${newTripInfo.isApp ? EnunciatorState.APPROACHING : EnunciatorState.NEXT}`;
                if (enunciator && !stopsEnunciatedRef.current.includes(stateKey)) {
                    stopsEnunciatedRef.current.push(stateKey);
                    
                    const voiceState = isApproachingStop 
                        ? (nextStopName === lastStopName ? EnunciatorState.TERMINUS : EnunciatorState.APPROACHING)
                        : EnunciatorState.NEXT;
                        
                    const voicedAnnouncement = await enunciator.sync(chateau, voiceState, null, newTripInfo);
                    
                     if (voicedAnnouncement) {
                        setAnnouncementTextChunk("[MSG]");
                        enunciator.play(voicedAnnouncement);
                        
                        setTimeout(() => {
                            if (voicedAnnouncement) {
                                let chunks = voicedAnnouncement.text.match(/.{1,53}/g) || [];
                                let chunkList = Array.from(chunks);
                                
                                const next = chunkList.shift();
                                if(next) setAnnouncementTextChunk(next);
                                
                                if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
                                chunkIntervalRef.current = setInterval(() => {
                                     if (chunkList.length > 0) {
                                         setAnnouncementTextChunk(chunkList.shift()!);
                                     } else {
                                         if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
                                         setAnnouncementTextChunk(null);
                                     }
                                }, 3500);
                            }
                        }, 1600);
                    }
                }
                
                setError(null);
             } catch (e: any) {
                 setError(e.message);
             }
        };

        const interval = setInterval(fetchTripInfo, 1000);
        fetchTripInfo(); // Initial call
        
        return () => {
             clearInterval(interval);
             if (chunkIntervalRef.current) clearInterval(chunkIntervalRef.current);
        };
    }, [use24h]);

    // Data for transfers (Mock/Static as per original Svelte)
    const currentStationData = {
        transfers: [
            { name: "Chūō Line Local (for Sendagaya & Yotsuya)", color: "bg-yellow-400", letter: "JC" },
            { name: "Toei Ōedo Line", color: "bg-pink-600", letter: "E" },
        ],
    };

    const nextStationData = {
        transfers: [
            { name: "Shōnan-Shinjuku Line", color: "bg-gradient-to-r from-orange-500 to-red-600", letter: "JS" },
            { name: "Rinkai Line", color: "bg-blue-600", letter: "R" },
        ],
    };

    const data = currentView === "current" ? currentStationData : nextStationData;
    const status = (tripInfo && tripInfo.nextStops[0]?.minutes === "DUE") ? "Now stopping at" : "Next";

    if (!tripInfo) return <div></div>;

    return (
        <div className="min-h-screen bg-gray-100 p-8 font-sans">
             <div className="max-w-5xl mx-auto">
                 {/* Control Buttons */}
                 <div className="mb-4 flex gap-2">
                     <button
                        onClick={() => setCurrentView("current")}
                        className={`px-4 py-2 rounded ${currentView === 'current' ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
                     >
                         Current Station
                     </button>
                     <button
                        onClick={() => setCurrentView("next")}
                        className={`px-4 py-2 rounded ${currentView === 'next' ? 'bg-green-500 text-white' : 'bg-gray-300'}`}
                     >
                         Next Station
                     </button>
                 </div>

                 {/* Main Display */}
                 <div className="bg-white border-4 border-black">
                     {/* Header */}
                     <div className="bg-gray-800 text-white flex items-stretch">
                         <div className="p-4 pr-0 flex items-center">
                             <div className="text-left">
                                 <div className="text-sm">Bound for</div>
                                 <div className="text-2xl font-bold leading-tight whitespace-pre-line">
                                     {tripInfo.finalStop}
                                 </div>
                             </div>
                         </div>
                         <div className="w-12 bg-green-500"></div>
                         <div className="flex-1 flex items-center justify-between px-8">
                             <div className="text-left">
                                 <div className="text-2xl mb-2">{status}</div>
                                 <div className="text-7xl font-bold overflow-hidden">
                                     {tripInfo.nextStop}
                                 </div>
                             </div>
                             <div className="text-right">
                                 <div className="text-5xl font-bold mb-1">
                                     {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: !use24h })}
                                 </div>
                             </div>
                         </div>
                     </div>

                     {/* Station List */}
                     <div className="bg-gray-50 p-8 flex">
                         {/* Names */}
                         <div className="flex-1 flex flex-col items-end pr-8">
                             {tripInfo.nextStops.map((arrival, index) => (
                                 <div
                                    key={index}
                                    className={`flex items-center justify-end text-black ${index === 0 ? 'h-20 text-6xl font-bold' : 'h-24 text-4xl'}`}
                                 >
                                     {fixStationName(arrival.name)}
                                 </div>
                             ))}
                         </div>

                         {/* Green Line */}
                         <div className="relative flex flex-col items-center">
                             <div className="absolute inset-y-0 left-1/2 w-3 bg-green-500 transform -translate-x-1/2"></div>
                             
                             {currentView === 'next' && (
                                 <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8 z-20">
                                     <svg width="80" height="50" viewBox="0 0 80 50">
                                         <polygon points="0,0 80,0 40,50" fill="#dc2626" />
                                     </svg>
                                 </div>
                             )}

                             {tripInfo.nextStops.map((arrival, index) => (
                                 <div key={index} className={`relative z-10 flex items-center justify-center ${index === 0 ? 'h-20' : 'h-24'}`}>
                                     {index === 0 && arrival.minutes === "DUE" ? (
                                         <svg width="80" height="80" viewBox="0 0 80 80" className="relative">
                                             <polygon points="10,10 70,10 70,60 40,80 10,60" fill="#dc2626" stroke="white" strokeWidth="4" />
                                             <circle cx="40" cy="40" r="8" fill="white" />
                                         </svg>
                                     ) : (index === 0 && arrival.minutes !== "DUE") ? (
                                         <div className="w-16 h-16 bg-yellow-400 border-4 border-white rounded-full flex items-center justify-center">
                                             <span className="text-2xl font-bold text-black">{arrival.minutes}</span>
                                         </div>
                                     ) : (
                                         <div className="w-16 h-16 bg-white border-4 border-gray-800 rounded-full flex items-center justify-center">
                                             <span className="text-2xl font-bold text-black">{arrival.minutes}</span>
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>

                         {/* Minutes Indicator */}
                         <div className="flex flex-col items-start pl-2">
                             {tripInfo.nextStops.map((arrival, index) => (
                                 <div key={index} className={`flex items-center ${index === 0 ? 'h-20' : 'h-24'}`}>
                                     {arrival.minutes && index !== 0 && (
                                         <span className="text-xl text-black">(min)</span>
                                     )}
                                 </div>
                             ))}
                         </div>

                         {/* Transfers */}
                         <div className="flex-1 pl-8 flex flex-col justify-center">
                             <div className="text-2xl font-bold mb-4 text-black">
                                 Transfer at<br />{tripInfo.nextStop} Station
                             </div>
                             <div className="space-y-2">
                                 {data.transfers.map((transfer, i) => (
                                     <div key={i} className="flex items-center gap-2">
                                         {transfer.letter && (
                                             <div className={`w-8 h-8 ${transfer.color} text-white rounded-full flex items-center justify-center font-bold`}>
                                                 {transfer.letter}
                                             </div>
                                         )}
                                         <div className={`h-8 ${transfer.color} px-3 flex items-center`}>
                                             <span className={`font-bold ${transfer.letter ? 'text-black' : 'text-white'}`}>
                                                 {transfer.name}
                                             </span>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                 </div>

                 {error && (
                     <div className="fixed bottom-0 left-0 w-full bg-red-600 text-white p-2 text-center font-bold">
                         {error}
                     </div>
                 )}

                 {announcementTextChunk && (
                     <div className="fixed bottom-0 left-0 w-full px-10 py-6 text-center z-[100] bg-black/85 text-white">
                         <span className="font-bold tracking-tight text-4xl">
                             {announcementTextChunk === "[MSG]" ? (
                                 <span className="animate-pulse opacity-70 italic">&rarr; Announcement approaching</span>
                             ) : (
                                 announcementTextChunk.replace("[MSG]", "")
                             )}
                         </span>
                     </div>
                 )}
             </div>
        </div>
    )
};
