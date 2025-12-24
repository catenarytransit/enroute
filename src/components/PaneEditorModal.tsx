import React from "react";
import { usePaneEditor } from "./context/PaneEditorContext";
import { PaneConfigModal } from "./PaneConfigModal";

/**
 * Global pane editor modal that renders at the root level.
 * This ensures the modal always appears above all panes regardless of display.
 */
export const PaneEditorModal: React.FC = () => {
    const { isEditing, editingPane, closeEditingPane, savePane } = usePaneEditor();

    if (!isEditing || !editingPane) {
        return null;
    }

    return (
        <PaneConfigModal
            pane={editingPane.config}
            onSave={(config) => {
                savePane(editingPane.paneId, config);
            }}
            onClose={closeEditingPane}
        />
    );
};
