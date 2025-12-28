import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { PaneConfig } from "../types/PaneConfig";

interface PaneEditorContextType {
    // Global editing state
    isEditing: boolean;
    setIsEditing: (value: boolean) => void;

    // Current pane being edited
    editingPane: {
        paneId: string;
        config: PaneConfig;
        displayName: string; // e.g., "station-departures", "enroute-main"
    } | null;
    setEditingPane: (pane: PaneEditorContextType["editingPane"]) => void;
    closeEditingPane: () => void;

    // Save handler
    savePane: (paneId: string, config: Partial<PaneConfig>) => void;
    onPaneSaved: ((paneId: string, config: Partial<PaneConfig>) => void) | null;
    setOnPaneSaved: (handler: ((paneId: string, config: Partial<PaneConfig>) => void) | null) => void;
}

const PaneEditorContext = createContext<PaneEditorContextType | undefined>(undefined);

export const PaneEditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingPane, setEditingPane] = useState<PaneEditorContextType["editingPane"]>(null);
    const [onPaneSaved, setOnPaneSaved] = useState<((paneId: string, config: Partial<PaneConfig>) => void) | null>(null);

    const closeEditingPane = () => {
        setEditingPane(null);
    };

    const savePane = (paneId: string, config: Partial<PaneConfig>) => {
        if (onPaneSaved) {
            onPaneSaved(paneId, config);
        }
        closeEditingPane();
    };

    return (
        <PaneEditorContext.Provider
            value={{
                isEditing,
                setIsEditing,
                editingPane,
                setEditingPane,
                closeEditingPane,
                savePane,
                onPaneSaved,
                setOnPaneSaved,
            }}
        >
            {children}
        </PaneEditorContext.Provider>
    );
};

// Default context values when provider is not available
const defaultContext: PaneEditorContextType = {
    isEditing: false,
    setIsEditing: () => {},
    editingPane: null,
    setEditingPane: () => {},
    closeEditingPane: () => {},
    savePane: () => {},
    onPaneSaved: null,
    setOnPaneSaved: () => {},
};

export const usePaneEditor = () => {
    const context = useContext(PaneEditorContext);
    return context || defaultContext;
};
