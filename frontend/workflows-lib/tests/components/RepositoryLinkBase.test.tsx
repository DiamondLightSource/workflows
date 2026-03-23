import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { RepositoryLinkBase } from "../../lib/main";

describe("RepositoryLinkBase", () => {
  it("should be disabled if no link is provided", () => {
    render(<RepositoryLinkBase />);
    expect(screen.getByLabelText("No repository found")).toBeInTheDocument();
  });

  it("should render the plain icon variant", () => {
    render(
      <RepositoryLinkBase variant="Icon" repository={"www.example.org"} />,
    );
    expect(screen.getByLabelText("Go to repository")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "www.example.org");
  });

  it("should render the static text variant", () => {
    render(
      <RepositoryLinkBase variant="TextIcon" repository={"www.example.org"} />,
    );
    expect(screen.getByText("Visit the repository")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "www.example.org");
  });
});
