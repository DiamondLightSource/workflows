import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import SingleTemplatePage from "../src/routes/SingleTemplatePage";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("relay-workflows-lib", async () => ({
  ...(await vi.importActual("relay-workflows-lib")),
  TemplateView: ({
    templateName,
    visit,
  }: {
    templateName: string;
    visit?: Visit;
  }) => (
    <p>
      TemplateView for {templateName} in visit {visit?.proposalCode}
      {visit?.proposalNumber}-{visit?.number}
    </p>
  ),
  TemplateViewRetrigger: ({
    templateName,
    workflowId,
    visit,
  }: {
    templateName: string;
    workflowId: string;
    visit: Visit;
  }) => (
    <p>
      TemplateViewRetrigger for {templateName} in visit {visit.proposalCode}
      {visit.proposalNumber}-{visit.number} using workflow {workflowId}
    </p>
  ),
  WorkflowsNavbar: vi.fn(),
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

  it("renders a TemplateViewRetrigger when a workflow id is provided", () => {
    renderWithPath(
      "/templates/e02-mib2x/mg36964-1:mock-workflow-1:fake-id-123",
    );
    expect(screen.getByText(/TemplateViewRetrigger/i)).toBeInTheDocument();
  });

  it("passes the visit from the address to the TemplateViewRetrigger", () => {
    renderWithPath(
      "/templates/e02-mib2x/mg36964-1:mock-workflow-1:test-uid-12345",
    );
    expect(screen.getByText(/mg36964-1/i)).toBeInTheDocument();
  });

  it("passes the template name from the address to the TemplateViewRetrigger", () => {
    renderWithPath(
      "/templates/e02-mib2x/mg36964-1:mock-workflow-1:test-uid-12345",
    );
    expect(screen.getByText(/e02-mib2x/i)).toBeInTheDocument();
  });

  it("passes the workflow name from the address to the TemplateViewRetrigger", () => {
    renderWithPath(
      "/templates/e02-mib2x/mg36964-1:mock-workflow-1:fake-uid-123",
    );
    expect(
      screen.getByText(/workflow mg36964-1:mock-workflow-1:fake-uid-123/i),
    ).toBeInTheDocument();
  });
});
