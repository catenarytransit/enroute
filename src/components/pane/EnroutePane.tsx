import React from "react";

export const metadata = {
  type: "custom" as const,
  title: "Enroute",
  description: "Displays enroute trip information."
};

export interface EnroutePaneProps {
  // Add props as needed
}

export const EnroutePane: React.FC<EnroutePaneProps> = () => {
  return (
    <div className="p-2">
      <span className="text-slate-400 text-sm">Enroute Pane</span>
    </div>
  );
};

export default EnroutePane;
