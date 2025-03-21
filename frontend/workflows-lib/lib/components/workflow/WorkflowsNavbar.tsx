import { Box, Typography } from "@mui/material";
import { Navbar, DiamondTheme } from "@diamondlightsource/sci-react-ui";

interface WorkflowsNavbarProps {
  title: string;
  sessionInfo: string;
}

const WorkflowsNavbar: React.FC<WorkflowsNavbarProps> = ({
  title,
  sessionInfo,
}) => (
  <Navbar logo="theme">
    <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "right" }}>
      <Typography
        sx={{ color: DiamondTheme.palette.primary.contrastText, size: "h1" }}
      >
        {title}
      </Typography>
    </Box>
    <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "flex-end" }}>
      <Typography sx={{ color: DiamondTheme.palette.primary.contrastText }}>
        {sessionInfo}
      </Typography>
    </Box>
  </Navbar>
);

export default WorkflowsNavbar;
