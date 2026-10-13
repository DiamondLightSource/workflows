import { TriggerAccordion } from "workflows-lib";
import { render, screen } from "@testing-library/react";

function renderComponent(errorMessage: string | undefined, enabled: boolean) {
  render(
    <TriggerAccordion
      toggleEnabled={() => {}}
      errorMessage={errorMessage}
      beamline="test-beamline"
      name="test-trigger"
      enabled={enabled}
      templateRef="test-template"
      creatorName="test-creator"
    />,
  );
}

it("renders all trigger details", () => {
  renderComponent(undefined, true);

  expect(screen.getByText("test-beamline")).toBeDefined();
  expect(screen.getByText("test-trigger")).toBeDefined();
  expect(screen.getByText("test-template")).toBeDefined();
  expect(screen.getByText("test-creator", { exact: false })).toBeDefined();
  // Check checkbox is checked
  expect(screen.getByTestId("CheckBoxIcon")).toBeDefined();
  // No error message should be present
  expect(screen.queryByTestId("ErrorOutlineIcon")).toBeNull();
});

it("renders error messages", () => {
  renderComponent("test error message", false);

  expect(
    screen.getByText("test error message", { exact: false }),
  ).toBeDefined();
  // Check checkbox is unchecked
  expect(screen.getByTestId("CheckBoxOutlineBlankIcon")).toBeDefined();
});
