import { Meta, StoryObj } from "@storybook/react-vite";
import TemplateSubmissionForm from "../lib/components/template/SubmissionForm";

const meta: Meta<typeof TemplateSubmissionForm> = {
  title: "Submission Form",
  component: TemplateSubmissionForm,
};

type Story = StoryObj<typeof TemplateSubmissionForm>;

const fakeSchema = {
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
  },
};

const fakeUiSchema = {
  type: "VerticalLayout",
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
  ],
};

export default meta;
export const Submission: Story = {
  args: {
    title: "Numpy Benchmark",
    description: `
        Runs a numpy script in a python container.
        The script finds the normal of the dot product of two random matrices.
        Matrix sizes are specified by the input parameter "size".
      `,
    parametersSchema: fakeSchema,
    parametersUISchema: fakeUiSchema,
    onSubmit: (visit, parameters) => {
      alert(JSON.stringify({ visit, parameters }));
    },
  },
};
