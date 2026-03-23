import { Box, Typography } from "@mui/material";
import { NavLink as Link } from "react-router-dom";
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
  <Navbar
    logo="theme"
    leftSlot={
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
          <NavLink to="/" linkComponent={Link}>
            Home
          </NavLink>
          <NavLink to="/workflows" linkComponent={Link}>
            Workflows
          </NavLink>
          <NavLink to="/templates" linkComponent={Link}>
            Templates
          </NavLink>
        </NavLinks>
      </Box>
    }
    rightSlot={
      <>
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
      </>
    }
  />
);

export default WorkflowsNavbar;
