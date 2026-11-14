class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

vi.mock("relay-workflows-lib", async () => ({
  ...(await vi.importActual("relay-workflows-lib")),
  WorkflowsNavbar: vi.fn(),
}));

vi.mock("@diamondlightsource/sci-react-ui", async () => ({
  ...(await vi.importActual("@diamondlightsource/sci-react-ui")),
  Breadcrumbs: () => vi.fn(),
}));
