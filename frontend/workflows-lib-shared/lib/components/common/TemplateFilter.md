# TemplateFilter

A reusable React component for filtering workflow templates or other
categories, such as Science Groups.

The component uses Material UI Select and supports multiple selections
without checkboxes.

## Features

- Select multiple values from a dropdown.
- Display selected values in a compact format.
- Highlight selected options in the dropdown.
- Clear all selections using the "Clear all" option.
- Support configurable filter labels.
- Control selected values through component props.
- Responsive layout using Material UI.
- Independent of GraphQL, Apollo, Relay, and React Router.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `label` | `string` | Optional dropdown label. Defaults to "Science Group". |
| `templates` | `string[]` | Available options displayed in the dropdown. |
| `selectedTemplates` | `string[]` | Currently selected values, controlled by the parent. |
| `onChange` | `(selectedTemplates: string[]) => void` | Called when the selection changes or is cleared. |

## Example

```tsx
import { useState } from "react";
import { TemplateFilter } from "@diamondlightsource/workflows-lib-shared";

const scienceGroups = [
  "No Group",
  "MX",
  "Examples",
  "Magnetic Materials",
  "Soft Condensed Matter",
  "Imaging and Microscopy",
  "Biological Cryo-Imaging",
  "Structures and Surfaces",
  "Crystallography",
  "Spectroscopy",
];

export function WorkflowFilters() {
  const [selectedScienceGroups, setSelectedScienceGroups] =
    useState<string[]>([]);

  return (
    <TemplateFilter
      label="Science Group"
      templates={scienceGroups}
      selectedTemplates={selectedScienceGroups}
      onChange={setSelectedScienceGroups}
    />
  );
}
```

## Selection behaviour

The dropdown supports multiple selections without displaying checkboxes.

Selected options are highlighted when the dropdown is opened.

The closed dropdown displays the first selected value followed by
the number of additional selections.

### Examples

| Selected values | Display |
| --- | --- |
| None | All science groups |
| MX | MX |
| MX, Imaging and Microscopy | MX +1 more |
| MX, Imaging and Microscopy, Spectroscopy | MX +2 more |
| Four selected values | First selection +3 more |

This keeps the dropdown compact even when multiple options are selected.

## Clear all

The dropdown includes a "Clear all" option at the top.

Selecting "Clear all" calls:

```tsx
onChange([]);
```

The parent component is responsible for updating the selected state.

The "Clear all" option is disabled when no values are selected.

## Controlled state

`TemplateFilter` is a controlled React component.

It does not maintain its own selected values.

Instead, the parent supplies the current selection through:

```tsx
selectedTemplates={selectedScienceGroups}
```

When the user changes the selection, the component calls:

```tsx
onChange(updatedSelection);
```

The parent updates its state and React re-renders the component
with the new selected values.

An empty `selectedTemplates` array represents no selection.

## Styling

The component follows the Material UI outlined Select design.

- Variant: Outlined
- Size: Medium
- Height: Approximately 56px
- Border radius: 4px
- Width: 100% of the parent container
- Background: Transparent
- Multiple selection without checkboxes

The component uses Material UI styling and can inherit the
Diamond Design System theme from the consuming application.

## Data handling

The component only manages the user interface for selecting filters.

It does not:

- Fetch workflow templates.
- Execute GraphQL queries.
- Filter workflow results.
- Manage pagination.
- Depend on Apollo or Relay.
- Access application-specific routing.

The consuming application is responsible for retrieving available
options and applying the selected filters.

## Testing

Component tests are located at:

`tests/components/TemplateFilter.test.tsx`

Tests should cover:

- Rendering the dropdown.
- Displaying available options.
- Selecting one option.
- Selecting multiple options.
- Highlighting selected options.
- Displaying the selection count.
- Clearing all selections.
- Updating the selection through props.
- Handling an empty options list.

Run the component tests:

`pnpm exec vitest run tests/components/TemplateFilter.test.tsx`

Run all shared-library tests:

`pnpm exec vitest run`

## Storybook

Interactive examples are located at:

`stories/TemplateFilter.stories.tsx`

Stories demonstrate:

- Default state with no selection.
- One preselected value.
- Multiple preselected values.
- Empty options list.

Run Storybook:

`pnpm storybook`

## Architecture

The component belongs to:

`frontend/workflows-lib-shared/lib/components/common/TemplateFilter.tsx`

It is exported through:

`frontend/workflows-lib-shared/lib/main.ts`

The component can be imported using:

```tsx
import { TemplateFilter } from "@diamondlightsource/workflows-lib-shared";
```

It is reusable across workflow dashboards regardless of whether
the application uses Apollo, Relay, REST, or another data source.

The component remains independent of the GraphQL integration layer.
