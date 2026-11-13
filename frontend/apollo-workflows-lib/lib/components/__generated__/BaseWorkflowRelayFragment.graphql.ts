/**
 * @generated SignedSource<<b710d425081a59e2dea4551e8abfc568>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type BaseWorkflowRelayFragment$data = {
  readonly creator: {
    readonly creatorId: string;
  };
  readonly id: string;
  readonly name: string;
  readonly status: {
    readonly __typename: "WorkflowErroredStatus";
    readonly startTime: string;
  } | {
    readonly __typename: "WorkflowFailedStatus";
    readonly startTime: string;
  } | {
    readonly __typename: "WorkflowRunningStatus";
    readonly startTime: string;
  } | {
    readonly __typename: "WorkflowSucceededStatus";
    readonly startTime: string;
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
  readonly " $fragmentSpreads": FragmentRefs<"WorkflowTasksFragment">;
  readonly " $fragmentType": "BaseWorkflowRelayFragment";
};
export type BaseWorkflowRelayFragment$key = {
  readonly " $data"?: BaseWorkflowRelayFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"BaseWorkflowRelayFragment">;
};

const node: ReaderFragment = (function(){
var v0 = [
  {
    "alias": null,
    "args": null,
    "kind": "ScalarField",
    "name": "startTime",
    "storageKey": null
  }
];
return {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "BaseWorkflowRelayFragment",
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
      "name": "id",
      "storageKey": null
    },
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
          "selections": (v0/*: any*/),
          "type": "WorkflowRunningStatus",
          "abstractKey": null
        },
        {
          "kind": "InlineFragment",
          "selections": (v0/*: any*/),
          "type": "WorkflowSucceededStatus",
          "abstractKey": null
        },
        {
          "kind": "InlineFragment",
          "selections": (v0/*: any*/),
          "type": "WorkflowFailedStatus",
          "abstractKey": null
        },
        {
          "kind": "InlineFragment",
          "selections": (v0/*: any*/),
          "type": "WorkflowErroredStatus",
          "abstractKey": null
        }
      ],
      "storageKey": null
    },
    {
      "args": null,
      "kind": "FragmentSpread",
      "name": "WorkflowTasksFragment"
    }
  ],
  "type": "Workflow",
  "abstractKey": null
};
})();

(node as any).hash = "e8dcd102f3f7da322fe4fc7f2bea9d03";

export default node;
