/**
 * @generated SignedSource<<de854e282b4bca5c3a69ae4d8257af64>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type VisitInput = {
  number: number;
  proposalCode: string;
  proposalNumber: number;
};
export type TaskLogViewerSubscription$variables = {
  taskId: string;
  visit: VisitInput;
  workflowName: string;
};
export type TaskLogViewerSubscription$data = {
  readonly logs: {
    readonly content: string;
    readonly podName: string;
  };
};
export type TaskLogViewerSubscription = {
  response: TaskLogViewerSubscription$data;
  variables: TaskLogViewerSubscription$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "taskId"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "visit"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "workflowName"
},
v3 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "taskId",
        "variableName": "taskId"
      },
      {
        "kind": "Variable",
        "name": "visit",
        "variableName": "visit"
      },
      {
        "kind": "Variable",
        "name": "workflowName",
        "variableName": "workflowName"
      }
    ],
    "concreteType": "LogEntry",
    "kind": "LinkedField",
    "name": "logs",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "content",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "podName",
        "storageKey": null
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "TaskLogViewerSubscription",
    "selections": (v3/*: any*/),
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*: any*/),
      (v2/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "TaskLogViewerSubscription",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "9f67cb417c867cf27186391cfaf2c99b",
    "id": null,
    "metadata": {},
    "name": "TaskLogViewerSubscription",
    "operationKind": "subscription",
    "text": "subscription TaskLogViewerSubscription(\n  $visit: VisitInput!\n  $workflowName: String!\n  $taskId: String!\n) {\n  logs(visit: $visit, workflowName: $workflowName, taskId: $taskId) {\n    content\n    podName\n  }\n}\n"
  }
};
})();

(node as any).hash = "c76298c7da9dac8f9f25f4770ff497fe";

export default node;
