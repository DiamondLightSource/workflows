import React from "react";
import ClearIcon from "@mui/icons-material/Clear";
import {
  Box,
  MenuItem,
  Select,
  Checkbox,
  ListItemText,
  FormControl,
  InputLabel,
} from "@mui/material";

interface FileTypeDropdownProps {
  fileTypes: string[];
  selectedFileTypes: string[];
  setSelectedFileTypes: (types: string[]) => void;
}

export const FileTypeDropdown: React.FC<FileTypeDropdownProps> = ({
  fileTypes,
  selectedFileTypes,
  setSelectedFileTypes,
}) => {
  if (!fileTypes.length) return null;

  return (
    <FormControl
      variant="outlined"
      size="small"
      sx={{ width: "29%", position: "relative" }}
    >
      <InputLabel id="file-types-label">File Types</InputLabel>
      {selectedFileTypes.length > 0 && (
        <ClearIcon
          aria-label="clearFileTypes"
          type="button"
          onClick={() => {
            setSelectedFileTypes([]);
          }}
          style={{
            position: "absolute",
            right: 30,
            top: 8,
            zIndex: 1,
            background: "#eef",
            borderRadius: "4px",
            padding: "2px 4px",
            cursor: "pointer",
          }}
        />
      )}
      <Select
        labelId="file-types-label"
        id="file-types"
        multiple
        value={selectedFileTypes}
        onChange={(e) => {
          setSelectedFileTypes(e.target.value as string[]);
        }}
        label="File Types"
        renderValue={(selected) => {
          let displayText: string;
          if (selected.length === 0) {
            displayText = "All file types";
          } else if (selected.length === 1) {
            displayText = selected[0];
          } else {
            const joined = selected.join(", ");
            displayText =
              joined.length > 20 ? `${joined.slice(0, 20)}...` : joined;
          }
          return <Box>{displayText}</Box>;
        }}
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
    </FormControl>
  );
};
