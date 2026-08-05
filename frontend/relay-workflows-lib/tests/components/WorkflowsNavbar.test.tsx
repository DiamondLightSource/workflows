import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { DiamondTheme, AuthState } from "@diamondlightsource/sci-react-ui";
import { BrowserRouter } from "react-router-dom";
import { getUser } from "relay-workflows-lib";
import userEvent from "@testing-library/user-event";
import WorkflowsNavbar from "../../lib/components/WorkflowsNavbar";
import * as coreUtils from "../../lib/utils/coreUtils";

vi.mock("relay-workflows-lib", () => ({
  getUser: vi.fn(() => Promise.resolve(null)),
}));

describe("WorkflowsNavbar", () => {
  const user = userEvent.setup();
  const testUser: AuthState = {
    name: "Tess Tuser",
    fedid: "ab12345",
  };

  afterEach(() => {
    delete window.__USE_AUTH_GATEWAY__;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders with title and sessionInfo", () => {
    const { getByText } = render(
      <ThemeProvider theme={DiamondTheme}>
        <BrowserRouter>
          <WorkflowsNavbar sessionInfo="cm12345-6" />
        </BrowserRouter>
      </ThemeProvider>,
    );
    expect(getByText("cm12345-6")).toBeInTheDocument();
  });

  it("applies the correct styles", () => {
    const { getByText } = render(
      <ThemeProvider theme={DiamondTheme}>
        <BrowserRouter>
          <WorkflowsNavbar sessionInfo="cm34567-8" />
        </BrowserRouter>
      </ThemeProvider>,
    );
    const sessionElement = getByText("cm34567-8");
    expect(sessionElement).toHaveStyle(
      `color: ${DiamondTheme.palette.primary.contrastText}`,
    );
  });

  it("displays the logged in user", async () => {
    vi.mocked(getUser).mockReturnValue(Promise.resolve(testUser));
    render(
      <ThemeProvider theme={DiamondTheme}>
        <BrowserRouter>
          <WorkflowsNavbar />
        </BrowserRouter>
      </ThemeProvider>,
    );
    expect(await screen.findByText("Tess Tuser")).toBeVisible();
    expect(screen.getByText("ab12345")).toBeVisible();
  });

  it("redirects to logout", async () => {
    vi.mocked(getUser).mockReturnValue(Promise.resolve(testUser));
    const redirectSpy = vi.spyOn(coreUtils, "externalRedirect");
    const url: string = import.meta.env.VITE_LOGOUT_URL;
    render(
      <ThemeProvider theme={DiamondTheme}>
        <BrowserRouter>
          <WorkflowsNavbar />
        </BrowserRouter>
      </ThemeProvider>,
    );
    await screen.findByText("Tess Tuser");
    await user.click(screen.getByRole("button", { name: "User Avatar" }));
    await user.click(await screen.findByText("Logout"));
    expect(redirectSpy).toHaveBeenCalledWith(url);
  });

  it("logs out via the auth gateway and redirects to home", async () => {
    window.__USE_AUTH_GATEWAY__ = "true";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(getUser).mockReturnValue(Promise.resolve(testUser));
    const redirectSpy = vi.spyOn(coreUtils, "externalRedirect");
    render(
      <ThemeProvider theme={DiamondTheme}>
        <BrowserRouter>
          <WorkflowsNavbar />
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
