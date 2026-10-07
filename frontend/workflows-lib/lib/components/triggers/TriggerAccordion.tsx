import React from "react";

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
} from "@mui/material";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";

interface TriggerProps {
  index: number;
  beamline: string | null | undefined;
  enabled: boolean;
  name: string | null | undefined;
  templateRef: string | null | undefined;
}


const TriggerAccordion: React.FC<TriggerProps> = ({
  index,
  beamline,
  name,
  enabled,
  templateRef,
}) => {

  return (
    <Accordion key={index}>
            <AccordionSummary>
              <Box sx={{ display: "flex", flexBasis: 0, flexGrow: 5, gap: 2 }}>
                <Typography sx={{ fontWeight: "bold" }}>
                  {beamline}
                </Typography>
                <Typography>{name}</Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexBasis: 0,
                    gap: 2,
                    marginLeft: "auto",
                    marginRight: 0,
                  }}
                >
                  <Typography>Enabled: </Typography>
                  {enabled ? (
                    <CheckBoxIcon fontSize="medium" />
                  ) : (
                    <CheckBoxOutlineBlankIcon />
                  )}
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Created from the <i>{templateRef}</i> template
              </Typography>
            </AccordionDetails>
          </Accordion>
  );
};
export default TriggerAccordion;
