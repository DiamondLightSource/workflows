import "@testing-library/jest-dom";
import { screen } from "@testing-library/dom";
import SubmissionForm from "../../lib/components/SubmissionForm";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render } from "@testing-library/react";
import { server } from "../mocks/browser";
import { TemplateViewQuery } from "../../lib/views/TemplateView";
import { TemplateViewQuery as TemplateViewQueryType } from "../../lib/views/__generated__/TemplateViewQuery.graphql";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";

describe("SubmissionForm", () => {
  const SubmissionFormWithQuery = () => {
    const templateData = useLazyLoadQuery<TemplateViewQueryType>(
      TemplateViewQuery,
      { templateName: "e02-mib2x" },
    );
    return (
      <SubmissionForm
        template={templateData.workflowTemplate}
        onSubmit={vi.fn()}
      />
    );
  };

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it("autofills values from the search params", async () => {
    const environment = await getRelayEnvironment();
    render(
      <MemoryRouter
        initialEntries={[
          "/templates/e02-mib2x?mib_path=/test/path&nprocs=2&iBF=false",
        ]}
      >
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route
              path="templates/:templateName"
              element={<SubmissionFormWithQuery />}
            />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("spinbutton", { name: "Nprocs" }),
    ).toHaveValue(2);
    expect(
      screen.getByRole("textbox", { name: "Path of MIB file" }),
    ).toHaveValue("/test/path");
    expect(
      screen.getByRole("checkbox", { name: /bright-field/i }),
    ).not.toBeChecked();
  });

  it("autofills values from the search params with a visit ID given", async () => {
    const environment = await getRelayEnvironment();
    render(
      <MemoryRouter
        initialEntries={[
          "/templates/e02-mib2x/mg36964-1?Scan_X=99&reshape_option=--use-fly-back",
        ]}
      >
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route
              path="templates/:templateName/:prepopulate"
              element={<SubmissionFormWithQuery />}
            />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("combobox", { name: "Reshape methods" }),
    ).toHaveValue("Fly-back");
    expect(
      screen.getByRole("spinbutton", { name: /Dimension in x/i }),
    ).toHaveValue(99);
  });

  it("informs the user of parameters set via link", async () => {
    const environment = await getRelayEnvironment();
    render(
      <MemoryRouter
        initialEntries={[
          "/templates/e02-mib2x/mg36964-1?Scan_X=99&reshape_option=--use-fly-back",
        ]}
      >
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route
              path="templates/:templateName/:prepopulate"
              element={<SubmissionFormWithQuery />}
            />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/values from the URL link: 'Scan_X', 'reshape_option'/i),
    ).toBeInTheDocument();
  });

  it("does not show a message for unrecognised parameters", async () => {
    const environment = await getRelayEnvironment();
    render(
      <MemoryRouter
        initialEntries={["/templates/e02-mib2x/mg36964-1?not_in_schema=true"]}
      >
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route
              path="templates/:templateName/:prepopulate"
              element={<SubmissionFormWithQuery />}
            />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );

    expect(
      screen.queryByText(/values from the URL link/i),
    ).not.toBeInTheDocument();
  });

  it("handles duplicate search params", async () => {
    const environment = await getRelayEnvironment();
    render(
      <MemoryRouter initialEntries={["/templates/e02-mib2x?nprocs=2&nprocs=3"]}>
        <RelayEnvironmentProvider environment={environment}>
          <Routes>
            <Route
              path="templates/:templateName"
              element={<SubmissionFormWithQuery />}
            />
          </Routes>
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("spinbutton", { name: "Nprocs" }),
    ).toHaveValue(3);
    expect(screen.getAllByText(/'nprocs'/i)).toHaveLength(1);
  });
});
