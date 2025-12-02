import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { server } from "relay-workflows-lib/tests/mocks/browser.ts";
import { RelayEnvironmentProvider } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { MemoryRouter } from "react-router-dom";
import TemplateView from "../../lib/views/TemplateView";

describe("TemplateView queries", () => {
  const user = userEvent.setup();

  beforeAll(() => {
    server.listen();
  });

  beforeEach(async () => {
    const environment = await getRelayEnvironment();

    render(
      <MemoryRouter>
        <RelayEnvironmentProvider environment={environment}>
          <TemplateView templateName="sin-simulate-artifact" />
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it("populates the submission form with default values", async () => {
    expect(await screen.findByText("Away Day")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Step" })).toHaveValue("1");
    expect(screen.getByRole("textbox", { name: "Stop" })).toHaveValue("10");
  });

  it("adds submitted workflows to the list", async () => {
    expect(await screen.findByText("Away Day")).toBeInTheDocument();
    expect(screen.queryByText("Submissions")).not.toBeInTheDocument();

    const visitBox = screen.getByRole("textbox", { name: "Visit" });
    const submitButton = screen.getByText("Submit");

    await user.type(visitBox, "mg36964-1");
    for (let i = 0; i < 5; i++) await user.click(submitButton);

    expect(await screen.findByText("Submissions")).toBeVisible();
    expect(
      screen.getAllByText("mg36964-1/mg-sin-simulate-artifact"),
    ).toHaveLength(5);
    expect(screen.getAllByTestId("status-icon-unknown")[0]).toBeVisible();
  });

  it("shows a network error submission response if network fails", async () => {
    expect(await screen.findByText("Away Day")).toBeInTheDocument();
    expect(screen.queryByText("Submissions")).not.toBeInTheDocument();

    const visitBox = screen.getByRole("textbox", { name: "Visit" });
    const submitButton = screen.getByText("Submit");

    await user.clear(visitBox);
    await user.type(visitBox, "er44444-44");
    await user.click(submitButton);

    expect(await screen.findByText("Submissions")).toBeVisible();
    expect(screen.getByText(/Submission error type/)).toBeVisible();
  });

  it("shows a graphql error submission response if mutation fails", async () => {
    expect(await screen.findByText("Away Day")).toBeInTheDocument();
    expect(screen.queryByText("Submissions")).not.toBeInTheDocument();

    const visitBox = screen.getByRole("textbox", { name: "Visit" });
    const submitButton = screen.getByText("Submit");

    await user.clear(visitBox);
    await user.type(visitBox, "gr99999-99");
    await user.click(submitButton);

    expect(await screen.findByText("Submissions")).toBeVisible();
    expect(screen.getByText(/Submission error type GraphQL/)).toBeVisible();
    expect(screen.getByText(/Mock GraphQL Error/)).toBeInTheDocument();
  });
});

describe("TemplateView params", () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  async function renderWithPath(path: string) {
    const environment = await getRelayEnvironment();
    render(
      <MemoryRouter initialEntries={[path]}>
        <RelayEnvironmentProvider environment={environment}>
          <TemplateView templateName={"sin-simulate-artifact"} />
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );
  }

  it("populates the visit field from the path", async () => {
    await renderWithPath("/templates/sin-simulate-artifact/mg36964-1");
    expect(screen.getByRole("textbox", { name: "Visit" })).toHaveValue(
      "mg36964-1",
    );
  });
});
