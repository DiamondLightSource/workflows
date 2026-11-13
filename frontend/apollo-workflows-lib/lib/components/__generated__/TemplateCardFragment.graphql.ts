/**
 * @generated SignedSource<<7c1d5231308fe79d64daaf86c47dfa37>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type TemplateCardFragment$data = {
  readonly description: string | null | undefined;
  readonly maintainer: string;
  readonly name: string;
  readonly repository: string | null | undefined;
  readonly templateSource: {
    readonly path: string;
    readonly repositoryUrl: string;
    readonly targetRevision: string;
  } | null | undefined;
  readonly title: string | null | undefined;
  readonly " $fragmentType": "TemplateCardFragment";
};
export type TemplateCardFragment$key = {
  readonly " $data"?: TemplateCardFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"TemplateCardFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "TemplateCardFragment",
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
      "name": "title",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "description",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "maintainer",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "repository",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "concreteType": "TemplateSource",
      "kind": "LinkedField",
      "name": "templateSource",
      "plural": false,
      "selections": [
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "repositoryUrl",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "path",
          "storageKey": null
        },
        {
          "alias": null,
          "args": null,
          "kind": "ScalarField",
          "name": "targetRevision",
          "storageKey": null
        }
      ],
      "storageKey": null
    }
  ],
  "type": "WorkflowTemplate",
  "abstractKey": null
};

(node as any).hash = "fea866bb3c09a66e090aa6592f8e65c2";

export default node;
