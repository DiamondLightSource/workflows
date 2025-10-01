import { useState } from "react";
import { ScienceGroup, WorkflowTemplatesFilter } from "../../types";
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  SelectChangeEvent,
  Stack,
} from "@mui/material";

const scienceGroups = [
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

export default function ScienceGroupSelector({
  setFilter,
}: {
  setFilter: (filter: WorkflowTemplatesFilter) => void;
}) {
  const [scienceGroup, setScienceGroup] = useState<ScienceGroup[]>([]);

  const handleSelect = (event: SelectChangeEvent) => {
    if (event.target.value == "") {
      setScienceGroup([]);
    } else {
      setScienceGroup([event.target.value as ScienceGroup]);
    }
  };

  const handleClick = () => {
    setFilter({ scienceGroup } as WorkflowTemplatesFilter);
  };

  return (
    <>
      <Stack direction="row" spacing={1}>
        <FormControl sx={{ width: 300 }}>
          <InputLabel>Science Group</InputLabel>
          <Select
            onChange={handleSelect}
            value={scienceGroup[0] ?? ""}
            input={<OutlinedInput label="Science Group" />}
          >
            <MenuItem key="No Group" value="">
              No Group
            </MenuItem>
            {scienceGroups.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={handleClick}>
          Apply
        </Button>
      </Stack>
    </>
  );
}
