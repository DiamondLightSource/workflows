import { useLazyLoadQuery } from "react-relay";
import { graphql } from "relay-runtime";
import { RepositoryLinkQuery as RepositoryLinkQueryType } from "./__generated__/RepositoryLinkQuery.graphql";
import { RepositoryLinkBase } from "workflows-lib";

const RepositoryLinkQuery = graphql`
  query RepositoryLinkQuery($name: String!) {
    workflowTemplate(name: $name) {
      templateSource {
        repositoryUrl
        path
        targetRevision
      }
    }
  }
`;

const RepositoryLink = ({
  variant = "Icon",
  templateRef,
}: {
  variant?: "Icon" | "TextIcon";
  templateRef: string;
}) => {
  const data = useLazyLoadQuery<RepositoryLinkQueryType>(RepositoryLinkQuery, {
    name: templateRef,
  });

  return (
    <RepositoryLinkBase
      repository={data.workflowTemplate.templateSource}
      variant={variant}
    />
  );
};

export default RepositoryLink;
