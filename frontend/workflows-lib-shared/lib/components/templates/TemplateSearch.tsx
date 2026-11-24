import { Clear, Search } from "@mui/icons-material";
import { IconButton, InputAdornment, TextField } from "@mui/material";

export interface TemplateSearchProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}

const TemplateSearch = ({
  label = "Search component",
  placeholder = "",
  value,
  onChange,
}: TemplateSearchProps) => {
  const handleClear = () => {
    onChange("");
  };

  return (
    <TextField
      fullWidth
      variant="outlined"
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="Clear search"
                onClick={handleClear}
                disabled={!value}
                edge="end"
              >
                <Clear />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};

export default TemplateSearch;
