/**
 * @generated SignedSource<<ef380c767f11b70837f5d6bd455a4ae2>>
 * @lightSyntaxTransform
 * @nogrep
 */

/* tslint:disable */
/* eslint-disable */
// @ts-nocheck

import { ConcreteRequest } from "relay-runtime";
export type TriggersListContentCreateMutation$variables = Record<
  PropertyKey,
  never
>;
export type TriggersListContentCreateMutation$data = {
  readonly createTrigger:
    | {
        readonly name: string | null | undefined;
      }
    | null
    | undefined;
};
export type TriggersListContentCreateMutation = {
  response: TriggersListContentCreateMutation$data;
  variables: TriggersListContentCreateMutation$variables;
};

const node: ConcreteRequest = (function () {
  var v0 = [
    {
      alias: null,
      args: [
        {
          kind: "Literal",
          name: "name",
          value: "olis-test-trigger",
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
        'createTrigger(name:"olis-test-trigger",templateRef:"webhook-test-trigger")',
    },
  ];
  return {
    fragment: {
      argumentDefinitions: [],
      kind: "Fragment",
      metadata: null,
      name: "TriggersListContentCreateMutation",
      selections: v0 /*: any*/,
      type: "Mutation",
      abstractKey: null,
    },
    kind: "Request",
    operation: {
      argumentDefinitions: [],
      kind: "Operation",
      name: "TriggersListContentCreateMutation",
      selections: v0 /*: any*/,
    },
    params: {
      cacheID: "10f3c86c2910d6339b82374fbf285670",
      id: null,
      metadata: {},
      name: "TriggersListContentCreateMutation",
      operationKind: "mutation",
      text: 'mutation TriggersListContentCreateMutation {\n  createTrigger(templateRef: "webhook-test-trigger", name: "olis-test-trigger") {\n    name\n  }\n}\n',
    },
  };
})();

(node as any).hash = "57741f287c5ed50618a7c71b51989355";

export default node;
