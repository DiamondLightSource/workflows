class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.mock("workflows-lib", async () => ({
  ...(await vi.importActual("workflows-lib")),
  WorkflowsNavbar: vi.fn(),
}));

vi.mock("@diamondlightsource/sci-react-ui", async () => ({
  ...(await vi.importActual("@diamondlightsource/sci-react-ui")),
  Breadcrumbs: () => vi.fn(),
}));
