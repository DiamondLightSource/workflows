import { Box, TextField } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
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

  const validateAndUpdate = useCallback(() => {
    const result = validateScanRange(
      scanRange.start,
      scanRange.end,
      excludedRaw,
    );
    setErrors(result.errors);

    if (result.parsed) {
      handleChange(name, result.parsed);
    }
  }, [scanRange, excludedRaw, handleChange, name]);

  const handleFieldChange =
    (field: keyof typeof scanRange) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setScanRange({ ...scanRange, [field]: event.target.value });
    };

  const handleExcludedChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExcludedRaw(event.target.value);
  };

  useEffect(() => {
    setScanRange({
      start: String(value.start),
      end: String(value.end),
    });
    if ((value.excluded ?? []).length === 0) {
      setExcludedRaw("");
    }
  }, [value.start, value.end, value.excluded]);

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
        onBlur={validateAndUpdate}
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
        onBlur={validateAndUpdate}
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
        onBlur={validateAndUpdate}
        error={!!errors.excluded}
        helperText={errors.excluded || " "}
        slotProps={{
          formHelperText: { sx: { minHeight: "3em", whiteSpace: "pre-wrap" } },
          inputLabel: { shrink: true },
        }}
      />
    </Box>
  );
};

export default ScanRangeInput;
