import type { Meta, StoryObj, StoryFn } from "@storybook/react";
import { fakeTasksA } from "./common";
import TasksDynamic from "../lib/components/workflow/TasksDynamic";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

const ResizableDecorator = (Story: StoryFn) => (
  <ResizableBox
    width={1200}
    height={600}
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

const meta: Meta<typeof TasksDynamic> = {
  title: "Tasks",
  component: TasksDynamic,
  decorators: [ResizableDecorator],
};

type Story = StoryObj<typeof TasksDynamic>;

export default meta;

export const Dynamic: Story = {
  args: {
    tasks: fakeTasksA,
  },
};
