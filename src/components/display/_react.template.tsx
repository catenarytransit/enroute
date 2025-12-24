import React, { useEffect } from 'react';
import { loadDynamicPanes } from 'utils/DynamicLoader.ts';
import { DisplayHeader } from '../common/DisplayHeader';
import { PaneEditorSetup } from '../PaneEditorSetup';

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

const DisplayTemplateContent: React.FC<DisplayProps> = ({ config, data }) => {
  useEffect(() => {
    loadDynamicPanes().then((loadedPanes) => {
      console.log('Loaded panes:', loadedPanes);
    });
  }, []);

  return (
    <div
      className="w-screen h-screen overflow-hidden relative font-sans"
      style={{ backgroundColor: "var(--catenary-background)" }}
    >
      <DisplayHeader
        title={displayMetadata.title}
        showGridControls={false}
      />

      {/* Display content goes here */}
      <div style={{ paddingTop: "6vh", padding: "20px" }}>
        <h1>{displayMetadata.title}</h1>
        <p>{displayMetadata.description}</p>
      </div>
    </div>
  );
};

const DisplayTemplate: React.FC<DisplayProps> = (props) => (
  <PaneEditorSetup>
    <DisplayTemplateContent {...props} />
  </PaneEditorSetup>
);

export default DisplayTemplate;
