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
      return (
        <StoryTheme
          mode={context.globals.diamondMode === "dark" ? "dark" : "light"}
        >
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
  selectedValues: initialSelection,
  ...props
}: TemplateFilterProps) => {
  const [selectedValues, setSelectedTemplates] = useState(initialSelection);

  return (
    <TemplateFilter
      {...props}
      selectedValues={selectedValues}
      onChange={setSelectedTemplates}
    />
  );
};

export const Default: Story = {
  args: {
    label: "Science Group",
    filterValues: templates,
    selectedValues: [],
    variant: "outlined",
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const Preselected: Story = {
  args: {
    label: "Science Group",
    filterValues: templates,
    selectedValues: ["tomography"],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const MultipleSelected: Story = {
  args: {
    filterValues: templates,
    selectedValues: ["tomography", "mx-processing"],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const Empty: Story = {
  args: {
    filterValues: [],
    selectedValues: [],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const MultipleFilters: Story = {
  args: {
    filterValues: templates,
    selectedValues: [],
  },
  render: (args) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "350px",
      }}
    >
      <ControlledTemplateFilter {...args} label="Science Group" />

      <ControlledTemplateFilter {...args} label="Workflow Templates" />

      <ControlledTemplateFilter {...args} label={undefined} />
    </div>
  ),
};

export const ResponsiveWidth: Story = {
  args: {
    filterValues: templates,
    selectedValues: ["tomography", "mx-processing", "visr-reconstruction"],
  },
  render: (args) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <div style={{ width: "200px" }}>
        <ControlledTemplateFilter {...args} />
      </div>

      <div style={{ width: "350px" }}>
        <ControlledTemplateFilter {...args} />
      </div>

      <div style={{ width: "600px" }}>
        <ControlledTemplateFilter {...args} />
      </div>
    </div>
  ),
};
