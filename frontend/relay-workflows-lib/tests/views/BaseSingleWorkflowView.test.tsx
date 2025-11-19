import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import BaseSingleWorkflowView from "relay-workflows-lib/lib/views/BaseSingleWorkflowView";
import { SingleWorkflowViewQuery } from "relay-workflows-lib/lib/views/SingleWorkflowView";
import { server } from "relay-workflows-lib/tests/mocks/browser.ts";
import { RelayEnvironmentProvider, useLazyLoadQuery } from "react-relay";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import { SingleWorkflowViewQuery as SingleWorkflowViewQueryType } from "relay-workflows-lib/lib/views/__generated__/SingleWorkflowViewQuery.graphql";
import userEvent from "@testing-library/user-event";
import * as tasksFlowUtils from "workflows-lib/lib/utils/tasksFlowUtils";
import { useMemo } from "react";

const QueryWrappedBaseSingleWorkflowView = () => {
  const [searchParams] = useSearchParams();
  const taskParam = searchParams.get("tasks");

  const taskIds = useMemo(() => {
    if (!taskParam) return [];
    try {
      return JSON.parse(taskParam) as string[];
    } catch {
      return [];
    }
  }, [taskParam]);

  const data = useLazyLoadQuery<SingleWorkflowViewQueryType>(
    SingleWorkflowViewQuery,
    {
      visit: {
        proposalCode: "mg",
        proposalNumber: 36964,
        number: 1,
      },
      name: "conditional-steps-first",
    },
  );
  return (
    <BaseSingleWorkflowView fragmentRef={data.workflow} taskIds={taskIds} />
  );
};

describe("BaseSingleWorkflowView", () => {
  const user = userEvent.setup();
  const highlightSpy = vi.spyOn(tasksFlowUtils, "addHighlightsAndFills");

  beforeAll(() => {
    server.listen();
  });

  beforeEach(async () => {
    const environment = await getRelayEnvironment();

    render(
      <MemoryRouter>
        <RelayEnvironmentProvider environment={environment}>
          <QueryWrappedBaseSingleWorkflowView />
        </RelayEnvironmentProvider>
      </MemoryRouter>,
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  it("highlights the output tasks", async () => {
    expect(
      await screen.findByText("conditional-steps-first"),
    ).toBeInTheDocument();
    const outputButton = screen.getByText("OUTPUT");

    await user.click(outputButton);
    expect(highlightSpy).toHaveBeenLastCalledWith(
      expect.anything(),
      [
        "conditional-steps-first-1223470002",
        "conditional-steps-first-2863409095",
        "conditional-steps-first-3590043386",
        "conditional-steps-first-567981434",
      ],
      null,
    );
  });

  it("clears the output tasks", async () => {
    expect(
      await screen.findByText("conditional-steps-first"),
    ).toBeInTheDocument();
    await user.click(screen.getByText("CLEAR"));
    expect(highlightSpy).toHaveBeenLastCalledWith(expect.anything(), [], null);
  });

  it("renders the artifact list", async () => {
    expect(await screen.findAllByText("main.log")).toHaveLength(2);
  });

  it("fills the corresponding task node when an artifact is hovered over", async () => {
    const artifact = await screen.findByRole("cell", { name: "less-than-5" });
    await user.hover(artifact);
    await waitFor(() => {
      expect(highlightSpy).toHaveBeenLastCalledWith(
        expect.anything(),
        [],
        "conditional-steps-first-2863409095",
      );
    });
    await user.unhover(artifact);
    await waitFor(() => {
      expect(highlightSpy).toHaveBeenLastCalledWith(
        expect.anything(),
        [],
        null,
      );
    });
  });
});
