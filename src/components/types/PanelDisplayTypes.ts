// Common types for panels and displays

// Metadata type for panels and displays
export type Metadata = {
  title: string;
  description: string;
};

// Props type for panels and displays
export type PanelDisplayProps = {
  config: Record<string, any>; // LocalStorage configuration
  data: any; // Data passed to the panel or display
};

// Types for displays
export type DisplayMetadata = Metadata;
export type DisplayProps = PanelDisplayProps;
export type DisplayConfig = {
  metadata: DisplayMetadata;
  type: "departures" | "alerts" | "info" | "bike" | "weather" | "custom"; // Extend as needed
};

// Types for panes
export type PaneMetadata = Metadata;
export type PaneProps = PanelDisplayProps;
export type PaneConfig = {
  metadata: PaneMetadata;
  type: "departures" | "alerts" | "info" | "bike" | "weather" | "custom"; // Extend as needed
};
