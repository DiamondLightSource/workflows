import { Suspense } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Container, Box, Typography } from "@mui/material";
import { Breadcrumbs } from "@diamondlightsource/sci-react-ui";
import { WorkflowsNavbar, WorkflowTemplatesFilter } from "workflows-lib";
import TemplatesListView from "relay-workflows-lib/lib/views/TemplatesListView";
import WorkflowErrorBoundaryWithRetry from "workflows-lib/lib/components/workflow/WorkflowErrorBoundaryWithRetry";
import { getFilterFromParams } from "./utils";

const TemplatesListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleSetFilter = (newFilter: WorkflowTemplatesFilter) => {
    if (newFilter.scienceGroup?.length) {
      searchParams.set("group", newFilter.scienceGroup.join());
    } else {
      searchParams.delete("group");
    }
    setSearchParams(searchParams);
  };

  return (
    <>
      <WorkflowsNavbar />
      <Breadcrumbs path={window.location.pathname} linkComponent={Link} />
      <Container maxWidth="md">
        <WorkflowErrorBoundaryWithRetry>
          {({ fetchKey }) => (
            <Suspense
              key={JSON.stringify(fetchKey)}
              fallback={
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Loading Templates...
                  </Typography>
                </Box>
              }
            >
              <Box mt={2} mb={2}>
                <TemplatesListView
                  filter={getFilterFromParams(searchParams)}
                  setFilter={handleSetFilter}
                />
              </Box>
            </Suspense>
          )}
        </WorkflowErrorBoundaryWithRetry>
      </Container>
    </>
  );
};

export default TemplatesListPage;
