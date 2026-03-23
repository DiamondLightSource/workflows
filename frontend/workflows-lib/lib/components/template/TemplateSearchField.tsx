import { Search, Clear } from "@mui/icons-material";
import { Box, IconButton, InputAdornment, TextField } from "@mui/material";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

interface SearchFieldProps {
  handleSearch: (search: string) => void;
}

export default function TemplateSearchField({
  handleSearch,
}: SearchFieldProps) {
  const [searchParams] = useSearchParams();
  const [searchBoxContents, setSearchBoxContents] = useState(
    searchParams.get("search") ?? "",
  );

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
        id="search-templates"
        label="Search templates"
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
                <IconButton
                  onClick={handleClear}
                  data-testid="clear-search"
                  aria-label="Clear Search"
                >
                  <Clear />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        value={searchBoxContents}
      />
    </Box>
  );
}
