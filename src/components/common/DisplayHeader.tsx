import React, { useEffect, useState } from "react";

interface DisplayHeaderProps {
    title: string;
    isEditing?: boolean;
    onEditToggle?: (isEditing: boolean) => void;
    onGridChange?: (rows: number, cols: number) => void;
    onReset?: () => void;
    gridRows?: number;
    gridCols?: number;
    showGridControls?: boolean;
    showEditButton?: boolean;
}

export const DisplayHeader: React.FC<DisplayHeaderProps> = ({
    title,
    isEditing = false,
    onEditToggle,
    onGridChange,
    onReset,
    gridRows = 1,
    gridCols = 1,
    showGridControls = true,
    showEditButton = true,
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [innerWidth, setInnerWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
    const [innerHeight, setInnerHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 0);
    const [use24h, setUse24h] = useState(true);

    const isPortrait = innerHeight > innerWidth;

    const getSetting = (key: string, defaultValue = "") => {
        if (typeof window === "undefined") return defaultValue;
        const params = new URLSearchParams(window.location.search);
        return params.get(key) || localStorage.getItem(`enroute_${key}`) || defaultValue;
    };

    // Clock timer
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Window resize listener
    useEffect(() => {
        const handleResize = () => {
            setInnerWidth(window.innerWidth);
            setInnerHeight(window.innerHeight);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Load settings from localStorage
    useEffect(() => {
        const is24h = getSetting("24h") !== "false";
        setUse24h(is24h);
    }, []);

    return (
        <div
            className="absolute top-0 left-0 w-full flex items-center justify-between z-20 border-b-2 border-slate-500 shadow-md"
            style={{
                height: isPortrait ? "5vh" : "6vh",
                paddingLeft: isPortrait ? "3vw" : "1.5vw",
                paddingRight: isPortrait ? "3vw" : "1.5vw",
                backgroundColor: "var(--catenary-darksky)",
            }}
        >
            <div className="flex items-center gap-4">
                <span
                    className="font-bold truncate"
                    style={{ fontSize: isPortrait ? "2.5vh" : "3vh" }}
                >
                    {title}
                </span>
                {showEditButton && (
                    <button
                        onClick={() => onEditToggle?.(!isEditing)}
                        className={`text-xs px-2 py-1 rounded border border-white/20 transition-colors ${isEditing
                            ? "bg-yellow-500 text-black font-bold"
                            : "bg-white/10 hover:bg-white/20"
                        }`}
                    >
                        {isEditing ? "Done Editing" : "Edit"}
                    </button>
                )}

                {isEditing && showGridControls && (
                    <div className="flex items-center gap-2 ml-4 px-2 py-0.5 rounded border border-slate-600 shadow-lg" style={{ backgroundColor: 'rgba(30, 41, 59, 0.8)' }}>
                        <button
                            onClick={() => {
                                const event = new CustomEvent("openConfig");
                                window.dispatchEvent(event);
                            }}
                            className="text-[10px] font-bold px-2 py-0.5 rounded transition-colors border border-slate-500"
                        >
                            Settings
                        </button>
                        <button
                            onClick={onReset}
                            className="text-[10px] font-bold px-2 py-0.5 rounded transition-colors border border-slate-500 hover:bg-red-900/30 hover:border-red-500"
                        >
                            Reset
                        </button>
                        <div className="w-px h-4 bg-slate-600 mx-1"></div>
                        <span className="text-[10px] font-bold text-slate-400">GRID</span>
                        <div className="flex items-center gap-1">
                            <label className="text-xs" htmlFor="rows">Rows</label>
                            <select
                                id="rows"
                                className="bg-slate-700 rounded px-1 py-0.5 text-xs border border-slate-600 outline-none hover:bg-slate-600"
                                value={gridRows}
                                onChange={(e) => onGridChange?.(parseInt(e.target.value), gridCols)}
                            >
                                {[1, 2, 3, 4].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <span className="text-slate-600 font-bold">×</span>
                        <div className="flex items-center gap-1">
                            <label className="text-xs" htmlFor="cols">Cols</label>
                            <select
                                id="cols"
                                className="bg-slate-700 rounded px-1 py-0.5 text-xs border border-slate-600 outline-none hover:bg-slate-600"
                                value={gridCols}
                                onChange={(e) => onGridChange?.(gridRows, parseInt(e.target.value))}
                            >
                                {[1, 2, 3, 4].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Clock */}
            <span
                className="font-medium font-mono"
                style={{ fontSize: isPortrait ? "2.5vh" : "3vh" }}
            >
                {currentTime.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: !use24h,
                })}
            </span>
        </div>
    );
};

export default DisplayHeader;
