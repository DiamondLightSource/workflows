import {
  Button,
  Drawer,
  TextField,
  Typography,
  Box,
  Stack,
  Divider,
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";
import { useState } from "react";
import { WorkflowQueryFilter, WorkflowStatusBool } from "../../types";

interface WorkflowListFilterDrawerProps {
  onApplyFilters: (filters: WorkflowQueryFilter) => void;
}

type LabelValueRowProps = {
  label: string;
  value: string;
}

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

function WorkflowListFilterDrawer({ onApplyFilters }: WorkflowListFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [creator, setCreator] = useState<string>("");
  const [errors, setErrors] = useState<{ creator?: boolean }>({});
  const [status, setStatus] = useState<WorkflowStatusBool | undefined>(undefined);

  const toggleDrawer = (newOpen: boolean) => () => {setOpen(newOpen)};

  const handleChangeCreator = (value: string) => {
    setCreator(value);

    const isValid = value === "" || /^[a-z]+[0-9]+$/.test(value);
    setErrors((prev) => ({ ...prev, creator: !isValid }));
  };

  const handleStatusChange = (value: string[]) => {
    if (value.length === 0) {
      setStatus(undefined);
      return;
    }
    const statusOptions = ["pending", "running", "succeeded", "failed", "error"] as const;
    const newStatus: WorkflowStatusBool = Object.fromEntries(
      statusOptions
        .filter((k) => value.includes(k))
        .map((k) => [k, true])
    );
    setStatus(newStatus);
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
    const rawFilter =
    {
      creator,
      workflowStatusFilter: status,
    };
    const filter = normaliseFilter(rawFilter);
    const validation = validateFilter(filter);
    return { filter, validation };
  }

  function normaliseFilter(filter: WorkflowQueryFilter): WorkflowQueryFilter {
    filter.creator = filter.creator?.trim() === "" ? undefined: filter.creator;
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
          <Typography variant="h6" color="primary" gutterBottom>
            Select Your Filters
          </Typography>

          <TextField
            fullWidth
            id="Creator"
            label="FedID"
            variant="outlined"
            value={creator}
            error={!!errors.creator}
            onChange={(e) => { handleChangeCreator(e.target.value); }}
          />

          <InputLabel id="status-label">Workflow Status</InputLabel>
          <Select
            labelId="status-label"
            id="status"
            multiple
            value={
              status
                ? Object.entries(status)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                : []
            }
            onChange={(e) => { handleStatusChange(e.target.value as string[]); }}
            label="Status"
          >
            <MenuItem value={"pending"}>Pending</MenuItem>
            <MenuItem value={"running"}>Running</MenuItem>
            <MenuItem value={"succeeded"}>Succeeded</MenuItem>
            <MenuItem value={"failed"}>Failed</MenuItem>
            <MenuItem value={"error"}>Error</MenuItem>
          </Select>


          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
            <Button variant="outlined" onClick={toggleDrawer(false)}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleApply} disabled={isApplyDisabled}>
              Apply
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}

export default WorkflowListFilterDrawer;
