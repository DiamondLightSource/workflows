import { Button, Typography } from "@mui/material";
import ErrorBoundary from "./ErrorBoundary";
import { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

const meta: Meta<typeof ErrorBoundary> = {
  title: "ErrorBoundary",
  component: ErrorBoundary,
  tags: ["autodocs"],
  decorators: [(story) => <div style={{ width: "400px" }}>{story()}</div>],
  parameters: {
    docs: {
      description: {
        component: `
            A component that catches errors in its children and displays a fallback component instead.
            NOTE: Error boundaries can only catch errors thrown in child components' render functions
              This means it can NOT catch errors in event handlers, asynchronous callbacks or anything
              thrown inside its own render function
        `,
      },
    },
  },
};

type Story = StoryObj<typeof ErrorBoundary>;

export default meta;

function ButtonThatErrors() {
  const [triggerError, setTriggerError] = useState(false);

  if (triggerError) {
    throw new Error("Button Error");
  }

  return (
    <Button
      onClick={() => {
        setTriggerError(true);
      }}
    >
      Click to error
    </Button>
  );
}

export const ErrorButton: Story = {
  args: {
    children: <ButtonThatErrors />,
  },
  parameters: {
    docs: {
      description: {
        story: `
    The button is wrapped in an error boundary.
    When clicked, the button re-renders and throws an error in the render function.
    The error boundary catches this and displays an alert describing the details of the error
    `,
      },
    },
  },
};

export const CustomFallback: Story = {
  args: {
    children: <ButtonThatErrors />,
    fallback: (error) => <Typography>Error: {error.name}</Typography>,
  },
};
