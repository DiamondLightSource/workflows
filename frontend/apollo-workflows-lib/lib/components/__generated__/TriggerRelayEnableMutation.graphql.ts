/**
 * @generated SignedSource<<66cb4a5f717ea3f27f3b67044b936183>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type TriggerRelayEnableMutation$variables = {
  name: string;
};
export type TriggerRelayEnableMutation$data = {
  readonly enableTrigger: {
    readonly name: string | null | undefined;
  } | null | undefined;
};
export type TriggerRelayEnableMutation = {
  response: TriggerRelayEnableMutation$data;
  variables: TriggerRelayEnableMutation$variables;
};

const node: ConcreteRequest = (function(){
var v0 = [
  {
    "defaultValue": null,
    "kind": "LocalArgument",
    "name": "name"
  }
],
v1 = [
  {
    "alias": null,
    "args": [
      {
        "kind": "Variable",
        "name": "name",
        "variableName": "name"
      }
    ],
    "concreteType": "Trigger",
    "kind": "LinkedField",
    "name": "enableTrigger",
    "plural": false,
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
];
return {
  "fragment": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Fragment",
    "metadata": null,
    "name": "TriggerRelayEnableMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "TriggerRelayEnableMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "7a165573cf5d4f77fcf072b2e1632da3",
    "id": null,
    "metadata": {},
    "name": "TriggerRelayEnableMutation",
    "operationKind": "mutation",
    "text": "mutation TriggerRelayEnableMutation(\n  $name: String!\n) {\n  enableTrigger(name: $name) {\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "97a30905a1687d11f892f4310e2684d6";

export default node;
