/**
 * @generated SignedSource<<98a873586d733aa4fc95fdf47d2a36f6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type WorkflowLabelSelectorOperator = "DOES_NOT_EXIST" | "EQ" | "EXISTS" | "IN" | "NE" | "NOT_IN" | "%future added value";
export type VisitInput = {
  number: number;
  proposalCode: string;
  proposalNumber: number;
};
export type WorkflowFilter = {
  annotations?: ReadonlyArray<WorkflowAnnotationFilter> | null | undefined;
  creator?: any | null | undefined;
  labelSelectors?: ReadonlyArray<LabelSelector> | null | undefined;
  parameters?: ReadonlyArray<WorkflowParameterFilter> | null | undefined;
  submittedTime?: DatetimeOperatorInput | null | undefined;
  template?: any | null | undefined;
  workflowStatusFilter?: WorkflowStatusFilter | null | undefined;
};
export type WorkflowStatusFilter = {
  error?: boolean;
  failed?: boolean;
  pending?: boolean;
  running?: boolean;
  succeeded?: boolean;
};
export type LabelSelector = {
  key: string;
  operator: WorkflowLabelSelectorOperator;
  values?: ReadonlyArray<string> | null | undefined;
};
export type WorkflowParameterFilter = {
  parameterName: string;
  value: string;
};
export type WorkflowAnnotationFilter = {
  key: string;
  value: string;
};
export type DatetimeOperatorInput = {
  gt?: string | null | undefined;
  lt?: string | null | undefined;
};
export type WorkflowsListViewQuery$variables = {
  cursor?: string | null | undefined;
  filter?: WorkflowFilter | null | undefined;
  limit?: number | null | undefined;
  visit: VisitInput;
};
export type WorkflowsListViewQuery$data = {
  readonly workflows: {
    readonly nodes: ReadonlyArray<{
      readonly name: string;
    }>;
    readonly pageInfo: {
      readonly endCursor: string | null | undefined;
      readonly hasNextPage: boolean;
    };
    readonly " $fragmentSpreads": FragmentRefs<"WorkflowsContentFragment">;
  };
};
export type WorkflowsListViewQuery = {
  response: WorkflowsListViewQuery$data;
  variables: WorkflowsListViewQuery$variables;
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
  "name": "filter"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "limit"
},
v3 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "visit"
},
v4 = [
  {
    "kind": "Variable",
    "name": "cursor",
    "variableName": "cursor"
  },
  {
    "kind": "Variable",
    "name": "filter",
    "variableName": "filter"
  },
  {
    "kind": "Variable",
    "name": "limit",
    "variableName": "limit"
  },
  {
    "kind": "Variable",
    "name": "visit",
    "variableName": "visit"
  }
],
v5 = {
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
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v8 = [
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
      (v7/*: any*/),
      (v6/*: any*/),
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
          (v6/*: any*/),
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
      (v1/*: any*/),
      (v2/*: any*/),
      (v3/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "WorkflowsListViewQuery",
    "selections": [
      {
        "alias": null,
        "args": (v4/*: any*/),
        "concreteType": "WorkflowConnection",
        "kind": "LinkedField",
        "name": "workflows",
        "plural": false,
        "selections": [
          (v5/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "Workflow",
            "kind": "LinkedField",
            "name": "nodes",
            "plural": true,
            "selections": [
              (v6/*: any*/)
            ],
            "storageKey": null
          },
          {
            "args": null,
            "kind": "FragmentSpread",
            "name": "WorkflowsContentFragment"
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
    "argumentDefinitions": [
      (v3/*: any*/),
      (v2/*: any*/),
      (v0/*: any*/),
      (v1/*: any*/)
    ],
    "kind": "Operation",
    "name": "WorkflowsListViewQuery",
    "selections": [
      {
        "alias": null,
        "args": (v4/*: any*/),
        "concreteType": "WorkflowConnection",
        "kind": "LinkedField",
        "name": "workflows",
        "plural": false,
        "selections": [
          (v5/*: any*/),
          {
            "alias": null,
            "args": null,
            "concreteType": "Workflow",
            "kind": "LinkedField",
            "name": "nodes",
            "plural": true,
            "selections": [
              (v6/*: any*/),
              (v7/*: any*/),
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
              },
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
                  },
                  {
                    "kind": "InlineFragment",
                    "selections": (v8/*: any*/),
                    "type": "WorkflowRunningStatus",
                    "abstractKey": null
                  },
                  {
                    "kind": "InlineFragment",
                    "selections": (v8/*: any*/),
                    "type": "WorkflowSucceededStatus",
                    "abstractKey": null
                  },
                  {
                    "kind": "InlineFragment",
                    "selections": (v8/*: any*/),
                    "type": "WorkflowFailedStatus",
                    "abstractKey": null
                  },
                  {
                    "kind": "InlineFragment",
                    "selections": (v8/*: any*/),
                    "type": "WorkflowErroredStatus",
                    "abstractKey": null
                  }
                ],
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
    "cacheID": "ae8df848c83696f4d4636576124a3b66",
    "id": null,
    "metadata": {},
    "name": "WorkflowsListViewQuery",
    "operationKind": "query",
    "text": "query WorkflowsListViewQuery(\n  $visit: VisitInput!\n  $limit: Int\n  $cursor: String\n  $filter: WorkflowFilter\n) {\n  workflows(visit: $visit, limit: $limit, cursor: $cursor, filter: $filter) {\n    pageInfo {\n      hasNextPage\n      endCursor\n    }\n    nodes {\n      name\n      id\n    }\n    ...WorkflowsContentFragment\n  }\n}\n\nfragment BaseWorkflowRelayFragment on Workflow {\n  name\n  id\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  creator {\n    creatorId\n  }\n  status {\n    __typename\n    ... on WorkflowRunningStatus {\n      startTime\n    }\n    ... on WorkflowSucceededStatus {\n      startTime\n    }\n    ... on WorkflowFailedStatus {\n      startTime\n    }\n    ... on WorkflowErroredStatus {\n      startTime\n    }\n  }\n  ...WorkflowTasksFragment\n}\n\nfragment WorkflowRelayFragment on Workflow {\n  ...BaseWorkflowRelayFragment\n  status {\n    __typename\n  }\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  name\n  id\n}\n\nfragment WorkflowTasksFragment on Workflow {\n  name\n  id\n  visit {\n    proposalCode\n    proposalNumber\n    number\n  }\n  status {\n    __typename\n    ... on WorkflowRunningStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowSucceededStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowFailedStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n    ... on WorkflowErroredStatus {\n      tasks {\n        id\n        name\n        status\n        depends\n        stepType\n        artifacts {\n          name\n          url\n          mimeType\n        }\n      }\n    }\n  }\n}\n\nfragment WorkflowsContentFragment on WorkflowConnection {\n  pageInfo {\n    hasNextPage\n    endCursor\n  }\n  nodes {\n    ...WorkflowRelayFragment\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "5160bd996de73394aa2a68b2e344ab3b";

export default node;
