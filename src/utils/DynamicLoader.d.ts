export type DynamicComponent = {
  metadata: {
    type: "departures" | "alerts" | "info" | "bike" | "weather" | "custom";
    title: string;
    description: string;
  };
  component: any;
};

export declare function loadDynamicPanes(): Promise<DynamicComponent[]>;
export declare function loadDynamicDisplays(): Promise<DynamicComponent[]>;
