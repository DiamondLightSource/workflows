import { useEffect, useState } from "react";
import { useColorScheme } from "@mui/material/styles";
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
const StoryTheme = ({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: "light" | "dark";
}) => {
  return (
    <ThemeProvider theme={DiamondDSTheme}>
      <ThemeMode mode={mode}>{children}</ThemeMode>
    </ThemeProvider>
  );
};

const ThemeMode = ({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: "light" | "dark";
}) => {
  const { setMode } = useColorScheme();

  useEffect(() => {
    setMode(mode);

    // Synchronise Diamond Design System CSS variables.
    document.documentElement.setAttribute("data-mode", mode);
  }, [mode, setMode]);

  return <>{children}</>;
};


const meta: Meta<typeof TemplateFilter> = {
  title: "TemplateFilter",
  component: TemplateFilter,
  decorators: [
    (Story, context) => {
      console.log("Diamond mode:", context.globals.diamondMode);

      return (
        <StoryTheme mode={context.globals.diamondMode ?? "light"}>
          <Story />
        </StoryTheme>
      );
    },
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
