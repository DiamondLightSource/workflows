import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { JsonForms } from "@jsonforms/react";
import { vi } from "vitest";
import { JsonFormsFileUploadRenderer } from "../../lib/main";
import { fileUploadTester } from "../../lib/utils/testers";

const schema = {
  type: "object",
  properties: {
    configFile: {
      type: "object",
      properties: {
        fileName: { type: "string" },
        content: { type: "string" },
        type: { type: "string" },
      },
    },
    unrelatedField: {
      type: "string",
    },
  },
};

const matchingUISchema = {
  type: "Control",
  scope: "#/properties/configFileUpload",
  options: {
    useFileUploadControl: true,
  },
};

const nonMatchingUISchema = {
  type: "Control",
  scope: "#/properties/configFileUpload",
};

describe("FileUploadButtonRenderer", () => {
  it("renders the file upload button when tester matches", async () => {
    const handleChange = vi.fn();

    render(
      <JsonForms
        schema={schema}
        uischema={matchingUISchema}
        data={{}}
        renderers={[
          { tester: fileUploadTester, renderer: JsonFormsFileUploadRenderer },
        ]}
        onChange={handleChange}
      />,
    );

    expect(screen.getByText("Upload File")).toBeInTheDocument();

    const file = new File(["test content"], "test.txt", { type: "text/plain" });
    const input = screen.getByTestId("file-input");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
    });
  });

  it("does not render the file upload button when tester does not match", () => {
    const handleChange = vi.fn();

    render(
      <JsonForms
        schema={schema}
        uischema={nonMatchingUISchema}
        data={{}}
        renderers={[
          { tester: fileUploadTester, renderer: JsonFormsFileUploadRenderer },
        ]}
        onChange={handleChange}
      />,
    );

    expect(screen.queryByText("Upload File")).not.toBeInTheDocument();
  });
});
