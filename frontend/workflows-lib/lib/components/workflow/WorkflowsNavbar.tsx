import { Box, Typography } from "@mui/material";
import {
  Navbar,
  DiamondTheme,
  NavLinks,
  NavLink,
} from "@diamondlightsource/sci-react-ui";

interface WorkflowsNavbarProps {
  sessionInfo?: string;
}

const WorkflowsNavbar: React.FC<WorkflowsNavbarProps> = ({ sessionInfo }) => (
  <Navbar logo="theme">
    <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "right" }}>
      <NavLinks>
        <NavLink href="/">Home</NavLink>
        <NavLink href="/workflows">Workflows</NavLink>
        <NavLink href="/templates">Templates</NavLink>
      </NavLinks>
    </Box>
    <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "flex-end" }}>
      <Typography sx={{ color: DiamondTheme.palette.primary.contrastText }}>
        {sessionInfo}
      </Typography>
    </Box>
  </Navbar>
);

export default WorkflowsNavbar;
