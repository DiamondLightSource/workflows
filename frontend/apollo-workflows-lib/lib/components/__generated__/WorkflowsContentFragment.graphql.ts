/**
 * @generated SignedSource<<5cc5baee5cdb9e3e48ff712f7b9e415e>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type WorkflowsContentFragment$data = {
  readonly nodes: ReadonlyArray<{
    readonly id: string;
    readonly " $fragmentSpreads": FragmentRefs<"WorkflowRelayFragment">;
  }>;
  readonly pageInfo: {
    readonly endCursor: string | null | undefined;
    readonly hasNextPage: boolean;
  };
  readonly " $fragmentType": "WorkflowsContentFragment";
};
export type WorkflowsContentFragment$key = {
  readonly " $data"?: WorkflowsContentFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"WorkflowsContentFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "WorkflowsContentFragment",
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
      "concreteType": "Workflow",
      "kind": "LinkedField",
      "name": "nodes",
      "plural": true,
      "selections": [
        {
          "args": null,
          "kind": "FragmentSpread",
          "name": "WorkflowRelayFragment"
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
  ],
  "type": "WorkflowConnection",
  "abstractKey": null
};

(node as any).hash = "19a8d5e4fd5ea142c62e5821832bb7da";

export default node;
