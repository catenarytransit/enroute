import type { TripInformation } from "./types/TripInformation";
import type { EnunciatorMessage, EnunciatorScheme } from "./types/Enunciator";
import { EnunciatorState } from "./types/Enunciator";
import type { Arrival } from "./types/StationInformation";

export let enunciator = {
    async play(sync: EnunciatorMessage): Promise<boolean> {
        return new Promise((resolve) => {
            if (sync.audio.length > 0) {
                let audio = new Audio(sync.state === EnunciatorState.STATION ? '/audio/stationchime.wav' : '/audio/onboardchime.wav');
                audio.play();

                let index = 0;

                audio.onended = function () {
                    if (index < sync.audio.length) {
                        audio.src = sync.audio[index];
                        audio.play().catch(error => {
                            console.error(error)
                        });
                        index++;
                    } else {
                        resolve(true);
                    }
                };
            } else {
                let tone = new Audio(sync.state === EnunciatorState.STATION ? '/audio/stationchime.wav' : '/audio/onboardchime.wav');
                tone.play();
                tone.onended = function () {
                    let tts = new SpeechSynthesisUtterance(sync.text.replaceAll(' Dr', 'Drive').replaceAll(' St', 'Street').replaceAll(' Ave', 'Avenue').replaceAll(' Blvd', 'Boulevard').replaceAll(' Ln', 'Lane').replaceAll(' Rd', 'Road').replaceAll(' Pkwy', 'Parkway').replaceAll(' Hwy', ' Highway').replaceAll('Hwy ', 'Highway ').replaceAll(' Pl', ' Place').replaceAll(' Ct', ' Court').replaceAll(' Expy', ' Expressway').replaceAll(' Fwy', ' Freeway').replaceAll(' Trl', ' Trail').replaceAll(' Cir', ' Circle').replaceAll(' Sq', ' Square').replaceAll(' Ter', ' Terrace').replaceAll(' Pk', ' Park').replaceAll(' Ctr', ' Center').replaceAll(' Brg', 'Bridge'));
                    speechSynthesis.speak(tts);
                    tts.onend = function () {
                        resolve(true);
                    };
                }
            }
        })
    },
    async sync(chateau: string, state: EnunciatorState, arrivalInfo: Arrival | null, tripInfo: TripInformation | null): Promise<EnunciatorMessage | null> {
        const schemeUrl = `/audio/${chateau}/_scheme.json`;
        const schemeData = await fetch(schemeUrl);
        const currentScheme: EnunciatorScheme = await schemeData.json();

        try {
            if (state === EnunciatorState.STATION) {
                if (arrivalInfo) {
                    let customDirectional: { audio: string[], text: string } = { audio: [], text: `The ${arrivalInfo.route} to ${arrivalInfo.destination} is now arriving.` }

                    if (currentScheme.direction) {
                        if (currentScheme.direction[arrivalInfo.routeId]) {
                            currentScheme.direction[arrivalInfo.routeId].forEach(direction => {
                                if (direction.headsign === arrivalInfo.headsign) {
                                    customDirectional = direction.station
                                }
                            })
                        }
                    }

                    return {
                        audio: customDirectional.audio.map(audio => `/audio/${chateau}/direction/${audio}.wav`),
                        text: customDirectional.text,
                        state: state
                    }
                } else {
                    let announcements = [
                        {
                            audio: ['/audio/catenary/THX.wav'],
                            text: 'Thanks for going with Catenary Maps!',
                        }
                    ]

                    return {
                        ...announcements[Math.floor(Math.random() * announcements.length)],
                        state: state
                    }
                }
            }
            if (tripInfo) {
                let audio = []
                let text = ''

                if (currentScheme && currentScheme.route && (currentScheme.route[tripInfo.routeID] || currentScheme.route['*'])) {
                    let schemeType = currentScheme.route[tripInfo.routeID] ? currentScheme.route[tripInfo.routeID].scheme : currentScheme.route['*'].scheme
                    if (currentScheme && schemeType === 'metro') {
                        let customDirectional: { audio: string[], text: string } | undefined;

                        if (currentScheme.direction) {
                            if (currentScheme.direction[tripInfo.routeID]) {
                                currentScheme.direction[tripInfo.routeID].forEach(direction => {
                                    if (tripInfo && direction.headsign === tripInfo.headsign) {
                                        customDirectional = direction.enroute as any
                                        if (customDirectional && customDirectional.audio && Array.isArray(customDirectional.audio)) {
                                            customDirectional.audio = customDirectional.audio.map((audio: string) => `/audio/${chateau}/direction/${audio}.wav`)
                                        }
                                    }
                                })
                            }
                        }

                        let defaults = {
                            directional: {
                                audio: [
                                    '/audio/catenary/THIS IS THE.wav',
                                    `/audio/${tripInfo.chateau}/route/${tripInfo.routeID}.wav`,
                                    '/audio/catenary/FINAL DEST.wav',
                                    `/audio/${tripInfo.chateau}/stop/${tripInfo.finalStopID}.wav`,
                                ],
                                text: `This is the ${tripInfo.route}. Final destination: ${tripInfo.finalStop}.`
                            }
                        }

                        switch (state) {
                            case EnunciatorState.NEXT:
                                if (customDirectional) {
                                    audio.push(...customDirectional.audio)
                                    text = (customDirectional.text)
                                } else {
                                    audio.push(...defaults.directional.audio)
                                    text = (defaults.directional.text)
                                }

                                audio.push(
                                    '/audio/catenary/NEXT.wav',
                                    `/audio/${tripInfo.chateau}/stop/${tripInfo.nextStopID}.wav`,
                                )
                                text += ` Next station: ${tripInfo.nextStop}.`

                                if (currentScheme.custom && currentScheme.custom.audio && currentScheme.custom.audio.length > 0 && tripInfo.nextStopNumber % 5 === 1) {
                                    currentScheme.custom.audio.forEach(customAudio => {
                                        audio.push(`/audio/${tripInfo.chateau}/custom/${customAudio}.wav`);
                                    })
                                    text += (' ' + currentScheme.custom.text);
                                }

                                break;
                            case EnunciatorState.APPROACHING:
                                audio.push(
                                    `/audio/${tripInfo.chateau}/stop/${tripInfo.nextStopID}.wav`,
                                    '/audio/catenary/IS NEXT.wav',
                                )
                                text = `${tripInfo.nextStop} is next.`
                                if (currentScheme.append ? currentScheme.append.includes(tripInfo.nextStopID) : false) {
                                    audio.push(`/audio/${tripInfo.chateau}/append/${tripInfo.nextStopID}.wav`);
                                    // text += (' ' + currentScheme.append[tripInfo.nextStopID].text);
                                }
                                break;
                            case EnunciatorState.TERMINUS:
                                audio.push(
                                    `/audio/${tripInfo.chateau}/stop/${tripInfo.nextStopID}.wav`,
                                    '/audio/catenary/IS NEXT.wav',
                                    '/audio/catenary/LAST STOP.wav',
                                    '/audio/catenary/THX.wav'
                                )
                                text = `${tripInfo.nextStop} is next. This is the last stop. Please check to be sure you have all your personal belongings, and stay seated or hold on until the doors have opened. Thanks for going with Catenary Maps!`
                                break;
                            default:
                                break;
                        }
                    } else if (currentScheme && schemeType === 'regional') {
                        switch (state) {
                            case EnunciatorState.WELCOME:
                                if (currentScheme.custom && currentScheme.custom.audio && currentScheme.custom.audio.length > 0) {
                                    audio.push(...currentScheme.custom.audio)
                                    text = (currentScheme.custom.text + ' ')
                                }
                                audio.push('/audio/ROUTE INTRO.wav')
                                text += 'For your personal safety, please keep aisles clear of personal items. If you see a suspicious package onboard the train, report it to the conductor immediately. Safety is everyone\'s concern.'
                                break;
                            case EnunciatorState.NEXT:
                                audio.push(
                                    '/audio/catenary/OUR NEXT STA STOP IS.wav',
                                    `/audio/${tripInfo.chateau}/stop/${tripInfo.nextStopID}.wav`,
                                    '/audio/catenary/ALL STA STOPS BRIEF.wav',
                                    `/audio/${tripInfo.chateau}/stop/${tripInfo.nextStopID}.wav`,
                                    '/audio/catenary/IS OUR NEXT STOP.wav'
                                )
                                text = `Our next station stop is ${tripInfo.nextStop}. All station stops are brief. ${tripInfo.nextStop} is our next stop.`
                                break;
                            case EnunciatorState.APPROACHING:
                                audio.push(
                                    '/audio/catenary/OUR NEXT STA STOP IS.wav',
                                    `/audio/${tripInfo.chateau}/stop/${tripInfo.nextStopID}.wav`,
                                    '/audio/catenary/IF THIS IS YOUR DEST.wav',
                                    `/audio/${tripInfo.chateau}/stop/${tripInfo.nextStopID}.wav`,
                                    '/audio/catenary/IS OUR NEXT STOP.wav'
                                )
                                text = `Our next station stop is ${tripInfo.nextStop}. If this is your destination, please watch your step and use handholds when moving through the train to the doors. ${tripInfo.nextStop} is our next stop.`
                                break;
                            case EnunciatorState.TERMINUS:
                                audio.push(
                                    '/audio/catenary/OUR NEXT STA STOP IS.wav',
                                    `/audio/${tripInfo.chateau}/stop/${tripInfo.nextStopID}.wav`,
                                    '/audio/catenary/ALL STA STOPS BRIEF.wav',
                                    `/audio/${tripInfo.chateau}/stop/${tripInfo.nextStopID}.wav`,
                                    '/audio/catenary/IS OUR NEXT STOP.wav',
                                    '/audio/catenary/LAST STOP.wav',
                                    '/audio/catenary/THX.wav'
                                )
                                text = `Our next station stop is ${tripInfo.nextStop}. All station stops are brief. ${tripInfo.nextStop} is our next stop. This is the last stop. Please check to be sure you have all your personal belongings, and stay seated or hold on until the doors have opened. Thanks for going with Catenary Maps!`
                                break;
                            default:
                                break;
                        }
                    } else {
                        switch (state) {
                            case EnunciatorState.APPROACHING:
                                return {
                                    audio: [],
                                    text: 'Approaching: ' + tripInfo.nextStop,
                                    state
                                }
                            default:
                                break;
                        }
                    }
                } else {
                    switch (state) {
                        case EnunciatorState.APPROACHING:
                            return {
                                audio: [],
                                text: 'Approaching: ' + tripInfo.nextStop,
                                state
                            }
                        default:
                            return null;
                    }
                }

                return {
                    audio: audio,
                    text: text,
                    state
                }
            }
        } catch (error: any) {
            console.error(error)
            return null;
        }
        return null;
    },
}
