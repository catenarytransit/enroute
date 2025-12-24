// Utility to dynamically load panes and displays
import type { ConfigFieldDefinition } from '../components/types/PaneConfig';

export type PaneType = string; // Dynamically discovered types
export type DisplayMode = "simple" | "train_departure" | "grouped_by_route";

export type DynamicComponent = {
  metadata: {
    type: PaneType;
    title: string;
    description: string;
    displayMode?: DisplayMode;
    configSchema?: ConfigFieldDefinition[]; // Dynamic config for this pane
  };
  component: any;
};

// Cache for loaded panes - avoids re-loading on every render
let panesCache: DynamicComponent[] | null = null;
let displayCache: DynamicComponent[] | null = null;

export async function loadDynamicPanes(): Promise<DynamicComponent[]> {
  // Return cached panes if already loaded
  if (panesCache) {
    return panesCache;
  }

  const modules = import.meta.glob('../components/pane/*.tsx');
  const components: DynamicComponent[] = [];

  for (const path in modules) {
    // Skip template files
    if (path.includes('_react.template') || path.includes('_svelte.template')) {
      continue;
    }

    const module = await modules[path]() as any;
    if (module.metadata && module.default) {
      components.push({
        metadata: module.metadata,
        component: module.default,
      });
    }
  }

  panesCache = components;
  return components;
}

export async function loadDynamicDisplays(): Promise<DynamicComponent[]> {
  // Return cached displays if already loaded
  if (displayCache) {
    return displayCache;
  }

  const modules = import.meta.glob('../components/display/*.tsx');
  const components: DynamicComponent[] = [];

  for (const path in modules) {
    // Skip template files
    if (path.includes('_react.template') || path.includes('_svelte.template')) {
      continue;
    }

    const module = await modules[path]() as any;
    if (module.metadata && module.default) {
      components.push({
        metadata: module.metadata,
        component: module.default,
      });
    }
  }

  displayCache = components;
  return components;
}

// Get available pane types for config modals (returns just metadata, not components)
export async function getAvailablePaneTypes(): Promise<Array<{
  type: PaneType;
  displayMode?: DisplayMode;
  title: string;
  description: string;
  configSchema?: ConfigFieldDefinition[];
}>> {
  const panes = await loadDynamicPanes();
  return panes.map(p => ({
    type: p.metadata.type,
    displayMode: p.metadata.displayMode,
    title: p.metadata.title,
    description: p.metadata.description,
    configSchema: p.metadata.configSchema,
  }));
}

// Clear cache (useful for hot reloading in dev)
export function clearPaneCache() {
  panesCache = null;
  displayCache = null;
}
