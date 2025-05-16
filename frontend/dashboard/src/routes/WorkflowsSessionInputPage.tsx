import { Container, Box } from "@mui/material";
import { VisitInput, Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import { useVisitInput } from "./utils";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";

function WorkflowsSessionInputPage() {
  const { handleVisitSubmit } = useVisitInput();
  return (
    <>
      <WorkflowsNavbar sessionInfo={"No Instrument Session"} />
      <Breadcrumbs path={window.location.pathname} />
      <Container maxWidth="sm">
        <Box mt={5}>
          <VisitInput onSubmit={handleVisitSubmit} />
        </Box>
      </Container>
    </>
  );
}

export default WorkflowsSessionInputPage;
