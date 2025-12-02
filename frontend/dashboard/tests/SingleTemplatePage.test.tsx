import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import SingleTemplatePage from "../src/routes/SingleTemplatePage";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("relay-workflows-lib/lib/views/TemplateView", () => ({
  default: ({
    templateName,
    visit,
  }: {
    templateName: string;
    visit: Visit;
  }) => (
    <p>
      TemplateView for {templateName} in visit {visit.proposalCode}
      {visit.proposalNumber}-{visit.number}
    </p>
  ),
}));

vi.mock("relay-workflows-lib/lib/views/TemplateViewRetrigger", () => ({
  default: ({
    templateName,
    workflowName,
    visit,
  }: {
    templateName: string;
    workflowName: string;
    visit: Visit;
  }) => (
    <p>
      TemplateViewRetrigger for {templateName} in visit {visit.proposalCode}
      {visit.proposalNumber}-{visit.number} using workflow {workflowName}
    </p>
  ),
}));

vi.mock("workflows-lib", async () => ({
  ...(await vi.importActual("workflows-lib")),
  WorkflowsNavbar: () => <></>,
}));

vi.mock("@diamondlightsource/sci-react-ui", async () => ({
  ...(await vi.importActual("@diamondlightsource/sci-react-ui")),
  Breadcrumbs: () => <></>,
}));

describe("SingleTemplatePage", () => {
  function renderWithPath(path: string) {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="templates/:templateName/:prepopulate"
            element={<SingleTemplatePage />}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("does not render a view if no visit is provided", () => {
    render(
      <MemoryRouter initialEntries={["/templates/e02-mib2x"]}>
        <Routes>
          <Route
            path="templates/:templateName"
            element={<SingleTemplatePage />}
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryAllByRole("text")).toHaveLength(0);
  });

  it("renders a TemplateView when no workflow name is provided", () => {
    renderWithPath("/templates/e02-mib2x/mg36964-1");
    expect(screen.getByText(/TemplateView /i)).toBeInTheDocument();
  });

  it("passes the visit from the address to the TemplateView", () => {
    renderWithPath("/templates/e02-mib2x/mg36964-1");
    expect(screen.getByText(/mg36964-1/i)).toBeInTheDocument();
  });

  it("passes the template name from the address to the TemplateView", () => {
    renderWithPath("/templates/e02-mib2x/mg36964-1");
    expect(screen.getByText(/e02-mib2x/i)).toBeInTheDocument();
  });

  it("renders a TemplateViewRetrigger when a workflow name is provided", () => {
    renderWithPath("/templates/e02-mib2x/mg36964-1-mock-workflow-1");
    expect(screen.getByText(/TemplateViewRetrigger/i)).toBeInTheDocument();
  });

  it("passes the visit from the address to the TemplateViewRetrigger", () => {
    renderWithPath("/templates/e02-mib2x/mg36964-1-mock-workflow-1");
    expect(screen.getByText(/mg36964-1/i)).toBeInTheDocument();
  });

  it("passes the template name from the address to the TemplateViewRetrigger", () => {
    renderWithPath("/templates/e02-mib2x/mg36964-1-mock-workflow-1");
    expect(screen.getByText(/e02-mib2x/i)).toBeInTheDocument();
  });

  it("passes the workflow name from the address to the TemplateViewRetrigger", () => {
    renderWithPath("/templates/e02-mib2x/mg36964-1-mock-workflow-1");
    expect(screen.getByText(/workflow mock-workflow-1/i)).toBeInTheDocument();
  });
});
