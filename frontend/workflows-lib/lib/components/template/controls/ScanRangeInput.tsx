import { useCallback, useEffect, useState } from "react";
import { Box, InputAdornment, TextField, Tooltip } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { ScanRangeInputProps } from "../../../types";
import { validateScanRange } from "../../../utils/validationUtils";

const ScanRangeInput = ({ name, value, handleChange }: ScanRangeInputProps) => {
  const [scanRange, setScanRange] = useState({
    start: String(value.start),
    end: String(value.end),
  });

  const [excludedRaw, setExcludedRaw] = useState(
    (value.excluded ?? []).join(", "),
  );
  const [errors, setErrors] = useState({
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
    setErrors(result.errors);

    if (result.parsed) {
      const current = {
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

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: 2,
        alignItems: "flex-start",
        paddingTop: "20px",
      }}
    >
      <TextField
        type="number"
        label="Start"
        value={scanRange.start}
        onChange={handleFieldChange("start")}
        error={!!errors.start}
        helperText={errors.start || " "}
        slotProps={{
          htmlInput: { step: 1 },
          formHelperText: { sx: { minHeight: "3em", whiteSpace: "pre-wrap" } },
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
        error={!!errors.end}
        helperText={errors.end || " "}
        slotProps={{
          htmlInput: { step: 1 },
          formHelperText: { sx: { minHeight: "3em", whiteSpace: "pre-wrap" } },
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
        error={!!errors.excluded}
        helperText={errors.excluded || " "}
        slotProps={{
          formHelperText: { sx: { minHeight: "3em", whiteSpace: "pre-wrap" } },
          inputLabel: { shrink: true },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Accepts integers ond ranges separated by spaces or commas i.e. 1 2, 5-9, 11.">
                  <InfoOutlined color="action" />
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
};

export default ScanRangeInput;
