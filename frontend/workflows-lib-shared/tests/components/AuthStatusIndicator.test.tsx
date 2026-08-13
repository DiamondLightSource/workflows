import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { AuthStatusIndicator } from "../../lib/main";

const origin = window.location.origin;

const mockFetch = (authenticated: boolean) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(authenticated),
  });

describe("AuthStatusIndicator", () => {
  let openMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    openMock = vi.fn();
    vi.stubGlobal("open", openMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the authenticated state from a mocked response", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthStatusIndicator accessToken="tok" />);

    expect(
      await screen.findByLabelText("Workflows Authenticated"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `${origin}/auth/status`,
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } }),
    );
  });

  it("opens login in a new tab when clicked while unauthenticated", async () => {
    vi.stubGlobal("fetch", mockFetch(false));
    const user = userEvent.setup();

    render(<AuthStatusIndicator accessToken="tok" />);

    const indicator = await screen.findByLabelText(
      "Workflows Unauthenticated — click to log in",
    );
    await user.click(indicator);

    expect(openMock).toHaveBeenCalledWith(
      `${origin}/auth/login`,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("includes returnTo in the login url", async () => {
    vi.stubGlobal("fetch", mockFetch(false));
    const user = userEvent.setup();

    render(
      <AuthStatusIndicator
        accessToken="tok"
        returnTo="https://app.example/visits"
      />,
    );

    await user.click(
      await screen.findByLabelText(
        "Workflows Unauthenticated — click to log in",
      ),
    );

    expect(openMock).toHaveBeenCalledWith(
      `${origin}/auth/login?returnTo=https%3A%2F%2Fapp.example%2Fvisits`,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("does not open a tab when already authenticated", async () => {
    vi.stubGlobal("fetch", mockFetch(true));
    const user = userEvent.setup();

    render(<AuthStatusIndicator accessToken="tok" />);

    await user.click(await screen.findByLabelText("Workflows Authenticated"));

    expect(openMock).not.toHaveBeenCalled();
  });
});
