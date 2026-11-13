/**
 * @generated SignedSource<<55fa38379f3dffba492b2e35e9e22301>>
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
export type LiveWorkflowRelaySubscription$variables = {
  name: string;
  visit: VisitInput;
};
export type LiveWorkflowRelaySubscription$data = {
  readonly workflow: {
    readonly status: {
      readonly __typename: string;
    } | null | undefined;
    readonly " $fragmentSpreads": FragmentRefs<"BaseWorkflowRelayFragment">;
  };
};
export type LiveWorkflowRelaySubscription = {
  response: LiveWorkflowRelaySubscription$data;
  variables: LiveWorkflowRelaySubscription$variables;
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
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "LiveWorkflowRelaySubscription",
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
            "name": "BaseWorkflowRelayFragment"
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
    "name": "LiveWorkflowRelaySubscription",
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
              }
            ],
            "storageKey": null
          },
          (v5/*: any*/),
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
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "c6a83e851c060a883cdec5cb24d5b1c2",
    "id": null,
    "metadata": {},
    "name": "LiveWorkflowRelaySubscription",
    "operationKind": "subscription",
    "text": "subscription LiveWorkflowRelaySubscription(\n  $visit: VisitInput!\n  $name: String!\n) {\n  workflow(visit: $visit, name: $name) {\n    status {\n      __typename\n    }\n    ...BaseWorkflowRelayFragment\n    id\n  }\n}\n\nfragment BaseWorkflowRelayFragment on Workflow {\n  name\n  id\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  creator {\n    creatorId\n  }\n  status {\n    __typename\n    ... on WorkflowRunningStatus {\n      startTime\n    }\n    ... on WorkflowSucceededStatus {\n      startTime\n    }\n    ... on WorkflowFailedStatus {\n      startTime\n    }\n    ... on WorkflowErroredStatus {\n      startTime\n    }\n  }\n  ...WorkflowTasksFragment\n}\n\nfragment WorkflowTasksFragment on Workflow {\n  name\n  id\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  status {\n    __typename\n    ... on WorkflowRunningStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowSucceededStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowFailedStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowErroredStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "32c5b53eecb71c38bd91e18fafb29f50";

export default node;
