import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  ThemeProvider,
  DiamondDSTheme,
} from "@diamondlightsource/sci-react-ui";
import { TemplateFilter, type TemplateFilterProps } from "../lib/main";

const templates = [
  "mx-processing",
  "tomography",
  "visr-reconstruction",
  "data-analysis",
];

const meta: Meta<typeof TemplateFilter> = {
  title: "TemplateFilter",
  component: TemplateFilter,
  decorators: [
    (Story) => (
      <ThemeProvider theme={DiamondDSTheme}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TemplateFilter>;

// Wrapper to manage controlled filter state
const ControlledTemplateFilter = ({
  selectedTemplates: initialSelection,
  ...props
}: TemplateFilterProps) => {
  const [selectedTemplates, setSelectedTemplates] = useState(initialSelection);

  return (
    <TemplateFilter
      {...props}
      selectedTemplates={selectedTemplates}
      onChange={setSelectedTemplates}
    />
  );
};

export const Default: Story = {
  args: {
    templates,
    selectedTemplates: [],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const Preselected: Story = {
  args: {
    templates,
    selectedTemplates: ["tomography"],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const MultipleSelected: Story = {
  args: {
    templates,
    selectedTemplates: ["tomography", "mx-processing"],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const Empty: Story = {
  args: {
    templates: [],
    selectedTemplates: [],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};
