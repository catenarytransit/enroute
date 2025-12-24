import React from "react";
import type { ReactNode } from "react";
import { PaneEditorProvider } from "./context/PaneEditorContext";
import { PaneEditorModal } from "./PaneEditorModal";

/**
 * Wrapper that combines PaneEditorProvider and PaneEditorModal.
 * This ensures they hydrate together on the client and share context.
 */
export const PaneEditorSetup: React.FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <PaneEditorProvider>
            <PaneEditorModal />
            {children}
        </PaneEditorProvider>
    );
};
