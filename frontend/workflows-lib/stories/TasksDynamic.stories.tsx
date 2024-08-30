import type { Meta, StoryObj, StoryFn } from "@storybook/react";
import TasksDynamic from "../lib/components/workflow/TasksDynamic";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

const fakeTasks = [
  {
    workflow: "1",
    name: "task-1",
    status: "completed",
  },
  {
    depends: "task-1",
    workflow: "1",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "completed",
  },
  {
    depends: "task-1",
    workflow: "1",
    name: "task-3",
    status: "running",
  },
  {
    workflow: "1",
    name: "task-4 ERFBAK3KJ34",
    status: "running",
  },
  {
    depends: "task-3",
    workflow: "1",
    name: "task-6 KNMNE9",
    status: "running",
  },
  {
    depends: "task-3",
    workflow: "1",
    name: "task-7 KLDJF034 DFJSOID 039402KDJO",
    status: "running",
  },
  {
    depends: "task-3",
    workflow: "1",
    name: "task-8",
    status: "pending",
  },
  {
    depends: "task-6 KNMNE9",
    workflow: "1",
    name: "task-9",
    status: "pending",
  },
  {
    depends: "task-9",
    workflow: "1",
    name: "task-10",
    status: "pending",
  },
];

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
    tasks: fakeTasks,
  },
};
