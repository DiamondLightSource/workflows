import React, { useState, useMemo } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import type { Artifact } from "workflows-lib";

interface ImageGalleryProps {
  artifactList: Artifact[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ artifactList }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageArtifacts = useMemo(() => {
    return artifactList.filter((artifact) => artifact.mimeType === "image/png");
  }, [artifactList]);

  const handlePrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? imageArtifacts.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === imageArtifacts.length - 1 ? 0 : prevIndex + 1
    );
  };

  return (
    <>
      {imageArtifacts.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: 2,
          }}
        >
          <Typography variant="body1" sx={{ color: "red" }} noWrap>
            No images available
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton onClick={handlePrevious}>
            <ArrowBackIcon />
          </IconButton>
          <Box
            component="img"
            src={imageArtifacts[currentIndex].url}
            alt={`Gallery Image ${currentIndex + 1}`}
            sx={{
              width: "300px",
              height: "300px",
              borderRadius: 1,
              border: "solid",
              objectFit: "contain",
            }}
          />
          <IconButton onClick={handleNext}>
            <ArrowForwardIcon />
          </IconButton>
        </Box>
      )}
    </>
  );
};
