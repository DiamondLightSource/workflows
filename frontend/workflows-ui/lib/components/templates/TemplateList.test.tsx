import { TemplateList, TemplateOverviewButton } from "../../main";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ThemeProvider,
  DiamondDSTheme,
} from "@diamondlightsource/sci-react-ui";
import { TemplateOverviewCommonProps } from "./TemplateOverviewCommon";

const templateDataList = [
  {
    title: "First Template",
    name: "first-template",
    maintainer: "",
    description: "",
  },
  {
    title: "Second Template",
    name: "second-template",
    maintainer: "",
    description: "",
  },
  {
    title: "Third Template",
    name: "third-template",
    maintainer: "",
    description: "",
  },
];

it("displays all templates", () => {
  render(
    <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
      <TemplateList
        cardPropsList={templateDataList}
        selectedName={null}
        setSelectedName={vi.fn()}
      />
    </ThemeProvider>,
  );

  for (const cardData of templateDataList) {
    expect(screen.getByText(cardData.title)).toBeDefined();
  }
});

it("displays empty list message", () => {
  render(
    <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
      <TemplateList
        cardPropsList={[]}
        selectedName={null}
        setSelectedName={vi.fn()}
      />
    </ThemeProvider>,
  );

  expect(screen.getByText("No Templates Found")).toBeDefined();
});

it("calls setSelectedName when a card is clicked", async () => {
  const user = userEvent.setup();
  const mockFunction = vi.fn();

  render(
    <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
      <TemplateList
        cardPropsList={templateDataList}
        selectedName={null}
        setSelectedName={mockFunction}
      />
    </ThemeProvider>,
  );

  const selectTemplateName = "second-template";

  await user.click(screen.getByText(selectTemplateName, { exact: false }));

  expect(mockFunction).toHaveBeenCalledWith(selectTemplateName);
});

vi.mock("./TemplateOverviewButton.tsx", {
  spy: true,
});

it("sets a card as collected when its name matches the selectedName", () => {
  const selectTemplateName = "second-template";

  render(
    <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
      <TemplateList
        cardPropsList={templateDataList}
        selectedName={selectTemplateName}
        setSelectedName={vi.fn()}
      />
    </ThemeProvider>,
  );

  // Checks that the TemplateOverviewButton with the matching name
  // was created with a selected value of true
  expect(TemplateOverviewButton).toHaveBeenCalledWith(
    expect.objectContaining({
      cardProps: expect.objectContaining({
        name: selectTemplateName,
      }) as TemplateOverviewCommonProps,
      selected: true,
    }),
    expect.anything(),
  );
});

// Additional tests that are not possible with React:
// Make sure a scroll bar appears when enough cards are present
