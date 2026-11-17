import { Autocomplete, TextField } from "@mui/material";

export interface TemplateFilterProps {
  templates: string[];
  selectedTemplates: string[];
  onChange: (selectedTemplates: string[]) => void;
}

const TemplateFilter = ({
  templates,
  selectedTemplates,
  onChange,
}: TemplateFilterProps) => {
  return (
    <Autocomplete
      multiple
      options={templates}
      value={selectedTemplates}
      onChange={(_, newValue) => onChange(newValue)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Templates"
          placeholder="Filter by template"
        />
      )}
    />
  );
};

export default TemplateFilter;
