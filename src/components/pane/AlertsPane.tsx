import React, { useEffect, useState } from "react";
import type { PaneConfig, ConfigFieldDefinition } from "../types/PaneConfig";
import type { AlertV2 } from "components/types/birchtypes.ts";
import { getAlertColor } from "components/data/transitUtils.ts";

interface AlertsPaneProps {
    config: PaneConfig;
    activeAlerts: AlertV2[]; // Updated to use AlertV2 type
    isEditing?: boolean;
    style?: React.CSSProperties;
    className?: string;
    theme?: string;
    onEdit?: () => void;
}

const AlertsPane: React.FC<AlertsPaneProps> = ({
    config,
    activeAlerts,
    isEditing = false,
    style,
    className = "",
    theme = "default",
    onEdit,
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        if (activeAlerts.length > 0) {
            setLoading(false);
        }

        console.log(activeAlerts);

        // Removed the data fetching logic as alertsData is now received via props

        return () => {
            mounted = false;
        };
    }, []);

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit?.();
    };

    return (
        <div className="grow overflow-auto scrollbar-hide" style={{ padding: "var(--compact-padding)" }}>
            {loading ? (
                <div className="flex items-center justify-center h-full">
                    <span className="text-white/50 text-xs animate-pulse">Loading alerts...</span>
                </div>
            ) : error ? (
                <div className="flex items-center justify-center h-full text-center" style={{ padding: "var(--compact-padding)" }}>
                    <span className="text-red-400 text-xs">{error}</span>
                </div>
            ) : activeAlerts.length > 0 ? (
                <div className="flex flex-col" style={{ gap: "var(--compact-gap)" }}>
                    {activeAlerts.map((alert, index) => {
                        const color = getAlertColor(alert);

                        return (
                            <div
                                key={index}
                                className={`rounded border ${color}`}
                                style={{ padding: "var(--compact-padding)" }}
                            >
                                <p className="text-sm font-medium">
                                    {alert?.header_text?.translation[0]?.text || null}
                                </p>

                                <p className="text-xs opacity-80">
                                    {alert?.description_text?.translation[0]?.text || null}
                                </p>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-white/50 text-center text-sm py-4">No alerts found.</div>
            )}
        </div>
    );
};

const configSchema: ConfigFieldDefinition[] = [
    // Alerts pane doesn't need configuration beyond what's provided via the Pane component
    // but this is here as an example of how to add fields if needed
];

export const metadata = {
    type: "alerts" as const,
    title: "Alerts",
    description: "Displays active service alerts.",
    configSchema,
};

export default AlertsPane;
