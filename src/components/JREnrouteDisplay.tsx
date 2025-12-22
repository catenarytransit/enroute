import React, { useEffect, useState } from 'react';
import type { BirchStopTime, BirchTripInformation, TripInformation } from './types/TripInformation';
import { fixHeadsignText, fixRouteColor, fixRouteName, fixRouteTextColor, fixRunNumber, fixStationArt, fixStationName } from './data/agencyspecific';
import { enunciator } from './enunciator';
import type { EnunciatorMessage } from './types/Enunciator';
import { EnunciatorState } from './types/Enunciator';
import { motion, AnimatePresence } from "motion/react"

// export function JREnrouteDisplay() {
  
// };

// export default TrainStationDisplay;

export function JREnrouteDisplay() {
  let [tripInfo, setTripInfo] = useState<TripInformation>();
  let [error, setError] = useState<string | null>(null);

  let [announcementTextChunk, setAnnouncementTextChunk] = useState<string | null>(null);

  let stopsEnunciated: string[] = [];

  const query = new URLSearchParams(window.location.search);
  const getSetting = (key: string, defaultValue: string = "") => query.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;

  const use24h = getSetting('24h') !== 'false';

  let chateau = query.get('chateau');
  let trip = query.get('trip');
  let [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const resizeHandler = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', resizeHandler);
    return () => window.removeEventListener('resize', resizeHandler);
  }, []);


  // Responsiveness
  // already defined above

  useEffect(() => {
    setInterval(() => {
    }, 1500)

    async function fetchTripInfo() {
      try {
        if (!chateau || !trip) throw new Error('Trip ID and Chateâu must be provided in the URL query parameters');
        let raw = await fetch(`https://birch.catenarymaps.org/get_trip_information/${chateau}/?trip_id=${trip}`)
        if (raw.status === 404) throw new Error(`Trip ${trip} not found in Chateâu ${chateau}`);
        let birchData = await raw.json() as BirchTripInformation;

        let nextStopIndex = birchData.stoptimes.findIndex((stopTime: BirchStopTime) => (stopTime.rt_arrival?.time || stopTime.scheduled_arrival_time_unix_seconds) > Date.now() / 1000);
        let nextStopName: string = birchData.stoptimes[nextStopIndex].name;


        let lastStopIndex = birchData.stoptimes.length - 1;
        let lastStopName: string = birchData.stoptimes[lastStopIndex].name;

        let timeToStop: number = (birchData.stoptimes[nextStopIndex].rt_arrival?.time || birchData.stoptimes[nextStopIndex].scheduled_arrival_time_unix_seconds) - Date.now() / 1000
        let isApproachingStop: boolean = timeToStop < 40

        // Construct proper list of stops to display
        // Logic: Show as many stops as possible (up to 7) before the final stop.
        // If there are more than 7 stops total, show the first 6, then a gap, then the final stop.

        let stopsToDisplay: { name: string, minutes: string, arrivalTime: string, stopId?: string, isSpacer?: boolean, count?: number }[] = [];

        const addStop = (index: number) => {
          if (index < 0 || index >= birchData.stoptimes.length) return;
          const s = birchData.stoptimes[index];
          const arrivalUnix = s.rt_arrival?.time || s.scheduled_arrival_time_unix_seconds;
          const date = new Date(arrivalUnix * 1000);
          const timeString = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !use24h }).toLowerCase().replace(" ", "");

          stopsToDisplay.push({
            name: fixStationName(s.name),
            minutes: (isApproachingStop && index === nextStopIndex) ? 'DUE' : Math.floor(Math.max(0, Math.round((arrivalUnix) - Date.now() / 1000) / 60)).toString(),
            arrivalTime: timeString,
            stopId: s.stop_id
          });
        };

        // const MAX_STOPS_TOTAL = isPortrait ? 10 : 8; // Total items in list (including stops and spacer)
        const MAX_STOPS_TOTAL = 5;

        let remainingStops = lastStopIndex - nextStopIndex + 1;

        if (remainingStops <= MAX_STOPS_TOTAL) {
          // Show all remaining stops
          for (let i = nextStopIndex; i <= lastStopIndex; i++) {
            addStop(i);
          }
        } else {
          // Show first (MAX_STOPS_TOTAL - 2) stops, then spacer, then final stop
          // const stopsToShowBeforeSpacer = MAX_STOPS_TOTAL - 2;
          for (let i = 0; i < MAX_STOPS_TOTAL; i++) {
            addStop(nextStopIndex + i);
          }

          // let highestAddedIndex = nextStopIndex + stopsToShowBeforeSpacer - 1;
          // let gapSize = lastStopIndex - highestAddedIndex - 1;

          // if (gapSize > 0) {
          //   stopsToDisplay.push({
          //     name: `${gapSize} more stops`,
          //     count: gapSize,
          //     minutes: '',
          //     arrivalTime: '',
          //     isSpacer: true
          //   });
          // }

          // addStop(lastStopIndex);
        }

        let newTripInfo: TripInformation = {
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

        if (enunciator && !stopsEnunciated.includes(`${newTripInfo.nextStopID}:${newTripInfo.isApp ? EnunciatorState.APPROACHING : EnunciatorState.NEXT}`)) {
          stopsEnunciated.push(`${newTripInfo.nextStopID}:${newTripInfo.isApp ? EnunciatorState.APPROACHING : EnunciatorState.NEXT}`);
          let voicedAnnouncement: EnunciatorMessage | null = await enunciator.sync(chateau, (isApproachingStop ? (nextStopName === lastStopName ? EnunciatorState.TERMINUS : EnunciatorState.APPROACHING) : EnunciatorState.NEXT), null, newTripInfo);
          if (voicedAnnouncement) {
            setAnnouncementTextChunk('[MSG]');
            enunciator.play(voicedAnnouncement);
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
                      clearInterval(chunkInterval);
                      setAnnouncementTextChunk(null);
                    }
                  }, 3500);
                }
              }
            }, 1600);
          }
        }

      } catch (error: any) {
        setError(error.message);
      }
    }

    setInterval(() => {
      fetchTripInfo()
    }, 1000)
  }, [chateau, trip, isPortrait, use24h]);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * Layout Scaling & Dimension Constraints
   * We use vh/vw units for responsive scaling, while enforcing physical maximums
   * on desktop displays to maintain a premium, understated aesthetic.
   */
  const vUnit = isPortrait ? 'vw' : 'vh';
  const hUnit = isPortrait ? 'vh' : 'vw';

  const ROUTE_LINE_STR = isPortrait ? '0' : `min(5${hUnit}, 32px)`;
  const TIMELINE_LEFT_STR = isPortrait ? '0' : `min(2.5${hUnit}, 16px)`;
  const TIMELINE_CIRCLE_SIZE_STR = isPortrait ? '0' : `min(5${hUnit}, 32px)`;

  // Numerical fallback for calculations (using 64 as cap)
  const LIST_PADDING_LEFT = isPortrait ? 3 : 10;

  /**
   * Layout Metrics
   * Used for precise vertical alignment of arrivals and timeline elements.
   */
  const CONTAINER_TOP = 7;
  const CONTAINER_PAD = 1;
  let cursor = CONTAINER_TOP + CONTAINER_PAD;
  let stopMetrics: { center: number, height: number, cursor: number, isSpacer: boolean }[] = [];
  let lineHeight = 0;

  if (tripInfo) {
    /**
     * Vertical Metric Calculation
     * Maps each stop/spacer into a precise vertical coordinate space.
     * This is used for both the arrival card rendering and the timeline alignment.
     */
    stopMetrics = tripInfo.nextStops.map((stop) => {
      const isSpacer = stop.isSpacer;
      const height = isSpacer ? 4 : (isPortrait ? 9 : 9.375);
      const marginTop = isSpacer ? 0 : (isPortrait ? 0.4 : 0.6);
      const marginBottom = isSpacer ? 0 : (isPortrait ? 0.4 : 0.6);

      cursor += marginTop;
      const center = cursor + (height / 2);
      cursor += height;
      cursor += marginBottom;

      return { center, height, cursor: cursor - height - marginBottom, isSpacer: isSpacer || false };
    });

    const lastMetric = stopMetrics[stopMetrics.length - 1];
    if (lastMetric) {
      lineHeight = lastMetric.center - CONTAINER_TOP;
    }
  }

  const [currentView, setCurrentView] = useState('current'); // 'current' or 'next'
  
  const currentStationData = {
    status: 'Now stopping at',
    time: '11:22',
    carNo: '8',
    destination: 'Shinjuku&\nIkebukuro',
    currentStation: 'Yoyogi',
    stations: [
      { name: 'Yoyogi', minutes: 0, isCurrentStop: true, isNext: false },
      { name: 'Shinjuku', minutes: 2, isCurrentStop: false, isNext: false },
      { name: 'Shin-Ōkubo', minutes: 4, isCurrentStop: false, isNext: false },
      { name: 'Takadanobaba', minutes: 6, isCurrentStop: false, isNext: false },
      { name: 'Mejiro', minutes: 8, isCurrentStop: false, isNext: false }
    ],
    transfers: [
      { name: 'Chūō Line Local (for Sendagaya & Yotsuya)', color: 'bg-yellow-400', letter: 'JC' },
      { name: 'Toei Ōedo Line', color: 'bg-pink-600', letter: 'E' }
    ]
  };
  
  const nextStationData = {
    status: 'Next',
    time: '13:20',
    carNo: '11',
    destination: 'Shinagawa&\nTōkyō',
    currentStation: 'Ōsaki',
    stations: [
      { name: 'Ōsaki', minutes: 1, isCurrentStop: false, isNext: true },
      { name: 'Shinagawa', minutes: 5, isCurrentStop: false, isNext: false },
      { name: 'Tamachi', minutes: 8, isCurrentStop: false, isNext: false },
      { name: 'Hamamatsuchō', minutes: 10, isCurrentStop: false, isNext: false },
      { name: 'Shimbashi', minutes: 12, isCurrentStop: false, isNext: false }
    ],
    transfers: [
      { name: 'Shōnan-Shinjuku Line', color: 'bg-gradient-to-r from-orange-500 to-red-600', letter: 'JS' },
      { name: 'Rinkai Line', color: 'bg-blue-600', letter: 'R' }
    ]
  };
  
  const data = currentView === 'current' ? currentStationData : nextStationData;
  
  if(!tripInfo) {
    return (<div></div>);
  }

  const status = tripInfo.nextStops[0].minutes === 'DUE' ? 'Now stopping at' : 'Next';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Control buttons */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setCurrentView('current')}
            className={`px-4 py-2 rounded ${
              currentView === 'current' ? 'bg-green-500 text-white' : 'bg-gray-300'
            }`}
          >
            Current Station
          </button>
          <button
            onClick={() => setCurrentView('next')}
            className={`px-4 py-2 rounded ${
              currentView === 'next' ? 'bg-green-500 text-white' : 'bg-gray-300'
            }`}
          >
            Next Station
          </button>
        </div>
        
        {/* Main display */}
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
                <div className="text-7xl font-bold overflow-hidden">{tripInfo.nextStop}</div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold mb-1">{currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: !use24h })}</div>
                {/* <div className="text-xl">
                  Car No. <span className="text-5xl font-bold">{data.carNo}</span>
                </div> */}
              </div>
            </div>
          </div>
          
          {/* Station list */}
          <div className="bg-gray-50 p-8 flex">
            {/* Station names */}
            <div className="flex-1 flex flex-col items-end pr-8">
              {tripInfo.nextStops.map((arrival: any, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-end text-black ${
                    index === 0 ? 'h-20' : 'h-24'
                  } ${
                    index === 0 ? 'text-6xl font-bold' : 'text-4xl'
                  }`}
                >
                  {fixStationName(arrival.name)}
                </div>
              ))}
            </div>
            
            {/* Green line with indicators */}
            <div className="relative flex flex-col items-center">
              <div className="absolute inset-y-0 left-1/2 w-3 bg-green-500 transform -translate-x-1/2"></div>
              
              {/* Red chevron pointing down for next station view */}
              {currentView === 'next' && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8 z-20">
                  <svg width="80" height="50" viewBox="0 0 80 50">
                    <polygon 
                      points="0,0 80,0 40,50" 
                      fill="#dc2626"
                    />
                  </svg>
                </div>
              )}
              
              {tripInfo.nextStops.map((arrival: any, index) => (
                <div key={index} className={`relative z-10 flex items-center justify-center ${
                  index === 0 ? 'h-20' : 'h-24'
                }`}>
                  {(index === 0 && arrival.minutes === 'DUE') ? (
                    // Pentagon shape for current station (used in both views when at station)
                    <svg width="80" height="80" viewBox="0 0 80 80" className="relative">
                      <polygon 
                        points="10,10 70,10 70,60 40,80 10,60" 
                        fill="#dc2626" 
                        stroke="white" 
                        strokeWidth="4"
                      />
                      <circle cx="40" cy="40" r="8" fill="white" />
                    </svg>
                  ) : (index === 0 && arrival.minutes !== 'DUE') ? (
                    <div className="w-16 h-16 bg-yellow-400 border-4 border-white rounded-full flex items-center justify-center">
                      {/* TODO - Add a chevron */}
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
            
            {/* Minutes indicator */}
            <div className="flex flex-col items-start pl-2">
              {tripInfo.nextStops.map((arrival: any, index) => (
                <div key={index} className={`flex items-center ${
                  index === 0 ? 'h-20' : 'h-24'
                }`}>
                  {arrival.minutes && index !== 0 && (
                    <span className="text-xl text-black">(min)</span>
                  )}
                </div>
              ))}
            </div>
            
            {/* Right section - transfers */}
            <div className="flex-1 pl-8 flex flex-col justify-center">
              <div className="text-2xl font-bold mb-4 text-black">
                Transfer at<br />{data.currentStation} Station
              </div>
              <div className="space-y-2">
                {data.transfers.map((transfer, idx) => (
                  <div key={idx} className="flex items-center gap-2">
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
          
          {/* Footer
          <div className="bg-white px-8 py-2 text-sm text-center border-t-2 border-black">
            Transfer and waiting times are not included. Times may differ by train.
          </div> */}
        </div>
      </div>
    </div>
  );

  // return (
  //   <div className="w-screen h-screen overflow-hidden relative">
  //     {tripInfo && <>
  //       {/* Header Bar */}
  //       <div className={`fixed top-0 left-0 w-full bg-[#1a4475] text-white flex items-center justify-between z-50 border-b-2 border-slate-500`} style={{ height: `6${vUnit}`, paddingLeft: isPortrait ? '5vw' : '3vw', paddingRight: isPortrait ? '5vw' : '3vw' }}>
  //         <span className={`font-bold truncate`} style={{ maxWidth: `70${hUnit}`, fontSize: `3${vUnit}` }}>
  //           {tripInfo.route} {tripInfo.run && <span className="font-normal">#{tripInfo.run}</span>} to {fixStationName(tripInfo.finalStop)}
  //         </span>
  //         <span className={`font-medium font-mono`} style={{ fontSize: `3${vUnit}` }}>{currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: !use24h })}</span>
  //       </div>


  //       <div className={`fixed grid grid-cols-1 p-[1${hUnit}]`} style={{
  //         top: `7${vUnit}`,
  //         right: isPortrait ? `2${vUnit}` : `1${hUnit}`,
  //         width: isPortrait ? `calc(100vw - 4${vUnit})` : `90${hUnit}`,
  //         left: isPortrait ? `2${vUnit}` : undefined
  //       }}>
  //         <AnimatePresence mode='popLayout'>
  //           {tripInfo.nextStops.map((arrival: any, index) => {
  //             // Render spacer differently
  //             if (arrival.isSpacer) {
  //               return (
  //                 <motion.div
  //                   key={`spacer-${index}`}
  //                   layout
  //                   initial={{ opacity: 0, scale: 0.9 }}
  //                   animate={{ opacity: 1, scale: 1 }}
  //                   exit={{ opacity: 0, scale: 0.9 }}
  //                   className='flex items-center justify-center text-slate-300 italic font-bold'
  //                   style={{ height: `4${vUnit}`, paddingLeft: isPortrait ? '5vw' : '10vw' }}
  //                 >
  //                   <span style={{ fontSize: isPortrait ? `3.5${vUnit}` : `2.5${vUnit}` }}>{arrival.count || arrival.name.split(' ')[0]} more stops</span>
  //                 </motion.div>
  //               );
  //             }

  //             return (
  //               <motion.div key={arrival.name}
  //                 layout
  //                 initial={{ opacity: 0, y: 30 }}
  //                 animate={{ opacity: 1, y: 0 }}
  //                 exit={{ opacity: 0, scale: 0.9 }}
  //                 className='rounded-lg leading-none flex items-center justify-start cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all'
  //                 style={{
  //                   gap: isPortrait ? `3vw` : `2${hUnit}`,
  //                   backgroundColor: tripInfo.color,
  //                   color: tripInfo.textColor,
  //                   height: isPortrait ? `9${vUnit}` : `${56.25 / 6}${vUnit}`,
  //                   paddingLeft: isPortrait ? `4vw` : `${LIST_PADDING_LEFT}${hUnit}`,
  //                   paddingRight: `0.8${hUnit}`,
  //                   margin: `${isPortrait ? 0.4 : 0.6}${vUnit} 0.3${hUnit}`
  //                 }}
  //                 onClick={() => {
  //                   if (arrival.stopId) {
  //                     window.location.href = `/?mode=station&chateau=${tripInfo.chateau}&stop=${arrival.stopId}`;
  //                   }
  //                 }}
  //               >
  //                 <span className={`text-left font-bold whitespace-nowrap`} style={{ fontSize: isPortrait ? `5${vUnit}` : `5${vUnit}`, minWidth: isPortrait ? `22vw` : `20${hUnit}` }}>
  //                   {arrival.minutes === 'DUE' ? <span className="pulse">NOW</span> : arrival.arrivalTime}
  //                   {arrival.minutes !== 'DUE' && <svg className={`inline mx-[0.6${hUnit}] p-0`} style={{ height: isPortrait ? `2.8${vUnit}` : `2.3${vUnit}`, width: isPortrait ? `2.8${vUnit}` : `2.3${vUnit}` }} viewBox="0 -960 960 960" font-weight="bold" fill={tripInfo.textColor}><path d="M200-120q-33 0-56.5-23.5T120-200q0-33 23.5-56.5T200-280q33 0 56.5 23.5T280-200q0 33-23.5 56.5T200-120Zm480 0q0-117-44-218.5T516-516q-76-76-177.5-120T120-680v-120q142 0 265 53t216 146q93 93 146 216t53 265H680Zm-240 0q0-67-25-124.5T346-346q-44-44-101.5-69T120-440v-120q92 0 171.5 34.5T431-431q60 60 94.5 139.5T560-120H440Z" /></svg>}
  //                 </span>
  //                 <div className="overflow-hidden flex-grow">
  //                   <div className={`font-bold whitespace-nowrap truncate`} style={{ fontSize: isPortrait ? `5.5${vUnit}` : `5${vUnit}` }}>
  //                     {fixStationName(arrival.name)}
  //                   </div>
  //                 </div>
  //               </motion.div>
  //             );
  //           })}
  //         </AnimatePresence>
  //       </div>

  //       {/* Main Journey Timeline (Landscape Only) */}
  //       {!isPortrait && <div className='fixed z-20 shadow-lg' style={{
  //         left: TIMELINE_LEFT_STR,
  //         width: ROUTE_LINE_STR,
  //         top: `7${vUnit}`,
  //         background: tripInfo.color,
  //         height: `${lineHeight}${vUnit}`
  //       }}></div>}

  //       {!isPortrait && tripInfo.nextStops.map((stop: any, index) => {
  //         const metric = stopMetrics[index];
  //         if (!metric) return null;

  //         if (stop.isSpacer) {
  //           /** 
  //            * Render intermediate dots on the timeline for hidden segments.
  //            * Uses equally spaced points [0.2, 0.5, 0.8] to represent hidden station frequency.
  //            */
  //           return (
  //             <React.Fragment key={`spacer-dots-${index}`}>
  //               {[0.2, 0.5, 0.8].map((pos, i) => (
  //                 <div key={`spacer-dot-${index}-${i}`} className='z-30 fixed rounded-full transform -translate-y-1/2 -translate-x-1/2'
  //                   style={{
  //                     width: `calc(${TIMELINE_CIRCLE_SIZE_STR} / 6)`,
  //                     height: `calc(${TIMELINE_CIRCLE_SIZE_STR} / 6)`,
  //                     left: `calc(${TIMELINE_LEFT_STR} + (${TIMELINE_CIRCLE_SIZE_STR} / 2))`,
  //                     background: tripInfo.textColor,
  //                     opacity: 0.6,
  //                     top: `calc((${metric.cursor}${vUnit}) + (${metric.height}${vUnit} * ${pos}))`
  //                   }}>
  //                 </div>
  //               ))}
  //             </React.Fragment>
  //           );
  //         }

  //         return (
  //           <div key={`circle-${index}`} className='z-30 fixed rounded-full transform -translate-y-1/2'
  //             style={{
  //               width: TIMELINE_CIRCLE_SIZE_STR,
  //               height: TIMELINE_CIRCLE_SIZE_STR,
  //               borderWidth: `min(0.5${vUnit}, 4px)`,
  //               boxSizing: 'border-box',
  //               left: TIMELINE_LEFT_STR,
  //               background: tripInfo.color,
  //               borderColor: tripInfo.textColor,
  //               top: `${metric.center}${vUnit}`
  //             }}>
  //           </div>
  //         )
  //       })}

  //       {announcementTextChunk &&
  //         <div className={`fixed bottom-0 left-0 w-full px-[10${hUnit}] py-[1.5${vUnit}] text-center z-[100]`} style={{ background: 'rgba(0,0,0,0.85)', color: 'white' }}>
  //           <span className='font-bold tracking-tight' style={{ fontSize: `3.5${vUnit}` }}>
  //             {announcementTextChunk === '[MSG]' ? <span className='pulse opacity-70 italic'>&rarr; Announcement approaching</span> : announcementTextChunk.replace('[MSG]', '')}
  //           </span>
  //         </div>
  //       }

  //       <div className='fixed top-0 left-0 w-screen h-screen -z-10 bg-cover bg-center opacity-50' style={{ backgroundImage: `url(${tripInfo.artwork})` }}></div>
  //     </>}
  //     {
  //       !tripInfo && <>
  //         <div className={`fixed top-0 left-0 w-full bg-[#1a4475] text-white flex items-center justify-between px-[2${hUnit}] z-50 border-b-2 border-slate-500`} style={{ height: `6${vUnit}` }}>
  //           <span className={`font-bold truncate`} style={{ fontSize: `3${vUnit}` }}>Loading...</span>
  //           <span className={`font-medium font-mono`} style={{ fontSize: `3${vUnit}` }}>{currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
  //         </div>
  //         {error && <p className={`font-semibold text-danger w-screen h-screen flex items-center justify-center`} style={{ fontSize: `2${vUnit}` }}>{error}</p>}
  //         {(!error) && <p className={`font-semibold text-seashore w-screen h-screen flex items-center justify-center`} style={{ fontSize: `2${vUnit}` }}>Loading...</p>}
  //       </>
  //     }
  //   </div>
  // );
}
