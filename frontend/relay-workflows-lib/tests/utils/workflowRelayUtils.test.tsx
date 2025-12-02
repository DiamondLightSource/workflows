import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { WorkflowTasksFragment$key } from "../../lib/graphql/__generated__/WorkflowTasksFragment.graphql";
import {
  useFetchedTasks,
  useSelectedTaskIds,
  mergeParameters,
} from "../../lib/utils/workflowRelayUtils";
import { MemoryRouter, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { SingleWorkflowViewQuery } from "../../lib/views/SingleWorkflowView";
import { BaseSingleWorkflowViewFragment } from "../../lib/views/BaseSingleWorkflowView";
import { SingleWorkflowViewQuery$data } from "../../lib/views/__generated__/SingleWorkflowViewQuery.graphql";
import { singleWorkflowViewQueryResponse } from "dashboard/src/mocks/responses/workflows/SingleWorkflowViewQueryResponse";
import {
  RelayEnvironmentProvider,
  useFragment,
  useLazyLoadQuery,
} from "react-relay";
import { server } from "../mocks/browser";
import { Suspense } from "react";
import { SubmissionFormParametersFragment$data } from "../../lib/components/__generated__/SubmissionFormParametersFragment.graphql";
import e02Mib2xRetriggerResponse from "dashboard/src/mocks/responses/templates/e02Mib2xRetriggerResponse.json";

beforeAll(() => {
  server.listen();
});
afterAll(() => {
  server.close();
});
afterEach(() => {
  server.resetHandlers();
});

test("useSelectedTaskIds", async () => {
  const SearchDisplay = () => {
    const location = useLocation();
    return <div data-testid="search">{location.search}</div>;
  };
  const TestComponent = () => {
    const [selectedTaskIds, setSelectedTaskIds] = useSelectedTaskIds();
    return (
      <div>
        <button
          data-testid="button1"
          onClick={() => {
            setSelectedTaskIds(["task-one"]);
          }}
        />
        <button
          data-testid="button2"
          onClick={() => {
            setSelectedTaskIds(["task-two"]);
          }}
        />
        <div data-testid="selected-ids">{selectedTaskIds}</div>
        <SearchDisplay />
      </div>
    );
  };
  render(
    <MemoryRouter initialEntries={[{ pathname: "/home" }]}>
      <TestComponent />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  expect(screen.getByTestId("selected-ids")).toHaveTextContent("");
  await user.click(screen.getByTestId("button1"));
  expect(screen.getByTestId("selected-ids")).toHaveTextContent("task-one");
  await user.click(screen.getByTestId("button2"));
  expect(screen.getByTestId("selected-ids")).toHaveTextContent("task-two");
});

test("useFetchedTasks", async () => {
  const environment = await getRelayEnvironment();

  const TestComponent = () => {
    const queryData = useLazyLoadQuery(
      SingleWorkflowViewQuery,
      {},
    ) as SingleWorkflowViewQuery$data;
    const data = useFragment(
      BaseSingleWorkflowViewFragment,
      queryData.workflow,
    ) as WorkflowTasksFragment$key;

    const fetchedTasks = useFetchedTasks(data);
    const originalData =
      singleWorkflowViewQueryResponse.workflow.status.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        status: task.status,
        depends: task.depends,
        artifacts: task.artifacts.map((artifact) => ({
          ...artifact,
          parentTask: task.name,
          parentTaskId: task.id,
          key: `${task.id}-${artifact.name}`,
        })),
        workflow: singleWorkflowViewQueryResponse.workflow.name,
        instrumentSession: singleWorkflowViewQueryResponse.workflow.visit,
        stepType: task.stepType,
      }));

    return (
      <div>
        <div data-testid="fetched-task">
          {fetchedTasks[0] ? "Data" : "No Data"}
        </div>
        <div data-testid="data-comparison">
          {(
            JSON.stringify(fetchedTasks) === JSON.stringify(originalData)
          ).toString()}
        </div>
      </div>
    );
  };

  render(
    <RelayEnvironmentProvider environment={environment}>
      <Suspense fallback={<div>Loading Template...</div>}>
        <TestComponent />
      </Suspense>
    </RelayEnvironmentProvider>,
  );
  await waitFor(() => screen.getByTestId("fetched-task"));
  expect(screen.getByTestId("fetched-task")).toHaveTextContent("Data");
  expect(screen.getByTestId("data-comparison")).toHaveTextContent("true");
});

test("mergeParameters", () => {
  const mockSearchParams = new URLSearchParams(
    "?mib_path=/test/path/&Scan_X=512",
  );
  const mockReusedData =
    e02Mib2xRetriggerResponse as SubmissionFormParametersFragment$data;
  expect(mergeParameters(mockReusedData, mockSearchParams)).toEqual(
    expect.objectContaining({
      Scan_X: "512",
      Scan_Y: 128,
      memory: "8Gi",
      mib_path: "/test/path/",
    }),
  );
});
