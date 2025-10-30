import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  RenderSubmittedMessage,
  RenderSubmittedMessagePropsList,
} from "../../lib/components/RenderSubmittedMessage";
import { RelayEnvironmentProvider, useFragment } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { PayloadError } from "relay-runtime";
import { RenderSubmittedMessageFragment$data } from "relay-workflows-lib/lib/components/__generated__/RenderSubmittedMessageFragment.graphql";

vi.mock("react-relay", async () => {
  const actual = await vi.importActual("react-relay");
  return {
    ...actual,
    RelayEnvironmentProvider: actual.RelayEnvironmentProvider,
    useFragment: vi.fn(),
  };
});

describe("RenderSubmittedMessage", () => {
  const user = userEvent.setup();

  const renderComponent = async (props: RenderSubmittedMessagePropsList) => {
    const environment = await getRelayEnvironment();
    render(
      <MemoryRouter
        initialEntries={["/templates/mock-workflow"]}
        initialIndex={0}
      >
        <RelayEnvironmentProvider environment={environment}>
          <RenderSubmittedMessage {...props} />
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );
  };

  it("renders a success", async () => {
    const mockSuccess: RenderSubmittedMessageFragment$data = {
      status: { __typename: "WorkflowSucceededStatus" },
      " $fragmentType": "RenderSubmittedMessageFragment",
    };

    vi.mocked(
      useFragment as () => RenderSubmittedMessageFragment$data,
    ).mockReturnValueOnce(mockSuccess);

    const successProps: RenderSubmittedMessagePropsList = {
      result: { type: "success", message: "ba54321-1/mock-workflow" },
      index: 0,
    };

    await renderComponent(successProps);

    const link = screen.getByText("ba54321-1/mock-workflow");
    expect(screen.getByTestId("status-icon-succeeded")).toBeInTheDocument();
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/workflows/ba54321-1/mock-workflow");

    vi.clearAllMocks();
  });

  it("renders a network error", async () => {
    const mockError: Error = {
      name: "Mock Network Error",
      message: "This is a mock error message",
    };

    const errorProps: RenderSubmittedMessagePropsList = {
      result: { type: "networkError", error: mockError },
      index: 0,
    };

    await renderComponent(errorProps);

    const accordionInfo = screen.getByText(/Submission error type/);
    const accordionDetails = screen.getByText(/Submission error message/);

    expect(accordionInfo).toHaveTextContent(mockError.name);
    expect(accordionDetails).not.toBeVisible();

    await user.click(accordionInfo);

    expect(accordionDetails).toBeVisible();
    expect(accordionDetails).toHaveTextContent(mockError.message);
  });

  it("renders a graphql error", async () => {
    const mockError: PayloadError = {
      message: "This is a graphql error",
    };

    const graphqlErrorProps: RenderSubmittedMessagePropsList = {
      result: { type: "graphQLError", errors: [mockError] },
      index: 0,
    };

    await renderComponent(graphqlErrorProps);

    const accordionInfo = screen.getByText("Submission error type GraphQL");
    const accordionDetails = screen.getByText(/Error 0/);

    expect(accordionInfo).toBeInTheDocument();
    expect(accordionDetails).not.toBeVisible();
    expect(accordionDetails).toHaveTextContent(mockError.message);

    await user.click(accordionInfo);

    expect(accordionDetails).toBeVisible();
  });
});
