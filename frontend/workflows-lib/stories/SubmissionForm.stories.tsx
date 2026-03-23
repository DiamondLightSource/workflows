import { Meta, StoryObj } from "@storybook/react-vite";
import TemplateSubmissionForm from "../lib/components/template/SubmissionForm";
import {
  numpySchema,
  numpyUiSchema,
  customRendererSchema,
  customRendererUiSchema,
} from "./common";

const meta: Meta<typeof TemplateSubmissionForm> = {
  title: "Submission Form",
  component: TemplateSubmissionForm,
};

type Story = StoryObj<typeof TemplateSubmissionForm>;

export default meta;
export const SimpleForm: Story = {
  args: {
    title: "Numpy Benchmark",
    description: `
        Runs a numpy script in a python container.
        The script finds the normal of the dot product of two random matrices.
        Matrix sizes are specified by the input parameter "size".
      `,
    parametersSchema: numpySchema,
    parametersUISchema: numpyUiSchema,
    onSubmit: (visit, parameters) => {
      alert(JSON.stringify({ visit, parameters }));
    },
  },
};

export const CustomRendererForm: Story = {
  args: {
    title: "Custom Renderer Example",
    description: "Has fields for uploading files and entering can ranges.",
    parametersSchema: customRendererSchema,
    parametersUISchema: customRendererUiSchema,
    onSubmit: (visit, parameters) => {
      alert(JSON.stringify({ visit, parameters }));
    },
  },
};
