import { Box, Typography, useTheme } from "@mui/material";
import { useState } from "react";
import { TemplateList } from "workflows-apollo";

export default function TemplateRoute() {
  const theme = useTheme();

  const [selectedTemplateName, setSelectedTemplateName] = useState<
    string | null
  >(null);

  return (
    // Looking for a colour inbetween background and default??
    // Is default fine??
    <Box sx={{ display: "flex", minHeight: 0 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "300px",
          minHeight: 0,
          bgcolor: theme.vars?.palette.background.paper,
        }}
      >
        <p>Filter placeholder</p>
        <TemplateList
          selectedName={selectedTemplateName}
          setSelectedName={setSelectedTemplateName}
        />
      </Box>
      <Box>
        <Typography>Data card placeholder</Typography>
        <Typography>{selectedTemplateName} is currently selected</Typography>
      </Box>
    </Box>
  );
}
