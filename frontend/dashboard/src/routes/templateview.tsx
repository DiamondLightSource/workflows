import { Container, Box  } from "@mui/material";
import {
  ThemeProvider,
  DiamondTheme,
} from "@diamondlightsource/sci-react-ui";
import { useParams } from "react-router-dom";
import WorkflowsNavbar from "workflows-lib/lib/components/workflow/WorkflowsNavbar";

const TemplatesView: React.FC = () => {
  const { templatename } = useParams<{ templatename: string }>();

  return (
    <>
      <ThemeProvider theme={DiamondTheme} defaultMode="light">
        <WorkflowsNavbar
          title={`Workflow Submission for ${templatename?? ""}`}
          sessionInfo={""}
        />
        <Container maxWidth="sm">
            <Box display="flex" flexDirection="column" alignItems="center" mt={2}>
                This feature is not yet implemented
            </Box>
        </Container>
      </ThemeProvider>
    </>
  );
};

export default TemplatesView;
