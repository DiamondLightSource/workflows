import React, { useState, useMemo } from "react";
import {
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
  const [sortColumn, setSortColumn] = useState<"name" | "parentTask">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (column: "name" | "parentTask") => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const sortedArtifacts = useMemo(() => {
    const sorted = [...artifactList].sort((artifactA, artifactB) => {
      const sortValueA =
        sortColumn === "name" ? artifactA.name : artifactA.parentTask || "";
      const sortValueB =
        sortColumn === "name" ? artifactB.name : artifactB.parentTask || "";
      if (sortValueA < sortValueB) return sortOrder === "asc" ? -1 : 1;
      if (sortValueA > sortValueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [artifactList, sortColumn, sortOrder]);

  return (
    <>
      <Typography variant="h5" sx={{ marginTop: 2, marginBottom: 2 }}>
        Artefacts
      </Typography>
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
                <div style={{ display: "flex", alignItems: "center" }} aria-label="sort-name">
                  <Typography variant="h6" sx={{ flexGrow: 1, textAlign: "left" }}>
                    Artefact Name
                  </Typography>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: sortColumn === "name" ? "inherit" : "#888",
                      position: "absolute",
                      right: "10px",
                      fontSize: "1.3em",
                    }}
                  >
                    {sortColumn === "name"
                      ? sortOrder === "asc"
                        ? " ↑"
                        : " ↓"
                      : "⇅"}
                  </span>
                </div>
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
                <div style={{ display: "flex", alignItems: "center" }} aria-label="sort-parent-task">
                  <Typography variant="h6" sx={{ flexGrow: 1, textAlign: "left" }}>
                    Parent Task
                  </Typography>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: sortColumn === "parentTask" ? "inherit" : "#888",
                      position: "absolute",
                      right: "10px",
                      fontSize: "1.3em",
                    }}
                  >
                    {sortColumn === "parentTask"
                      ? sortOrder === "asc"
                        ? " ↑"
                        : " ↓"
                      : "⇅"}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedArtifacts.map((artifact) => (
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
