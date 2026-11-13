/**
 * @generated SignedSource<<9138bd3975b9118732da0a4b266ea84c>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from 'relay-runtime';
export type TriggerRelayDisableMutation$variables = {
  name: string;
};
export type TriggerRelayDisableMutation$data = {
  readonly disableTrigger: {
    readonly name: string | null | undefined;
  } | null | undefined;
};
export type TriggerRelayDisableMutation = {
  response: TriggerRelayDisableMutation$data;
  variables: TriggerRelayDisableMutation$variables;
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
    "name": "disableTrigger",
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
    "name": "TriggerRelayDisableMutation",
    "selections": (v1/*: any*/),
    "type": "Mutation",
    "abstractKey": null
  },
  "kind": "Request",
  "operation": {
    "argumentDefinitions": (v0/*: any*/),
    "kind": "Operation",
    "name": "TriggerRelayDisableMutation",
    "selections": (v1/*: any*/)
  },
  "params": {
    "cacheID": "4a3d1fa7bcea76d1b0910fe298b711ad",
    "id": null,
    "metadata": {},
    "name": "TriggerRelayDisableMutation",
    "operationKind": "mutation",
    "text": "mutation TriggerRelayDisableMutation(\n  $name: String!\n) {\n  disableTrigger(name: $name) {\n    name\n  }\n}\n"
  }
};
})();

(node as any).hash = "16795e22567036489cef057140bb15e0";

export default node;
