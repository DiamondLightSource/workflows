import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { TemplateSearch } from "../../main";

describe("TemplateSearch", () => {
  it("renders the search input", () => {
    render(<TemplateSearch value="" onChange={vi.fn()} />);

    expect(
      screen.getByRole("textbox", { name: "Search templates" }),
    ).toBeInTheDocument();
  });

  it("calls onChange when the user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TemplateSearch value="" onChange={onChange} />);

    await user.type(screen.getByRole("textbox"), "MX");

    expect(onChange).toHaveBeenCalledWith("M");
  });

  it("displays the value provided through props", () => {
    render(<TemplateSearch value="tomography" onChange={vi.fn()} />);

    expect(screen.getByRole("textbox")).toHaveValue("tomography");
  });

  it("updates the displayed value when props change", () => {
    const { rerender } = render(
      <TemplateSearch value="tomography" onChange={vi.fn()} />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("tomography");

    rerender(<TemplateSearch value="mx-processing" onChange={vi.fn()} />);

    expect(screen.getByRole("textbox")).toHaveValue("mx-processing");
  });

  it("clears the search when Clear is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<TemplateSearch value="tomography" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Clear search" }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("disables Clear when the search is empty", () => {
    render(<TemplateSearch value="" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Clear search" })).toBeDisabled();
  });

  it("supports a custom label", () => {
    render(
      <TemplateSearch label="Search workflows" value="" onChange={vi.fn()} />,
    );

    expect(
      screen.getByRole("textbox", { name: "Search workflows" }),
    ).toBeInTheDocument();
  });

  it("supports a custom placeholder", () => {
    render(
      <TemplateSearch
        placeholder="Enter template name"
        value=""
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByPlaceholderText("Enter template name"),
    ).toBeInTheDocument();
  });
});
