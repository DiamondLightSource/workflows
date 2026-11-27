import { useEffect, useRef, type ReactNode } from "react";
import { CircularProgress, Box } from "@mui/material";

export interface InfiniteScrollProps {
  children: ReactNode;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

const InfiniteScroll = ({
  children,
  hasMore,
  loading,
  onLoadMore,
}: InfiniteScrollProps) => {
  const observerRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const requestPendingRef = useRef(false);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  // Reset the request guard when loading finishes

  const wasLoadingRef = useRef(loading);

  useEffect(() => {
    if (wasLoadingRef.current && !loading) {
      requestPendingRef.current = false;
    }

    wasLoadingRef.current = loading;
  }, [loading]);

  // Observe the bottom of the list

  useEffect(() => {
    const element = observerRef.current;

    if (!element || !hasMore || loading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !requestPendingRef.current) {
          requestPendingRef.current = true;
          onLoadMoreRef.current();
        }
      },
      {
        rootMargin: "100px",
        threshold: 0,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading]);

  return (
    <Box>
      {children}

      {loading && (
        <Box
          role="status"
          aria-label="Loading more items"
          sx={{ display: "flex", justifyContent: "center", padding: 2 }}
        >
          <CircularProgress size={24} />
        </Box>
      )}

      {hasMore && <div ref={observerRef} aria-hidden="true" />}
    </Box>
  );
};

export default InfiniteScroll;
