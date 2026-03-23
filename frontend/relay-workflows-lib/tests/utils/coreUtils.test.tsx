import { ChangeEvent } from "react";
import * as utils from "../../lib/utils/coreUtils";
import { workflowRelayQuery$data } from "../../lib/graphql/__generated__/workflowRelayQuery.graphql";
import { Visit } from "workflows-lib";
import { screen, render, within, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Box, Pagination } from "@mui/material";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { visitToText } from "@diamondlightsource/sci-react-ui";

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 10,
  key: () => "key",
};
global.localStorage = localStorageMock;

describe("useVisitInput", () => {
  const user = userEvent.setup();

  const LocationDisplay = () => {
    const location = useLocation();
    return <div data-testid="location-display">{location.pathname}</div>;
  };

  const TestApp = ({
    inputVisit,
    inputNextVisit,
  }: {
    inputVisit: string | null;
    inputNextVisit: Visit | null;
  }) => {
    const { visit, handleVisitSubmit } = utils.useVisitInput(inputVisit);
    return (
      <div>
        <div data-testid="visit-display">{visit && visitToText(visit)}</div>
        <button
          title="TestButton"
          onClick={() => {
            handleVisitSubmit(inputNextVisit);
          }}
        >
          Button
        </button>
        <LocationDisplay />
      </div>
    );
  };

  it("returns correct outputs when given a visit", async () => {
    const inputVisit: string = "ab1234-1";
    const inputNextVisit = {
      proposalCode: "cd",
      proposalNumber: 4321,
      number: 1,
    } as Visit;

    render(
      <MemoryRouter initialEntries={["/home"]}>
        <TestApp inputVisit={inputVisit} inputNextVisit={inputNextVisit} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("visit-display")).toHaveTextContent("ab1234-1");
    expect(screen.getByTestId("location-display")).toHaveTextContent("/home");
    await user.click(screen.getByTitle("TestButton"));
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "instrumentSessionID",
      "cd4321-1",
    );
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/home/cd4321-1",
    );
    vi.clearAllMocks();
  });

  it("returns correct outputs when given null", async () => {
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <TestApp inputVisit={null} inputNextVisit={null} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("visit-display")).toHaveTextContent("");
    await user.click(screen.getByTitle("TestButton"));
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(screen.getByTestId("location-display")).toHaveTextContent("/");
    vi.clearAllMocks();
  });
});

describe("ScrollRestorer", () => {
  it("works", async () => {
    render(<utils.ScrollRestorer />);
    expect(window.scrollY).toStrictEqual(0);
    window.scrollTo(0, 10);
    await waitFor(() => {
      expect(window.scrollY).toStrictEqual(0);
    });
  });
});

describe("isWorkflowWithTasks returns the correct boolean when", () => {
  it("__typename is WorkflowRunningStatus", () => {
    expect(
      utils.isWorkflowWithTasks({
        __typename: "WorkflowRunningStatus",
      }),
    ).toEqual(true);
  });

  it("__typename is WorkflowSucceededStatus", () => {
    expect(
      utils.isWorkflowWithTasks({
        __typename: "WorkflowSucceededStatus",
      }),
    ).toEqual(true);
  });

  it("__typename is WorkflowFailedStatus", () => {
    expect(
      utils.isWorkflowWithTasks({
        __typename: "WorkflowFailedStatus",
      }),
    ).toEqual(true);
  });

  it("__typename is WorkflowErroredStatus", () => {
    expect(
      utils.isWorkflowWithTasks({
        __typename: "WorkflowErroredStatus",
      }),
    ).toEqual(true);
  });

  it("__typename is Unknown", () => {
    expect(
      utils.isWorkflowWithTasks({
        __typename: "Unknown",
      }),
    ).toEqual(false);
  });
});

