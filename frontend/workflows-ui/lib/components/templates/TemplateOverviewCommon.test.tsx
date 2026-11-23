import TemplateOverviewCommon from "./TemplateOverviewCommon";
import { render, screen } from "@testing-library/react";

import {
  ThemeProvider,
  DiamondDSTheme,
} from "@diamondlightsource/sci-react-ui";

export const basicName = "Test Name";
export const basicMaintainer = "Test Maintainer";
export const basicTitle = "Test Title";
export const basicDescription = "Test Description";

it("displays all information", () => {
  render(
    <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
      <TemplateOverviewCommon
        name={basicName}
        maintainer={basicMaintainer}
        title={basicTitle}
        description={basicDescription}
      />
    </ThemeProvider>,
  );
  expect(screen.getByText(basicName, { exact: false })).toBeDefined();
  expect(screen.getByText(basicMaintainer, { exact: false })).toBeDefined();
  expect(screen.getByText(basicTitle)).toBeDefined();
  expect(screen.getByText(basicDescription)).toBeDefined();
});

// Additional tests that are not possible with React:
// Make sure the component does not breach its parents content box when inside a div (Box)
