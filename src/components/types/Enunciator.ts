export enum EnunciatorState {
    WELCOME,
    NEXT,
    APPROACHING,
    TERMINUS,
    STATION
}

export type EnunciatorScheme = {
    "route": {
        [key: string]: {
            "scheme": "metro" | "regional" | "local";
        };
    } | null;
    "direction": {
        [key: string]: {
            "headsign": string;
            "station": {
                "audio": string[];
                "text": string;
            };
            "enroute": {
                "audio": string;
                "text": string;
            };
        }[],
     } | null;
    "append": string[] | null;
    "custom": {
        audio: string[];
        text: string | null;
    } | null;
}

export type EnunciatorMessage = {
    audio: string[];
    text: string;
    state: EnunciatorState;
}
