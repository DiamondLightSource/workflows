import { useLazyLoadQuery } from "react-relay";
import { graphql } from "relay-runtime";
import { GitHubNavigatorQuery as GitHubNavigatorQueryType } from "./__generated__/GitHubNavigatorQuery.graphql";
import { GitHubNavigator as GitHubNavigatorBase } from "workflows-lib";

const GitHubNavigatorQuery = graphql`
  query GitHubNavigatorQuery($name: String!) {
    workflowTemplate(name: $name) {
      repository
    }
  }
`;

const GitHubIconNavigator = ({
  templateRef,
  variant = "Icon",
}: {
  templateRef: string;
  variant?: "Icon" | "TextIcon";
}) => {
  const data = useLazyLoadQuery<GitHubNavigatorQueryType>(
    GitHubNavigatorQuery,
    {
      name: templateRef,
    },
  );
  const repository = data.workflowTemplate.repository;

  return <GitHubNavigatorBase repository={repository} variant={variant} />;
};

export default GitHubIconNavigator;
