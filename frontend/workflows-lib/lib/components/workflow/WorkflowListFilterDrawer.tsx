import {
  Button,
  Drawer,
  TextField,
  Typography,
  Box,
  Stack,
  Divider,
  Autocomplete,
  IconButton,
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import { WorkflowQueryFilter, WorkflowStatusBool } from "../../types";

interface WorkflowListFilterDrawerProps {
  onApplyFilters: (filters: WorkflowQueryFilter) => void;
}

type LabelValueRowProps = {
  label: string;
  value: string;
};

export function LabelValueRow({ label, value }: LabelValueRowProps) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography sx={{ fontWeight: "bold" }}>{label}:</Typography>
      <Typography>{value}</Typography>
    </Stack>
  );
}

function WorkflowStatusToString(status?: WorkflowStatusBool): string | null {
  if (!status) return null;

  const result = Object.entries(status)
    .filter(([, value]) => value === true)
    .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
    .join(", ");

  return result.length > 0 ? result : null;
}

export function WorkflowListFilterDisplay({
  filter,
}: {
  filter: WorkflowQueryFilter;
}) {
  const statusString = WorkflowStatusToString(filter.workflowStatusFilter);
  const creator = filter.creator;
  return (
    <Box sx={{ mb: 2 }}>
      {creator && <LabelValueRow label="FedID" value={creator} />}
      {statusString && (
        <LabelValueRow label="Workflow Status" value={statusString} />
      )}
      <Divider sx={{ borderBottomWidth: 3 }} />
    </Box>
  );
}

function WorkflowListFilterDrawer({
  onApplyFilters,
}: WorkflowListFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [creator, setCreator] = useState<string>("");
  const [errors, setErrors] = useState<{ creator?: boolean }>({});
  const [status, setStatus] = useState<{ label: string; value: string }[]>([]);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const clearAllFilters = () => () => {
    setCreator("");
    setStatus([]);
    setErrors({});
  };

  const handleChangeCreator = (value: string) => {
    setCreator(value);

    const isValid = value === "" || /^[a-z]+[0-9]+$/.test(value);
    setErrors((prev) => ({ ...prev, creator: !isValid }));
  };

  const handleApply = () => {
    const { filter, validation } = processFilter();

    setErrors(validation.errors);

    if (!validation.valid) return;

    setOpen(false);
    onApplyFilters(filter);
  };

  function processFilter(): {
    filter: WorkflowQueryFilter;
    validation: { valid: boolean; errors: Record<string, boolean> };
  } {
    const selectedValues = status.map((opt) => opt.value);

    const workflowStatusFilter: WorkflowStatusBool | undefined =
      selectedValues.length > 0
        ? Object.fromEntries(
            ["pending", "running", "succeeded", "failed", "error"]
              .filter((k) => selectedValues.includes(k))
              .map((k) => [k, true]),
          )
        : undefined;

    const rawFilter = {
      creator,
      workflowStatusFilter,
    };

    const filter = normaliseFilter(rawFilter);
    const validation = validateFilter(filter);
    return { filter, validation };
  }

  function normaliseFilter(filter: WorkflowQueryFilter): WorkflowQueryFilter {
    filter.creator = filter.creator?.trim() === "" ? undefined : filter.creator;
    return filter;
  }

  function validateFilter(filter: WorkflowQueryFilter): {
    valid: boolean;
    errors: Record<string, boolean>;
  } {
    const errors: Record<string, boolean> = {};

    if (filter.creator && !/^[a-z]+[0-9]+$/.test(filter.creator)) {
      errors.creator = true;
    }

    return {
      valid: Object.values(errors).every((e) => !e),
      errors,
    };
  }

  const isApplyDisabled = !processFilter().validation.valid;

  return (
    <>
      <Button sx={{ mt: 1 }} variant="contained" onClick={toggleDrawer(true)}>
        Add filters
      </Button>

      <Drawer anchor="left" open={open} onClose={toggleDrawer(false)}>
        <Box
          sx={{
            width: 300,
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <IconButton
            onClick={toggleDrawer(false)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" color="primary" gutterBottom>
            Select Filters
          </Typography>
          <TextField
            fullWidth
            id="Creator"
            label="FedID"
            variant="outlined"
            value={creator}
            error={!!errors.creator}
            onChange={(e) => {
              handleChangeCreator(e.target.value);
            }}
            slotProps={{
              input: {
                endAdornment: creator ? (
                  <IconButton
                    onClick={() => {
                      handleChangeCreator("");
                    }}
                  >
                    <ClearIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                ) : undefined,
              },
            }}
          />
          <Autocomplete
            multiple
            options={[
              { label: "Pending", value: "pending" },
              { label: "Running", value: "running" },
              { label: "Succeeded", value: "succeeded" },
              { label: "Failed", value: "failed" },
              { label: "Error", value: "error" },
            ]}
            value={status}
            onChange={(_e, val) => {
              setStatus(val);
            }}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) =>
              option.value === value.value
            }
            renderInput={(params) => <TextField {...params} label="Status" />}
            slotProps={{
              popupIndicator: { sx: { display: "none" } },
            }}
          />
          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
            <Button variant="outlined" onClick={clearAllFilters()}>
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={handleApply}
              disabled={isApplyDisabled}
            >
              Apply
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}

export default WorkflowListFilterDrawer;
