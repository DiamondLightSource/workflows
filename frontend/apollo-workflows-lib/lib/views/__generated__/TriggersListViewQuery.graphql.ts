/**
 * @generated SignedSource<<96e8271021efb0cfbe42d37ea7b218fd>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type TriggersListViewQuery$variables = {
  cursor?: string | null | undefined;
  limit?: number | null | undefined;
};
export type TriggersListViewQuery$data = {
  readonly triggers: {
    readonly nodes: ReadonlyArray<{
      readonly beamline: string | null | undefined;
      readonly creator: {
        readonly creatorId: string;
      };
      readonly enabled: boolean;
      readonly name: string | null | undefined;
      readonly templateRef: string | null | undefined;
      readonly visit: string;
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
  };
};
export type TriggersListViewQuery = {
  response: TriggersListViewQuery$data;
  variables: TriggersListViewQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "cursor"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "limit"
},
v2 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "cursor",
        "variableName": "cursor"
      },
      {
        "kind": "Variable",
        "name": "limit",
        "variableName": "limit"
      }
    ],
    "concreteType": "TriggerConnection",
    "kind": "LinkedField",
    "name": "triggers",
    "plural": false,
    "selections": [
      {
        "alias": null,
        "args": null,
        "concreteType": "PageInfo",
        "kind": "LinkedField",
        "name": "pageInfo",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "hasNextPage",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "endCursor",
            "storageKey": null
          }
        ],
        "storageKey": null
      },
      {
        "alias": null,
        "args": null,
        "concreteType": "Trigger",
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
          },
          {
            "alias": null,
            "args": null,
            "kind": "ScalarField",
            "name": "beamline",
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
            "name": "enabled",
            "storageKey": null
          },
          {
            "alias": null,
            "args": null,
            "concreteType": "TriggerCreator",
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
            "name": "visit",
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
    "name": "TriggersListViewQuery",
    "selections": (v2/*: any*/),
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "TriggersListViewQuery",
    "selections": (v2/*: any*/)
  },
  "params": {
    "cacheID": "2931bb523a7b2f3b62b11f47c4181b77",
    "id": null,
    "metadata": {},
    "name": "TriggersListViewQuery",
    "operationKind": "query",
    "text": "query TriggersListViewQuery(\n  $limit: Int\n  $cursor: String\n) {\n  triggers(limit: $limit, cursor: $cursor) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      name\n      beamline\n      templateRef\n      enabled\n      creator {\n        creatorId\n      }\n      visit\n    }\n  }\n}\n"
  }
};
})();

(node as any).hash = "a67a490aa92aa9428e64adabcf9b6a38";

export default node;
