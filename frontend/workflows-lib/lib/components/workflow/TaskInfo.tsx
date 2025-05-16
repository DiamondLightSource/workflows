import React from "react";
import { Box } from "@mui/material";
import type { Artifact } from "workflows-lib";
import { ImageGallery } from "./ImageGallery";
import { ArtifactFilteredList } from "./ArtifactFilteredList";

interface TaskInfoProps {
  artifactList: Artifact[];
}

export const TaskInfo: React.FC<TaskInfoProps> = ({ artifactList }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: {
          xs: "column",
          sm: "row",
        },
        flexWrap: "wrap",
        gap: 2,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ flex: 1, minWidth: "300px" }}>
        <ArtifactFilteredList artifactList={artifactList} />
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: "300px",
        }}
      >
        <ImageGallery artifactList={artifactList} />
      </Box>
    </Box>
  );
};
