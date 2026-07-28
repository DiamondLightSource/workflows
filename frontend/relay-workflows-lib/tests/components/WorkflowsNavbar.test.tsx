import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "@mui/material/styles";
import { DiamondTheme, AuthState } from "@diamondlightsource/sci-react-ui";
import { BrowserRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import WorkflowsNavbar from "../../lib/components/WorkflowsNavbar";
import { getUser, login, logout } from "../../lib/utils/auth";

vi.mock("../../lib/utils/auth", () => ({
  getUser: vi.fn(() => Promise.resolve(null)),
  login: vi.fn(() => Promise.resolve()),
  logout: vi.fn(() => Promise.resolve()),
}));

const renderNavbar = (sessionInfo?: string) =>
  render(
    <ThemeProvider theme={DiamondTheme}>
      <BrowserRouter>
        <WorkflowsNavbar sessionInfo={sessionInfo} />
      </BrowserRouter>
    </ThemeProvider>,
  );

describe("WorkflowsNavbar", () => {
  const user = userEvent.setup();
  const testUser: AuthState = {
    name: "Tess Tuser",
    fedid: "ab12345",
  };

  beforeEach(() => {
    vi.mocked(getUser).mockReturnValue(Promise.resolve(null));
  });

  it("renders with title and sessionInfo", () => {
    const { getByText } = renderNavbar("cm12345-6");
    expect(getByText("cm12345-6")).toBeInTheDocument();
  });

  it("applies the correct styles", () => {
    const { getByText } = renderNavbar("cm34567-8");
    const sessionElement = getByText("cm34567-8");
    expect(sessionElement).toHaveStyle(
      `color: ${DiamondTheme.palette.primary.contrastText}`,
    );
  });

  it("displays the logged in user", async () => {
    vi.mocked(getUser).mockReturnValue(Promise.resolve(testUser));
    renderNavbar();
    expect(await screen.findByText("Tess Tuser")).toBeVisible();
    expect(screen.getByText("ab12345")).toBeVisible();
  });

  it("displays a login button when logged out", async () => {
    renderNavbar();
    expect(await screen.findByRole("button", { name: "Login" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "User Avatar" }),
    ).not.toBeInTheDocument();
  });

  it("logs in", async () => {
    renderNavbar();
    await user.click(await screen.findByRole("button", { name: "Login" }));
    expect(login).toHaveBeenCalled();
  });

  it("logs out", async () => {
    vi.mocked(getUser).mockReturnValue(Promise.resolve(testUser));
    renderNavbar();
    await screen.findByText("Tess Tuser");
    await user.click(screen.getByRole("button", { name: "User Avatar" }));
    await user.click(await screen.findByText("Logout"));
    expect(logout).toHaveBeenCalled();
  });
});
