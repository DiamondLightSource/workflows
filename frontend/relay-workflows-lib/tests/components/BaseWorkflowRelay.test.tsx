import { render, screen } from "@testing-library/react";
import { useState } from "react";
import "@testing-library/jest-dom";
import BaseWorkflowRelay from "relay-workflows-lib/lib/components/BaseWorkflowRelay";
import { workflowsListViewQueryResponse } from "dashboard/src/mocks/responses/workflows/WorkflowsListViewQueryResponse";
import { BaseWorkflowRelayFragment$key } from "relay-workflows-lib/lib/components/__generated__/BaseWorkflowRelayFragment.graphql";
import { RelayEnvironmentProvider } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { beforeAll } from "vitest";
import { server } from "relay-workflows-lib/tests/mocks/browser.ts";
import userEvent from "@testing-library/user-event";
import { mockReactFlow } from "../mocks/mockReactFlow";

vi.mock("react-relay", async () => {
  const actual = await import("react-relay");

  return {
    ...actual,
    useFragment: vi.fn(() => workflowsListViewQueryResponse.workflows.nodes[0]),
    RelayEnvironmentProvider: actual.RelayEnvironmentProvider,
  };
});

vi.mock("react-router-dom", () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
  useParams: vi.fn(() => ({ workflowName: "conditional-steps" })),
  useSearchParams: vi.fn(() => [new URLSearchParams(""), vi.fn()]),
  NavLink: () => <div></div>,
}));

const ExpansionHandler = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const mockFragmentRef = {} as BaseWorkflowRelayFragment$key;
  return (
    <BaseWorkflowRelay
      fragmentRef={mockFragmentRef}
      expanded={isExpanded}
      onChange={() => {
        setIsExpanded(!isExpanded);
      }}
    />
  );
};

describe("BaseWorkflowRelay", () => {
  const user = userEvent.setup();

  beforeAll(() => {
    server.listen();
    mockReactFlow();
  });
  beforeEach(async () => {
    const environment = await getRelayEnvironment();

    render(
      <RelayEnvironmentProvider environment={environment}>
        <ExpansionHandler />
      </RelayEnvironmentProvider>,
    );
  });
  afterAll(() => {
    server.close();
  });

  it("renders a workflow card with name and creator", async () => {
    expect(
      await screen.findByText("conditional-steps-first"),
    ).toBeInTheDocument();
    expect(screen.getByText("Creator: abc12345")).toBeInTheDocument();
  });

  it("should display flow box nodes when expanded", async () => {
    const accordionButton = await screen.findByRole("button", {
      name: /conditional-steps-first/i,
    });
    expect(accordionButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("even")).not.toBeVisible();

    await user.click(accordionButton);
    expect(accordionButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("React Flow")).toBeVisible();
    expect(screen.getByText("even")).toBeInTheDocument();
  });
});
