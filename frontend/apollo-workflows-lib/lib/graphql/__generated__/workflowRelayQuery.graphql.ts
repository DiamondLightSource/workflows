/**
 * @generated SignedSource<<d60b3d6f50be71096ab0689d554b7a38>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type TaskStatus = "ERROR" | "FAILED" | "OMITTED" | "PENDING" | "RUNNING" | "SKIPPED" | "SUCCEEDED" | "%future added value";
export type VisitInput = {
  number: number;
  proposalCode: string;
  proposalNumber: number;
};
export type workflowRelayQuery$variables = {
  name: string;
  visit: VisitInput;
};
export type workflowRelayQuery$data = {
  readonly workflow: {
    readonly name: string;
    readonly parameters: any | null | undefined;
    readonly status: {
      readonly __typename: "WorkflowErroredStatus";
      readonly endTime: string;
      readonly message: string | null | undefined;
      readonly startTime: string;
      readonly tasks: ReadonlyArray<{
        readonly artifacts: ReadonlyArray<{
          readonly mimeType: string;
          readonly name: string;
          readonly url: any;
        }>;
        readonly dependencies: ReadonlyArray<string>;
        readonly depends: ReadonlyArray<string>;
        readonly id: string;
        readonly message: string | null | undefined;
        readonly name: string;
        readonly status: TaskStatus;
        readonly stepType: string;
      }>;
    } | {
      readonly __typename: "WorkflowFailedStatus";
      readonly endTime: string;
      readonly message: string | null | undefined;
      readonly startTime: string;
      readonly tasks: ReadonlyArray<{
        readonly artifacts: ReadonlyArray<{
          readonly mimeType: string;
          readonly name: string;
          readonly url: any;
        }>;
        readonly dependencies: ReadonlyArray<string>;
        readonly depends: ReadonlyArray<string>;
        readonly id: string;
        readonly message: string | null | undefined;
        readonly name: string;
        readonly status: TaskStatus;
        readonly stepType: string;
      }>;
    } | {
      readonly __typename: "WorkflowPendingStatus";
      readonly message: string | null | undefined;
    } | {
      readonly __typename: "WorkflowRunningStatus";
      readonly message: string | null | undefined;
      readonly startTime: string;
      readonly tasks: ReadonlyArray<{
        readonly artifacts: ReadonlyArray<{
          readonly mimeType: string;
          readonly name: string;
          readonly url: any;
        }>;
        readonly dependencies: ReadonlyArray<string>;
        readonly depends: ReadonlyArray<string>;
        readonly id: string;
        readonly message: string | null | undefined;
        readonly name: string;
        readonly status: TaskStatus;
        readonly stepType: string;
      }>;
    } | {
      readonly __typename: "WorkflowSucceededStatus";
      readonly endTime: string;
      readonly message: string | null | undefined;
      readonly startTime: string;
      readonly tasks: ReadonlyArray<{
        readonly artifacts: ReadonlyArray<{
          readonly mimeType: string;
          readonly name: string;
          readonly url: any;
        }>;
        readonly dependencies: ReadonlyArray<string>;
        readonly depends: ReadonlyArray<string>;
        readonly id: string;
        readonly message: string | null | undefined;
        readonly name: string;
        readonly status: TaskStatus;
        readonly stepType: string;
      }>;
    } | {
      // This will never be '%other', but we need some
      // value in case none of the concrete values match.
      readonly __typename: "%other";
    } | null | undefined;
    readonly templateRef: string | null | undefined;
    readonly visit: {
      readonly number: number;
      readonly proposalCode: string;
      readonly proposalNumber: number;
    };
  } | null | undefined;
};
export type workflowRelayQuery = {
  response: workflowRelayQuery$data;
  variables: workflowRelayQuery$variables;
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
  "name": "name",
  "storageKey": null
},
v4 = {
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
v5 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "templateRef",
  "storageKey": null
},
v6 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "parameters",
  "storageKey": null
},
v7 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "message",
  "storageKey": null
},
v8 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "startTime",
  "storageKey": null
},
v9 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v10 = {
  "alias": null,
  "args": null,
  "concreteType": "Task",
  "kind": "LinkedField",
  "name": "tasks",
  "plural": true,
  "selections": [
    (v9/*: any*/),
    (v3/*: any*/),
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "status",
      "storageKey": null
    },
    (v7/*: any*/),
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
      "name": "dependencies",
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
        (v3/*: any*/),
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
},
v11 = [
  (v8/*: any*/),
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "endTime",
    "storageKey": null
  },
  (v7/*: any*/),
  (v10/*: any*/)
],
v12 = {
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
      "selections": [
        (v7/*: any*/)
      ],
      "type": "WorkflowPendingStatus",
      "abstractKey": null
    },
    {
      "kind": "InlineFragment",
      "selections": [
        (v8/*: any*/),
        (v7/*: any*/),
        (v10/*: any*/)
      ],
      "type": "WorkflowRunningStatus",
      "abstractKey": null
    },
    {
      "kind": "InlineFragment",
      "selections": (v11/*: any*/),
      "type": "WorkflowSucceededStatus",
      "abstractKey": null
    },
    {
      "kind": "InlineFragment",
      "selections": (v11/*: any*/),
      "type": "WorkflowFailedStatus",
      "abstractKey": null
    },
    {
      "kind": "InlineFragment",
      "selections": (v11/*: any*/),
      "type": "WorkflowErroredStatus",
      "abstractKey": null
    }
  ],
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "workflowRelayQuery",
    "selections": [
      {
        "alias": null,
        "args": (v2/*: any*/),
        "concreteType": "Workflow",
        "kind": "LinkedField",
        "name": "workflow",
        "plural": false,
        "selections": [
          (v3/*: any*/),
          (v4/*: any*/),
          (v5/*: any*/),
          (v6/*: any*/),
          (v12/*: any*/)
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
      (v1/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "workflowRelayQuery",
    "selections": [
      {
        "alias": null,
        "args": (v2/*: any*/),
        "concreteType": "Workflow",
        "kind": "LinkedField",
        "name": "workflow",
        "plural": false,
        "selections": [
          (v3/*: any*/),
          (v4/*: any*/),
          (v5/*: any*/),
          (v6/*: any*/),
          (v12/*: any*/),
          (v9/*: any*/)
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "2d6c184cd46536ca82e753a30678f859",
    "id": null,
    "metadata": {},
    "name": "workflowRelayQuery",
    "operationKind": "query",
    "text": "query workflowRelayQuery(\n  $visit: VisitInput!\n  $name: String!\n) {\n  workflow(visit: $visit, name: $name) {\n    name\n    visit {\n      proposalCode\n      proposalNumber\n      number\n    }\n    templateRef\n    parameters\n    status {\n      __typename\n      ... on WorkflowPendingStatus {\n        message\n      }\n      ... on WorkflowRunningStatus {\n        startTime\n        message\n        tasks {\n          id\n          name\n          status\n          message\n          depends\n          dependencies\n          stepType\n          artifacts {\n            name\n            url\n            mimeType\n          }\n        }\n      }\n      ... on WorkflowSucceededStatus {\n        startTime\n        endTime\n        message\n        tasks {\n          id\n          name\n          status\n          message\n          depends\n          dependencies\n          stepType\n          artifacts {\n            name\n            url\n            mimeType\n          }\n        }\n      }\n      ... on WorkflowFailedStatus {\n        startTime\n        endTime\n        message\n        tasks {\n          id\n          name\n          status\n          message\n          depends\n          dependencies\n          stepType\n          artifacts {\n            name\n            url\n            mimeType\n          }\n        }\n      }\n      ... on WorkflowErroredStatus {\n        startTime\n        endTime\n        message\n        tasks {\n          id\n          name\n          status\n          message\n          depends\n          dependencies\n          stepType\n          artifacts {\n            name\n            url\n            mimeType\n          }\n        }\n      }\n    }\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "dfd325b015adca157f0b5aac914b4de9";

export default node;
