import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";

import { TemplateSearch, type TemplateSearchProps } from "../../main";

const meta: Meta<typeof TemplateSearch> = {
  title: "Components/TemplateSearch",
  component: TemplateSearch,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `

A reusable React search component for searching workflow templates or other resources.

## Features

- Search input with a search icon.
- Clear button to reset the search.
- Configurable label and placeholder.
- Controlled state through component props.
- Responsive width through the parent container.
- Supports Diamond light and dark themes.
- Independent of GraphQL, Apollo, Relay, and React Router.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| label | string | Optional label. Defaults to "Search templates". |
| placeholder | string | Optional placeholder text. |
| value | string | Current search text, controlled by the parent. |
| onChange | (value: string) => void | Called when the search text changes or is cleared. |

## Controlled State

TemplateSearch is a controlled component.

The parent owns the search value and passes it through the \`value\` prop.

When the user types, the component calls \`onChange(newValue)\`.

The parent updates its state and React re-renders the component.

## Clear Search

The clear button calls \`onChange("")\`.

When the search value is empty, the clear button is disabled.

## Usage

Import TemplateSearch from:

\`@diamondlightsource/workflows-ui\`

The parent component manages the search value using React state.
        `,
      },
    },
  },
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
    onChange: () => {},
  },
  render: (args) => <ControlledTemplateSearch {...args} />,
};

export const WithValue: Story = {
  args: {
    label: "Search templates",
    value: "tomography",
    onChange: () => {},
  },
  render: (args) => <ControlledTemplateSearch {...args} />,
};

export const CustomLabel: Story = {
  args: {
    label: "Search workflows",
    placeholder: "Enter workflow name",
    value: "",
    onChange: () => {},
  },
  render: (args) => <ControlledTemplateSearch {...args} />,
};

export const Empty: Story = {
  args: {
    label: "Search templates",
    placeholder: "Start typing...",
    value: "",
    onChange: () => {},
  },
  render: (args) => <ControlledTemplateSearch {...args} />,
};
