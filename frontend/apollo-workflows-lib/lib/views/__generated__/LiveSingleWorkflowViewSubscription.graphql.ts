/**
 * @generated SignedSource<<f6949c72c6c43606bbbb8daaee2933ca>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type VisitInput = {
  number: number;
  proposalCode: string;
  proposalNumber: number;
};
export type LiveSingleWorkflowViewSubscription$variables = {
  name: string;
  visit: VisitInput;
};
export type LiveSingleWorkflowViewSubscription$data = {
  readonly workflow: {
    readonly status: {
      readonly __typename: string;
    } | null | undefined;
    readonly " $fragmentSpreads": FragmentRefs<"BaseSingleWorkflowViewFragment">;
  };
};
export type LiveSingleWorkflowViewSubscription = {
  response: LiveSingleWorkflowViewSubscription$data;
  variables: LiveSingleWorkflowViewSubscription$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "name"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "visit"
},
v2 = [
  {
    "kind": "Variable",
    "name": "name",
    "variableName": "name"
  },
  {
    "kind": "Variable",
    "name": "visit",
    "variableName": "visit"
  }
],
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "__typename",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "message",
  "storageKey": null
},
v7 = [
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
      (v4/*: any*/),
      (v5/*: any*/),
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
          (v5/*: any*/),
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
      (v6/*: any*/)
    ],
    "storageKey": null
  },
  (v6/*: any*/)
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "LiveSingleWorkflowViewSubscription",
    "selections": [
      {
        "alias": null,
        "args": (v2/*: any*/),
        "concreteType": "Workflow",
        "kind": "LinkedField",
        "name": "workflow",
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
              (v3/*: any*/)
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
    "type": "Subscription",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "LiveSingleWorkflowViewSubscription",
    "selections": [
      {
        "alias": null,
        "args": (v2/*: any*/),
        "concreteType": "Workflow",
        "kind": "LinkedField",
        "name": "workflow",
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
              (v3/*: any*/),
              {
                "kind": "InlineFragment",
                "selections": (v7/*: any*/),
                "type": "WorkflowRunningStatus",
                "abstractKey": null
              },
              {
                "kind": "InlineFragment",
                "selections": (v7/*: any*/),
                "type": "WorkflowSucceededStatus",
                "abstractKey": null
              },
              {
                "kind": "InlineFragment",
                "selections": (v7/*: any*/),
                "type": "WorkflowFailedStatus",
                "abstractKey": null
              },
              {
                "kind": "InlineFragment",
                "selections": (v7/*: any*/),
                "type": "WorkflowErroredStatus",
                "abstractKey": null
              },
              {
                "kind": "InlineFragment",
                "selections": [
                  (v6/*: any*/)
                ],
                "type": "WorkflowPendingStatus",
                "abstractKey": null
              }
            ],
            "storageKey": null
          },
          (v5/*: any*/),
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
          (v4/*: any*/),
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
    "cacheID": "074df3e2351c4893c75c5f84464831e3",
    "id": null,
    "metadata": {},
    "name": "LiveSingleWorkflowViewSubscription",
    "operationKind": "subscription",
    "text": "subscription LiveSingleWorkflowViewSubscription(\n  $visit: VisitInput!\n  $name: String!\n) {\n  workflow(visit: $visit, name: $name) {\n    status {\n      __typename\n    }\n    ...BaseSingleWorkflowViewFragment\n    id\n  }\n}\n\nfragment BaseSingleWorkflowViewFragment on Workflow {\n  name\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  status {\n    __typename\n  }\n  ...BaseWorkflowRelayFragment\n  ...WorkflowRelayFragment\n  ...WorkflowInfoFragment\n  ...WorkflowTasksFragment\n}\n\nfragment BaseWorkflowRelayFragment on Workflow {\n  name\n  id\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  creator {\n    creatorId\n  }\n  status {\n    __typename\n    ... on WorkflowRunningStatus {\n      startTime\n    }\n    ... on WorkflowSucceededStatus {\n      startTime\n    }\n    ... on WorkflowFailedStatus {\n      startTime\n    }\n    ... on WorkflowErroredStatus {\n      startTime\n    }\n  }\n  ...WorkflowTasksFragment\n}\n\nfragment WorkflowInfoFragment on Workflow {\n  templateRef\n  parameters\n  status {\n    __typename\n    ... on WorkflowPendingStatus {\n      message\n    }\n    ... on WorkflowRunningStatus {\n      message\n      tasks {\n        name\n        message\n      }\n    }\n    ... on WorkflowSucceededStatus {\n      message\n      tasks {\n        name\n        message\n      }\n    }\n    ... on WorkflowFailedStatus {\n      message\n      tasks {\n        name\n        message\n      }\n    }\n    ... on WorkflowErroredStatus {\n      message\n      tasks {\n        name\n        message\n      }\n    }\n  }\n}\n\nfragment WorkflowRelayFragment on Workflow {\n  ...BaseWorkflowRelayFragment\n  status {\n    __typename\n  }\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  name\n  id\n}\n\nfragment WorkflowTasksFragment on Workflow {\n  name\n  id\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  status {\n    __typename\n    ... on WorkflowRunningStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowSucceededStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowFailedStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowErroredStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "abdd4cc39031bc6795d3666ee68fa71f";

export default node;
