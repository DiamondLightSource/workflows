import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { DiamondTheme, AuthState } from "@diamondlightsource/sci-react-ui";
import { BrowserRouter } from "react-router-dom";
import { getUser } from "dashboard/src/RelayEnvironment";
import userEvent from "@testing-library/user-event";
import WorkflowsNavbar from "../../lib/components/workflow/WorkflowsNavbar";
import * as commonUtils from "../../lib/utils/commonUtils";

vi.mock("dashboard/src/RelayEnvironment", () => ({
  getUser: vi.fn(() => Promise.resolve(null)),
}));

describe("WorkflowsNavbar", () => {
  const user = userEvent.setup();
  const testUser: AuthState = {
    name: "Tess Tuser",
    fedid: "ab12345",
  };

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
    const redirectSpy = vi.spyOn(commonUtils, "externalRedirect");
    const url =
      "https://identity.diamond.ac.uk/realms/dls/protocol/openid-connect/logout";
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
});
