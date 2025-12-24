import React, { useState } from "react";
import type { ConfigFieldDefinition } from "../types/PaneConfig";

interface ImagePaneProps {
  imageUrl?: string;
  [key: string]: any;
}

const configSchema: ConfigFieldDefinition[] = [
  {
    key: 'imageUrl',
    label: 'Image URL',
    type: 'url',
    placeholder: 'https://example.com/image.jpg',
    description: 'URL of the image to display',
    required: true,
    defaultValue: '/alert/pride.png',
  },
];

const ImagePane: React.FC<ImagePaneProps> = ({ imageUrl = "/alert/pride.png" }) => {
  const [imageSrc, setImageSrc] = useState(imageUrl);
  const [error, setError] = useState<string | null>(null);

  const handleImageError = () => {
    setError("Failed to load image");
  };

  return (
    <div className="grow overflow-auto p-2 scrollbar-hide flex flex-col items-center justify-center h-full">
      {error ? (
        <div className="flex items-center justify-center h-full p-4 text-center">
          <span className="text-red-400 text-xs">{error}</span>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={imageSrc}
            alt="Display"
            onError={handleImageError}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
};

export const metadata = {
  type: "image" as const,
  title: "Image Display",
  description: "Displays images from URLs",
  configSchema,
};

export default ImagePane;
