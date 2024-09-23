import { graphql, useLazyLoadQuery } from "react-relay";
import WorkflowRelay from "./components/WorkflowFragment";

const workflowQuery = graphql`
  query WorkflowQuery(
    $name: String!
    $proposalCode: String!
    $proposalNumber: Int!
    $visit: Int!
  ) {
    workflow(
      name: $name
      proposalCode: $proposalCode
      proposalNumber: $proposalNumber
      visit: $visit
    ) {
      ...WorkflowFragment
    }
  }
`;

const WorkflowQuery = () => {
  const data: any = useLazyLoadQuery(workflowQuery, {
    proposalCode: "mg",
    proposalNumber: 36964,
    name: "dag-nested-h46pc",
    visit: 1,
  });

  if (!data.workflow) {
    return <div>Loading...</div>;
  }

  return <WorkflowRelay workflow={data.workflow} />;
};

export default WorkflowQuery;
