import React from 'react';
import type {PaneConfig} from '../types/PaneConfig';

// Metadata for the pane
export const paneMetadata = {
  title: 'Pane Title',
  description: 'Description of the pane.',
};

// Props type for the pane
export type PaneProps = {
  config: PaneConfig; // Updated to use PaneConfig type
  data: any; // Data passed to the pane
};

const PaneTemplate: React.FC<PaneProps> = ({ config, data }) => {
  return (
    <div>
      {/* Pane content goes here */}
      <h1>{config.metadata?.title || paneMetadata.title}</h1>
      <p>{config.metadata?.description || paneMetadata.description}</p>
    </div>
  );
};

export const metadata = {
  title: 'Pane Title',
  description: 'Description of the pane.',
};

export default PaneTemplate;
