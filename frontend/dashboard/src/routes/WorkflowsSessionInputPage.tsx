import { Link } from "react-router-dom";
import { Container, Box } from "@mui/material";
import { VisitInput, Breadcrumbs } from "@diamondlightsource/sci-react-ui";

import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";
import { useVisitInput } from "./utils";

function WorkflowsSessionInputPage() {
  const { handleVisitSubmit } = useVisitInput();
  return (
    <>
      <WorkflowsNavbar sessionInfo={"No Instrument Session"} />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      <Container maxWidth="sm">
        <Box mt={5}>
          <VisitInput onSubmit={handleVisitSubmit} />
        </Box>
      </Container>
    </>
  );
}

export default WorkflowsSessionInputPage;
