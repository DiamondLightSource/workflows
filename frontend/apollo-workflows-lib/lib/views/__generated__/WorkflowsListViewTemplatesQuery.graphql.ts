/**
 * @generated SignedSource<<77e5c635fd42cf08d13632d1b15e46be>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type WorkflowsListViewTemplatesQuery$variables = Record<PropertyKey, never>;
export type WorkflowsListViewTemplatesQuery$data = {
  readonly workflowTemplates: {
    readonly " $fragmentSpreads": FragmentRefs<"WorkflowListFilterDrawerFragment">;
  };
};
export type WorkflowsListViewTemplatesQuery = {
  response: WorkflowsListViewTemplatesQuery$data;
  variables: WorkflowsListViewTemplatesQuery$variables;
};

const node: ConcreteRequest = {
  "fragment": {
    "argumentDefinitions": [],
    "kind": "Fragment",
    "metadata": null,
    "name": "WorkflowsListViewTemplatesQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "WorkflowTemplateConnection",
        "kind": "LinkedField",
        "name": "workflowTemplates",
        "plural": false,
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "WorkflowListFilterDrawerFragment"
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
    "argumentDefinitions": [],
    "kind": "Operation",
    "name": "WorkflowsListViewTemplatesQuery",
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "WorkflowTemplateConnection",
        "kind": "LinkedField",
        "name": "workflowTemplates",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "WorkflowTemplate",
            "kind": "LinkedField",
            "name": "nodes",
            "plural": true,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "name",
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
    "cacheID": "06f207c5de3c76e00e90d1d1c932a570",
    "id": null,
    "metadata": {},
    "name": "WorkflowsListViewTemplatesQuery",
    "operationKind": "query",
    "text": "query WorkflowsListViewTemplatesQuery {\n  workflowTemplates {\n    ...WorkflowListFilterDrawerFragment\n  }\n}\n\nfragment WorkflowListFilterDrawerFragment on WorkflowTemplateConnection {\n  nodes {\n    name\n  }\n}\n"
  }
};

(node as any).hash = "aae0caea7c263309c5e4273748b0c0a6";

export default node;