describe("useClienSidePagination", () => {
  const user = userEvent.setup();
  const TestComponent = ({
    items,
    perPage,
  }: {
    items: string[];
    perPage: number;
  }) => {
    const { pageNumber, setPageNumber, totalPages, paginatedItems } =
      utils.useClientSidePagination(items, perPage);

    const handlePageChange = (_event: ChangeEvent<unknown>, page: number) => {
      setPageNumber(page);
    };
    return (
      <Box>
        {paginatedItems.map((item, i) => (
          <p key={i}>{item}</p>
        ))}
        <Box>
          <Pagination
            count={totalPages}
            page={pageNumber}
            onChange={handlePageChange}
          />
        </Box>
      </Box>
    );
  };
  const items = ["one", "two", "three", "four", "five", "six", "seven"];
  it("2 items per page", async () => {
    render(<TestComponent items={items} perPage={2} />);
    const pagination = screen.getByLabelText("pagination navigation");
    const paginationButtons = within(pagination).getAllByRole("button");
    expect(paginationButtons).toHaveLength(6); // back + 1 + 2 + 3 + 4 + next
    const nextButton = screen.getByTestId("NavigateNextIcon");
    expect(screen.getAllByRole("paragraph")).toHaveLength(2); // <p>one</p><p>two</p>
    await user.click(nextButton);
    expect(screen.getAllByRole("paragraph")).toHaveLength(2); // <p>three</p><p>four</p>
    await user.click(nextButton);
    expect(screen.getAllByRole("paragraph")).toHaveLength(2); // <p>five</p><p>six</p>
    await user.click(nextButton);
    expect(screen.getAllByRole("paragraph")).toHaveLength(1); // <p>seven</p>
  });

  it("3 items per page", async () => {
    render(<TestComponent items={items} perPage={3} />);
    const pagination = screen.getByLabelText("pagination navigation");
    const paginationButtons = within(pagination).getAllByRole("button");
    expect(paginationButtons).toHaveLength(5); // back + 1 + 2 + 3 + next
    const nextButton = screen.getByTestId("NavigateNextIcon");
    expect(screen.getAllByRole("paragraph")).toHaveLength(3); // <p>one</p><p>two</p><p>three</p>
    await user.click(nextButton);
    expect(screen.getAllByRole("paragraph")).toHaveLength(3); // <p>four</p><p>five</p><p>six</p>
    await user.click(nextButton);
    expect(screen.getAllByRole("paragraph")).toHaveLength(1); // <p>seven</p>
  });

  it("4 items per page", async () => {
    render(<TestComponent items={items} perPage={4} />);
    const pagination = screen.getByLabelText("pagination navigation");
    const paginationButtons = within(pagination).getAllByRole("button");
    expect(paginationButtons).toHaveLength(4); // back + 1 + 2 + next
    const nextButton = screen.getByTestId("NavigateNextIcon");
    expect(screen.getAllByRole("paragraph")).toHaveLength(4); // <p>one</p><p>two</p><p>three</p><p>four</p>
    await user.click(nextButton);
    expect(screen.getAllByRole("paragraph")).toHaveLength(3); // <p>five</p><p>six</p><p>seven</p>
  });
});

describe("isFinished returns the correct boolean when", () => {
  it("__typename is WorkflowSucceededStatus", () => {
    expect(
      utils.isFinished({
        workflow: {
          status: {
            __typename: "WorkflowSucceededStatus",
          },
        } as workflowRelayQuery$data["workflow"],
      }),
    ).toEqual(true);
  });

  it("__typename is WorkflowFailedStatus", () => {
    expect(
      utils.isFinished({
        workflow: {
          status: {
            __typename: "WorkflowFailedStatus",
          },
        } as workflowRelayQuery$data["workflow"],
      }),
    ).toEqual(true);
  });

  it("__typename is WorkflowErroredStatus", () => {
    expect(
      utils.isFinished({
        workflow: {
          status: {
            __typename: "WorkflowErroredStatus",
          },
        } as workflowRelayQuery$data["workflow"],
      }),
    ).toEqual(true);
  });

  it("__typename is WorkflowRunningStatus", () => {
    expect(
      utils.isFinished({
        workflow: {
          status: {
            __typename: "WorkflowRunningStatus",
          },
        } as workflowRelayQuery$data["workflow"],
      }),
    ).toEqual(false);
  });

  it("__typename is WorkflowPendingStatus", () => {
    expect(
      utils.isFinished({
        workflow: {
          status: {
            __typename: "WorkflowPendingStatus",
          },
        } as workflowRelayQuery$data["workflow"],
      }),
    ).toEqual(false);
  });
});
