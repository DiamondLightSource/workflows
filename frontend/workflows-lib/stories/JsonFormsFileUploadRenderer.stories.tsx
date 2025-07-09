import { Meta, StoryObj } from "@storybook/react";
import { JsonForms } from "@jsonforms/react";
import { JsonFormsFileUploadRenderer } from "../lib/main";
import { fileUploadTester } from "../lib/utils/testers";

const schema = {
  type: "object",
  properties: {
    configFileUpload: {
      type: "object",
      properties: {
        fileName: { type: "string" },
        content: { type: "string" },
        type: { type: "string" },
      },
    },
  },
};

const uischema = {
  type: "Control",
  scope: "#/properties/configFileUpload",
  options: {
    useFileUploadControl: true,
  },
};

const meta: Meta = {
  title: "Controls/jsonforms/FileUploadButtonRenderer",
  component: JsonFormsFileUploadRenderer,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={{}}
      renderers={[
        { tester: fileUploadTester, renderer: JsonFormsFileUploadRenderer },
      ]}
      onChange={() => {}}
    />
  ),
};
