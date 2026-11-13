/**
 * @generated SignedSource<<4b0ea3c79ebcfb1b3df5ac09b539439a>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type WorkflowRelayFragment$data = {
  readonly id: string;
  readonly name: string;
  readonly status: {
    readonly __typename: string;
  } | null | undefined;
  readonly visit: {
    readonly number: number;
    readonly proposalCode: string;
    readonly proposalNumber: number;
  };
  readonly " $fragmentSpreads": FragmentRefs<"BaseWorkflowRelayFragment">;
  readonly " $fragmentType": "WorkflowRelayFragment";
};
export type WorkflowRelayFragment$key = {
  readonly " $data"?: WorkflowRelayFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"WorkflowRelayFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "WorkflowRelayFragment",
  "selections": [
    {
      "args": null,
      "kind": "FragmentSpread",
      "name": "BaseWorkflowRelayFragment"
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
    }
  ],
  "type": "Workflow",
  "abstractKey": null
};

(node as any).hash = "1ced1c0cab9886f5e2756f25f6f5854b";

export default node;
