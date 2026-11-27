import { TemplateOverviewButton } from "../../main";
import { render } from "@testing-library/react";
import {
  ThemeProvider,
  DiamondDSTheme,
} from "@diamondlightsource/sci-react-ui";
import {
  basicName,
  basicMaintainer,
  basicTitle,
  basicDescription,
} from "./TemplateOverviewCommon.test";
import userEvent from "@testing-library/user-event";

it("runs onSelect when clicked", async () => {
  const user = userEvent.setup();
  const mockFunction = vi.fn();

  render(
    <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
      <TemplateOverviewButton
        cardProps={{
          name: basicName,
          maintainer: basicMaintainer,
          title: basicTitle,
          description: basicDescription,
        }}
        selected={false}
        onSelect={mockFunction}
      />
    </ThemeProvider>,
  );

  const button = document.querySelector("button");
  expect(button).not.toBeNull();
  if (button !== null) {
    await user.click(button);
  }

  expect(mockFunction).toHaveBeenCalled();
});

// Additional tests that are not possible with React:
// Make sure the component changes colour when hovered over and when selected
