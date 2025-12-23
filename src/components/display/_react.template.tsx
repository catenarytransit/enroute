import React, { useEffect } from 'react';
import { loadDynamicPanes } from 'utils/DynamicLoader.ts';

export const metadata = {
  title: 'Display Title',
  description: 'Description of the display.',
};

export const displayMetadata = {
  title: 'Display Title',
  description: 'Description of the display.',
};

export type DisplayProps = {
  config: Record<string, any>; // LocalStorage config
  data: any; // Data passed to the display
};

const DisplayTemplate: React.FC<DisplayProps> = ({ config, data }) => {
  useEffect(() => {
    loadDynamicPanes().then((loadedPanes) => {
      console.log('Loaded panes:', loadedPanes);
    });
  }, []);

  return (
    <div>
      <h1>{displayMetadata.title}</h1>
      <p>{displayMetadata.description}</p>
      {/* Display content goes here */}
    </div>
  );
};

export default DisplayTemplate;
