import React from "react";
import type { ConfigFieldDefinition } from "../types/PaneConfig";

interface ContentPaneProps {
  title?: string;
  content?: string;
  iframeUrl?: string;
  [key: string]: any;
}

const configSchema: ConfigFieldDefinition[] = [
  {
    key: 'title',
    label: 'Title',
    type: 'text',
    placeholder: 'Enter a title',
    description: 'Title for this content pane',
    defaultValue: 'Information',
  },
  {
    key: 'content',
    label: 'Content',
    type: 'textarea',
    placeholder: 'Enter your content...',
    description: 'Text content to display (supports basic HTML)',
    defaultValue: 'No content available',
  },
  {
    key: 'iframeUrl',
    label: 'Iframe URL (Optional)',
    type: 'url',
    placeholder: 'https://example.com',
    description: 'If provided, displays content in an iframe instead of text',
  },
];

const ContentPane: React.FC<ContentPaneProps> = ({ 
  title = "Information",
  content = "No content available",
  iframeUrl,
}) => {
  return (
    <div className="grow overflow-auto p-2 scrollbar-hide flex flex-col h-full">
      {/* Header */}
      {!iframeUrl && (
        <div className="pb-3 mb-3 border-b border-slate-700 shrink-0">
          <h3 className="font-bold text-sm text-slate-200">{title}</h3>
        </div>
      )}

      {/* Content */}
      {iframeUrl ? (
        <iframe
          src={iframeUrl}
          className="flex-1 border border-slate-600 rounded w-full"
          title={title}
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      ) : (
        <div className="text-sm text-slate-300 leading-relaxed">
          <h3 className="font-bold text-sm text-slate-200 mb-3">{title}</h3>
          {content}
        </div>
      )}
    </div>
  );
};

export const metadata = {
  type: "content" as const,
  title: "Content",
  description: "Displays custom text or HTML content, or an iframe",
  configSchema,
};

export default ContentPane;
