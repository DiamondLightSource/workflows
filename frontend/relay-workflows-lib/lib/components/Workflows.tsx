import { useState, useEffect, useRef, useCallback } from "react";
import { Box, CircularProgress, Typography, Button } from "@mui/material";
import { graphql } from "relay-runtime";
import { fetchQuery, useRelayEnvironment } from "react-relay/hooks";
import { useInView } from "react-intersection-observer";
import { Visit, WorkflowQueryFilter } from "workflows-lib";
import WorkflowRelay from "relay-workflows-lib/lib/components/WorkflowRelay";

import { WorkflowsQuery as WorkflowsQueryType } from "./__generated__/WorkflowsQuery.graphql";

const workflowsQuery = graphql`
  query WorkflowsQuery(
    $visit: VisitInput!
    $cursor: String
    $limit: Int!
    $filter: WorkflowFilter
  ) {
    workflows(visit: $visit, cursor: $cursor, limit: $limit, filter: $filter) {
      nodes {
        ...workflowFragment
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

export default function Workflows({
  visit,
  filter,
}: {
  visit: Visit;
  filter?: WorkflowQueryFilter;
}) {
  const environment = useRelayEnvironment();
  const [items, setItems] = useState<
    WorkflowsQueryType["response"]["workflows"]["nodes"]
  >([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedOnce = useRef(false);
  const { ref, inView } = useInView({ threshold: 0.1 });

  const loadMore = useCallback(async () => {
    if (!hasNextPage || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchQuery<WorkflowsQueryType>(
        environment,
        workflowsQuery,
        {
          visit,
          cursor,
          limit: 20,
          filter,
        },
      ).toPromise();

      const newItems = data?.workflows.nodes ?? [];
      const newCursor = data?.workflows.pageInfo.endCursor ?? null;
      const nextPage = data?.workflows.pageInfo.hasNextPage ?? false;

      if (newItems.length === 0 || newCursor === cursor) {
        setHasNextPage(false);
      } else {
        setItems((prev) => [...prev, ...newItems]);
        setCursor(newCursor);
        setHasNextPage(nextPage);
      }
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, [cursor, environment, filter, hasNextPage, loading, visit]);

  useEffect(() => {
    if ((inView && hasLoadedOnce.current) || !hasLoadedOnce.current) {
      void loadMore();
    }
  }, [inView, loadMore]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
      }}
    >
      {items.map((node, index) => (
        <WorkflowRelay key={index} workflow={node} workflowLink={true} />
      ))}

      {error && (
        <Box textAlign="center" py={2}>
          <Typography color="error" gutterBottom>
            Failed to load workflows. Please try again.
          </Typography>
          <Button variant="outlined" onClick={() => void loadMore}>
            Retry
          </Button>
        </Box>
      )}

      {hasNextPage && !error && (
        <Box ref={ref} textAlign="center" py={2}>
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}
