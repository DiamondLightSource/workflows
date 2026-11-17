# TemplateFilter

A reusable React component for selecting workflow templates.

## Features

- Search available templates.
- Select multiple templates.
- Remove selected templates.
- Control the selected state through component props.
- Independent of GraphQL, Apollo, Relay, and React Router.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `templates` | `string[]` | Templates available for selection. |
| `selectedTemplates` | `string[]` | Templates currently selected by the parent component. |
| `onChange` | `(templates: string[]) => void` | Called with the updated selection when the user selects or removes a template. |

## Example

```tsx
import { useState } from "react";
import { TemplateFilter } from "@diamondlightsource/workflows-lib-shared";

const templates = [
  "tomography",
  "mx-processing",
  "visr-reconstruction",
];

export function WorkflowFilters() {
  const [selectedTemplates, setSelectedTemplates] =
    useState<string[]>([]);

  return (
    <TemplateFilter
      templates={templates}
      selectedTemplates={selectedTemplates}
      onChange={setSelectedTemplates}
    />
  );
}
```

## Controlled state

`TemplateFilter` is a controlled component.

It reports selection changes through `onChange`, but the parent component
owns and updates `selectedTemplates`.

An empty `selectedTemplates` array means that no template is selected.

The component does not fetch templates or filter workflows.

Data retrieval and filter application remain the responsibility of the
consuming application.

## Testing

Component tests are located at:

`tests/components/TemplateFilter.test.tsx`

Run the tests using:

`pnpm exec vitest run tests/components/TemplateFilter.test.tsx`

## Storybook

Interactive examples are available in:

`stories/TemplateFilter.stories.tsx`

Run Storybook using:

`pnpm storybook`

## Architecture

The component belongs to `workflows-lib-shared` and has no dependency on
GraphQL, Apollo, Relay, or application-specific routing.

It can be reused by different workflow dashboards regardless of their
data-fetching implementation.
