import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { JsonForms } from "@jsonforms/react";
import { rendererSet } from "../../lib/utils/renderers";
import userEvent from "@testing-library/user-event";

const matchingUISchema = {
  type: "Control",
  scope: "#/properties/multiScan",
  options: {
    elementLabelProp: "scanRange",
    detail: {
      type: "VerticalLayout",
      elements: [
        {
          type: "Control",
          scope: "#/properties/multiScan/items",
          options: {
            useScanRangeControl: true,
          },
        },
      ],
    },
  },
};

const schema = {
  type: "object",
  properties: {
    multiScan: {
      title: "Scans",
      type: "array",
      items: {
        type: "object",
      },
    },
  },
};

const nonMatchingUISchema = { ...matchingUISchema, options: {} };

describe("ScanRangeInputRenderer", () => {
  const user = userEvent.setup();
  const handleChange = vi.fn();
  const mockData = {
    multiScan: [
      { multiScan: { start: "1421", end: "3204", excluded: [3200] } },
    ],
  };

  it("renders for matching schema", async () => {
    render(
      <JsonForms
        schema={schema}
        uischema={matchingUISchema}
        data={mockData}
        renderers={rendererSet}
        onChange={handleChange}
      />,
    );
    expect(screen.getByLabelText("Index")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Index" }));
    expect(screen.getByRole("spinbutton", { name: "Start" })).toHaveValue(1421);
    expect(screen.getByRole("spinbutton", { name: "End" })).toHaveValue(3204);
    expect(screen.getByRole("textbox", { name: "Excluded" })).toHaveValue(
      "3200",
    );
  });

  it("Does not render for non-matching schema", () => {
    render(
      <JsonForms
        schema={schema}
        uischema={nonMatchingUISchema}
        data={mockData}
        renderers={rendererSet}
        onChange={handleChange}
      />,
    );
    expect(screen.queryByLabelText("Index")).not.toBeInTheDocument();
  });
});
