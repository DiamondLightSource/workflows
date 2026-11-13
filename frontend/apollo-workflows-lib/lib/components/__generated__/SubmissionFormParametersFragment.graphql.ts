/**
 * @generated SignedSource<<d7ce650ceb59abf62386b770775b8b52>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ReaderFragment } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type SubmissionFormParametersFragment$data = {
  readonly parameters: any | null | undefined;
  readonly " $fragmentType": "SubmissionFormParametersFragment";
};
export type SubmissionFormParametersFragment$key = {
  readonly " $data"?: SubmissionFormParametersFragment$data;
  readonly " $fragmentSpreads": FragmentRefs<"SubmissionFormParametersFragment">;
};

const node: ReaderFragment = {
  "argumentDefinitions": [],
  "kind": "Fragment",
  "metadata": null,
  "name": "SubmissionFormParametersFragment",
  "selections": [
    {
      "alias": null,
      "args": null,
      "kind": "ScalarField",
      "name": "parameters",
      "storageKey": null
    }
  ],
  "type": "Workflow",
  "abstractKey": null
};

(node as any).hash = "bf49c4af91eb91e5dacc84805fb7807a";

export default node;
