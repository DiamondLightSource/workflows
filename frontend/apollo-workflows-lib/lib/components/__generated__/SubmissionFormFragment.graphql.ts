/**
 * @generated SignedSource<<9eec6c975b708b036dcafffc5392f899>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type SubmissionFormFragment$data = {
  readonly arguments: any;
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
  readonly uiSchema: any | null | undefined;
  readonly " $fragmentType": "SubmissionFormFragment";
};
export type SubmissionFormFragment$key = {
  readonly " $data"?: SubmissionFormFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"SubmissionFormFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "SubmissionFormFragment",
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
      "name": "maintainer",
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
      "name": "arguments",
      "storageKey": null
    },
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "uiSchema",
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

(node as any).hash = "066169b8474edb75aab59ce00b929fff";

export default node;
