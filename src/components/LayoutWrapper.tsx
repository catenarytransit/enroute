import React, { type ReactNode } from "react";
import { PaneEditorSetup } from "./PaneEditorSetup";

/**
 * Global wrapper that ensures PaneEditorSetup is at the top level,
 * so all displays share the same context and modal instance.
 */
export const LayoutWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    return <PaneEditorSetup>{children}</PaneEditorSetup>;
};

export default LayoutWrapper;
