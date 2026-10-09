import React, { useState } from "react";

import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Checkbox,
  Alert,
} from "@mui/material";

interface TriggerProps {
  beamline: string | null | undefined;
  enabled: boolean;
  toggleEnabled: () => string; // Returns error message on failure
  name: string | null | undefined;
  templateRef: string | null | undefined;
}

const TriggerAccordion: React.FC<TriggerProps> = ({
  beamline,
  name,
  enabled,
  toggleEnabled,
  templateRef,
}) => {
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <Accordion>
      <AccordionSummary>
        <Box sx={{ display: "flex", flexBasis: 0, flexGrow: 5, gap: 2 }}>
          <Typography sx={{ fontWeight: "bold" }}>{beamline}</Typography>
          <Typography color={enabled ? "textPrimary" : "textDisabled"}>
            {name}
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          sx={{
            display: "flex",
            "justify-content": "space-between",
            "align-items": "center",
          }}
        >
          <Typography>
            Created from the <i>{templateRef}</i> template
          </Typography>
          <Box sx={{ display: "flex", "align-items": "center" }}>
            <Typography>Enabled: </Typography>
            <Checkbox
              checked={enabled}
              onChange={() => {
                setErrorMessage(toggleEnabled());
              }}
            />
          </Box>
        </Box>
        {errorMessage === "" || (
          <Alert severity="error">
            Toggle enabled status unsucessful: {errorMessage}
          </Alert>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
export default TriggerAccordion;
