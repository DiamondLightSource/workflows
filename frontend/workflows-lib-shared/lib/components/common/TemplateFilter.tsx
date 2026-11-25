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
import { useEffect, useId, useRef, useState } from "react";

export interface TemplateFilterProps {
  label?: string;
  emptyLabel?: string;
  filterValues: string[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  variant?: "outlined" | "filled" | "standard";
}

const CLEAR_ALL_VALUE = "__clear_all__";

const TemplateFilter = ({
  label,
  emptyLabel = "All",
  filterValues,
  selectedValues,
  onChange,
  variant = "outlined",
}: TemplateFilterProps) => {
  const id = useId();

  const selectRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);

  useEffect(() => {
    const element = selectRef.current;

    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      setAvailableWidth(entry.contentRect.width);
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const selectId = `${id}-select`;
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

    const element = selectRef.current;

    if (!element || availableWidth === 0) {
      return `${selected[0]} +${String(selected.length - 1)} more`;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return `${selected[0]} +${String(selected.length - 1)} more`;
    }

    context.font = getComputedStyle(element).font;

    const measure = (text: string) => context.measureText(text).width;

    const maxWidth = Math.max(0, availableWidth - 40);

    const visible: string[] = [];

    for (let i = 0; i < selected.length; i++) {
      const remaining = selected.length - i - 1;

      const candidate = [...visible, selected[i]].join(", ");

      const display =
        remaining > 0 ? `${candidate} +${String(remaining)} more` : candidate;

      if (measure(display) > maxWidth) {
        break;
      }

      visible.push(selected[i]);
    }

    if (visible.length === selected.length) {
      return visible.join(", ");
    }

    if (visible.length === 0) {
      return `+${String(selected.length)} more`;
    }

    return `${visible.join(", ")} +${String(selected.length - visible.length)} more`;
  };

  return (
    <FormControl fullWidth variant={variant}>
      {label && (
        <InputLabel id={labelId} shrink>
          {label}
        </InputLabel>
      )}
      <Select
        ref={selectRef}
        labelId={label ? labelId : undefined}
        id={selectId}
        multiple
        displayEmpty
        value={selectedValues}
        onChange={handleChange}
        label={label}
        inputProps={{
          "aria-label": label ? undefined : "Filter values",
        }}
        renderValue={renderSelectedValues}

        MenuProps={{
          PaperProps: {
            sx: {
              bgcolor: "background.paper",
              color: "text.primary",
            },
          },
        }}
        sx={{
          bgcolor: "background.paper",
          color: "text.primary",

          "& .MuiSelect-select": {
            color: "text.primary",
          },

          "& .MuiSelect-icon": {
            color: "text.primary",
          },
        }}
      >
        <MenuItem
          value={CLEAR_ALL_VALUE}
          disabled={selectedValues.length === 0}
        >
          Clear all
        </MenuItem>
        <Divider />

        {filterValues.map((value) => (
          <MenuItem key={value} value={value}>
            <Checkbox checked={selectedValues.includes(value)} size="small" />
            <ListItemText primary={value} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default TemplateFilter;
