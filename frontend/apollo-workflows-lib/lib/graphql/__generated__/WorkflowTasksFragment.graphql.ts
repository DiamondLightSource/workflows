/**
 * @generated SignedSource<<fd5fb4a8ea66b79d8a05df18fcc9a8c9>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
export type TaskStatus = "ERROR" | "FAILED" | "OMITTED" | "PENDING" | "RUNNING" | "SKIPPED" | "SUCCEEDED" | "%future added value";
import { FragmentRefs } from "relay-runtime";
export type WorkflowTasksFragment$data = {
  readonly id: string;
  readonly name: string;
  readonly status: {
    readonly __typename: "WorkflowErroredStatus";
    readonly tasks: ReadonlyArray<{
      readonly artifacts: ReadonlyArray<{
        readonly mimeType: string;
        readonly name: string;
        readonly url: any;
      }>;
      readonly depends: ReadonlyArray<string>;
      readonly id: string;
      readonly name: string;
      readonly status: TaskStatus;
      readonly stepType: string;
    }>;
  } | {
    readonly __typename: "WorkflowFailedStatus";
    readonly tasks: ReadonlyArray<{
      readonly artifacts: ReadonlyArray<{
        readonly mimeType: string;
        readonly name: string;
        readonly url: any;
      }>;
      readonly depends: ReadonlyArray<string>;
      readonly id: string;
      readonly name: string;
      readonly status: TaskStatus;
      readonly stepType: string;
    }>;
  } | {
    readonly __typename: "WorkflowRunningStatus";
    readonly tasks: ReadonlyArray<{
      readonly artifacts: ReadonlyArray<{
        readonly mimeType: string;
        readonly name: string;
        readonly url: any;
      }>;
      readonly depends: ReadonlyArray<string>;
      readonly id: string;
      readonly name: string;
      readonly status: TaskStatus;
      readonly stepType: string;
    }>;
  } | {
    readonly __typename: "WorkflowSucceededStatus";
    readonly tasks: ReadonlyArray<{
      readonly artifacts: ReadonlyArray<{
        readonly mimeType: string;
        readonly name: string;
        readonly url: any;
      }>;
      readonly depends: ReadonlyArray<string>;
      readonly id: string;
      readonly name: string;
      readonly status: TaskStatus;
      readonly stepType: string;
    }>;
  } | {
    // This will never be '%other', but we need some
    // value in case none of the concrete values match.
    readonly __typename: "%other";
  } | null | undefined;
  readonly visit: {
    readonly number: number;
    readonly proposalCode: string;
    readonly proposalNumber: number;
  };
  readonly " $fragmentType": "WorkflowTasksFragment";
};
export type WorkflowTasksFragment$key = {
  readonly " $data"?: WorkflowTasksFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"WorkflowTasksFragment">;
};

const node: ReaderFragment = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v1 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "id",
  "storageKey": null
},
v2 = [
  {
    "alias": null,
    "args": null,
    "concreteType": "Task",
    "kind": "LinkedField",
    "name": "tasks",
    "plural": true,
    "selections": [
      (v1/*: any*/),
      (v0/*: any*/),
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
          (v0/*: any*/),
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
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "WorkflowTasksFragment",
  "selections": [
    (v0/*: any*/),
    (v1/*: any*/),
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
          "selections": (v2/*: any*/),
          "type": "WorkflowRunningStatus",
          "abstractKey": null
        },
        {
          "kind": "InlineFragment",
          "selections": (v2/*: any*/),
          "type": "WorkflowSucceededStatus",
          "abstractKey": null
        },
        {
          "kind": "InlineFragment",
          "selections": (v2/*: any*/),
          "type": "WorkflowFailedStatus",
          "abstractKey": null
        },
        {
          "kind": "InlineFragment",
          "selections": (v2/*: any*/),
          "type": "WorkflowErroredStatus",
          "abstractKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "Workflow",
  "abstractKey": null
};
})();

(node as any).hash = "66f946dde9f9cd05d6ad65e40b64fcce";

export default node;
