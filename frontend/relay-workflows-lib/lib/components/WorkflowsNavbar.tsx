import { Box } from "@mui/material";
import { NavLink as Link } from "react-router-dom";
import {
  Navbar,
  NavLinks,
  NavLink,
  User,
  AuthState,
} from "@diamondlightsource/sci-react-ui";
import { getUser } from "relay-workflows-lib";
import { useEffect, useState } from "react";
import { externalRedirect } from "../utils/coreUtils";
import { getUseAuthGateway } from "../utils/useAuthGateway";

interface WorkflowsNavbarProps {
  sessionInfo?: string;
}

const handleLogout = () => {
  const LOGOUT_URL = import.meta.env.VITE_LOGOUT_URL;
  if (getUseAuthGateway()) {
    fetch(LOGOUT_URL, { method: "POST", credentials: "include" })
      .then(() => {
        externalRedirect("/");
      })
      .catch((error: unknown) => {
        console.error("Logout failed: ", error);
      });
  } else {
    externalRedirect(LOGOUT_URL);
  }
};

const WorkflowsNavbar: React.FC<WorkflowsNavbarProps> = () => {
  const [user, setUser] = useState<AuthState | null>(null);

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch(() => {
        console.error("Failed to fetch user from JWT");
      });
  }, []);

  return (
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
            <NavLink to="/triggers" linkComponent={Link}>
              Triggers
            </NavLink>
          </NavLinks>
        </Box>
      }
      rightSlot={
        <User colour="white" user={user} onLogout={handleLogout}></User>
      }
    />
  );
};

export default WorkflowsNavbar;
