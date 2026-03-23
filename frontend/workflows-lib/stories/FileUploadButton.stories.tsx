import { Meta, StoryObj } from "@storybook/react";
import { FileUploadButton } from "../lib/main";

const meta: Meta<typeof FileUploadButton> = {
  title: "Controls/FileUploadButton",
  component: FileUploadButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Button to upload file content",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "configFile", handleChange: () => {} },
};
