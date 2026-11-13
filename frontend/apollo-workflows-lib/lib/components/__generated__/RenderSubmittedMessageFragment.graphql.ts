/**
 * @generated SignedSource<<092178d92bbea4830950c1f3741f9248>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type RenderSubmittedMessageFragment$data = {
  readonly id: string;
  readonly status: {
    readonly __typename: string;
  } | null | undefined;
  readonly " $fragmentType": "RenderSubmittedMessageFragment";
};
export type RenderSubmittedMessageFragment$key = {
  readonly " $data"?: RenderSubmittedMessageFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"RenderSubmittedMessageFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "RenderSubmittedMessageFragment",
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
  "type": "Workflow",
  "abstractKey": null
};

(node as any).hash = "2377f015ae5f3c8ca3bb655a30605609";

export default node;
