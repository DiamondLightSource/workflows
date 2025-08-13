import {
  Button,
  Drawer,
  TextField,
  Typography,
  Box,
  Stack,
  Autocomplete,
  IconButton,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import { WorkflowTemplatesFilter } from "../../types";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface WorkflowTemplateListFilterDrawerProps {
  onApplyFilters: (filters: WorkflowTemplatesFilter) => void;
}

const scienceGroups = [
  { label: "workflows-examples" },
  { label: "magnetic-materials" },
  { label: "spectroscopy" },
  { label: "crystallography" },
  { label: "mx" },
];

function WorkflowTemplatesFilterDrawer({
  onApplyFilters,
}: WorkflowTemplateListFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [scienceGroup, setScienceGroup] = useState<string | undefined>(
    undefined,
  );

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const clearAllFilters = () => () => {
    setScienceGroup(undefined);
  };

  function handleApply(): void {
    const filter: WorkflowTemplatesFilter = { scienceGroup };
    setOpen(false);
    onApplyFilters(filter);
  }

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

          <Autocomplete
            onChange={(_, value) => {
              setScienceGroup(value?.label ?? undefined);
            }}
            value={scienceGroup ? { label: scienceGroup } : null}
            disablePortal
            options={scienceGroups}
            renderInput={(params) => (
              <TextField {...params} label="Science Group" />
            )}
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
            <Tooltip title="Can't find your template? See https://diamondlightsource.github.io/workflows/docs/explanations/template-labels for a list of supported filters and how to use them.">
              <InfoOutlinedIcon color="action" fontSize="small" />
            </Tooltip>
            <Button variant="outlined" onClick={clearAllFilters()}>
              Clear
            </Button>
            <Button variant="contained" onClick={handleApply}>
              Apply
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}

export default WorkflowTemplatesFilterDrawer;
