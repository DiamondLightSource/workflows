import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { server } from "relay-workflows-lib/tests/mocks/browser.ts";
import { RelayEnvironmentProvider } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { MemoryRouter } from "react-router-dom";
import TemplateViewWithRetrigger from "../../lib/views/TemplateViewRetrigger";

describe("TemplateViewRetrigger", () => {
  beforeAll(() => {
    server.listen();
  });

  beforeEach(async () => {
    const environment = await getRelayEnvironment();

    render(
      <MemoryRouter>
        <RelayEnvironmentProvider environment={environment}>
          <TemplateViewWithRetrigger
            templateName="e02-mib2x"
            workflowName="e02-mib2x"
            visit={{ proposalCode: "mg", proposalNumber: 36964, number: 1 }}
          />
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );
  });

  afterAll(() => {
    server.close();
  });

  it("passes parameter fragment data to the submission form correctly", async () => {
    expect(await screen.findByText("ePSIC mib conversion")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Memory" })).toHaveValue("8Gi");
    expect(
      screen.getByRole("spinbutton", { name: "Dimension in x (row)" }),
    ).toHaveValue(128);
  });

  it("shows a link to the reused workflow", () => {
    expect(
      screen.getByText(/Parameter values have been reused from/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "e02-mib2x" })).toHaveAttribute(
      "href",
      "/workflows/mg36964-1/e02-mib2x",
    );
  });
});
