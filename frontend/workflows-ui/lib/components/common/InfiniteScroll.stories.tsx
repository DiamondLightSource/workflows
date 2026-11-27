import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Box, Paper, Typography } from "@mui/material";
import InfiniteScroll from "./InfiniteScroll";

const meta: Meta<typeof InfiniteScroll> = {
  title: "Components/InfiniteScroll",
  component: InfiniteScroll,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: `
A reusable React component that automatically requests more items when the user scrolls to the bottom of a list.

## Features

- Automatically detects when the bottom of a list becomes visible.
- Uses the browser's IntersectionObserver API.
- Supports loading indicators.
- Stops requesting pages when all items are loaded.
- Helps prevent duplicate pagination requests.
- Does not require pagination arrow buttons.
- Independent of Apollo, Relay, and GraphQL.
- Supports Diamond light and dark themes.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| children | ReactNode | Content displayed inside the component. |
| hasMore | boolean | Whether additional pages are available. |
| loading | boolean | Whether another page is currently loading. |
| onLoadMore | () => void | Callback invoked when more items should be fetched. |

## How It Works

1. The parent displays the first page of items.
2. InfiniteScroll observes an element at the bottom of the list.
3. When that element becomes visible, it calls onLoadMore.
4. The parent requests the next page.
5. The parent appends the new items.
6. The process repeats until hasMore becomes false.

## Apollo Integration

The component does not fetch data itself.

An Apollo parent component can use fetchMore to request additional pages.

The parent must manage:

- The currently loaded items.
- The loading state.
- Whether another page exists.
- Combining previously loaded and newly fetched results.

## Important

The Default story uses simulated template data.

No GraphQL backend is required.
        `,
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof InfiniteScroll>;

// Demonstration data only, not fetched from GraphQL.
const templateOptions = Array.from(
  { length: 50 },
  (_, index) => `Workflow Template ${String(index + 1)}`,
);

const PAGE_SIZE = 10;

const TemplateItems = ({ items }: { items: string[] }) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    {items.map((item) => (
      <Paper key={item} sx={{ padding: 2 }}>
        <Typography>{item}</Typography>
      </Paper>
    ))}
  </Box>
);

const InfiniteScrollDemo = () => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);

  const hasMore = visibleCount < templateOptions.length;

  const loadMore = () => {
    if (loading || !hasMore) {
      return;
    }

    setLoading(true);
  };

  useEffect(() => {
    if (!loading) {
      return;
    }

    // Simulate a network request.
    const timeout = setTimeout(() => {
      setVisibleCount((previous) =>
        Math.min(previous + PAGE_SIZE, templateOptions.length),
      );

      setLoading(false);
    }, 600);

    return () => {
      clearTimeout(timeout);
    };
  }, [loading]);

  return (
    <Box
      sx={{
        height: 400,
        overflowY: "auto",
        padding: 2,
      }}
    >
      <InfiniteScroll hasMore={hasMore} loading={loading} onLoadMore={loadMore}>
        <TemplateItems items={templateOptions.slice(0, visibleCount)} />
      </InfiniteScroll>
    </Box>
  );
};

export const Default: Story = {
  args: {
    hasMore: true,
    loading: false,
    onLoadMore: () => {},
  },
  render: () => <InfiniteScrollDemo />,
};

export const Loading: Story = {
  args: {
    hasMore: true,
    loading: true,
    onLoadMore: () => {},
  },
  render: (args) => (
    <InfiniteScroll {...args}>
      <TemplateItems items={templateOptions.slice(0, PAGE_SIZE)} />
    </InfiniteScroll>
  ),
};

export const AllLoaded: Story = {
  args: {
    hasMore: false,
    loading: false,
    onLoadMore: () => {},
  },
  render: (args) => (
    <InfiniteScroll {...args}>
      <TemplateItems items={templateOptions.slice(0, PAGE_SIZE)} />
    </InfiniteScroll>
  ),
};

export const Empty: Story = {
  args: {
    hasMore: false,
    loading: false,
    onLoadMore: () => {},
  },
  render: (args) => (
    <InfiniteScroll {...args}>
      <Typography>No templates available.</Typography>
    </InfiniteScroll>
  ),
};
