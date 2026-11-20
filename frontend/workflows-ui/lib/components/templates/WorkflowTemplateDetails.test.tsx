import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Visit as Session } from "@diamondlightsource/sci-react-ui";
import {
  WorkflowTemplateDetails,
  WorkflowTemplateData,
  WorkflowTemplateDetailsProps,
} from "./WorkflowTemplateDetails";
import { TemplateSource } from "../../types";

const submitterProps = vi.fn();
const repoLinkProps = vi.fn();

vi.mock("./WorkflowSubmissionForm", () => ({
  WorkflowSubmissionForm: (props: {
    name: string;
    onSubmit?: (name: string, session: Session, params: object) => void;
  }) => {
    submitterProps(props);
    return (
      <button
        data-testid="workflow-submitter"
        onClick={() =>
          props.onSubmit?.(
            props.name,
            { proposalCode: "cm", proposalNumber: 12345, number: 1 },
            { foo: "bar" },
          )
        }
      >
        submit
      </button>
    );
  },
}));

vi.mock("../common/RepositoryLink", () => ({
  default: (props: { repository: unknown }) => {
    repoLinkProps(props);
    return <div data-testid="repository-link" />;
  },
}));

const templateSource: TemplateSource = {
  repositoryUrl: "https://github.com/DiamondLightSource/workflows",
  targetRevision: "HEAD",
  path: "/templates",
};

const testTemplate: WorkflowTemplateData = {
  name: "test-name",
  maintainer: "workflows-test",
  title: "Test Title",
  description: "Test description",
  arguments: { type: "object", properties: { x: { type: "number" } } },
  uiSchema: { type: "VerticalLayout", elements: [] },
  templateSource,
};

const renderDetails = (overrides: Partial<WorkflowTemplateDetailsProps> = {}) =>
  render(
    <WorkflowTemplateDetails
      template={testTemplate}
      showRepoLink={true}
      {...overrides}
    />,
  );

describe("WorkflowTemplateDetails", () => {
  beforeEach(() => {
    submitterProps.mockClear();
    repoLinkProps.mockClear();
  });

  it("shows the title", () => {
    renderDetails();
    expect(
      screen.getByRole("heading", { name: "Test Title" }),
    ).toBeInTheDocument();
  });

  it("falls back to the name when title is null", () => {
    renderDetails({ template: { ...testTemplate, title: null } });
    expect(
      screen.getByRole("heading", { name: "Test Name" }),
    ).toBeInTheDocument();
  });

  it("renders the description", () => {
    renderDetails();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("renders without crashing when description is null", () => {
    renderDetails({ template: { ...testTemplate, description: null } });
    expect(screen.queryByText("Test description")).not.toBeInTheDocument();
  });

  it("shows the workflow name in bold", () => {
    renderDetails();
    expect(screen.getByText(/Workflow name:/)).toBeInTheDocument();
    const bold = screen.getByText("test-name", { selector: "b" });
    expect(bold).toBeInTheDocument();
  });

  it("shows the maintainer", () => {
    renderDetails();
    expect(screen.getByText("Maintainer: workflows-test")).toBeInTheDocument();
  });

  it("renders RepositoryLink with the template source when showRepoLink is true", () => {
    renderDetails({ showRepoLink: true });
    expect(screen.getByTestId("repository-link")).toBeInTheDocument();
    expect(repoLinkProps).toHaveBeenCalledWith({
      repository: templateSource,
    });
  });

  it("hides RepositoryLink when showRepoLink is false", () => {
    renderDetails({ showRepoLink: false });
    expect(screen.queryByTestId("repository-link")).not.toBeInTheDocument();
    expect(repoLinkProps).not.toHaveBeenCalled();
  });

  it("defaults to showing RepositoryLink when showRepoLink is omitted", () => {
    const props = { template: testTemplate } as WorkflowTemplateDetailsProps;
    render(<WorkflowTemplateDetails {...props} />);
    expect(screen.getByTestId("repository-link")).toBeInTheDocument();
  });

  it("passes a null templateSource through unchanged", () => {
    renderDetails({ template: { ...testTemplate, templateSource: null } });
    expect(repoLinkProps).toHaveBeenCalledWith({ repository: null });
  });
  it("receives the template's name, uiSchema and arguments", () => {
    renderDetails({ onSubmit: vi.fn() });
    expect(submitterProps).toHaveBeenCalledWith(
      expect.objectContaining({
        name: testTemplate.name,
        uiSchema: testTemplate.uiSchema,
        args: testTemplate.arguments,
      }),
    );
  });

  it("forwards onSubmit so submissions reach the caller", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderDetails({ onSubmit });

    await userEvent.click(screen.getByTestId("workflow-submitter"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      "test-name",
      { proposalCode: "cm", proposalNumber: 12345, number: 1 },
      { foo: "bar" },
    );
  });
});
