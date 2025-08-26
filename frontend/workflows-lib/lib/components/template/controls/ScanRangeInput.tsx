import { useCallback, useEffect, useState } from "react";
import {
  Box,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { validateScanRange } from "../../../utils/validationUtils";
import { ScanRange } from "../../../types";

export interface ScanRangeInputProps {
  name: string;
  value: ScanRange;
  handleChange: (path: string, value: ScanRange) => void;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  enabled?: boolean;
  visible?: boolean;
  id?: string;
}

const ScanRangeInput = ({
  name,
  value,
  handleChange,
  label,
  description,
  error,
  required = false,
  enabled = true,
  visible = true,
  id,
}: ScanRangeInputProps) => {
  const [scanRange, setScanRange] = useState({
    start: String(value.start),
    end: String(value.end),
  });

  const [excludedRaw, setExcludedRaw] = useState(
    (value.excluded ?? []).join(", "),
  );
  const [componentError, setComponentError] = useState({
    start: "",
    end: "",
    excluded: "",
  });

  const [hasUserEditedExcluded, setHasUserEditedExcluded] = useState(false);

  const validateAndUpdate = useCallback(() => {
    const result = validateScanRange(
      scanRange.start,
      scanRange.end,
      excludedRaw,
    );
    setComponentError(result.errors);

    if (result.parsed) {
      const current: ScanRange = {
        start: Number(scanRange.start),
        end: Number(scanRange.end),
        excluded: result.parsed.excluded,
      };

      const isEqual =
        current.start === value.start &&
        current.end === value.end &&
        JSON.stringify(current.excluded) ===
          JSON.stringify(value.excluded ?? []);

      if (!isEqual) {
        handleChange(name, result.parsed);
      }
    }
  }, [scanRange, excludedRaw, handleChange, name, value]);

  const handleFieldChange =
    (field: keyof typeof scanRange) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setScanRange({ ...scanRange, [field]: event.target.value });
    };

  const handleExcludedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExcludedRaw(event.target.value);
    setHasUserEditedExcluded(true);
  };

  useEffect(() => {
    setScanRange({
      start: String(value.start),
      end: String(value.end),
    });

    if (!hasUserEditedExcluded) {
      setExcludedRaw((value.excluded ?? []).join(", "));
    }
  }, [value.start, value.end, value.excluded, hasUserEditedExcluded]);

  useEffect(() => {
    validateAndUpdate();
  }, [scanRange, excludedRaw, validateAndUpdate]);

  if (!visible) return null;

  return (
    <Box
      id={id}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        paddingTop: "20px",
      }}
    >
      {label && (
        <Typography variant="body1">
          {label}
          {required && <span style={{ color: "red" }}> *</span>}
        </Typography>
      )}

      {description && (
        <Typography variant="caption" color="textSecondary">
          {description}
        </Typography>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        <TextField
          type="number"
          label="Start"
          value={scanRange.start}
          onChange={handleFieldChange("start")}
          error={!!componentError.start}
          helperText={componentError.start || " "}
          disabled={!enabled}
          slotProps={{
            htmlInput: { step: 1 },
            formHelperText: {
              sx: { minHeight: "3em", whiteSpace: "pre-wrap" },
            },
            inputLabel: { shrink: true },
          }}
          onWheel={(event) => {
            (event.target as HTMLInputElement).blur();
          }}
        />

        <TextField
          type="number"
          label="End"
          value={scanRange.end}
          onChange={handleFieldChange("end")}
          error={!!componentError.end}
          helperText={componentError.end || " "}
          disabled={!enabled}
          slotProps={{
            htmlInput: { step: 1 },
            formHelperText: {
              sx: { minHeight: "3em", whiteSpace: "pre-wrap" },
            },
            inputLabel: { shrink: true },
          }}
          onWheel={(event) => {
            (event.target as HTMLInputElement).blur();
          }}
        />

        <TextField
          label="Excluded"
          value={excludedRaw}
          onChange={handleExcludedChange}
          error={!!componentError.excluded}
          helperText={componentError.excluded || " "}
          disabled={!enabled}
          slotProps={{
            formHelperText: {
              sx: { minHeight: "3em", whiteSpace: "pre-wrap" },
            },
            inputLabel: { shrink: true },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Accepts integers and ranges separated by spaces or commas, e.g. 1 2, 5-9, 11.">
                    <InfoOutlined color="action" />
                  </Tooltip>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
};

export default ScanRangeInput;
