/**
 * @generated SignedSource<<62bd1d83f1c9e4ac36af6ef3b631acb6>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from "relay-runtime";
export type TriggerRelayCreateMutation$variables = Record<PropertyKey, never>;
export type TriggerRelayCreateMutation$data = {
  readonly createTrigger:
    | {
        readonly name: string | null | undefined;
      }
    | null
    | undefined;
};
export type TriggerRelayCreateMutation = {
  response: TriggerRelayCreateMutation$data;
  variables: TriggerRelayCreateMutation$variables;
};

const node: ConcreteRequest = (function () {
  var v0 = [
    {
      alias: null,
      args: [
        {
          kind: "Literal",
          name: "name",
          value: "frontend-test-trigger",
        },
        {
          kind: "Literal",
          name: "templateRef",
          value: "webhook-test-trigger",
        },
      ],
      concreteType: "Trigger",
      kind: "LinkedField",
      name: "createTrigger",
      plural: false,
      selections: [
        {
          alias: null,
          args: null,
          kind: "ScalarField",
          name: "name",
          storageKey: null,
        },
      ],
      storageKey:
        'createTrigger(name:"frontend-test-trigger",templateRef:"webhook-test-trigger")',
    },
  ];
  return {
    fragment: {
      argumentDefinitions: [],
      kind: "Fragment",
      metadata: null,
      name: "TriggerRelayCreateMutation",
      selections: v0 /*: any*/,
      type: "Mutation",
      abstractKey: null,
    },
    kind: "Request",
    operation: {
      argumentDefinitions: [],
      kind: "Operation",
      name: "TriggerRelayCreateMutation",
      selections: v0 /*: any*/,
    },
    params: {
      cacheID: "98f7ee403970a0396523378b17b744c4",
      id: null,
      metadata: {},
      name: "TriggerRelayCreateMutation",
      operationKind: "mutation",
      text: 'mutation TriggerRelayCreateMutation {\n  createTrigger(templateRef: "webhook-test-trigger", name: "frontend-test-trigger") {\n    name\n  }\n}\n',
    },
  };
})();

(node as any).hash = "b58b15a26ec58783f0d7411252594158";

export default node;
