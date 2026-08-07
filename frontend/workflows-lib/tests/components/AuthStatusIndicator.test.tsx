import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { AuthStatusIndicator } from "../../lib/main";

const gatewayUrl = "https://gateway.example";

const mockFetch = (authenticated: boolean) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(authenticated),
  });

describe("AuthStatusIndicator", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("shows the authenticated state from a mocked response", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthStatusIndicator gatewayUrl={gatewayUrl} accessToken="tok" />);

    expect(
      await screen.findByLabelText("Workflows Authenticated"),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `${gatewayUrl}/auth/status`,
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } }),
    );
  });

  it("redirects to login when clicked while unauthenticated", async () => {
    vi.stubGlobal("fetch", mockFetch(false));
    const user = userEvent.setup();

    render(<AuthStatusIndicator gatewayUrl={gatewayUrl} accessToken="tok" />);

    const indicator = await screen.findByLabelText(
      "Workflows Unauthenticated — click to log in",
    );
    await user.click(indicator);

    expect(window.location.href).toBe(`${gatewayUrl}/auth/login`);
  });

  it("uses the cached result on remount without re-fetching", async () => {
    const fetchMock = mockFetch(true);
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = render(
      <AuthStatusIndicator gatewayUrl={gatewayUrl} accessToken="tok" />,
    );
    await screen.findByLabelText("Workflows Authenticated");
    unmount();

    render(<AuthStatusIndicator gatewayUrl={gatewayUrl} accessToken="tok" />);
    await screen.findByLabelText("Workflows Authenticated");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
