export function fixHeadsignIcon(headsign: string): string | null {
    let fixPatterns = {
        'Airport': 'flight',
        'O\'Hare': 'flight',
        'Midway': 'flight',
    }

    // @ts-ignore
    if (fixPatterns[headsign]) {
        // @ts-ignore
        return fixPatterns[headsign] || null
    }
    return null
}

export function fixRouteIcon(chateau: string, rid: string): string | null {
    let fixPatterns = {
        'metro~losangeles': {
            '801': '/lines/metro~losangeles/801.svg',
            '802': '/lines/metro~losangeles/802.svg',
            '803': '/lines/metro~losangeles/803.svg',
            '804': '/lines/metro~losangeles/804.svg',
            '805': '/lines/metro~losangeles/805.svg',
            '807': '/lines/metro~losangeles/807.svg',
        },
        'san-diego-mts': {
            '510': '/lines/san-diego-mts/510.svg',
            '520': '/lines/san-diego-mts/520.svg',
            '530': '/lines/san-diego-mts/530.svg',
        }
    }

    // @ts-ignore
    if (fixPatterns[chateau]) {
        // @ts-ignore
        return fixPatterns[chateau][rid] || fixPatterns[chateau]['*'] || null
    } else {
        return null
    }
}

export function fixRouteColor(chateau: string, rid: string, rcol?: string): string {
    const fixPatterns: Record<string, Record<string, string>> = {
        // for the station arrivals beta
        'metro~losangeles': {
            '801': '#0072BC',
            '802': '#EB131B',
            '803': '#58A738',
            '805': '#A05DA5',
            '804': '#FDB913',
            '807': '#E470AB',
            '901': '#FC4C02',
            '910': '#ADB8BF',
            '950': '#ADB8BF',
            '720': '#D11242',
            '754': '#D11242',
            '761': '#D11242',
            '*': '#E16710'
        },
        // actual placements for final version
        'amtrak': {
            '60': '#669900',
            '78': '#517b9b',
            '*': '#002436'
        },
    }

    if (fixPatterns[chateau]) {
        if (fixPatterns[chateau][rid]) {
            return fixPatterns[chateau][rid]
        } else {
            return fixPatterns[chateau]['*']
        }
    }

    return rcol || '#0a233f'
}

export function fixRouteTextColor(chateau: string, rid: string, rcol?: string): string {
    const fixPatterns: Record<string, Record<string, string>> = {
        // for the station arrivals beta
        'metro~losangeles': {
            '804': 'black',
            '*': 'white'
        },
        // actual placements for final version
        'amtrak': {
            '*': '#FFFFFF'
        },
    }

    if (fixPatterns[chateau]) {
        if (fixPatterns[chateau][rid]) {
            return fixPatterns[chateau][rid]
        } else {
            return fixPatterns[chateau]['*']
        }
    }

    return rcol || '#FFFFFF'
}

export function fixRouteName(chateau: string, route: string, rid: string): string {
    const fixPatterns: Record<string, Record<string, string>> = {
        'metrolinktrains': {
            '91 Line': '91/PV Line',
            'Antelope Valley Line': 'AV Line',
            'Inland Emp.-Orange Co. Line': 'IE-OC Line',
            'Orange County Line': 'OC Line',
            'Riverside Line': 'RIV Line',
            'San Bernardino Line': 'SB Line',
            'Ventura County Line': 'VC Line',
        },
        'san-diego-mts': {
            '510': 'Blue Line',
            '520': 'Orange Line',
            '530': 'Green Line',
            '215': 'Mid-City Rapid',
            '225': 'South Bay Rapid',
            '235': 'I-15 Rapid',
            '201': 'SuperLoop',
            '202': 'SuperLoop',
            '204': 'SuperLoop',
            '227': 'Iris Rapid',
            '237': 'Mira Mesa Rapid',
            '280': 'Rapid Express',
            '290': 'Rapid Express',
            '398': 'COASTER',
            '399': 'SPRINTER',
            'AIR': 'Flyer'
        }
    }

    if (fixPatterns[chateau]) {
        if (fixPatterns[chateau][rid]) {
            return fixPatterns[chateau][rid]
        }
    }

    return route.replace('Amtrak ', '').replace('Transit Station', 'Sta').replace('Metro ', '').replace('Station', 'Sta').replace('Transportation Center', 'TC').replace('Transit Center', 'TC').replace('Transit Ctr', 'TC').trim()
}

export function fixRunNumber(chateau: string, rid: string, tripname: string | null, vehicle: string | null, tripid: string): string | null {
    if (chateau === 'san-diego-mts' && (rid === '510' || rid === '520' || rid === '530')) return vehicle
    if (chateau === 'metra') return tripid.split('_')[1].slice(2)
    if (chateau === 'northcountytransitdistrict' && rid !== "398") return null
    return tripname
}

