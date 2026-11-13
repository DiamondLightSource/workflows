/**
 * @generated SignedSource<<4c9e768282cd32efd46f3cdd523c4c10>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RepositoryLinkQuery$variables = {
  name: string;
};
export type RepositoryLinkQuery$data = {
  readonly workflowTemplate: {
    readonly templateSource: {
      readonly path: string;
      readonly repositoryUrl: string;
      readonly targetRevision: string;
    } | null | undefined;
  };
};
export type RepositoryLinkQuery = {
  response: RepositoryLinkQuery$data;
  variables: RepositoryLinkQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "name"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "name",
        "variableName": "name"
      }
    ],
    "concreteType": "WorkflowTemplate",
    "kind": "LinkedField",
    "name": "workflowTemplate",
    "plural": false,
    "selections": [
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
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "RepositoryLinkQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "RepositoryLinkQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "9f06d9b05b1641b4c056f9350ae80ed7",
    "id": null,
    "metadata": {},
    "name": "RepositoryLinkQuery",
    "operationKind": "query",
    "text": "query RepositoryLinkQuery(\n  $name: String!\n) {\n  workflowTemplate(name: $name) {\n    templateSource {\n      repositoryUrl\n      path\n      targetRevision\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "28a1d204738169da3a6934bde4993f25";

export default node;
