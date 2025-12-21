export type Arrival = {
    key: string // anything that can uniquely identify the vehicle (used for sorting out scheduled/live arrivals)
    live: boolean // whether the arrival is live or scheduled
    route: string // the route name, short or long (e.g. Green Line, A Line)
    routeId: string // the route ID (e.g. 804, 910)
    headsign: string // a shortened version of destination (e.g. NoHo, UnionSta)
    destination: string // the full destination name (e.g. North Hollywood Station)
    min: number // the number of minutes until arrival
    time: string // the time of arrival in HH:MM AM/PM format
    run: string // three/four digit run number (e.g. 794, 1049), if not viewable to the public, this should just be vehicle type (e.g. bus, train)
    vehicle: string // the vehicle number
    color: string // the route color in hex without # symbol (e.g. 0070BF)
    text: string // the route text color in hex without # symbol (e.g. FFFFFF)
}
