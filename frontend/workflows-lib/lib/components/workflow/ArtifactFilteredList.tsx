import React, { useState, useMemo } from "react";
import {
  Box,
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
import type { ArtifactSortType } from "workflows-lib/lib/types";
import ImportExportIcon from "@mui/icons-material/ImportExport";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

interface ArtifactFilteredListProps {
  artifactList: Artifact[];
  onArtifactHover?: (artifactName: Artifact | null) => void;
}

export const ArtifactFilteredList: React.FC<ArtifactFilteredListProps> = ({
  artifactList,
  onArtifactHover,
}) => {
  const [sortType, setSortType] = useState<ArtifactSortType>({
    name: "name",
    order: true,
  });

  const handleSort = (column: "name" | "parentTask") => {
    if (sortType.name === column) {
      setSortType((prev) => ({ ...prev, order: !prev.order }));
    } else {
      setSortType({ name: column, order: true });
    }
  };

  const sortedArtifacts = useMemo(() => {
    const sorted = [...artifactList].sort((artifactA, artifactB) => {
      const sortValueA =
        sortType.name === "name" ? artifactA.name : artifactA.parentTask || "";
      const sortValueB =
        sortType.name === "name" ? artifactB.name : artifactB.parentTask || "";
      if (sortValueA < sortValueB) return sortType.order ? -1 : 1;
      if (sortValueA > sortValueB) return sortType.order ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [artifactList, sortType]);

  return (
    <>
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
                  cursor: "pointer",
                  userSelect: "none",
                  position: "relative",
                  paddingRight: "32px",
                }}
                onClick={() => {
                  handleSort("name");
                }}
              >
                <Box
                  style={{ display: "flex", alignItems: "center" }}
                  aria-label="sort-name"
                >
                  <Typography
                    variant="h6"
                    sx={{ flexGrow: 1, textAlign: "left" }}
                  >
                    Output Name
                  </Typography>
                  <Box
                    style={{
                      marginLeft: "auto",
                      color: sortType.name === "name" ? "inherit" : "#888",
                      position: "absolute",
                      right: "10px",
                      fontSize: "1.3em",
                    }}
                  >
                    {sortType.name === "name" ? (
                      sortType.order ? (
                        <ArrowUpwardIcon fontSize="inherit" />
                      ) : (
                        <ArrowDownwardIcon fontSize="inherit" />
                      )
                    ) : (
                      <ImportExportIcon fontSize="inherit" />
                    )}
                  </Box>
                </Box>
              </TableCell>
              <TableCell
                sx={{
                  cursor: "pointer",
                  userSelect: "none",
                  position: "relative",
                  paddingRight: "32px",
                }}
                onClick={() => {
                  handleSort("parentTask");
                }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center" }}
                  aria-label="sort-parent-task"
                >
                  <Typography
                    variant="h6"
                    sx={{ flexGrow: 1, textAlign: "left" }}
                  >
                    Parent Task
                  </Typography>
                  <Box
                    sx={{
                      marginLeft: "auto",
                      color:
                        sortType.name === "parentTask" ? "inherit" : "#888",
                      position: "absolute",
                      right: "10px",
                      fontSize: "1.3em",
                    }}
                  >
                    {sortType.name === "parentTask" ? (
                      sortType.order ? (
                        <ArrowUpwardIcon fontSize="inherit" />
                      ) : (
                        <ArrowDownwardIcon fontSize="inherit" />
                      )
                    ) : (
                      <ImportExportIcon fontSize="inherit" />
                    )}
                  </Box>
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedArtifacts.map((artifact) => (
              <TableRow
                key={`${artifact.parentTask}-${artifact.name}`}
                hover
                style={{ cursor: "pointer" }}
              >
                <TableCell
                  onMouseEnter={() => onArtifactHover?.(artifact)}
                  onMouseLeave={() => onArtifactHover?.(null)}
                  onClick={() => window.open(artifact.url, "_blank")}
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
                  onMouseEnter={() => onArtifactHover?.(artifact)}
                  onMouseLeave={() => onArtifactHover?.(null)}
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
