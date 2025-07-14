import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  ListSubheader,
} from "@mui/material";
import type { Artifact } from "workflows-lib";

interface ArtifactFilteredListProps {
  artifactList: Artifact[];
}

export const ArtifactFilteredList: React.FC<ArtifactFilteredListProps> = ({
  artifactList,
}) => {
  const [artifactFilter, setArtifactFilter] = useState<string>("all");

  const handleArtifactFilter = (
    _: React.MouseEvent<HTMLElement>,
    newArtifactFilter: string
  ) => {
    setArtifactFilter(newArtifactFilter);
  };

  const imageArtifacts = useMemo(() => {
    return artifactList.filter((artifact) => artifact.mimeType === "image/png");
  }, [artifactList]);

  const listedArtifacts = useMemo(() => {
    switch (artifactFilter) {
      case "images":
        return imageArtifacts;
      case "log":
        return artifactList.filter(
          (artifact) =>
            artifact.mimeType === "text/plain" && artifact.name === "main.log"
        );
      case "text":
        return artifactList.filter(
          (artifact) => artifact.mimeType === "text/plain"
        );
      default:
        return artifactList;
    }
  }, [artifactFilter, artifactList, imageArtifacts]);
  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          p: 2,
        }}
      >
        <ToggleButtonGroup
          value={artifactFilter}
          exclusive
          onChange={handleArtifactFilter}
          aria-label="artifact filter"
        >
          <ToggleButton value="all" aria-label="all">
            ALL
          </ToggleButton>
          <ToggleButton value="log" aria-label="log">
            LOG
          </ToggleButton>
          <ToggleButton value="text" aria-label="text">
            TEXT
          </ToggleButton>
          <ToggleButton value="images" aria-label="images">
            IMAGES
          </ToggleButton>
        </ToggleButtonGroup>
        <List
          sx={{ paddingRight: "200px", width: "450px", paddingTop: 0 }}
          subheader={<ListSubheader>Artifacts</ListSubheader>}
        >
          {listedArtifacts.map((artifact) => (
            <Tooltip title={artifact.name} enterDelay={400} key={`${artifact.parentTask}-${artifact.name}`}>
              <ListItemButton
                onClick={() => window.open(artifact.url, "_blank")}
              >
                <Box display="flex" flexDirection="row" alignItems="center" justifyContent="space-between" width="100%">
                  <Typography
                    noWrap
                    sx={{
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {artifact.name}
                  </Typography>
                  {artifact.parentTask && (
                    <Typography
                      noWrap
                      color="#777"
                      sx={{
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {artifact.parentTask}
                    </Typography>
                  )}
                </Box>
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </Box>
    </>
  );
};
