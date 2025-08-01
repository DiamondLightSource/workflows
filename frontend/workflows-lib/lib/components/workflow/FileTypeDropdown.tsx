import React from "react";
import {
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
    <FormControl variant="outlined" size="small" sx={{ width: "29%" }}>
      <InputLabel id="file-types-label">File Types</InputLabel>
      <Select
        labelId="file-types-label"
        id="file-types"
        multiple
        value={selectedFileTypes}
        onChange={(e) => {
          setSelectedFileTypes(e.target.value as string[]);
        }}
        label="File Types"
        renderValue={(selected) =>
          selected.length === 0
            ? "All file types"
            : selected.length === 1
              ? selected[0]
              : `${String(selected.length)} types selected`
        }
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
