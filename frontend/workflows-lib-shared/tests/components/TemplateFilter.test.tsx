import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { TemplateFilter } from "../../lib/main";

const templates = [
  "mx-processing",
  "tomography",
  "visr-reconstruction",
];

describe("TemplateFilter", () => {
  it("renders the template filter", () => {
    render(
      <TemplateFilter
        templates={templates}
        selectedTemplates={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByLabelText("Templates")).toBeInTheDocument();
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
    await user.click(
      screen.getByRole("option", { name: "tomography" }),
    );

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

    expect(screen.getByText("tomography")).toBeInTheDocument();
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

    expect(screen.getByText("tomography")).toBeInTheDocument();

    rerender(
      <TemplateFilter
        templates={templates}
        selectedTemplates={["mx-processing"]}
        onChange={onChange}
      />,
    );

    expect(screen.getByText("mx-processing")).toBeInTheDocument();
    expect(screen.queryByText("tomography")).not.toBeInTheDocument();
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

    await user.click(
      screen.getByRole("button", { name: "tomography" })
        .querySelector('[data-testid="CancelIcon"]')!,
    );

    expect(onChange).toHaveBeenCalledWith([]);
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

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByText("No options")).toBeInTheDocument();
  });
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
  await user.click(
    screen.getByRole("option", { name: "tomography" }),
  );

  expect(onChange).toHaveBeenCalledWith(["tomography"]);

  // Simulate the parent updating the controlled selection.
  rerender(
    <TemplateFilter
      templates={templates}
      selectedTemplates={["tomography"]}
      onChange={onChange}
    />,
  );

  await user.click(screen.getByRole("combobox"));
  await user.click(
    screen.getByRole("option", { name: "mx-processing" }),
  );

  expect(onChange).toHaveBeenLastCalledWith([
    "tomography",
    "mx-processing",
  ]);
});
