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
  toggleEnabled: () => void;
  errorMessage: string | undefined;
  beamline: string | null | undefined;
  name: string | null | undefined;
  enabled: boolean;
  templateRef: string | null | undefined;
  creatorName: string | null;
  visit: string;
}

const TriggerAccordion: React.FC<TriggerProps> = ({
  toggleEnabled,
  errorMessage,
  beamline,
  name,
  enabled,
  templateRef,
  creatorName,
  visit,
}) => {
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
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography sx={{ marginBottom: "5px" }}>
              Created from the <i>{templateRef}</i> template
            </Typography>
            <Typography color="textSecondary" sx={{ marginBottom: "5px" }}>
              Visit: {visit}
            </Typography>
            {creatorName !== null && (
              <Typography color="textSecondary" sx={{ marginBottom: "5px" }}>
                Created by: {creatorName}
              </Typography>
            )}
          </Box>
          <Box
            sx={{ display: "flex", alignItems: "center", marginLeft: "20px" }}
          >
            <Typography>Enabled: </Typography>
            <Checkbox
              checked={enabled}
              onChange={() => {
                toggleEnabled();
              }}
            />
          </Box>
        </Box>
        {errorMessage !== undefined && (
          <Alert severity="error">
            Toggle enabled status unsucessful: {errorMessage}
          </Alert>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
export default TriggerAccordion;
