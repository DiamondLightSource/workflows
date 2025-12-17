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

export interface RawScanRange {
  excludedRaw: string;
  start: string;
  end: string;
}

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
    rawRange: RawScanRange;
  }

  type ScanRangeType = "start" | "end" | "excluded";

  interface ScanRangeAction {
    type: ScanRangeType;
    payload: string;
  }

  function scanRangeReducer(
    state: ScanRangeState,
    action: ScanRangeAction,
  ): ScanRangeState {
    const newState = { ...state };

    switch (action.type) {
      case "start":
        newState.rawRange.start = action.payload;
        break;
      case "end":
        newState.rawRange.end = action.payload;
        break;
      case "excluded":
        newState.rawRange.excludedRaw = action.payload;
        break;
      default:
        return state;
    }

    const result = validateScanRange(newState.rawRange);
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

  const [scanRange, dispatch] = useReducer(scanRangeReducer, {
    componentError: {
      start: "",
      end: "",
      excluded: "",
    },
    rawRange: {
      excludedRaw: Array.isArray(value.excluded)
        ? value.excluded.join(", ")
        : "",
      start: String(value.start || ""),
      end: String(value.end || ""),
    },
  });

  if (!visible) return null;

  const handleScanRangeChange =
    (
      type: ScanRangeType,
    ): React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> =>
    (event) => {
      dispatch({ type: type, payload: event.target.value });
    };

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
          value={scanRange.rawRange.start}
          onChange={handleScanRangeChange("start")}
          error={!!scanRange.componentError.start}
          helperText={scanRange.componentError.start || " "}
          disabled={!enabled}
          slotProps={{
            htmlInput: { step: 1, min: 0 },
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
          value={scanRange.rawRange.end}
          onChange={handleScanRangeChange("end")}
          error={!!scanRange.componentError.end}
          helperText={scanRange.componentError.end || " "}
          disabled={!enabled}
          slotProps={{
            htmlInput: { step: 1, min: 0 },
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
          value={scanRange.rawRange.excludedRaw}
          onChange={handleScanRangeChange("excluded")}
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
