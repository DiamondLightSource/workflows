/**
 * @generated SignedSource<<d6a4266cd5727af2524198a44bf375c9>>
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
export type SubscribeAndRenderSubscription$variables = {
  name: string;
  visit: VisitInput;
};
export type SubscribeAndRenderSubscription$data = {
  readonly workflow: {
    readonly " $fragmentSpreads": FragmentRefs<"RenderSubmittedMessageFragment">;
  };
};
export type SubscribeAndRenderSubscription = {
  response: SubscribeAndRenderSubscription$data;
  variables: SubscribeAndRenderSubscription$variables;
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
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "SubscribeAndRenderSubscription",
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
            "args": null,
            "kind": "FragmentSpread",
            "name": "RenderSubmittedMessageFragment"
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
    "name": "SubscribeAndRenderSubscription",
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
              {
                "alias": null,
                "args": null,
                "kind": "ScalarField",
                "name": "__typename",
                "storageKey": null
              }
            ],
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
    "cacheID": "b3157ff87fa43987dc7b3f0a7491f8d5",
    "id": null,
    "metadata": {},
    "name": "SubscribeAndRenderSubscription",
    "operationKind": "subscription",
    "text": "subscription SubscribeAndRenderSubscription(\n  $visit: VisitInput!\n  $name: String!\n) {\n  workflow(visit: $visit, name: $name) {\n    ...RenderSubmittedMessageFragment\n    id\n  }\n}\n\nfragment RenderSubmittedMessageFragment on Workflow {\n  status {\n    __typename\n  }\n  id\n}\n"
  }
};
})();

(node as any).hash = "d20767faae867c6169f867dcdd934dd1";

export default node;
