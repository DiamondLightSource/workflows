import { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { FileTypeDropdown } from "../lib/components/workflow/FileTypeDropdown";

const fileTypes: string[] = [".txt", ".pdf", ".log"];

const meta: Meta<typeof FileTypeDropdown> = {
  title: "Workflow",
  component: FileTypeDropdown,
};

type Story = StoryObj<typeof FileTypeDropdown>;

export default meta;

export const dropDown: Story = {
  args: {
    fileTypes,
    selectedFileTypes: [],
    setSelectedFileTypes: () => {},
  },
  render: () => {
    const DropDown = () => {
      const [selectedFileTypes, setSelectedFileTypes] = useState<string[]>([]);

      return (
        <FileTypeDropdown
          fileTypes={fileTypes}
          selectedFileTypes={selectedFileTypes}
          setSelectedFileTypes={setSelectedFileTypes}
        />
      );
    };

    return <DropDown />;
  },
};
