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
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        flexWrap: "nowrap",
        overflow: "hidden",
      }}
    >
      <NavLinks>
        <NavLink href="/">Home</NavLink>
        <NavLink href="/workflows">Workflows</NavLink>
        <NavLink href="/templates">Templates</NavLink>
      </NavLinks>

      {sessionInfo && (
        <Typography
          sx={{
            color: DiamondTheme.palette.primary.contrastText,
            fontSize: {
              xs: "0.75rem",
              sm: "0.8rem",
              md: "0.8rem",
              lg: "1rem",
            },
            textAlign: "right",
            ml: 2,
            whiteSpace: "nowrap",
          }}
        >
          {sessionInfo}
        </Typography>
      )}
    </Box>
  </Navbar>
);

export default WorkflowsNavbar;
