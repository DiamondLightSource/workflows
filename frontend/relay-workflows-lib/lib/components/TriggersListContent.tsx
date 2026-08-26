import { useEffect } from "react";
import { PreloadedQuery, usePreloadedQuery } from "react-relay";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from "@mui/material";
import { PaginationControls } from "workflows-lib";
import { TriggersListViewQuery } from "../views/TriggersListView";
import type { TriggersListViewQuery as TriggersListViewQueryType } from "../views/__generated__/TriggersListViewQuery.graphql";

interface TriggersListContentProps {
  queryRef: PreloadedQuery<TriggersListViewQueryType>;
  currentPage: number;
  totalPages: number;
  selectedLimit: number;
  onPageChange: (
    page: number,
    endCursor?: string | null,
    hasNextPage?: boolean,
  ) => void;
  onLimitChange: (limit: number) => void;
  updatePageInfo: (hasNextPage: boolean, endCursor: string | null) => void;
}

export default function TriggersListContent({
  queryRef,
  currentPage,
  totalPages,
  selectedLimit,
  onPageChange,
  onLimitChange,
  updatePageInfo,
}: TriggersListContentProps) {
  const queryData = usePreloadedQuery(TriggersListViewQuery, queryRef);
  const { nodes, pageInfo } = queryData.triggers;

  useEffect(() => {
    updatePageInfo(pageInfo.hasNextPage, pageInfo.endCursor ?? null);
  }, [pageInfo.hasNextPage, pageInfo.endCursor, updatePageInfo]);

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Box sx={{ overflowY: "auto", maxHeight: "80vh", width: "100%" }}>
        {nodes.map((node, index) => (
          <Accordion key={index}>
            <AccordionSummary>
              <Box sx={{ display: "flex", flexBasis: 0, flexGrow: 5, gap: 2 }}>
                <Typography sx={{ fontWeight: "bold" }}>
                  {node.beamline}
                </Typography>
                <Typography>{node.name}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Created from the <i>{node.templateRef}</i> template
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => {
          onPageChange(page, pageInfo.endCursor, pageInfo.hasNextPage);
        }}
        selectedLimit={selectedLimit}
        onLimitChange={onLimitChange}
      />
    </Box>
  );
}
