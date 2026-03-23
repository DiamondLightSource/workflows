import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { FileUploadButton, UploadedFile } from "../../lib/main";

describe("FileUploadButton", () => {
  it("renders the upload button", () => {
    render(<FileUploadButton name="configFileUpload" handleChange={vi.fn()} />);
    expect(screen.getByText("Upload File")).toBeInTheDocument();
  });

  it("calls handleChange with file data when a file is selected", async () => {
    const mockHandleChange = vi.fn();
    render(
      <FileUploadButton
        name="configFileUpload"
        handleChange={mockHandleChange}
      />,
    );

    const file = new File(["Some config file data"], "configFile.txt", {
      type: "text/plain",
    });
    const input = screen.getByTestId("file-input");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockHandleChange).toHaveBeenCalledWith(
        "configFileUpload",
        expect.objectContaining({
          fileName: "configFile.txt",
          type: "text/plain",
          content: expect.stringContaining("data:text/plain;base64,") as string,
        }),
      );
    });
  });

  it("renders name", async () => {
    render(<FileUploadButton name="someName" handleChange={vi.fn()} />);

    const file = new File(["Some content"], "someFile.txt", {
      type: "text/plain",
    });

    const input = screen.getByTestId("file-input");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText("Selected file: someFile.txt"),
      ).toBeInTheDocument();
    });
  });

  it("uploads a .txt file and reads its content", async () => {
    const mockHandleChange = vi.fn();

    render(
      <FileUploadButton name="textFile" handleChange={mockHandleChange} />,
    );

    const file = new File(["Hello, world!"], "hello.txt", {
      type: "text/plain",
    });

    const input = screen.getByTestId("file-input");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const call = mockHandleChange.mock.calls[0][1] as UploadedFile;
      expect(call.fileName).toBe("hello.txt");
      expect(call.type).toBe("text/plain");
      expect(call.content).toContain("data:text/plain;base64,");
    });
  });

  it("uploads a .json file and reads its content", async () => {
    const mockHandleChange = vi.fn();
    render(
      <FileUploadButton name="jsonFile" handleChange={mockHandleChange} />,
    );

    const jsonContent = JSON.stringify({ key: "value" });
    const file = new File([jsonContent], "data.json", {
      type: "application/json",
    });
    const input = screen.getByTestId("file-input");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const call = mockHandleChange.mock.calls[0][1] as UploadedFile;
      expect(call.fileName).toBe("data.json");
      expect(call.type).toBe("application/json");
      expect(call.content).toContain("data:application/json;base64,");
    });
  });

  it("uploads a .png file and reads its content", async () => {
    const mockHandleChange = vi.fn();

    render(
      <FileUploadButton name="imageFile" handleChange={mockHandleChange} />,
    );

    const binary = new Uint8Array([137, 80, 78, 71]);
    const file = new File([binary.buffer], "image.png", { type: "image/png" });
    const input = screen.getByTestId("file-input");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const call = mockHandleChange.mock.calls[0][1] as UploadedFile;
      expect(call.fileName).toBe("image.png");
      expect(call.type).toBe("image/png");
      expect(call.content).toContain("data:image/png;base64,");
    });
  });

  it("file reader error displays error message", async () => {
    const mockHandleChange = vi.fn();
    const globalFileReader = global.FileReader;
    class MockFileReader {
      public result: string | ArrayBuffer | null = null;
      public error: Error | null = new Error("Read error");
      public readyState = 2;
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      public readAsDataURL = vi.fn(() => {
        if (this.onerror) {
          this.onerror();
        }
      });
    }
    global.FileReader = MockFileReader as unknown as typeof FileReader;

    render(
      <FileUploadButton name="errorFile" handleChange={mockHandleChange} />,
    );

    const file = new File(["some error"], "error.txt", {
      type: "text/plain",
    });
    const input = screen.getByTestId("file-input");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Error reading file")).toBeInTheDocument();
    });

    global.FileReader = globalFileReader;
  });
});
