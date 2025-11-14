import { useReducer } from "react";
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
  interface ScanRangeState {
    componentError: {
      start: string;
      end: string;
      excluded: string;
    };
    excludedRaw: string;
    start: string;
    end: string;
  }

  interface ScanRangeAction {
    type: "start" | "end" | "excluded";
    payload: string;
  }

  function scanRangeReducer(
    state: ScanRangeState,
    action: ScanRangeAction,
  ): ScanRangeState {
    const newState = { ...state };

    switch (action.type) {
      case "start":
        newState.start = action.payload;
        break;
      case "end":
        newState.end = action.payload;
        break;
      case "excluded":
        newState.excludedRaw = action.payload;
        break;
      default:
        return state;
    }

    const result = validateScanRange(
      newState.start,
      newState.end,
      newState.excludedRaw,
    );
    newState.componentError = result.errors;

    if (result.parsed) {
      const scanRangeValue = {
        start: result.parsed.start,
        end: result.parsed.end,
        excluded: result.parsed.excluded,
      };
      handleChange(name, scanRangeValue);
    }

    return newState;
  }

  const [scanRange, handleScanRange] = useReducer(scanRangeReducer, {
    componentError: {
      start: "",
      end: "",
      excluded: "",
    },
    excludedRaw: Array.isArray(value.excluded) ? value.excluded.join(", ") : "",
    start: String(value.start || ""),
    end: String(value.end || ""),
  });

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
          onChange={(event) => {
            handleScanRange({ type: "start", payload: event.target.value });
          }}
          error={!!scanRange.componentError.start}
          helperText={scanRange.componentError.start || " "}
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
          onChange={(event) => {
            handleScanRange({ type: "end", payload: event.target.value });
          }}
          error={!!scanRange.componentError.end}
          helperText={scanRange.componentError.end || " "}
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
          value={scanRange.excludedRaw}
          onChange={(event) => {
            handleScanRange({ type: "excluded", payload: event.target.value });
          }}
          error={!!scanRange.componentError.excluded}
          helperText={scanRange.componentError.excluded || " "}
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
