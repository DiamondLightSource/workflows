import { useCallback, useState } from "react";

export function useServerSidePagination(initialLimit = 10) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<{
    [page: number]: string | null;
  }>({ 1: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLimit, setSelectedLimit] = useState(initialLimit);

  const updatePageInfo = useCallback(
    (hasNextPage: boolean, endCursor: string | null) => {
      const currentPageCount = Object.keys(cursorHistory).length;
      if (hasNextPage && !cursorHistory[currentPage + 1]) {
        setTotalPages(currentPageCount + 1);
      } else {
        setTotalPages(currentPageCount);
      }

      if (
        hasNextPage &&
        endCursor &&
        !Object.values(cursorHistory).includes(endCursor)
      ) {
        setCursorHistory((prev) => ({
          ...prev,
          [currentPage + 1]: endCursor,
        }));
      }
    },
    [cursorHistory, currentPage],
  );

  const goToPage = useCallback(
    (page: number, endCursor?: string | null, hasNextPage?: boolean) => {
      const targetCursor = cursorHistory[page];
      if (
        !targetCursor &&
        page === currentPage + 1 &&
        hasNextPage &&
        endCursor
      ) {
        setCursor(endCursor);
        setCurrentPage(page);
      } else {
        setCursor(targetCursor ?? null);
        setCurrentPage(page);
      }
    },
    [cursorHistory, currentPage],
  );

  const changeLimit = useCallback((limit: number) => {
    setSelectedLimit(limit);
    setCursorHistory({ 1: null });
    setCurrentPage(1);
    setCursor(null);
  }, []);

  return {
    cursor,
    setCursor,
    cursorHistory,
    setCursorHistory,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    selectedLimit,
    setSelectedLimit,
    updatePageInfo,
    goToPage,
    changeLimit,
  };
}
