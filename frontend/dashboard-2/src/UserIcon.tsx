import { User, AuthState } from "@diamondlightsource/sci-react-ui";
import { getUser } from "apollo-workflows-lib";
import { useEffect, useState } from "react";
import { externalRedirect } from "apollo-workflows-lib/lib/utils/coreUtils";
import { getUseAuthGateway } from "apollo-workflows-lib/lib/utils/useAuthGateway";

// Copied from relay-workflows-lib/lib/components/WorkflowsNavBar.tsx
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

export default function UserIcon() {
  const [user, setUser] = useState<AuthState | null>(null);

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch(() => {
        console.error("Failed to fetch user from JWT");
      });
  }, []);

  return <User user={user} onLogout={handleLogout}></User>;
}
