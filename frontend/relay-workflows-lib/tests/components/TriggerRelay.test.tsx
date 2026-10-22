import { render, screen } from "@testing-library/react";
import { RelayEnvironmentProvider } from "react-relay";
import { createMockEnvironment } from "relay-test-utils";
import TriggerRelay from "../../lib/components/TriggerRelay";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { act } from "react";
import { GraphQLResponseWithData } from "relay-runtime";
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
        creatorName=""
        visit=""
      />
    </RelayEnvironmentProvider>,
  );
};

async function clickButton() {
  const button = document.querySelector("input");
  expect(button).not.toBeNull();
  if (button !== null) {
    await user.click(button);
  }
}

async function toggleEnabledWithoutError(initiallyEnabled: boolean) {
  renderComponent(initiallyEnabled);
  await clickButton();

  const graphqlRequest =
    mockEnvironment.mock.getMostRecentOperation().request.node.params.text;

  if (initiallyEnabled) {
    expect(graphqlRequest).toContain("disableTrigger");
  } else {
    expect(graphqlRequest).toContain("enableTrigger");
  }

  // Test error message doesnt show up after response
  // This will raise a warning that response is not correct, shouldnt affect test (currently) though
  const emptyResponse: GraphQLResponseWithData = { data: {} };
  act(() => {
    mockEnvironment.mock.resolveMostRecentOperation(emptyResponse);
  });

  await expect(screen.findByTestId("ErrorOutlineIcon")).rejects.toThrow(
    "Unable to find an element",
  );
}

it("toggles from enabled to disabled", async () => {
  // Vitest linting doesnt like when a test doesnt contain an expect (even when theres one in the function)
  // This is put in place to pass that check
  await expect(toggleEnabledWithoutError(true)).resolves.toBeUndefined();
});

it("toggles from disabled to enabled", async () => {
  // Vitest linting doesnt like when a test doesnt contain an expect (even when theres one in the function)
  // This is put in place to pass that check
  await expect(toggleEnabledWithoutError(false)).resolves.toBeUndefined();
});

it("shows an error message", async () => {
  renderComponent(true);
  await clickButton();

  act(() => {
    mockEnvironment.mock.rejectMostRecentOperation(
      Error("Trigger Relay Test Error"),
    );
  });

  expect(await screen.findByTestId("ErrorOutlineIcon")).toBeDefined();
});
