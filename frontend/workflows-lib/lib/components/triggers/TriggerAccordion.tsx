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
  toggleEnabled: () => void;
  errorMessage: string | undefined;
  name: string | null | undefined;
  templateRef: string | null | undefined;
}

const TriggerAccordion: React.FC<TriggerProps> = ({
  beamline,
  name,
  enabled,
  toggleEnabled,
  errorMessage,
  templateRef,
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
            "justifyContent": "space-between",
            "alignItems": "center",
          }}
        >
          <Typography>
            Created from the <i>{templateRef}</i> template
          </Typography>
          <Box sx={{ display: "flex", "alignItems": "center" }}>
            <Typography>Enabled: </Typography>
            <Checkbox
              checked={enabled}
              onChange={() => {toggleEnabled();}}
            />
          </Box>
        </Box>
          { errorMessage !== undefined && ( <Alert severity="error">
            Toggle enabled status unsucessful: {errorMessage}
          </Alert> ) }
      </AccordionDetails>
    </Accordion>
  );
};
export default TriggerAccordion;
