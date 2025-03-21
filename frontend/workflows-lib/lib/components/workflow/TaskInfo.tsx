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
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          p: 2,
        }}
      >
        <ArtifactFilteredList
          artifactList={artifactList}
        ></ArtifactFilteredList>
        <ImageGallery artifactList={artifactList}></ImageGallery>
      </Box>
    </>
  );
};
