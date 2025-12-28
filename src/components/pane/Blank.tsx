import React from 'react';
import type {PaneConfig, ConfigFieldDefinition} from '../types/PaneConfig';

// Props type for the pane
export type PaneProps = {
  config: PaneConfig;
  [key: string]: any;
};

const PaneTemplate: React.FC<PaneProps> = ({ config }) => {
  return null
};

// Define configuration schema for this pane
// Remove or customize these fields based on your pane's needs
export const configSchema: ConfigFieldDefinition[] = [
  // No configuration fields needed for a blank pane
];

export const metadata = {
  type: 'blank' as const,
  title: 'Blank Pane',
  description: 'A blank pane.',
  configSchema,
};

export default PaneTemplate;
