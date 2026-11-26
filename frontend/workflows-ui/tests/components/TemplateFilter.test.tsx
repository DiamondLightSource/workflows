import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { TemplateFilter } from "../../lib/main";

const templates = ["mx-processing", "tomography", "visr-reconstruction"];

describe("TemplateFilter", () => {
  it("renders the template filter", () => {
    render(
      <TemplateFilter
        label="Science Group"
        templates={templates}
        selectedTemplates={[]}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Science Group" }),
    ).toBeInTheDocument();
  });

  it("displays available templates", async () => {
    const user = userEvent.setup();

    render(
      <TemplateFilter
        templates={templates}
        selectedTemplates={[]}
        onChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    expect(
      screen.getByRole("option", { name: "mx-processing" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", { name: "tomography" }),
    ).toBeInTheDocument();
  });

  it("calls onChange when a template is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TemplateFilter
        templates={templates}
        selectedTemplates={[]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    await user.click(screen.getByRole("option", { name: "tomography" }));

    expect(onChange).toHaveBeenCalledWith(["tomography"]);
  });

  it("displays templates selected through props", () => {
    render(
      <TemplateFilter
        templates={templates}
        selectedTemplates={["tomography"]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("tomography");
  });

  it("updates the selection when props change", () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <TemplateFilter
        templates={templates}
        selectedTemplates={["tomography"]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("tomography");

    rerender(
      <TemplateFilter
        templates={templates}
        selectedTemplates={["mx-processing"]}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("mx-processing");

    expect(screen.getByRole("combobox")).not.toHaveTextContent("tomography");
  });

  it("calls onChange when a selected template is removed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TemplateFilter
        templates={templates}
        selectedTemplates={["tomography"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    await user.click(screen.getByRole("option", { name: "tomography" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("handles an empty template list", async () => {
    const user = userEvent.setup();

    render(
      <TemplateFilter
        templates={[]}
        selectedTemplates={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("All");

    await user.click(screen.getByRole("combobox"));

    expect(
      screen.queryByRole("option", { name: "tomography" }),
    ).not.toBeInTheDocument();
  });

  it("supports multiple template selections", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    const { rerender } = render(
      <TemplateFilter
        templates={templates}
        selectedTemplates={[]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    await user.click(screen.getByRole("option", { name: "tomography" }));

    expect(onChange).toHaveBeenLastCalledWith(["tomography"]);

    // Simulate the parent updating the controlled state.
    rerender(
      <TemplateFilter
        templates={templates}
        selectedTemplates={["tomography"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("option", { name: "mx-processing" }));

    expect(onChange).toHaveBeenLastCalledWith(["tomography", "mx-processing"]);
  });

  it("clears all selected templates", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TemplateFilter
        templates={templates}
        selectedTemplates={["tomography", "mx-processing"]}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("combobox"));

    await user.click(screen.getByText("Clear all"));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("displays the selected templates", () => {
    render(
      <TemplateFilter
        templates={templates}
        selectedTemplates={[
          "tomography",
          "mx-processing",
          "visr-reconstruction",
        ]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveTextContent("tomography");
  });

  it("generates unique IDs for multiple filters", () => {
    const { container } = render(
      <>
        <TemplateFilter
          label="Science Group"
          templates={templates}
          selectedTemplates={[]}
          onChange={vi.fn()}
        />

        <TemplateFilter
          label="Workflow Templates"
          templates={templates}
          selectedTemplates={[]}
          onChange={vi.fn()}
        />
      </>,
    );

    const filters = container.querySelectorAll('[role="combobox"]');

    expect(filters).toHaveLength(2);

    const firstFilter = filters[0];
    const secondFilter = filters[1];

    expect(firstFilter.id).toBeTruthy();
    expect(secondFilter.id).toBeTruthy();

    expect(firstFilter.id).not.toBe(secondFilter.id);
  });
});
