import { loadDynamicDisplays, loadDynamicPanes } from './DynamicLoader';

export async function loadDynamicConfig() {
  const displays = await loadDynamicDisplays();
  const panes = await loadDynamicPanes();

  return {
    displays,
    panes,
  };
}
