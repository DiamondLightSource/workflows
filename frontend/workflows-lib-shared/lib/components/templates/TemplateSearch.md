# TemplateSearch

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
| `label` | `string` | Optional label. Defaults to "Search templates". |
| `placeholder` | `string` | Optional placeholder text. |
| `value` | `string` | Current search text, controlled by the parent. |
| `onChange` | `(value: string) => void` | Called when the search text changes or is cleared. |

## Example

```tsx
import { useState } from "react";
import { TemplateSearch } from "@diamondlightsource/workflows-lib-shared";

export function TemplateList() {
  const [search, setSearch] = useState("");

  return (
    <TemplateSearch
      label="Search templates"
      placeholder="Enter template name"
      value={search}
      onChange={setSearch}
    />
  );
}
```

## Controlled State

TemplateSearch is a controlled component.

The parent owns the search value and passes it through the `value` prop.

When the user types, the component calls `onChange(newValue)`.

The parent updates its state and React re-renders the component.

## Clear Search

The clear button calls `onChange("")`.

When the search value is empty, the clear button is disabled.



## Testing

Tests are located at:

`tests/components/templates/TemplateSearch.test.tsx`

Run:

`pnpm exec vitest run tests/components/templates/TemplateSearch.test.tsx`

## Storybook

Stories are located at:

`stories/TemplateSearch.stories.tsx`

Run Storybook:

`./node_modules/.bin/storybook dev -p 6006 --config-dir .storybook`

The stories demonstrate default, prefilled, and customised search fields in light and dark modes.
