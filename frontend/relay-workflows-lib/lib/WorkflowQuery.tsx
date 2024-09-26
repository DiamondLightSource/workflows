import { graphql, useLazyLoadQuery } from "react-relay";
import WorkflowRelay from "./components/WorkflowRelay";

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
      ...WorkflowRelayFragment
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
