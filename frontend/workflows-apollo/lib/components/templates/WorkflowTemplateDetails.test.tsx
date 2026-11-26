import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing/react";
import { WorkflowTemplateDetails } from "./WorkflowTemplateDetails";
import {
  WorkflowTemplateDetails as MockedTemplateDetails,
  type WorkflowTemplateDetailsProps,
} from "workflows-ui";
import { workflowTemplateMock } from "../../types/mocks";

vi.mock("workflows-ui", () => ({
  WorkflowTemplateDetails: vi.fn((props: WorkflowTemplateDetailsProps) => (
    <p>{props.template.title}</p>
  )),
}));

const lastProps = () => {
  const call = vi.mocked(MockedTemplateDetails).mock.lastCall;
  if (!call) {
    throw new Error("WorkflowTemplateDetails mock was never called");
  }
  return call[0];
};

describe("Apollo WorkflowTemplateDetails", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders a TemplateDetails component with query data", async () => {
    render(
      <MockedProvider mocks={[workflowTemplateMock]}>
        <WorkflowTemplateDetails templateName={"mock-template"} />
      </MockedProvider>,
    );
    expect(await screen.findByText("Mock Template Title")).toBeInTheDocument();
  });

  it("passes a function to the submitter", async () => {
    render(
      <MockedProvider mocks={[{ ...workflowTemplateMock }]}>
        <WorkflowTemplateDetails templateName={"mock-template"} />
      </MockedProvider>,
    );
    await screen.findByText("Mock Template Title");
    expect(lastProps().onSubmit).toEqual(expect.any(Function));
  });

  it("shows a loading component while query is fetched", async () => {
    render(
      <MockedProvider mocks={[{ ...workflowTemplateMock, delay: Infinity }]}>
        <WorkflowTemplateDetails templateName={"mock-template"} />
      </MockedProvider>,
    );
    expect(await screen.findByRole("progressbar")).toBeInTheDocument();
  });

  it("shows an error message for a failed query", async () => {
    render(
      <MockedProvider
        mocks={[{ ...workflowTemplateMock, error: new Error("Test error") }]}
      >
        <WorkflowTemplateDetails templateName={"mock-template"} />
      </MockedProvider>,
    );
    expect(await screen.findByText(/Error! Test error/i)).toBeInTheDocument();
  });

  it("shows a message for no data", async () => {
    render(
      <MockedProvider
        mocks={[{ ...workflowTemplateMock, result: { data: undefined } }]}
      >
        <WorkflowTemplateDetails templateName={"mock-template"} />
      </MockedProvider>,
    );
    expect(
      await screen.findByText("No template data found"),
    ).toBeInTheDocument();
  });
});
