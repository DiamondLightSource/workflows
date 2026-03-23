import { useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Container, Box } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import { WorkflowsNavbar } from "workflows-lib";
import { WorkflowsListView } from "relay-workflows-lib";

const WorkflowsListPage: React.FC = () => {
  const { visitid } = useParams<{ visitid?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (visitid) {
      localStorage.setItem("instrumentSessionID", visitid);
    }
  }, [visitid]);

  const instrumentSessionID =
    visitid ?? localStorage.getItem("instrumentSessionID");

  useEffect(() => {
    if (!visitid && instrumentSessionID) {
      (
        navigate(`/workflows/${instrumentSessionID}`, {
          replace: true,
        }) as Promise<void>
      ).catch((error: unknown) => {
        console.error("Navigation error:", error);
      });
    }
  }, [visitid, instrumentSessionID, navigate]);

  return (
    <>
      <WorkflowsNavbar
        sessionInfo={`Instrument Session ID is ${instrumentSessionID ?? ""}`}
      />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      <Container maxWidth="lg">
        <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
          <WorkflowsListView instrumentSessionID={instrumentSessionID} />
        </Box>
      </Container>
    </>
  );
};

export default WorkflowsListPage;
