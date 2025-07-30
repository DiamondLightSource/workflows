import { Meta, StoryObj } from "@storybook/react";
import { JsonForms } from "@jsonforms/react";
import { JsonFormsScanRangeRenderer } from "../lib/main";
import { scanRangeTester } from "../lib/utils/testers";

const schema = {
  type: "object",
  properties: {
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
      required: ["start", "end", "excluded"],
    },
  },
};

const uischema = {
  type: "Control",
  scope: "#/properties/scanRange",
  options: {
    useScanRangeControl: true,
  },
};

const meta: Meta = {
  title: "Controls/jsonforms/ScanRangeRenderer",
  component: JsonFormsScanRangeRenderer,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={{
        scanRange: {
          start: 1,
          end: 10,
          excluded: [5],
        },
      }}
      renderers={[
        { tester: scanRangeTester, renderer: JsonFormsScanRangeRenderer },
      ]}
      onChange={(data) => {
        console.log("Updated:", data);
      }}
    />
  ),
};
