import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { useColorScheme } from "@mui/material/styles";
import {
  ThemeProvider,
  DiamondDSTheme,
} from "@diamondlightsource/sci-react-ui";
import { TemplateSearch, type TemplateSearchProps } from "../lib/main";

type Mode = "light" | "dark";

const ThemeMode = ({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: Mode;
}) => {
  const { setMode } = useColorScheme();

  useEffect(() => {
    setMode(mode);
    document.documentElement.setAttribute("data-mode", mode);
  }, [mode, setMode]);

  return <>{children}</>;
};

const StoryTheme = ({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: Mode;
}) => (
  <ThemeProvider theme={DiamondDSTheme}>
    <ThemeMode mode={mode}>{children}</ThemeMode>
  </ThemeProvider>
);

const meta: Meta<typeof TemplateSearch> = {
  title: "TemplateSearch",
  component: TemplateSearch,
  decorators: [
    (Story, context) => {
      const selectedMode: unknown = context.globals.diamondMode;

      const mode: "light" | "dark" = selectedMode === "dark" ? "dark" : "light";

      return (
        <StoryTheme mode={mode}>
          <Story />
        </StoryTheme>
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof TemplateSearch>;

// Parent wrapper for controlled search state
const ControlledTemplateSearch = ({
  value: initialValue,
  ...props
}: TemplateSearchProps) => {
  const [value, setValue] = useState(initialValue);

  return <TemplateSearch {...props} value={value} onChange={setValue} />;
};

export const Default: Story = {
  args: {
    label: "Search templates",
    value: "",
  },
  render: (args) => <ControlledTemplateSearch {...args} />,
};

export const WithValue: Story = {
  args: {
    label: "Search templates",
    value: "tomography",
  },
  render: (args) => <ControlledTemplateSearch {...args} />,
};

export const CustomLabel: Story = {
  args: {
    label: "Search workflows",
    placeholder: "Enter workflow name",
    value: "",
  },
  render: (args) => <ControlledTemplateSearch {...args} />,
};

export const Empty: Story = {
  args: {
    label: "Search templates",
    placeholder: "Start typing...",
    value: "",
  },
  render: (args) => <ControlledTemplateSearch {...args} />,
};
