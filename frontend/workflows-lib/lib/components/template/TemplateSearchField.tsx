import { Search, Clear } from "@mui/icons-material";
import { Box, IconButton, InputAdornment, TextField } from "@mui/material";
import { useState } from "react";

interface SearchFieldProps {
  handleSearch: (search: string) => void;
}

export default function TemplateSearchField({
  handleSearch,
}: SearchFieldProps) {
  const [searchBoxContents, setSearchBoxContents] = useState("");

  const handleKeyPress = () => {
    handleSearch(searchBoxContents);
  };

  const handleClear = () => {
    setSearchBoxContents("");
    handleSearch("");
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center">
      <TextField
        onChange={(e) => {
          setSearchBoxContents(e.target.value);
        }}
        onKeyUp={handleKeyPress}
        slotProps={{
          htmlInput: { "data-testid": "searchInput" },
          input: {
            startAdornment: <Search />,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleClear} data-testid="clear-search">
                  <Clear />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        aria-label="Search templates"
        value={searchBoxContents}
      />
    </Box>
  );
}
