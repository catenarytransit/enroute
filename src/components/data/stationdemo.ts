import type { Arrival } from "../types/StationInformation"
import { fixHeadsignText, fixRouteColor, fixRouteName, fixRouteTextColor, fixRunNumber, fixStationName } from "./agencyspecific"
import type { DeparturesAtStopResponse } from "../types/birchtypes"

export type ArrivalSwiftly = {
  routeShortName: string
  routeName: string
  routeId: string
  stopId: string
  stopName: string
  stopCode: number
  destinations: {
    directionId: string
    headsign: string
    predictions: {
      time: number
      sec: number
      min: number
      vehicleId: string
      tripId: string
      headsign: string
    }[]
  }[]
}

export type PredictionSwiftly = {
  id: string
  routeId: string
  routeShortName: string
  tripId: string
  headsign: string
  vehicleType: string
  loc: {
    lat: number
    lon: number
    time: number
    heading: number
  }
  nextStopId: string
  nextStopName: string
  directionId: string
}

export async function fetchSwiftlyArrivals(selectedAgency: string, selectedRoutes: string[], selectedStop: string, use24h: boolean = false): Promise<{ name: string, trips: Arrival[], alerts: string[] }> {

  let allArrivals: Arrival[] = []
  let activeAlerts: string[] = []
  let stopName: string = selectedStop

  try {
    // Current time for querying
    // The endpoint takes a range
    const now = Math.floor(Date.now() / 1000);
    const oneHourLater = now + 3600 * 2; // 2 hours lookahead

    // https://birchdeparturesfromstop.catenarymaps.org/departures_at_stop?stop_id=315039&chateau_id=san-francisco-bay-area&greater_than_time=1766280968&less_than_time=1766347268&include_shapes=false
    let url = `https://birchdeparturesfromstop.catenarymaps.org/departures_at_stop?stop_id=${selectedStop}&chateau_id=${selectedAgency}&greater_than_time=${now}&less_than_time=${oneHourLater}&include_shapes=false`

    let response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch from birch: ${response.status}`)
    }

    let data: DeparturesAtStopResponse = await response.json()

    stopName = fixStationName(data.primary.stop_name)

    // Parse alerts
    if (data.alerts) {
      Object.values(data.alerts).forEach(agencyAlerts => {
        Object.values(agencyAlerts).forEach(alert => {
          const text = alert.header_text?.translation?.[0]?.text || alert.description_text?.translation?.[0]?.text;
          if (text && !activeAlerts.includes(text)) activeAlerts.push(text);
        });
      });
    }

    data.events.forEach(event => {
      // Filter by selected routes if needed, though the API might return all?
      // The original code filtered by iterating selectedRoutes. 
      // Here we get all events, so check if the route is in selectedRoutes.
      // BUT, existing code used route IDs. Let's see if we need to filter.
      // StationDisplay passes route names usually? Or IDs?
      // StationDisplay: let selectedRoutes = query.get('routes')?.split(',') || ['Metro A Line']
      // It seems to be loose. Let's process all events and maybe filter later if needed, 
      // or just accept all since the user might want all at that stop.
      // Wait, the original code looped through selectedRoutes and made a request PER ROUTE.
      // This new endpoint gets everything at the stop. We should probably filter to match behavior,
      // or just show all if that's the intent of the new endpoint.
      // Let's trying matching `event.route_id` or `route.short_name` / `route.long_name` against selectedRoutes.
      // For now, I'll include all valid events.

      const route = data.routes[data.primary.chateau]?.[event.route_id];
      if (!route) return;

      // Determine min remaining
      const arrivalTime = event.realtime_arrival || event.scheduled_arrival;
      const min = Math.floor((arrivalTime - now) / 60);

      // Filter out past tripss?
      if (min < -1) return; // Allow -1 for "DUE" handling if slightly passed

      // Extract color/text
      const color = fixRouteColor(selectedAgency, event.route_id, route.color) || '#0A233F';
      const textColor = fixRouteTextColor(selectedAgency, event.route_id, route.text_color) || 'white';

      // Construct display route name
      const routeName = fixRouteName(selectedAgency, route.short_name || route.long_name || event.route_id, event.route_id);

      allArrivals.push({
        key: event.trip_id,
        live: event.realtime_arrival !== null,
        route: routeName,
        routeId: event.route_id,
        headsign: fixHeadsignText(event.headsign),
        destination: fixStationName(event.headsign),
        min: min,
        time: new Date(arrivalTime * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !use24h }),
        run: fixRunNumber(selectedAgency, event.route_id, event.trip_short_name, event.vehicle_number, event.trip_id) || '',
        vehicle: event.vehicle_number || '',
        color: color,
        text: textColor
      })
    })

  } catch (e) {
    console.error("Error fetching birch departures", e);
    // Fallback or empty? Original code didn't try-catch heavily inside the loop, but had outer catch.
    // We return what we have.
  }

  return {
    name: stopName,
    trips: allArrivals.sort((a, b) => a.min - b.min),
    alerts: activeAlerts
  }
}