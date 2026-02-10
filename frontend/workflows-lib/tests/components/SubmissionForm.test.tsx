import {
  fireEvent,
  queryByAttribute,
  render,
  within,
} from "@testing-library/react";
import TemplateSubmissionForm from "../../lib/components/template/SubmissionForm";
import "@testing-library/jest-dom";
import * as jsonforms from "@jsonforms/react";
import { screen } from "@testing-library/react";

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

  it("should render the title", () => {
    const { getByText } = render(
      <TemplateSubmissionForm
        title="Numpy Benchmark"
        maintainer="AGroup"
        parametersSchema={mockParameterSchema}
        onSubmit={() => {}}
      />,
    );
    expect(getByText("Numpy Benchmark")).toBeInTheDocument();
  });

  it("should render the description", () => {
    const { getByText } = render(
      <TemplateSubmissionForm
        title="Numpy Benchmark"
        description="Description of Numpy Benchmark"
        maintainer="AGroup"
        parametersSchema={mockParameterSchema}
        onSubmit={() => {}}
      />,
    );
    expect(getByText("Description of Numpy Benchmark")).toBeInTheDocument();
  });

  it("should render ScanRangeInput custom renderer", () => {
    const { getByLabelText, container } = render(
      <TemplateSubmissionForm
        title="Numpy Benchmark"
        maintainer="AGroup"
        parametersSchema={mockParameterSchema}
        parametersUISchema={mockParameterUISchema}
        onSubmit={() => {}}
      />,
    );

    expect(getByLabelText("Start")).toBeInTheDocument();
    expect(getByLabelText("End")).toBeInTheDocument();
    expect(getByLabelText("Excluded")).toBeInTheDocument();
    expect(getByLabelText("Config File")).toBeInTheDocument();

    const getById = queryByAttribute.bind(null, "id");
    expect(getById(container, "#/properties/memory-input")).toBeInTheDocument();
    expect(getById(container, "#/properties/size-input")).toBeInTheDocument();
  });

  it("should render visit field", () => {
    const { getByTestId } = render(
      <TemplateSubmissionForm
        title="Numpy Benchmark"
        maintainer="AGroup"
        parametersSchema={mockParameterSchema}
        onSubmit={() => {}}
      />,
    );
    expect(getByTestId("visit-field")).toBeInTheDocument();
  });

  it("should render submit button", () => {
    const { getByTestId } = render(
      <TemplateSubmissionForm
        title="Numpy Benchmark"
        maintainer="AGroup"
        parametersSchema={mockParameterSchema}
        onSubmit={() => {}}
      />,
    );
    expect(getByTestId("submit-button")).toBeInTheDocument();
  });

  it("should produce visit and parameters on submit", () => {
    const callback = vi.fn();
    const { getByTestId } = render(
      <TemplateSubmissionForm
        title="Numpy Benchmark"
        maintainer="AGroup"
        parametersSchema={mockParameterSchema}
        onSubmit={callback}
      />,
    );
    const visitField = within(getByTestId("visit-field")).getByRole("textbox");
    fireEvent.change(visitField, { target: { value: "mg36964-1" } });
    const submitButton = getByTestId("submit-button");
    fireEvent.click(submitButton);
    expect(callback).toHaveBeenCalledWith(
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

  it("renders a repository link component", () => {
    render(
      <TemplateSubmissionForm
        title="Numpy Benchmark"
        maintainer="AGroup"
        parametersSchema={mockParameterSchema}
        onSubmit={vi.fn()}
        repository={"https://github.com/DiamondLightSource/workflows/"}
      />,
    );

    expect(screen.getByText("Visit the repository")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://github.com/DiamondLightSource/workflows/",
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
      <TemplateSubmissionForm
        title="Numpy Benchmark"
        maintainer="AGroup"
        parametersSchema={mockParameterSchema}
        onSubmit={() => {}}
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
      <TemplateSubmissionForm
        title="Numpy Benchmark"
        maintainer="AGroup"
        parametersSchema={mockParameterSchema}
        parametersUISchema={mockParameterUISchema}
        onSubmit={() => {}}
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
