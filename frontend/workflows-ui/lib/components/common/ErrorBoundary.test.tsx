import ErrorBoundary from "./ErrorBoundary";
import { render, screen } from "@testing-library/react";

const errorMessage = "error message";
function ErrorComponent() {
  throw new Error(errorMessage);

  return <></>;
}

it("Shows children when they dont error", () => {
  const childrenText = "Children text";

  render(<ErrorBoundary>{childrenText}</ErrorBoundary>);

  expect(screen.getByText(childrenText)).toBeDefined();
});

it("Shows fallback on error", () => {
  render(
    <ErrorBoundary>
      <ErrorComponent />
    </ErrorBoundary>,
  );

  expect(screen.getByRole("alert")).toBeDefined();
  expect(screen.getByText(errorMessage, { exact: false })).toBeDefined();
});

it("Shows custom fallback on error", () => {
  const customFallbackText = "Custom fallback";
  render(
    <ErrorBoundary fallback={() => <p>{customFallbackText}</p>}>
      <ErrorComponent />
    </ErrorBoundary>,
  );

  expect(screen.getByText(customFallbackText)).toBeDefined();
});