export function fixHeadsignText(name: string, route?: string) {

    if (route && name.startsWith(route)) {
        name = name.replace(route + ' - ', '').trim()
    }

    const fixPatterns: Record<string, string> = {
        'L.A. Union Station': 'Los Angeles',
        '12th & Imperial': '12th/Imp\'l',
        'El Cajon / Arnele': 'El Cajon',
        'Downtown SD': 'Downtown',
        'Ucsd': 'UCSD',
        'Sdsu': 'SDSU',
        'Utc': 'UTC',
        'Va / Ucsd': 'UTC',
        'UTC/VA Med Ctr': 'UTC',
        'Old Town to Airport Shuttle': 'Airport',
        'Downtown Santa Monica Station': 'S Monica',
        'Downtown Long Beach Station': 'Long Bch',
        'LA Union Station': 'Los Angeles',
        'North Hollywood Station': 'NoHo',
        'North Hollywood Station G - Line': 'NoHo',
        'Chatsworth Station G - Line': 'Chatsworth',
        'Union Station': 'UnionSta',
        'Wilshire / Western Station': 'Wil/Wstrn',
        'Wilshire / Vermont Station': 'Wilshire Ctr',
        'APU / Citrus College Station': 'Azusa',
        'Redondo Beach Station': 'Redondo Bch',
        'Norwalk Station': 'Norwalk',
        'Atlantic Station': 'East LA',
        'Expo / Crenshaw Station': 'Expo/Crnshw',
        'Westchester / Veterans Station': 'Westchester',
        'University & College': 'City Heights',
        'Crenshaw C-Line Station': 'Crenshaw',
    }

    if (fixPatterns[name]) {
        return fixPatterns[name].split(' - ')[0].split('(')[0].trim()
    } else {
        return fixStationName(name).split(' - ')[0].split('(')[0].trim()
    }
}

export function fixStationName(name: string) {
    const fixPatterns: Record<string, string> = {
        'L.A. Union Station': 'Los Angeles',
        'Union Station': 'Union Station',
        'Heritage Square / Arroyo Station': 'Heritage Square',
        'Lincoln Heights / Cypress Park Station': 'Lincoln / Cypress',
        'Mariachi Plaza / Boyle Heights Station': 'Mariachi Plaza',
        'Expo / La Brea / Ethel Bradley Station': 'Expo / La Brea',
        'Expo / Crenshaw K-Line Station': 'Expo / Crenshaw',
        'Expo / Crenshaw E-Line Station': 'Expo / Crenshaw',
        'Crenshaw C-Line Station': 'Crenshaw',
        'Union Station - Metro A-Line': 'Union Station',
        'Union Station - Metro a-Line': 'Union Station',
        'Union Station - Metro B & D Lines': 'Union Station',
        'Sabre Springs & Penasquitos Transit Station': 'Sabre Springs/Peñasquitos',
        'Clairemont Mesa Bl & Complex Dr': 'Kearny Mesa',
        '32nd/Commercial St Station': '32nd & Commercial',
        '25th & Commercial St Station': '25th & Commercial',
        'I-15 Centerline Sta & University Av': 'City Heights',
        'I-15 Centerline Sta & El Cajon Bl': 'Boulevard',
        'San Diego - Santa Fe Depot': 'Santa Fe Depot',
        'San Diego - Old Town': 'Old Town',
        'Burbank Airport - North (Av Line) Metrolink Station': 'Burbank Airport North',
        'Burbank Airport - South (Vc Line) Metrolink Station': 'Burbank Airport South',
    }

    if (name.endsWith(' Platform')) {
        name = name.split(',')[0]
    }

    return fixPatterns[name] || name.split(' - Metro')[0].split(' Caltrain ')[0].replace(' Northbound', '').replace(' Southbound', '').replace(' & ', ' / ').replace(' & via', ' & Via').replace(' Transit Station', '').replace('Transit Sta', '').replace('Transportation Center', '').replace('Transit Center', '').replace('Transit Ctr', '').replace(' Station', '').replace(' Metrolink', '').replace(' Amtrak', '').trim()
}

export function fixStationArt(agency: string, route: string): string {
    let fixPatterns = {
        'metro~losangeles': {
            '801': '/art/801.webp',
            '802': '/art/802.webp',
            '803': '/art/803.webp',
            '804': '/art/804.webp',
            '805': '/art/805.webp',
            '807': '/art/807.webp',
            '901': '/art/901.webp',
            '910': '/art/910.webp',
            '950': '/art/950.webp',
        },
        'metrolinktrains': {
            '91 Line': '/art/mlpv.webp',
            'Antelope Valley Line': '/art/mlav.png',
            'Inland Emp.-Orange Co. Line': '/art/mloc.webp',
            'Orange County Line': '/art/mloc.webp',
            'Riverside Line': '/art/mlriv.webp',
            'San Bernardino Line': '/art/mlsb.webp',
            'Ventura County Line': '/art/mlvc.png',
        },
        'san-diego-mts': {
            '75018': 'https://www.sdmts.com/sites/default/files/attachments/zeb1.jpg',
            '75019': 'https://www.sdmts.com/sites/default/files/attachments/zeb1.jpg',
            '*': 'https://www.sdmts.com/sites/default/files/attachments/DTW15%20%2839%29.jpg'
        },
        'amtrak': {
            '78': '/art/804.webp',
        }
    }

    // @ts-ignore
    if (fixPatterns[agency]) {
        // @ts-ignore
        return fixPatterns[agency][route] || fixPatterns[agency]['*'] || '/art/default.png'
    } else {
        return '/art/default.png'
    }
}