import type { Meta, StoryObj, StoryFn } from "@storybook/react-vite";
import { fakeTasksA } from "./common";
import TasksFlow from "../lib/components/workflow/TasksFlow";
import { Box } from "@mui/material";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

const StaticDecorator = (Story: StoryFn) => (
  <Box
    width={1200}
    height={600}
    style={{
      padding: "10px",
      overflow: "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Story />
  </Box>
);

const DynamicDecorator = (Story: StoryFn) => (
  <ResizableBox
    width={1200}
    height={400}
    resizeHandles={["se"]}
    style={{
      border: "2px dashed #ccc",
      padding: "10px",
      overflow: "auto",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Story />
  </ResizableBox>
);

const meta: Meta<typeof TasksFlow> = {
  title: "Tasks",
  component: TasksFlow,
};

type Story = StoryObj<typeof TasksFlow>;

export default meta;

export const Graph: Story = {
  args: {
    tasks: fakeTasksA,
    isDynamic: false,
  },
  decorators: [StaticDecorator],
};

export const Dynamic: Story = {
  args: {
    tasks: fakeTasksA,
    isDynamic: true,
  },
  decorators: [DynamicDecorator],
};
