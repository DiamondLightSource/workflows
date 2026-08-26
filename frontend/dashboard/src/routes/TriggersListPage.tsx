import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import { Box, Container } from "@mui/material";
import { Link } from "react-router-dom";
import { TriggersListView, WorkflowsNavbar } from "relay-workflows-lib";

export default function TriggersListPage() {
  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      <Container maxWidth="lg">
        <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
          <TriggersListView />
        </Box>
      </Container>
    </>
  );
}
