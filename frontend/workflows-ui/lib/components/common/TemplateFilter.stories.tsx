import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import TemplateFilter, { type TemplateFilterProps } from "./TemplateFilter";

const templateOptions = [
  "mx-processing",
  "tomography",
  "visr-reconstruction",
  "data-analysis",
];

const meta: Meta<typeof TemplateFilter> = {
  title: "TemplateFilter",
  component: TemplateFilter,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
A reusable multi-select dropdown component for filtering workflow
templateOptions or other categories, such as Science Groups.

### Features

- Select multiple values from a dropdown.
- Display selected values in a compact format.
- Highlight selected options.
- Clear all selections using the "Clear all" option.
- Support configurable labels and responsive layouts.
- Work independently of GraphQL, Apollo, and Relay.

### Props

| Prop | Type | Description |
| --- | --- | --- |
| \`label\` | \`string\` | Optional dropdown label. |
| \`filterValues\` | \`string[]\` | Available dropdown options. |
| \`selectedTemplates\` | \`string[]\` | Currently selected values. |
| \`onChange\` | \`(values: string[]) => void\` | Called when selections change. |

### Selection behaviour

The component supports multiple selections.

Selected values are displayed in a compact format,
showing the first selection followed by the number
of additional selections.

For example:

- No selection: All science groups
- One selection: MX
- Two selections: MX +1 more
- Three selections: MX +2 more

### Controlled state

TemplateFilter is a controlled React component.

The parent manages the selected values through
\`selectedTemplates\` and updates them using \`onChange\`.

Selecting "Clear all" calls \`onChange([])\`.

The component only manages the filter UI.
The consuming application is responsible for
fetching options and filtering workflow results.
        `,
      },
    },
  },
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
    filterValues: templateOptions,
    selectedTemplates: [],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const Preselected: Story = {
  args: {
    label: "Science Group",
    filterValues: templateOptions,
    selectedTemplates: ["tomography"],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const MultipleSelected: Story = {
  args: {
    filterValues: templateOptions,
    selectedTemplates: ["tomography", "mx-processing"],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const Empty: Story = {
  args: {
    filterValues: [],
    selectedTemplates: [],
  },
  render: (args) => <ControlledTemplateFilter {...args} />,
};

export const MultipleFilters: Story = {
  args: {
    filterValues: templateOptions,
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
    filterValues: templateOptions,
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
