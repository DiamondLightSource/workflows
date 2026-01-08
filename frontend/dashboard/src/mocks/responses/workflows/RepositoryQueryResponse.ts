import { RepositoryLinkQuery$data } from "relay-workflows-lib/lib/query-components/__generated__/RepositoryLinkQuery.graphql";

export const RepositoryLinkQueryResponse: RepositoryLinkQuery$data = {
  workflowTemplate: {
    templateSource: {
      repositoryUrl: "https://github.com/DiamondLightSource/workflows",
      path: "examples/conventional-templates",
      targetRevision: "HEAD",
    },
  },
};

export const RepositoryLinkQueryResponseFallback: RepositoryLinkQuery$data = {
  workflowTemplate: {
    templateSource: null,
  },
};
