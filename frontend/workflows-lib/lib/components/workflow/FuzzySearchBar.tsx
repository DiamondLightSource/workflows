import React from "react";
import { TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { IconButton } from "@mui/material";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const FuzzySearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
}) => {
  return (
    <TextField
      aria-label="Search Outputs"
      variant="outlined"
      size="small"
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value);
      }}
      placeholder="Search by name or parent task"
      sx={{ width: "70%", marginRight: 0.5, color: "#737373" }}
      slotProps={{
        htmlInput: {
          "data-testid": "searchOutputs",
        },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: searchQuery && (
            <InputAdornment position="end">
              <IconButton
                aria-label="clear search"
                onClick={() => {
                  setSearchQuery("");
                }}
                edge="end"
                size="small"
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};
