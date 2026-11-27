import { useId } from "react";
import {
  Checkbox,
  Divider,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";

export interface TemplateFilterProps {
  label?: string;
  emptyLabel?: string;
  filterValues: string[];
  selectedTemplates: string[];
  onChange: (selectedTemplates: string[]) => void;
}

const CLEAR_ALL_VALUE = "__clear_all__";

const TemplateFilter = ({
  label = "Science Group",
  emptyLabel = "All",
  filterValues,
  selectedTemplates,
  onChange,
}: TemplateFilterProps) => {
  const id = useId();
  const labelId = `${id}-label`;

  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;

    const selected = typeof value === "string" ? value.split(",") : value;

    if (selected.includes(CLEAR_ALL_VALUE)) {
      onChange([]);
      return;
    }

    onChange(selected);
  };

  const renderSelectedValues = (selected: string[]) => {
    if (selected.length === 0) {
      return emptyLabel;
    }

    if (selected.length === 1) {
      return selected[0];
    }

    return `${selected[0]} +${String(selected.length - 1)} more`;
  };

  return (
    <FormControl fullWidth variant="outlined">
      <InputLabel id={labelId} shrink>
        {label}
      </InputLabel>

      <Select
        labelId={labelId}
        id={id}
        multiple
        displayEmpty
        value={selectedTemplates}
        onChange={handleChange}
        label={label}
        renderValue={renderSelectedValues}
        sx={{
          borderRadius: "4px",
          backgroundColor: "transparent",
        }}
      >
        <MenuItem
          value={CLEAR_ALL_VALUE}
          disabled={selectedTemplates.length === 0}
        >
          Clear all
        </MenuItem>
        <Divider />

        {filterValues.map((value) => (
          <MenuItem key={value} value={value}>
            <Checkbox checked={selectedTemplates.includes(value)} />
            <ListItemText primary={value} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default TemplateFilter;
