import React, { useMemo } from "react";
import type { Artifact } from "workflows-lib";
import { ScrollableImages, ImageInfo } from "@diamondlightsource/sci-react-ui";

interface ImageGalleryProps {
  artifactList: Artifact[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ artifactList }) => {

  const imageArtifactsInfos: ImageInfo[] = useMemo(() => {
    return artifactList.filter((artifact) => artifact.mimeType === "image/png")
    .map((artifact, index) => ({
        src: artifact.url,
        alt: artifact.name || `Gallery Image ${String(index + 1)}`,
      }));
  }, [artifactList]);


  return (
    <>
      { <ScrollableImages images={imageArtifactsInfos} backgroundColor="#FFF"/> }
    </>
  );
};
