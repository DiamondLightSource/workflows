/**
 * @generated SignedSource<<154758ca7666a71ed32bf6d79a8f3f26>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type StopWorkflowMutation$variables = {
  id: string;
};
export type StopWorkflowMutation$data = {
  readonly stopWorkflow: {
    readonly id: string;
  };
};
export type StopWorkflowMutation = {
  response: StopWorkflowMutation$data;
  variables: StopWorkflowMutation$variables;
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
    "name": "stopWorkflow",
    "plural": false,
    "selections": [
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
    "name": "StopWorkflowMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "StopWorkflowMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "2eab472afcbebff6517c14b4d0506e3e",
    "id": null,
    "metadata": {},
    "name": "StopWorkflowMutation",
    "operationKind": "mutation",
    "text": "mutation StopWorkflowMutation(\n  $id: ID!\n) {\n  stopWorkflow(id: $id) {\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "e9abf073f0d18c33cfa9a6770df59238";

export default node;
