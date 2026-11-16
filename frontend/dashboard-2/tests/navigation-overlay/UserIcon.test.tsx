import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { DiamondDSTheme, AuthState } from "@diamondlightsource/sci-react-ui";
import { BrowserRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import UserIcon from "../../src/navigation-overlay/UserIcon";
import * as coreUtils from "workflows-apollo";

vi.mock(import("workflows-apollo"), async () => {
  const actual = await vi.importActual("workflows-apollo");
  const testUser: AuthState = {
    name: "Tess Tuser",
    fedid: "ab12345",
  };
  return {
    ...actual,
    getUser: vi.fn().mockResolvedValue(testUser),
  };
});

describe("WorkflowsNavbar", () => {
  const user = userEvent.setup();

  afterEach(() => {
    delete window.__USE_AUTH_GATEWAY__;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("displays the logged in user", async () => {
    render(
      <ThemeProvider theme={DiamondDSTheme}>
        <BrowserRouter>
          <UserIcon />
        </BrowserRouter>
      </ThemeProvider>,
    );
    expect(await screen.findByText("Tess Tuser")).toBeVisible();
    expect(screen.getByText("ab12345")).toBeVisible();
  });

  it("redirects to logout", async () => {
    const redirectSpy = vi.spyOn(coreUtils, "externalRedirect");
    const url =
      "https://identity.diamond.ac.uk/realms/dls/protocol/openid-connect/logout";
    vi.stubEnv("VITE_LOGOUT_URL", url);
    render(
      <ThemeProvider theme={DiamondDSTheme}>
        <BrowserRouter>
          <UserIcon />
        </BrowserRouter>
      </ThemeProvider>,
    );
    await screen.findByText("Tess Tuser");
    await user.click(screen.getByRole("button", { name: "User Avatar" }));
    await user.click(await screen.findByText("Logout"));
    console.log("logging!!");
    expect(redirectSpy).toHaveBeenCalledWith(url);
  });

  it("logs out via the auth gateway and redirects to home", async () => {
    window.__USE_AUTH_GATEWAY__ = "true";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const redirectSpy = vi.spyOn(coreUtils, "externalRedirect");
    render(
      <ThemeProvider theme={DiamondDSTheme}>
        <BrowserRouter>
          <UserIcon />
        </BrowserRouter>
      </ThemeProvider>,
    );
    await screen.findByText("Tess Tuser");
    await user.click(screen.getByRole("button", { name: "User Avatar" }));
    await user.click(await screen.findByText("Logout"));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(import.meta.env.VITE_LOGOUT_URL, {
        method: "POST",
        credentials: "include",
      });
    });
    expect(redirectSpy).toHaveBeenCalledWith("/");
  });
});
