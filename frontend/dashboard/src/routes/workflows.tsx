import { Container, Box } from "@mui/material";
import {
  VisitInput,
  ThemeProvider,
  DiamondTheme,
  Breadcrumbs,
} from "@diamondlightsource/sci-react-ui";
import { useVisitInput } from "./utils";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";

function WorkflowsSelect() {
  const { handleVisitSubmit } = useVisitInput();
  return (
    <ThemeProvider theme={DiamondTheme} defaultMode="light">
      <WorkflowsNavbar
        title={"Instrument Session Selection"}
        sessionInfo={"No Instrument Session Selected"}
      />
      <Breadcrumbs path={window.location.pathname} />
      <Container maxWidth="sm">
        <Box mt={5}>
          <VisitInput onSubmit={handleVisitSubmit} />
        </Box>
      </Container>
    </ThemeProvider>
  );
}

export default WorkflowsSelect;
