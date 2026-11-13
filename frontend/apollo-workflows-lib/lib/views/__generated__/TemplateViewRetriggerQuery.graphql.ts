/**
 * @generated SignedSource<<4653ce4d95f7c1f0a841b24e0af75ca8>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type TemplateViewRetriggerQuery$variables = {
  id: string;
};
export type TemplateViewRetriggerQuery$data = {
  readonly workflowById: {
    readonly " $fragmentSpreads": FragmentRefs<"SubmissionFormParametersFragment">;
  } | null | undefined;
};
export type TemplateViewRetriggerQuery = {
  response: TemplateViewRetriggerQuery$data;
  variables: TemplateViewRetriggerQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "id"
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "id",
    "variableName": "id"
  }
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "TemplateViewRetriggerQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*: any*/),
        "concreteType": "Workflow",
        "kind": "LinkedField",
        "name": "workflowById",
        "plural": false,
        "selections": [
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "SubmissionFormParametersFragment"
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
    "name": "TemplateViewRetriggerQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*: any*/),
        "concreteType": "Workflow",
        "kind": "LinkedField",
        "name": "workflowById",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "parameters",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "id",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "0d15cf605c8b8975e9cd5e2938b678c4",
    "id": null,
    "metadata": {},
    "name": "TemplateViewRetriggerQuery",
    "operationKind": "query",
    "text": "query TemplateViewRetriggerQuery(\n  $id: ID!\n) {\n  workflowById(id: $id) {\n    ...SubmissionFormParametersFragment\n    id\n  }\n}\n\nfragment SubmissionFormParametersFragment on Workflow {\n  parameters\n}\n"
  }
};
})();

(node as any).hash = "d668f592904d8db2a7737dcaa3e38156";

export default node;
