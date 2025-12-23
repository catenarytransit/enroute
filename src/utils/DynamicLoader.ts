// Utility to dynamically load panes and displays

export type DynamicComponent = {
  metadata: {
    type: "departures" | "alerts" | "info" | "bike" | "weather" | "custom";
    title: string;
    description: string;
  };
  component: any;
};

export async function loadDynamicPanes(): Promise<DynamicComponent[]> {
  const modules = import.meta.glob('../components/pane/*.tsx');
  const components: DynamicComponent[] = [];

  console.log("Dynamic Panes Modules:", modules);

  for (const path in modules) {
    const module = await modules[path]() as any; // Assert type to 'any'
    if (module.metadata && module.default) {
      components.push({
        metadata: module.metadata,
        component: module.default,
      });
    }
  }

  return components;
}

export async function loadDynamicDisplays(): Promise<DynamicComponent[]> {
  const modules = import.meta.glob('../components/display/*.tsx');
  const components: DynamicComponent[] = [];

  console.log("Dynamic Displays Modules:", modules);

  for (const path in modules) {
    const module = await modules[path]() as any; // Assert type to 'any'
    if (module.metadata && module.default) {
      components.push({
        metadata: module.metadata,
        component: module.default,
      });
    }
  }

  return components;
}
