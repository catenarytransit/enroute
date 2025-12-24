import React from 'react';
import type {PaneConfig, ConfigFieldDefinition} from '../types/PaneConfig';

// Props type for the pane
export type PaneProps = {
  config: PaneConfig;
  [key: string]: any;
};

const PaneTemplate: React.FC<PaneProps> = ({ config }) => {
  return (
    <div className="grow overflow-auto p-2 scrollbar-hide flex flex-col">
      {/* Pane content goes here */}
      <h1 className="text-lg font-bold text-white">{config.name || 'Custom Pane'}</h1>
      <p className="text-sm text-slate-300 mt-2">Add your custom pane content here.</p>
    </div>
  );
};

// Define configuration schema for this pane
// Remove or customize these fields based on your pane's needs
export const configSchema: ConfigFieldDefinition[] = [
  {
    key: 'exampleField',
    label: 'Example Configuration',
    type: 'text',
    placeholder: 'Enter a value',
    description: 'This is an example field. Customize as needed.',
    required: false,
  },
];

export const metadata = {
  type: 'custom' as const,
  title: 'Custom Pane',
  description: 'A template for creating custom panes.',
  configSchema,
};

export default PaneTemplate;
