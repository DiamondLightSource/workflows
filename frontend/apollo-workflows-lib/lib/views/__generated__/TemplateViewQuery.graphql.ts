/**
 * @generated SignedSource<<1722d1733c22f4cf936ece6e51eeb65d>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type TemplateViewQuery$variables = {
  templateName: string;
};
export type TemplateViewQuery$data = {
  readonly workflowTemplate: {
    readonly " $fragmentSpreads": FragmentRefs<"SubmissionFormFragment">;
  };
};
export type TemplateViewQuery = {
  response: TemplateViewQuery$data;
  variables: TemplateViewQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "templateName"
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "name",
    "variableName": "templateName"
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "TemplateViewQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*: any*/),
        "concreteType": "WorkflowTemplate",
        "kind": "LinkedField",
        "name": "workflowTemplate",
        "plural": false,
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "SubmissionFormFragment"
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "TemplateViewQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*: any*/),
        "concreteType": "WorkflowTemplate",
        "kind": "LinkedField",
        "name": "workflowTemplate",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "name",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "maintainer",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "title",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "description",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "arguments",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "uiSchema",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "repository",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "TemplateSource",
            "kind": "LinkedField",
            "name": "templateSource",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "repositoryUrl",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "path",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "targetRevision",
                "storageKey": null
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "892c0c5ae15449c0b5326eeb36efe69c",
    "id": null,
    "metadata": {},
    "name": "TemplateViewQuery",
    "operationKind": "query",
    "text": "query TemplateViewQuery(\n  $templateName: String!\n) {\n  workflowTemplate(name: $templateName) {\n    ...SubmissionFormFragment\n  }\n}\n\nfragment SubmissionFormFragment on WorkflowTemplate {\n  name\n  maintainer\n  title\n  description\n  arguments\n  uiSchema\n  repository\n  templateSource {\n    repositoryUrl\n    path\n    targetRevision\n  }\n}\n"
  }
};
})();

(node as any).hash = "4c702d8bfd75a5c741f542f85ff6f4a9";

export default node;
