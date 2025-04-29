import { Container, Box } from "@mui/material";
import { ThemeProvider, DiamondTheme, Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";
import Templates from "relay-workflows-lib/lib/components/templates";

const TemplatesList: React.FC = () => {
  return (
    <>
      <ThemeProvider theme={DiamondTheme} defaultMode="light">
        <WorkflowsNavbar />
        <Breadcrumbs path={window.location.pathname} />
        <Container maxWidth="sm">
          <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
            <Templates />
          </Box>
        </Container>
      </ThemeProvider>
    </>
  );
};

export default TemplatesList;
