import { workflowTemplateQuery } from "../apollo/queries/workflowTemplate";
import { submitWorkflowTemplateMutation } from "../apollo/mutations/submitWorkflowTemplate";

export const workflowTemplateMock = {
  request: {
    query: workflowTemplateQuery,
    variables: {
      name: "mock-template",
    },
  },
  result: {
    data: {
      workflowTemplate: {
        name: "mock-template",
        title: "Mock Template Title",
        maintainer: "workflows-test",
        description: "Mock workflows test template",
        arguments: {
          properties: {
            jpeg: {
              default: "true",
              type: "boolean",
            },
            jpg: {
              default: "true",
              type: "boolean",
            },
            png: {
              default: "true",
              type: "boolean",
            },
            tif: {
              default: "true",
              type: "boolean",
            },
            tiff: {
              default: "true",
              type: "boolean",
            },
          },
          required: ["jpeg", "jpg", "png", "tif", "tiff"],
          type: "object",
        },
        uiSchema: null,
        repository: "https://github.com/DiamondLightSource/workflows",
        templateSource: {
          repositoryUrl: "www.example.org",
          path: "/test",
          targetRevision: "HEAD",
        },
      },
    },
  },
};

export const submitWorkflowTemplateMock = {
  request: {
    query: submitWorkflowTemplateMutation,
    variables: () => true,
  },
  result: {
    data: {
      submitWorkflowTemplate: {
        id: "ks10000-1:mock-template-1a2b3:12345-abcde-67890",
      },
    },
  },
};
