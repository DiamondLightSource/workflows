import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { TemplateFilter, type TemplateFilterProps } from "../lib/main";

const templates = [
  "mx-processing",
  "tomography",
  "visr-reconstruction",
  "data-analysis",
];

const meta: Meta<typeof TemplateFilter> = {
  title: "TemplateFilter",
  component: TemplateFilter,
};

export default meta;

type Story = StoryObj<typeof TemplateFilter>;

// Wrapper to manage controlled filter state
const ControlledTemplateFilter = ({
  selectedTemplates: initialSelection,
  ...props
}: TemplateFilterProps) => {
  const [selectedTemplates, setSelectedTemplates] =
    useState<string[]>(initialSelection);

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
    label: "Science Group",
    templates: templates,
    selectedTemplates: [],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const Preselected: Story = {
  args: {
    label: "Science Group",
    templates: templates,
    selectedTemplates: ["tomography"],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const MultipleSelected: Story = {
  args: {
    templates: templates,
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

export const MultipleFilters: Story = {
  args: {
    templates: templates,
    selectedTemplates: [],
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
    templates: templates,
    selectedTemplates: ["tomography", "mx-processing", "visr-reconstruction"],
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
