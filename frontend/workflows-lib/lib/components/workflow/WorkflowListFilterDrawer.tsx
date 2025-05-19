import {
  Button,
  Drawer,
  TextField,
  Typography,
  Box,
  Stack,
  Divider,
} from "@mui/material";
import { useState } from "react";
import { WorkflowQueryFilter } from "../../types";

interface WorkflowListFilterDrawerProps {
  onApplyFilters: (filters: WorkflowQueryFilter) => void;
}

export const WorkflowListFilterDisplay = ({ filter }: { filter?: WorkflowQueryFilter }) => (
  <Box sx={{ mb: 2 }}>
    <Typography pt={2} variant="body2">
      {filter ? (
        Object.entries(filter)
          .filter(([, val]) => val)
          .map(([key, value], index) => (
            <div key={index}>
              <strong>{key}:</strong> {JSON.stringify(value, null, 2)}
            </div>
          ))
      ) : (
        <span>No active filters</span>
      )}
    </Typography>
    <Divider sx={{ borderBottomWidth: 3 }} />
  </Box>
);

function WorkflowListFilterDrawer({ onApplyFilters }: WorkflowListFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [creator, setCreator] = useState<string>("");
  const [errors, setErrors] = useState<{ creator?: boolean }>({});

  const toggleDrawer = (newOpen: boolean) => () => {setOpen(newOpen)};

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
    const rawFilter = { creator };
    const filter = normaliseFilter(rawFilter);
    const validation = validateFilter(filter);
    return { filter, validation };
  }

  function normaliseFilter(filter: WorkflowQueryFilter): WorkflowQueryFilter {
    const normalisedFilter: WorkflowQueryFilter = {};

    Object.keys(filter).forEach((key) => {
      const value = filter[key as keyof WorkflowQueryFilter];

      if (typeof value === "string") {
        normalisedFilter[key as keyof WorkflowQueryFilter] =
          value.trim() === "" ? undefined : value;
      } else {
        normalisedFilter[key as keyof WorkflowQueryFilter] = value;
      }
    });

    return normalisedFilter;
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
