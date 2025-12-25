import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { PaneConfig } from "../types/PaneConfig";

export interface EditingPane {
    paneId: string;
    config: PaneConfig;
    displayName: string;
}

interface PaneEditorContextType {
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    editingPane: EditingPane | null;
    setEditingPane: (pane: EditingPane | null) => void;
    closeEditingPane: () => void;
    savePane: (paneId: string, config: Partial<PaneConfig>) => void;
    setOnPaneSaved: (handler: ((paneId: string, config: Partial<PaneConfig>) => void) | null) => void;
}

const PaneEditorContext = createContext<PaneEditorContextType | undefined>(undefined);

export const PaneEditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingPane, setEditingPane] = useState<EditingPane | null>(null);
    const [onPaneSavedRef, setOnPaneSavedRef] = useState<((paneId: string, config: Partial<PaneConfig>) => void) | null>(null);

    const closeEditingPane = useCallback(() => {
        setEditingPane(null);
    }, []);

    const savePane = useCallback((paneId: string, config: Partial<PaneConfig>) => {
        if (onPaneSavedRef) {
            onPaneSavedRef(paneId, config);
        }
        setEditingPane(null);
    }, [onPaneSavedRef]);

    const setOnPaneSaved = useCallback((handler: ((paneId: string, config: Partial<PaneConfig>) => void) | null) => {
        setOnPaneSavedRef(() => handler);
    }, []);

    return (
        <PaneEditorContext.Provider
            value={{
                isEditing,
                setIsEditing,
                editingPane,
                setEditingPane,
                closeEditingPane,
                savePane,
                setOnPaneSaved,
            }}
        >
            {children}
        </PaneEditorContext.Provider>
    );
};

export const usePaneEditor = (): PaneEditorContextType => {
    const context = useContext(PaneEditorContext);
    if (!context) {
        throw new Error("usePaneEditor must be used within a PaneEditorProvider");
    }
    return context;
};
