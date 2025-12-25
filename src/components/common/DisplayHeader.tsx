import React, { useState, useEffect } from "react";

interface DisplayHeaderProps {
    title: string;
    isEditing?: boolean;
    onEditToggle?: (editing: boolean) => void;
    gridRows?: number;
    gridCols?: number;
    onGridChange?: (rows: number, cols: number) => void;
    onReset?: () => void;
    showGridControls?: boolean;
}

export const DisplayHeader: React.FC<DisplayHeaderProps> = ({
    title,
    isEditing = false,
    onEditToggle,
    gridRows = 1,
    gridCols = 1,
    onGridChange,
    onReset,
    showGridControls = false,
}) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [innerWidth, setInnerWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 0);
    const [innerHeight, setInnerHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 0);

    const isPortrait = innerHeight > innerWidth;
    const vUnit = isPortrait ? "vw" : "vh";
    const hUnit = isPortrait ? "vh" : "vw";

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const handleResize = () => {
            setInnerWidth(window.innerWidth);
            setInnerHeight(window.innerHeight);
        };
        window.addEventListener("resize", handleResize);
        return () => {
            clearInterval(timer);
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <div
            className="fixed top-0 left-0 w-full text-white flex items-center justify-between z-50 border-b-2 border-slate-500"
            style={{
                height: `6${vUnit}`,
                paddingLeft: `2${hUnit}`,
                paddingRight: `2${hUnit}`,
                backgroundColor: "var(--catenary-darksky)",
            }}
        >
            {/* Title */}
            <span className="font-bold truncate" style={{ fontSize: `3${vUnit}` }}>
                {title}
            </span>

            {/* Controls */}
            <div className="flex items-center gap-2">
                {/* Settings Button */}
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent("openConfig"))}
                    className="bg-slate-600 hover:bg-slate-500 text-white rounded p-1.5 transition-colors"
                    title="Settings (press C)"
                    aria-label="Open settings"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5"
                    >
                        <path
                            fillRule="evenodd"
                            d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
                            clipRule="evenodd"
                        />
                    </svg>
                </button>

                {/* Edit Mode Controls */}
                {isEditing && showGridControls && onGridChange && (
                    <div className="flex items-center gap-2 mr-4">
                        <span className="text-xs text-slate-300">Grid:</span>
                        <select
                            value={gridRows}
                            onChange={(e) => onGridChange(parseInt(e.target.value), gridCols)}
                            className="bg-slate-700 text-white text-sm rounded px-2 py-1"
                        >
                            {[1, 2, 3, 4].map((n) => (
                                <option key={n} value={n}>{n} row{n !== 1 ? 's' : ''}</option>
                            ))}
                        </select>
                        <span className="text-slate-400">×</span>
                        <select
                            value={gridCols}
                            onChange={(e) => onGridChange(gridRows, parseInt(e.target.value))}
                            className="bg-slate-700 text-white text-sm rounded px-2 py-1"
                        >
                            {[1, 2, 3, 4].map((n) => (
                                <option key={n} value={n}>{n} col{n !== 1 ? 's' : ''}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Reset Button */}
                {isEditing && onReset && (
                    <button
                        onClick={onReset}
                        className="bg-red-600/80 hover:bg-red-500 text-white text-sm rounded px-3 py-1 mr-2"
                    >
                        Reset
                    </button>
                )}

                {/* Edit Toggle Button */}
                {onEditToggle && (
                    <button
                        onClick={() => onEditToggle(!isEditing)}
                        className={`text-sm rounded px-3 py-1 transition-colors ${
                            isEditing
                                ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                                : "bg-slate-600 hover:bg-slate-500 text-white"
                        }`}
                    >
                        {isEditing ? "Done" : "Edit"}
                    </button>
                )}

                {/* Clock */}
                <span className="font-medium font-mono ml-4" style={{ fontSize: `3${vUnit}` }}>
                    {currentTime.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                    })}
                </span>
            </div>
        </div>
    );
};
