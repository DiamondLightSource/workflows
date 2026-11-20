import { fireEvent, render, screen, within } from "@testing-library/react";
import { WorkflowSubmissionForm } from "./WorkflowSubmissionForm";
import "@testing-library/jest-dom";
import * as jsonforms from "@jsonforms/react";

const mockParameterSchema = {
  type: "object",
  required: ["memory", "size"],
  properties: {
    memory: {
      default: "20Gi",
      type: "string",
      pattern: "^[0-9]+[GMK]i$",
    },
    size: {
      default: 2000,
      type: "integer",
    },
    configFile: {
      type: "string",
      minLength: 1,
    },
    scanRange: {
      type: "object",
      properties: {
        start: { type: "number" },
        end: { type: "number" },
        excluded: {
          type: "array",
          items: { type: "number" },
        },
      },
    },
  },
};

const mockParameterUISchema = {
  type: "HorizontalLayout",
  elements: [
    {
      type: "Control",
      scope: "#/properties/memory",
      label: "Memory",
    },
    {
      type: "Control",
      scope: "#/properties/size",
      label: "Matrix Size",
    },
    {
      type: "Control",
      scope: "#/properties/configFile",
      label: "Config File",
      options: {
        useFileUploadControl: true,
      },
    },
    {
      type: "Control",
      scope: "#/properties/scanRange",
      label: "Scan Range",
      options: {
        useScanRangeControl: true,
      },
    },
  ],
};

describe("SubmissionForm Component", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterAll(() => {
    vi.clearAllTimers();
  });

  it("should render ScanRangeInput custom renderer", () => {
    render(
      <WorkflowSubmissionForm
        name="numpy-benchmark"

        args={mockParameterSchema}
        uiSchema={mockParameterUISchema}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Start")).toBeInTheDocument();
    expect(screen.getByLabelText("End")).toBeInTheDocument();
    expect(screen.getByLabelText("Excluded")).toBeInTheDocument();
    expect(screen.getByLabelText("Config File")).toBeInTheDocument();

    expect(
      screen.getByRole("textbox", { name: /memory/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: /matrix size/i }),
    ).toBeInTheDocument();
  });

  it("should render visit field", () => {
    render(
      <WorkflowSubmissionForm
        name="numpy-benchmark"

        args={mockParameterSchema}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("visit-field")).toBeInTheDocument();
  });

  it("should render submit button", () => {
    render(
      <WorkflowSubmissionForm
        name="numpy-benchmark"

        args={mockParameterSchema}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByTestId("submit-button")).toBeInTheDocument();
  });

  it("should produce visit and parameters on submit", () => {
    const callback = vi.fn();
    render(
      <WorkflowSubmissionForm
        name="numpy-benchmark"

        args={mockParameterSchema}
        onSubmit={callback}
      />,
    );
    const visitField = within(screen.getByTestId("visit-field")).getByRole(
      "textbox",
    );
    fireEvent.change(visitField, { target: { value: "mg36964-1" } });
    const submitButton = screen.getByTestId("submit-button");
    fireEvent.click(submitButton);
    expect(callback).toHaveBeenCalledWith(
      "numpy-benchmark",
      {
        proposalCode: "mg",
        proposalNumber: 36964,
        number: 1,
      },
      {
        memory: "20Gi",
        size: 2000,
      },
    );
  });
});

describe("SubmissionForm Layout", () => {
  beforeEach(() => {
    vi.spyOn(jsonforms, "JsonForms");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it("should render parameter with default ui schema", () => {
    render(
      <WorkflowSubmissionForm
        name="numpy-benchmark"
        args={mockParameterSchema}
        onSubmit={vi.fn()}
      />,
    );
    expect(jsonforms.JsonForms).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: mockParameterSchema,
        uischema: undefined,
      }),
      expect.any(Object),
    );
  });

  it("should render parameter with custom ui schema", () => {
    render(
      <WorkflowSubmissionForm
        name="numpy-benchmark"

        args={mockParameterSchema}
        uiSchema={mockParameterUISchema}
        onSubmit={vi.fn()}
      />,
    );
    expect(jsonforms.JsonForms).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: mockParameterSchema,
        uischema: mockParameterUISchema,
      }),
      expect.any(Object),
    );
  });
});
