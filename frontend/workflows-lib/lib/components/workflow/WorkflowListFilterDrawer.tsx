import {
  Button,
  Drawer,
  TextField,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import { useState } from "react";
import { WorkflowListFilter } from "../../types";


interface WorkflowListFilterDrawerProps {
  onApplyFilters: (filters: WorkflowListFilter) => void;
}

function WorkflowListFilterDrawer({ onApplyFilters }: WorkflowListFilterDrawerProps) {
  const [open, setOpen] = useState(false);
  const [creator, setCreator] = useState<string>("");

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const handleApply = () => {
    setOpen(false);
    onApplyFilters({creator})
  };

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
            onChange={(e) => setCreator(e.target.value)}
          />

          <Stack direction="row" spacing={2} justifyContent="flex-end" mt={2}>
            <Button variant="outlined" onClick={toggleDrawer(false)}>
              Cancel
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

export default WorkflowListFilterDrawer;
