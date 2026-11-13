/**
 * @generated SignedSource<<abce9f3fcc01b9d51b9b11100f9014ee>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type RetriggerWorkflowQuery$variables = {
  id: string;
};
export type RetriggerWorkflowQuery$data = {
  readonly workflowById: {
    readonly id: string;
    readonly templateRef: string | null | undefined;
  } | null | undefined;
};
export type RetriggerWorkflowQuery = {
  response: RetriggerWorkflowQuery$data;
  variables: RetriggerWorkflowQuery$variables;
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
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "id",
        "variableName": "id"
      }
    ],
    "concreteType": "Workflow",
    "kind": "LinkedField",
    "name": "workflowById",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "templateRef",
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
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "RetriggerWorkflowQuery",
    "selections": (v1/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "RetriggerWorkflowQuery",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "98c387c17f105a40e7951f5e6681fc93",
    "id": null,
    "metadata": {},
    "name": "RetriggerWorkflowQuery",
    "operationKind": "query",
    "text": "query RetriggerWorkflowQuery(\n  $id: ID!\n) {\n  workflowById(id: $id) {\n    templateRef\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "bf6262971a57e06655054e8d57ba2e55";

export default node;
