/**
 * @generated SignedSource<<f075aa9b0dbdc64c28b6039a48a2d3f3>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type BaseSingleWorkflowViewFragment$data = {
  readonly name: string;
  readonly status: {
    readonly __typename: string;
  } | null | undefined;
  readonly visit: {
    readonly number: number;
    readonly proposalCode: string;
    readonly proposalNumber: number;
  };
  readonly " $fragmentSpreads": FragmentRefs<"BaseWorkflowRelayFragment" | "WorkflowInfoFragment" | "WorkflowRelayFragment" | "WorkflowTasksFragment">;
};
export type BaseSingleWorkflowViewFragment$key = {
  readonly " $data"?: BaseSingleWorkflowViewFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"BaseSingleWorkflowViewFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": {
    "mask": false
  },
  "name": "BaseSingleWorkflowViewFragment",
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
        }
      ],
      "storageKey": null
    },
    {
      "args": null,
      "kind": "FragmentSpread",
      "name": "BaseWorkflowRelayFragment"
    },
    {
      "args": null,
      "kind": "FragmentSpread",
      "name": "WorkflowRelayFragment"
    },
    {
      "args": null,
      "kind": "FragmentSpread",
      "name": "WorkflowInfoFragment"
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

(node as any).hash = "e5f8d5e539adb0e67e447654b1112052";

export default node;
