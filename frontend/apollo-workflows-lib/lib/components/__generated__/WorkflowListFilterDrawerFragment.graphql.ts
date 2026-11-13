/**
 * @generated SignedSource<<bad2bf47e5b2567ab05d26bcfe5aef4c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type WorkflowListFilterDrawerFragment$data = {
  readonly nodes: ReadonlyArray<{
    readonly name: string;
  }>;
  readonly " $fragmentType": "WorkflowListFilterDrawerFragment";
};
export type WorkflowListFilterDrawerFragment$key = {
  readonly " $data"?: WorkflowListFilterDrawerFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"WorkflowListFilterDrawerFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "WorkflowListFilterDrawerFragment",
  "selections": [
    {
      "alias": null,
      "args": null,
      "concreteType": "WorkflowTemplate",
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
        }
      ],
      "storageKey": null
    }
  ],
  "type": "WorkflowTemplateConnection",
  "abstractKey": null
};

(node as any).hash = "87ac93035fe35b3eccaa1336e8752767";

export default node;
