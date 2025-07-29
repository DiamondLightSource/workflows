import React, { useState, useMemo } from "react";
import {
  MenuItem,
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
  TextField,
  Select,
  Checkbox,
  ListItemText,
} from "@mui/material";
import type { Artifact } from "workflows-lib";

interface ArtifactFilteredListProps {
  artifactList: Artifact[];
}

export const ArtifactFilteredList: React.FC<ArtifactFilteredListProps> = ({
  artifactList,
}) => {
  const [artifactFilter, setArtifactFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<"name" | "parentTask">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);

  const handleArtifactFilter = (
    _: React.MouseEvent<HTMLElement>,
    newArtifactFilter: string
  ) => {
    setArtifactFilter(newArtifactFilter);
  };

  const handleSort = (column: "name" | "parentTask") => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
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

  const filteredArtifacts = useMemo(() => {
    if (!searchQuery.trim()) return listedArtifacts;
    const query = searchQuery.trim().toLowerCase();
    return listedArtifacts.filter((artifact) => {
      const name = artifact.name.toLowerCase();
      const parentTask = (artifact.parentTask || "").toLowerCase();
      return name.includes(query) || parentTask.includes(query);
    });
  }, [listedArtifacts, searchQuery]);

  const fileTypes = useMemo(() => {
    const types = new Set<string>();
    listedArtifacts.forEach((artifact) => {
      const fileType = artifact.name.split(".").pop();
      if (fileType) types.add(fileType);
    });
    return Array.from(types);
  }, [listedArtifacts]);

  const filteredByFileTypes = useMemo(() => {
    if (selectedFileTypes.length === 0) return filteredArtifacts;
    return filteredArtifacts.filter((artifact) =>
      selectedFileTypes.some((type) => artifact.name.endsWith(`.${type}`))
    );
  }, [filteredArtifacts, selectedFileTypes]);

  const sortedArtifacts = useMemo(() => {
    const sorted = [...filteredByFileTypes].sort((artifactA, artifactB) => {
      const sortValueA =
        sortColumn === "name" ? artifactA.name : artifactA.parentTask || "";
      const sortValueB =
        sortColumn === "name" ? artifactB.name : artifactB.parentTask || "";
      if (sortValueA < sortValueB) return sortOrder === "asc" ? -1 : 1;
      if (sortValueA > sortValueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredByFileTypes, sortColumn, sortOrder]);

  return (
    <>
      <Typography variant="h5" sx={{ marginTop: 2, marginBottom: 2 }}>
        Artefacts
      </Typography>
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
      <div style={{marginTop: "16px", display: "flex", gap: "5px"}}>
        <TextField
        label="Search Artefacts"
        variant="outlined"
        size="small"
        value={searchQuery}
        onChange={e => { setSearchQuery(e.target.value); }}
        sx={{ width: "75%" }}
        placeholder="Search by name or parent task"
        />
        <Select
          multiple
          value={selectedFileTypes}
          onChange={(e) => {
            setSelectedFileTypes(e.target.value as string[]);
          }}
          renderValue={(selected) => selected.join(", ")}
          variant="outlined"
          size="small"
          sx={{ width: "25%" }}
        >
          {fileTypes.map((type) => (
            <MenuItem
              key={type}
              value={type}
              sx={{ display: "flex", alignItems: "center" }}
            >
              <Checkbox
                checked={selectedFileTypes.includes(type)}
                sx={{ marginRight: "8px" }}
              />
              <ListItemText primary={type} />
            </MenuItem>
          ))}
        </Select>
      </div>
      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "8px",
          border: "1px solid #ccc",
          marginTop: 1,
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
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{ flexGrow: 1, textAlign: "left" }}
                  >
                    Artefact Name
                  </Typography>
                  <span
                    style={{
                      marginLeft: "auto",
                      color:
                        sortColumn === "name" ? "inherit" : "#888",
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
                <div style={{ display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="h6"
                    sx={{ flexGrow: 1, textAlign: "left" }}
                  >
                    Parent Task
                  </Typography>
                  <span
                    style={{
                      marginLeft: "auto",
                      color:
                        sortColumn === "parentTask" ? "inherit" : "#888",
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
