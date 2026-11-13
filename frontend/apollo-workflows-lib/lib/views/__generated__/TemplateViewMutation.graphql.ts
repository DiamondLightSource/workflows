/**
 * @generated SignedSource<<7f656888e345f27afc27b2aeac07eee6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type VisitInput = {
  number: number;
  proposalCode: string;
  proposalNumber: number;
};
export type TemplateViewMutation$variables = {
  parameters: any;
  templateName: string;
  visit: VisitInput;
};
export type TemplateViewMutation$data = {
  readonly submitWorkflowTemplate: {
    readonly id: string;
    readonly name: string;
  };
};
export type TemplateViewMutation = {
  response: TemplateViewMutation$data;
  variables: TemplateViewMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "parameters"
},
v1 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "templateName"
},
v2 = {
  "defaultValue": null,
  "kind": "LocalArgument",
  "name": "visit"
},
v3 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "name",
        "variableName": "templateName"
      },
      {
        "kind": "Variable",
        "name": "parameters",
        "variableName": "parameters"
      },
      {
        "kind": "Variable",
        "name": "visit",
        "variableName": "visit"
      }
    ],
    "concreteType": "Workflow",
    "kind": "LinkedField",
    "name": "submitWorkflowTemplate",
    "plural": false,
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
      }
    ],
    "storageKey": null
  }
];
return {
  "fragment": {
    "argumentDefinitions": [
      (v0/*: any*/),
      (v1/*: any*/),
      (v2/*: any*/)
    ],
    "kind": "Fragment",
    "metadata": null,
    "name": "TemplateViewMutation",
    "selections": (v3/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": [
      (v1/*: any*/),
      (v2/*: any*/),
      (v0/*: any*/)
    ],
    "kind": "Operation",
    "name": "TemplateViewMutation",
    "selections": (v3/*: any*/)
  },
  "params": {
    "cacheID": "c3d21612f0871848fb79bd5302c2a524",
    "id": null,
    "metadata": {},
    "name": "TemplateViewMutation",
    "operationKind": "mutation",
    "text": "mutation TemplateViewMutation(\n  $templateName: String!\n  $visit: VisitInput!\n  $parameters: JSON!\n) {\n  submitWorkflowTemplate(name: $templateName, visit: $visit, parameters: $parameters) {\n    name\n    id\n  }\n}\n"
  }
};
})();

(node as any).hash = "509359c8c4a1cbf7d35a8ddaa8109e41";

export default node;
