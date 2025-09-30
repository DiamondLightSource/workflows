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
import { WorkflowTemplatesFilter, ScienceGroup } from "../../types";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { LabelValueRow } from "relay-workflows-lib/lib/components/WorkflowListFilterDrawer";

interface WorkflowTemplateListFilterDrawerProps {
  onApplyFilters: (filters: WorkflowTemplatesFilter) => void;
}

export const scienceGroups = [
  { label: "MX", value: ScienceGroup.MX },
  { label: "Examples", value: ScienceGroup.Examples },
  { label: "Magnetic Materials", value: ScienceGroup.MagneticMaterials },
  { label: "Soft Condensed Matter", value: ScienceGroup.CondensedMatter },
  { label: "Imaging and Microscopy", value: ScienceGroup.Imaging },
  { label: "Biological Cryo-Imaging", value: ScienceGroup.BioCryoImaging },
  { label: "Structures and Surfaces", value: ScienceGroup.Surfaces },
  { label: "Crystallography", value: ScienceGroup.Crystallography },
  { label: "Spectroscopy", value: ScienceGroup.Spectroscopy },
];

export function WorkflowTemplateFilterDisplay({
  filter,
}: {
  filter: WorkflowTemplatesFilter;
}) {
  const scienceGroup = filter.scienceGroup ? filter.scienceGroup.join(", ") : null;
  return (
    <Box sx={{ mb: 2 }}>
      {scienceGroup && 
        <LabelValueRow
          label="Science Group"
          value={scienceGroup}
        />
      }  
    </Box>
  );
}

function WorkflowTemplatesFilterDrawer({
  onApplyFilters,
}: WorkflowTemplateListFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [scienceGroup, setScienceGroup] = useState<ScienceGroup[]>([]);

  function clearAllFilters(): void {
    setScienceGroup([]);
  }

  function handleApply(): void {
    const filter: WorkflowTemplatesFilter = fetchFilter();
    onApplyFilters(filter);
    setOpen(false);
  }

  function fetchFilter(): WorkflowTemplatesFilter {
    return { scienceGroup };
  }

  return (
    <>
      <Button
        sx={{ mt: 1 }}
        variant="contained"
        onClick={() => {
          setOpen(true);
        }}
      >
        Add filters
      </Button>

      <Drawer
        anchor="left"
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      >
        <Box
          sx={{
            width: 301,
            p: 4,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <IconButton
            onClick={() => {
              setOpen(false);
            }}
            sx={{
              position: "absolute",
              top: 9,
              right: 9,
            }}
          >
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" color="primary" gutterBottom>
            Select Filters
          </Typography>
        
          <Autocomplete
            multiple
            disablePortal
            options={scienceGroups}
            getOptionLabel={(option) => option.label}
            value={scienceGroups.filter((sg) =>
              scienceGroup.includes(sg.value),
            )}
            onChange={(_, values) => {
              setScienceGroup(values.map((v) => v.value));
            }}
            renderInput={(params) => (
              <TextField {...params} label="Science Group" />
            )}
          />

          <Stack direction="row" spacing={3} justifyContent="flex-end" mt={2}>
            <Tooltip title="Can't find your template? See https://diamondlightsource.github.io/workflows/docs/explanations/template-labels for a list of supported filters and how to use them.">
              <InfoOutlinedIcon color="action" fontSize="small" />
            </Tooltip>
            <Button variant="outlined" onClick={clearAllFilters}>
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
