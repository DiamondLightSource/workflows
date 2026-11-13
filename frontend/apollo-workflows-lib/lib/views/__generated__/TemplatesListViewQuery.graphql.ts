/**
 * @generated SignedSource<<c99988e616aa10109f4807b55ea159b6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
import { FragmentRefs } from "relay-runtime";
export type ScienceGroup = "BIO_CRYO_IMAGING" | "CONDENSED_MATTER" | "CRYSTALLOGRAPHY" | "EXAMPLES" | "IMAGING" | "MAGNETIC_MATERIALS" | "MX" | "SPECTROSCOPY" | "SURFACES" | "%future added value";
export type WorkflowTemplatesFilter = {
  scienceGroup?: ReadonlyArray<ScienceGroup> | null | undefined;
};
export type TemplatesListViewQuery$variables = {
  filter?: WorkflowTemplatesFilter | null | undefined;
};
export type TemplatesListViewQuery$data = {
  readonly workflowTemplates: {
    readonly nodes: ReadonlyArray<{
      readonly description: string | null | undefined;
      readonly name: string;
      readonly title: string | null | undefined;
      readonly " $fragmentSpreads": FragmentRefs<"TemplateCardFragment">;
    }>;
  };
};
export type TemplatesListViewQuery = {
  response: TemplatesListViewQuery$data;
  variables: TemplatesListViewQuery$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "filter"
  }
],
v1 = [
  {
    "kind": "Variable",
    "name": "filter",
    "variableName": "filter"
  }
],
v2 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "name",
  "storageKey": null
},
v3 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "title",
  "storageKey": null
},
v4 = {
  "alias": null,
  "args": null,
  "kind": "ScalarField",
  "name": "description",
  "storageKey": null
};
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "TemplatesListViewQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*: any*/),
        "concreteType": "WorkflowTemplateConnection",
        "kind": "LinkedField",
        "name": "workflowTemplates",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "WorkflowTemplate",
            "kind": "LinkedField",
            "name": "nodes",
            "plural": true,
            "selections": [
              (v2/*: any*/),
              (v3/*: any*/),
              (v4/*: any*/),
              {
                "args": null,
                "kind": "FragmentSpread",
                "name": "TemplateCardFragment"
              }
            ],
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ],
    "type": "Query",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "TemplatesListViewQuery",
    "selections": [
      {
        "alias": null,
        "args": (v1/*: any*/),
        "concreteType": "WorkflowTemplateConnection",
        "kind": "LinkedField",
        "name": "workflowTemplates",
        "plural": false,
        "selections": [
          {
            "alias": null,
            "args": null,
            "concreteType": "WorkflowTemplate",
            "kind": "LinkedField",
            "name": "nodes",
            "plural": true,
            "selections": [
              (v2/*: any*/),
              (v3/*: any*/),
              (v4/*: any*/),
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
            "storageKey": null
          }
        ],
        "storageKey": null
      }
    ]
  },
  "params": {
    "cacheID": "63c536b64fd14633e23d1cb6dd55c088",
    "id": null,
    "metadata": {},
    "name": "TemplatesListViewQuery",
    "operationKind": "query",
    "text": "query TemplatesListViewQuery(\n  $filter: WorkflowTemplatesFilter\n) {\n  workflowTemplates(filter: $filter) {\n    nodes {\n      name\n      title\n      description\n      ...TemplateCardFragment\n    }\n  }\n}\n\nfragment TemplateCardFragment on WorkflowTemplate {\n  name\n  title\n  description\n  maintainer\n  repository\n  templateSource {\n    repositoryUrl\n    path\n    targetRevision\n  }\n}\n"
  }
};
})();

(node as any).hash = "466bd37424fd0077d7cc5cad79125b84";

export default node;
