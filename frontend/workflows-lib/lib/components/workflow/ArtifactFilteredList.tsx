import React, { useState, useMemo } from "react";
import {
  ToggleButtonGroup,
  ToggleButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  TableContainer,
  Paper,
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
    return artifactList.filter((artifact) => artifact.mimeType.startsWith("image"));
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
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "8px",
          border: "1px solid #ccc",
          marginTop: 2,
        }}
      >
        <Table sx={{ width: "100%" }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  borderRight: "1px solid #ccc",
                }}
              >
                <Typography variant="h6">Artefact Name</Typography>
              </TableCell>
              <TableCell>
                <Typography variant="h6">Parent Task</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listedArtifacts.map((artifact) => (
              <TableRow
                key={`${artifact.parentTask}-${artifact.name}`}
                hover
                onClick={() => window.open(artifact.url, "_blank")}
                style={{ cursor: "pointer" }}
              >
                <TableCell
                  sx={{
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    maxWidth: "300px",
                    borderRight: "1px solid #ccc",
                  }}
                >
                  {artifact.name}
                </TableCell>
                <TableCell
                  sx={{
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    maxWidth: "200px",
                    color: "#777",
                  }}
                >
                  {artifact.parentTask || "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
