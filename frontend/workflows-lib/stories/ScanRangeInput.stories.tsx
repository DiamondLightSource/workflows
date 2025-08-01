import { Meta, StoryObj } from "@storybook/react";
import { ScanRangeInput } from "../lib/main";

const meta: Meta<typeof ScanRangeInput> = {
  title: "Controls/ScanRangeInput",
  component: ScanRangeInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Input for scan range with start, end and excluded scans",
      },
    },
  },
  argTypes: {
    name: { control: "text" },
    value: { control: "object" },
    handleChange: { action: "changed" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "scanRange",
    value: { start: 1, end: 10, excluded: [5, 6] },
    handleChange: (name: string, value: unknown) => {
      console.log("Updated:", name, value);
    },
  },
};

export const EmptyExcluded: Story = {
  args: {
    name: "scanRange",
    value: { start: 1, end: 10, excluded: [] },
    handleChange: (name: string, value: unknown) => {
      console.log("Updated:", name, value);
    },
  },
};

export const InvalidRange: Story = {
  args: {
    name: "scanRange",
    value: { start: 10, end: 5, excluded: [] },
    handleChange: (name: string, value: unknown) => {
      console.log("Updated:", name, value);
    },
  },
};
