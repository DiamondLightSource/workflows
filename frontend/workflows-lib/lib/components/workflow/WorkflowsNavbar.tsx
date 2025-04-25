import { Box, Typography } from "@mui/material";
import { Navbar, DiamondTheme } from "@diamondlightsource/sci-react-ui";

interface WorkflowsNavbarProps {
  title?: string;
  sessionInfo?: string;
}

const WorkflowsNavbar: React.FC<WorkflowsNavbarProps> = ({
  title,
  sessionInfo,
}) => (
  <Navbar logo="theme">
    <>
      {title ? (
        <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "right" }}>
          <Typography
            sx={{
              color: DiamondTheme.palette.primary.contrastText,
              fontSize: "h1",
            }}
          >
            {title}
          </Typography>
        </Box>
      ) : null}
      {sessionInfo ? (
        <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "flex-end" }}>
          <Typography sx={{ color: DiamondTheme.palette.primary.contrastText }}>
            {sessionInfo}
          </Typography>
        </Box>
      ) : null}
    </>
  </Navbar>
);

export default WorkflowsNavbar;
