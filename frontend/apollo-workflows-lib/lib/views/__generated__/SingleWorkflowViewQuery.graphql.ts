/**
 * @generated SignedSource<<1452ef73511b8c80e527de3fcad8ce53>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type SingleWorkflowViewQuery$variables = {
  id: string;
};
export type SingleWorkflowViewQuery$data = {
  readonly workflowById: {
    readonly status: {
      readonly __typename: string;
    } | null | undefined;
    readonly " $fragmentSpreads": FragmentRefs<"BaseSingleWorkflowViewFragment">;
  } | null | undefined;
};
export type SingleWorkflowViewQuery = {
  response: SingleWorkflowViewQuery$data;
  variables: SingleWorkflowViewQuery$variables;
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
],
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "__typename",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "message",
  "storageKey": null
},
v6 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "startTime",
    "storageKey": null
  },
  {
    "alias": null,
    "args": null,
    "concreteType": "Task",
    "kind": "LinkedField",
    "name": "tasks",
    "plural": true,
    "selections": [
      (v3/*: any*/),
      (v4/*: any*/),
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "status",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "depends",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "stepType",
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "Artifact",
        "kind": "LinkedField",
        "name": "artifacts",
        "plural": true,
        "selections": [
          (v4/*: any*/),
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "url",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "mimeType",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      (v5/*: any*/)
    ],
    "storageKey": null
  },
  (v5/*: any*/)
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "SingleWorkflowViewQuery",
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
            "concreteType": null,
            "kind": "LinkedField",
            "name": "status",
            "plural": false,
            "selections": [
              (v2/*: any*/)
            ],
            "storageKey": null
          },
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "BaseSingleWorkflowViewFragment"
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
    "name": "SingleWorkflowViewQuery",
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
            "concreteType": null,
            "kind": "LinkedField",
            "name": "status",
            "plural": false,
            "selections": [
              (v2/*: any*/),
              {
                "kind": "InlineFragment",
                "selections": (v6/*: any*/),
                "type": "WorkflowRunningStatus",
                "abstractKey": null
              },
              {
                "kind": "InlineFragment",
                "selections": (v6/*: any*/),
                "type": "WorkflowSucceededStatus",
                "abstractKey": null
              },
              {
                "kind": "InlineFragment",
                "selections": (v6/*: any*/),
                "type": "WorkflowFailedStatus",
                "abstractKey": null
              },
              {
                "kind": "InlineFragment",
                "selections": (v6/*: any*/),
                "type": "WorkflowErroredStatus",
                "abstractKey": null
              },
              {
                "kind": "InlineFragment",
                "selections": [
                  (v5/*: any*/)
                ],
                "type": "WorkflowPendingStatus",
                "abstractKey": null
              }
            ],
            "storageKey": null
          },
          (v4/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "Visit",
            "kind": "LinkedField",
            "name": "visit",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "proposalCode",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "proposalNumber",
                "storageKey": null
              },
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "number",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
          (v3/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "WorkflowCreator",
            "kind": "LinkedField",
            "name": "creator",
            "plural": false,
            "selections": [
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "creatorId",
                "storageKey": null
              }
            ],
            "storageKey": null
          },
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
            "name": "parameters",
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "14606b45d1bd8f40b32ba275ed6233fb",
    "id": null,
    "metadata": {},
    "name": "SingleWorkflowViewQuery",
    "operationKind": "query",
    "text": "query SingleWorkflowViewQuery(\n  $id: ID!\n) {\n  workflowById(id: $id) {\n    status {\n      __typename\n    }\n    ...BaseSingleWorkflowViewFragment\n    id\n  }\n}\n\nfragment BaseSingleWorkflowViewFragment on Workflow {\n  name\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  status {\n    __typename\n  }\n  ...BaseWorkflowRelayFragment\n  ...WorkflowRelayFragment\n  ...WorkflowInfoFragment\n  ...WorkflowTasksFragment\n}\n\nfragment BaseWorkflowRelayFragment on Workflow {\n  name\n  id\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  creator {\n    creatorId\n  }\n  status {\n    __typename\n    ... on WorkflowRunningStatus {\n      startTime\n    }\n    ... on WorkflowSucceededStatus {\n      startTime\n    }\n    ... on WorkflowFailedStatus {\n      startTime\n    }\n    ... on WorkflowErroredStatus {\n      startTime\n    }\n  }\n  ...WorkflowTasksFragment\n}\n\nfragment WorkflowInfoFragment on Workflow {\n  templateRef\n  parameters\n  status {\n    __typename\n    ... on WorkflowPendingStatus {\n      message\n    }\n    ... on WorkflowRunningStatus {\n      message\n      tasks {\n        name\n        message\n      }\n    }\n    ... on WorkflowSucceededStatus {\n      message\n      tasks {\n        name\n        message\n      }\n    }\n    ... on WorkflowFailedStatus {\n      message\n      tasks {\n        name\n        message\n      }\n    }\n    ... on WorkflowErroredStatus {\n      message\n      tasks {\n        name\n        message\n      }\n    }\n  }\n}\n\nfragment WorkflowRelayFragment on Workflow {\n  ...BaseWorkflowRelayFragment\n  status {\n    __typename\n  }\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  name\n  id\n}\n\nfragment WorkflowTasksFragment on Workflow {\n  name\n  id\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  status {\n    __typename\n    ... on WorkflowRunningStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowSucceededStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowFailedStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowErroredStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "f75fb2d38b0e62982cbc3909a3b32697";

export default node;
