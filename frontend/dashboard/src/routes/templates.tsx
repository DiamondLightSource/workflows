import { Container, Box } from "@mui/material";
import {
  ThemeProvider,
  DiamondTheme,
} from "@diamondlightsource/sci-react-ui";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";
import Templates from "relay-workflows-lib/lib/components/templates";


const TemplateList: React.FC = () => {
  return (
    <>
      <ThemeProvider theme={DiamondTheme} defaultMode="light">
        <WorkflowsNavbar
          title="Templates"
          sessionInfo={""}
        />
        <Container maxWidth="sm">
            <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
              <Templates />
            </Box>
        </Container>
      </ThemeProvider>
    </>
  );
};

export default TemplateList;
