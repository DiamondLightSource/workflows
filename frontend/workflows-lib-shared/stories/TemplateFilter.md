# TemplateFilter

A reusable React component for filtering values such as workflow templates,
science groups, or workflow statuses.

The component uses Material UI Select and supports multiple selections
with checkboxes.

## Features

- Select multiple values from a dropdown.
- Display checkboxes indicating selected values.
- Display selected values in a compact, responsive format.
- Highlight selected options in the dropdown.
- Clear all selections using the "Clear all" option.
- Support configurable labels and empty-state text.
- Support outlined, filled, and standard MUI variants.
- Control selected values through component props.
- Adapt the selection display to the available width.
- Support Diamond Design System light and dark themes.
- Remain independent of GraphQL, Apollo, Relay, and React Router.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `label` | `string` | Optional dropdown label. |
| `emptyLabel` | `string` | Optional text displayed when no values are selected. Defaults to "All". |
| `filterValues` | `string[]` | Available values displayed in the dropdown. |
| `selectedValues` | `string[]` | Currently selected values, controlled by the parent component. |
| `onChange` | `(selectedValues: string[]) => void` | Called when values are selected, deselected, or cleared. |
| `variant` | `"outlined" \| "filled" \| "standard"` | Optional MUI Select variant. Defaults to "outlined". |

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
      emptyLabel="All science groups"
      filterValues={scienceGroups}
      selectedValues={selectedScienceGroups}
      onChange={setSelectedScienceGroups}
      variant="outlined"
    />
  );
}
```

## Selection behaviour

The dropdown supports multiple selections.

Each option includes a checkbox indicating whether it is selected.

Selected options are also highlighted when the dropdown is opened.

Clicking a selected option again deselects it.

### Responsive selection display

The closed dropdown displays as many selected values as fit within
the available width.

If additional values cannot fit, the component displays the number
of remaining selections using the "+N more" format.

For example:

| Selected values | Possible display |
| --- | --- |
| None | All science groups |
| MX | MX |
| MX, Imaging and Microscopy | MX +1 more |
| MX, Imaging and Microscopy, Spectroscopy | MX +2 more |
| Four selected values | MX +3 more |

The exact display depends on the available width and the length
of the selected values.

When sufficient space is available, multiple values may be displayed
together, separated by commas.

If no selected value fits, the component displays only the count,
such as "+3 more".

The component uses ResizeObserver to detect changes in the available
width and adjust the display accordingly.

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
selectedValues={selectedScienceGroups}
```

When the user changes the selection, the component calls:

```tsx
onChange(updatedSelection);
```

The parent updates its state and React re-renders the component
with the new selected values.

An empty `selectedValues` array represents no selection.

## Styling

The component uses Material UI Select and supports three variants:

| Variant | Appearance |
| --- | --- |
| `outlined` | Select field with an outline. Default variant. |
| `filled` | Select field with a filled background and underline. |
| `standard` | Minimal Select field with an underline. |

The variants change the visual appearance without changing
the filtering behaviour.

The component occupies the full width of its parent container.

Its height and appearance depend on the selected MUI variant
and the active Diamond Design System theme.

The component uses semantic theme roles including:

- `background.paper` for the dropdown surface.
- `text.primary` for text and dropdown icons.

These roles allow the component to adapt to light and dark modes
without hardcoded colour values.

## Accessibility

The component uses React's `useId()` to generate unique IDs
for each instance.

This allows multiple filters to appear on the same page without
duplicate HTML IDs.

When a label is provided, it is associated with the Select control.

When no label is provided, the component uses the accessible
name "Filter values".

## Data handling

The component only provides the user interface for selecting filters.

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
- Displaying checkbox selection states.
- Displaying selected values.
- Clearing all selections.
- Updating the selection through props.
- Handling an empty options list.
- Generating unique IDs for multiple component instances.

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
- Different MUI variants, where provided.

Run Storybook:

`pnpm storybook`

The stories can use the Diamond Design System theme to demonstrate
the component in light and dark modes.

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
