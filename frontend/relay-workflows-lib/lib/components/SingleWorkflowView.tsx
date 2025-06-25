import { useCallback, useEffect } from "react";
import { graphql, useQueryLoader } from "react-relay";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { SingleWorkflowViewQuery } from "./__generated__/SingleWorkflowViewQuery.graphql";
import SingleWorkflowContent from "./SingleWorkflowContent";

export const singleWorkflowViewQuery = graphql`
  query SingleWorkflowViewQuery($visit: VisitInput!, $workflowname: String!) {
    workflow(visit: $visit, name: $workflowname) {
      ...workflowFragment
    }
  }
`;

interface SingleWorkflowViewProps {
  visit: Visit;
  workflowName: string;
  taskname?: string;
}

const SingleWorkflowView: React.FC<SingleWorkflowViewProps> = ({
  visit,
  workflowName,
  taskname,
}) => {
  const [queryReference, loadQuery] = useQueryLoader<SingleWorkflowViewQuery>(
    singleWorkflowViewQuery,
  );

  const load = useCallback(() => {
    loadQuery(
      { visit, workflowname: workflowName },
      { fetchPolicy: "store-and-network" },
    );
  }, [visit, workflowName, loadQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      load();
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [load]);

  if (!queryReference) return <div>Loading workflow</div>;

  return (
    <SingleWorkflowContent
      queryReference={queryReference}
      taskname={taskname}
    />
  );
};

export default SingleWorkflowView;
