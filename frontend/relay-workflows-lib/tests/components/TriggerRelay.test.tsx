import { render, screen } from "@testing-library/react";
import { RelayEnvironmentProvider } from "react-relay";
import { createMockEnvironment } from "relay-test-utils";
import TriggerRelay from "../../lib/components/TriggerRelay";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { act } from "react";
// For some reason this is the only way the createMockEnvironment function works
// https://github.com/facebook/relay/issues/4228
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.jest = vi;

const user = userEvent.setup();

const mockEnvironment = createMockEnvironment();

const renderComponent = (enabled: boolean) => {
  render(
    <RelayEnvironmentProvider environment={mockEnvironment}>
      <TriggerRelay
        beamline="test-beamline"
        enabled={enabled}
        name="frontend-test-trigger"
        templateRef="webhook-test-trigger"
      />
    </RelayEnvironmentProvider>,
  );
};

it("toggles from enabled to disabled", async () => {
  renderComponent(true);

  const button = document.querySelector("input");
  if (button !== null) {
    await user.click(button);
  }

  const graphqlRequest =
    mockEnvironment.mock.getMostRecentOperation().request.node.params.text;

  expect(graphqlRequest).toContain("disableTrigger");
});

it("toggles from disabled to enabled", async () => {
  renderComponent(false);

  const button = document.querySelector("input");
  if (button !== null) {
    await user.click(button);
  }

  const graphqlRequest =
    mockEnvironment.mock.getMostRecentOperation().request.node.params.text;

  expect(graphqlRequest).toContain("enableTrigger");
});

it("shows an error message", async () => {
  renderComponent(true);

  const button = document.querySelector("input");
  if (button !== null) {
    await user.click(button);
  }

  act(() => {
    mockEnvironment.mock.rejectMostRecentOperation(
      Error("Trigger Relay Test Error"),
    );
  });

  expect(await screen.findByTestId("ErrorOutlineIcon")).toBeDefined();
});
