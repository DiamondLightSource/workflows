import { Container, Box, Typography } from "@mui/material";
import Workflows from "../components/Workflows";
import WorkflowsErrorBoundary from "../components/WorkflowsErrorBoundary";
import { useParams } from "react-router-dom";
import {
  VisitInput,
  ThemeProvider,
  DiamondTheme,
} from "@diamondlightsource/sci-react-ui";

import WorkflowsNavbar from "../components/WorkflowsNavbar";
import { useVisitInput } from "./utils";

const WorkflowsList: React.FC = () => {
  const { visitid } = useParams<{ visitid: string }>();
  const { visit, handleVisitSubmit } = useVisitInput(visitid);

  return (
    <>
      <ThemeProvider theme={DiamondTheme} defaultMode="light">
        <WorkflowsNavbar
          title="Submitted Workflows"
          sessionInfo={`Instrument Session ID is ${visitid}`}
        />
        {visit ? (
          <Container maxWidth="sm">
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              mt={2}
            >
              <Box width="100%" mb={2}>
                <VisitInput onSubmit={handleVisitSubmit} visit={visit} />
              </Box>
              <Box width="100%">
                <WorkflowsErrorBoundary>
                  <Workflows visit={visit} />
                </WorkflowsErrorBoundary>
              </Box>
            </Box>
          </Container>
        ) : (
          <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
            <Typography variant="h6" color="red" pt={1} gutterBottom>
              Visit {visitid} is invalid
            </Typography>
            <Box width="100%" display="flex" justifyContent="center">
              <VisitInput onSubmit={handleVisitSubmit} />
            </Box>
          </Box>
        )}
      </ThemeProvider>
    </>
  );
};

export default WorkflowsList;
