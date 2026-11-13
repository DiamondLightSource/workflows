/**
 * @generated SignedSource<<18d2062d504a1571d05b1f5b081da97f>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type WorkflowInfoFragment$data = {
  readonly parameters: any | null | undefined;
  readonly status: {
    readonly __typename: "WorkflowErroredStatus";
    readonly message: string | null | undefined;
    readonly tasks: ReadonlyArray<{
      readonly message: string | null | undefined;
      readonly name: string;
    }>;
  } | {
    readonly __typename: "WorkflowFailedStatus";
    readonly message: string | null | undefined;
    readonly tasks: ReadonlyArray<{
      readonly message: string | null | undefined;
      readonly name: string;
    }>;
  } | {
    readonly __typename: "WorkflowPendingStatus";
    readonly message: string | null | undefined;
  } | {
    readonly __typename: "WorkflowRunningStatus";
    readonly message: string | null | undefined;
    readonly tasks: ReadonlyArray<{
      readonly message: string | null | undefined;
      readonly name: string;
    }>;
  } | {
    readonly __typename: "WorkflowSucceededStatus";
    readonly message: string | null | undefined;
    readonly tasks: ReadonlyArray<{
      readonly message: string | null | undefined;
      readonly name: string;
    }>;
  } | {
    // This will never be '%other', but we need some
    // value in case none of the concrete values match.
    readonly __typename: "%other";
  } | null | undefined;
  readonly templateRef: string | null | undefined;
  readonly " $fragmentType": "WorkflowInfoFragment";
};
export type WorkflowInfoFragment$key = {
  readonly " $data"?: WorkflowInfoFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"WorkflowInfoFragment">;
};

const node: ReaderFragment = (function(){
var v0 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "message",
  "storageKey": null
},
v1 = [
  (v0/*: any*/),
  {
    "alias": null,
    "args": null,
    "concreteType": "Task",
    "kind": "LinkedField",
    "name": "tasks",
    "plural": true,
    "selections": [
      {
        "alias": null,
        "args": null,
        "kind": "ScalarField",
        "name": "name",
        "storageKey": null
      },
      (v0/*: any*/)
    ],
    "storageKey": null
  }
];
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "WorkflowInfoFragment",
  "selections": [
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
          "selections": [
            (v0/*: any*/)
          ],
          "type": "WorkflowPendingStatus",
          "abstractKey": null
        },
        {
          "kind": "InlineFragment",
          "selections": (v1/*: any*/),
          "type": "WorkflowRunningStatus",
          "abstractKey": null
        },
        {
          "kind": "InlineFragment",
          "selections": (v1/*: any*/),
          "type": "WorkflowSucceededStatus",
          "abstractKey": null
        },
        {
          "kind": "InlineFragment",
          "selections": (v1/*: any*/),
          "type": "WorkflowFailedStatus",
          "abstractKey": null
        },
        {
          "kind": "InlineFragment",
          "selections": (v1/*: any*/),
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

(node as any).hash = "5de22faa81e3fe4803bab145e4701251";

export default node;
