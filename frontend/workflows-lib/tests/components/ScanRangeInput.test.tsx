import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { ScanRangeInput } from "../../lib/main";

describe("ScanRangeInput", () => {
  const defaultProps = {
    name: "scanRange",
    value: { start: 1, end: 10, excluded: [5, 6] },
    handleChange: vi.fn(),
  };

  it("renders all input fields", () => {
    render(<ScanRangeInput {...defaultProps} />);
    expect(screen.getByLabelText("Start")).toBeInTheDocument();
    expect(screen.getByLabelText("End")).toBeInTheDocument();
    expect(screen.getByLabelText("Excluded")).toBeInTheDocument();
  });

  it("displays initial values correctly", () => {
    render(<ScanRangeInput {...defaultProps} />);
    expect(screen.getByLabelText("Start")).toHaveValue(1);
    expect(screen.getByLabelText("End")).toHaveValue(10);
    expect(screen.getByLabelText("Excluded")).toHaveValue("5, 6");
  });

  it("calls handleChange with valid input", async () => {
    const mockHandleChange = vi.fn();
    render(
      <ScanRangeInput
        name="scanRange"
        value={{ start: 1, end: 10, excluded: [] }}
        handleChange={mockHandleChange}
      />,
    );

    const startInput = screen.getByLabelText("Start");
    const endInput = screen.getByLabelText("End");
    const excludedInput = screen.getByLabelText("Excluded");

    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Excluded"), {
      target: { value: "3, 4" },
    });
    fireEvent.blur(startInput);
    fireEvent.blur(endInput);
    fireEvent.blur(excludedInput);

    await waitFor(() => {
      expect(mockHandleChange).toHaveBeenCalledWith("scanRange", {
        start: 2,
        end: 12,
        excluded: [3, 4],
      });
    });
  });

  it("does not overwrite excludedRaw when value.excluded updates", () => {
    const mockHandleChange = vi.fn();
    const { rerender } = render(
      <ScanRangeInput
        name="scanRange"
        value={{ start: 1, end: 10, excluded: [5, 7] }}
        handleChange={mockHandleChange}
      />,
    );
    const excludedInput = screen.getByLabelText("Excluded");
    fireEvent.change(excludedInput, {
      target: { value: "5-7" },
    });
    rerender(
      <ScanRangeInput
        name="scanRange"
        value={{ start: 1, end: 10, excluded: [5, 6, 7] }}
        handleChange={mockHandleChange}
      />,
    );
    expect(excludedInput).toHaveValue("5-7");
  });

  it("shows error when end is less than start", async () => {
    render(<ScanRangeInput {...defaultProps} />);

    const endInput = screen.getByLabelText("End");

    fireEvent.change(screen.getByLabelText("End"), { target: { value: "0" } });
    fireEvent.blur(endInput);

    await waitFor(() => {
      expect(
        screen.getByText("End cannot be less than start"),
      ).toBeInTheDocument();
    });
  });

  it("does not show error when end is equal to start", async () => {
    render(<ScanRangeInput {...defaultProps} />);
    fireEvent.change(screen.getByLabelText("End"), { target: { value: "1" } });

    await waitFor(() => {
      expect(
        screen.queryByText("End cannot be less than start"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows error for invalid excluded values", async () => {
    render(<ScanRangeInput {...defaultProps} />);

    const excludedInput = screen.getByLabelText("Excluded");

    fireEvent.change(screen.getByLabelText("Excluded"), {
      target: { value: "abc" },
    });
    fireEvent.blur(excludedInput);

    await waitFor(() => {
      expect(
        screen.getByText("Must be positive integers or ranges"),
      ).toBeInTheDocument();
    });
  });

  it("shows error for excluded values out of range", async () => {
    render(<ScanRangeInput {...defaultProps} />);

    const excludedInput = screen.getByLabelText("Excluded");

    fireEvent.change(excludedInput, {
      target: { value: "0, 11" },
    });

    fireEvent.blur(excludedInput);

    await waitFor(() => {
      expect(
        screen.getByText("Excluded values out of range"),
      ).toBeInTheDocument();
    });
  });

  it("parses bracketed excluded values correctly", async () => {
    const mockHandleChange = vi.fn();
    render(
      <ScanRangeInput
        name="scanRange"
        value={{ start: 1, end: 10, excluded: [] }}
        handleChange={mockHandleChange}
      />,
    );

    const excludedInput = screen.getByLabelText("Excluded");

    fireEvent.change(excludedInput, {
      target: { value: "[2, 3]" },
    });

    fireEvent.blur(excludedInput);

    await waitFor(() => {
      expect(mockHandleChange).toHaveBeenCalledWith("scanRange", {
        start: 1,
        end: 10,
        excluded: [2, 3],
      });
    });
  });

  it("parses hyphenated excluded ranges correctly", async () => {
    const mockHandleChange = vi.fn();
    render(
      <ScanRangeInput
        name="scanRange"
        value={{ start: 1, end: 10, excluded: [] }}
        handleChange={mockHandleChange}
      />,
    );
    const excludedInput = screen.getByLabelText("Excluded");

    fireEvent.change(screen.getByLabelText("Excluded"), {
      target: { value: "2-4, 7-8" },
    });
    fireEvent.blur(excludedInput);

    await waitFor(() => {
      expect(mockHandleChange).toHaveBeenCalledWith("scanRange", {
        start: 1,
        end: 10,
        excluded: [2, 3, 4, 7, 8],
      });
    });
  });

  it("sorts values in range correctly", async () => {
    const mockHandleChange = vi.fn();
    render(
      <ScanRangeInput
        name="scanRange"
        value={{ start: 10, end: 100, excluded: [] }}
        handleChange={mockHandleChange}
      />,
    );
    const excludedInput = screen.getByLabelText("Excluded");

    fireEvent.change(screen.getByLabelText("Excluded"), {
      target: { value: "20-22, 14-16, 30-33" },
    });
    fireEvent.blur(excludedInput);

    await waitFor(() => {
      expect(mockHandleChange).toHaveBeenCalledWith("scanRange", {
        start: 10,
        end: 100,
        excluded: [14, 15, 16, 20, 21, 22, 30, 31, 32, 33],
      });
    });
  });
  it("parses mixed-format excluded values correctly", async () => {
    const mockHandleChange = vi.fn();
    render(
      <ScanRangeInput
        name="scanRange"
        value={{ start: 1, end: 20, excluded: [] }}
        handleChange={mockHandleChange}
      />,
    );
    const excludedInput = screen.getByLabelText("Excluded");
    fireEvent.change(excludedInput, {
      target: { value: "2, 3 4-6 10,12-13" },
    });
    fireEvent.blur(excludedInput);
    await waitFor(() => {
      expect(mockHandleChange).toHaveBeenCalledWith("scanRange", {
        start: 1,
        end: 20,
        excluded: [2, 3, 4, 5, 6, 10, 12, 13],
      });
    });
  });
  it("parses space-separated excluded values correctly", async () => {
    const mockHandleChange = vi.fn();
    render(
      <ScanRangeInput
        name="scanRange"
        value={{ start: 1, end: 10, excluded: [] }}
        handleChange={mockHandleChange}
      />,
    );
    const excludedInput = screen.getByLabelText("Excluded");
    fireEvent.change(excludedInput, {
      target: { value: "2 3 4" },
    });
    fireEvent.blur(excludedInput);
    await waitFor(() => {
      expect(mockHandleChange).toHaveBeenCalledWith("scanRange", {
        start: 1,
        end: 10,
        excluded: [2, 3, 4],
      });
    });
  });
});
