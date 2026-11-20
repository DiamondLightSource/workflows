import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, it, vi } from "vitest";
import RepositoryLink from "./RepositoryLink";
import { TemplateSource } from "../../types";
import { templateSourceToLink } from "../../utils/templates/repository";

const repoUrl = "https://github.com/DiamondLightSource/workflows";
const templateSource = {
  repositoryUrl: repoUrl,
  path: "templates/example",
  targetRevision: "main",
} as TemplateSource;

const setScreenSize = (size: "small" | "large") => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: size === "small" && query.includes("max-width"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

describe("RepositoryLink", () => {
  beforeEach(() => {
    setScreenSize("large");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("link target", () => {
    it("links to the url returned by templateSourceToLink", () => {
      render(<RepositoryLink repository={templateSource} variant="full" />);

      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        templateSourceToLink(templateSource),
      );
    });

    it("accepts a plain string repository", () => {
      render(<RepositoryLink repository={repoUrl} variant="full" />);

      expect(screen.getByRole("link")).toHaveAttribute("href", repoUrl);
    });
  });

  describe("disabled states", () => {
    it.each([
      ["null", null],
      ["undefined", undefined],
    ])("is disabled when the repository is %s", (_, repository) => {
      render(<RepositoryLink repository={repository} variant="full" />);

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("is disabled when no link can be built from the repository", () => {
      render(<RepositoryLink repository={undefined} variant="full" />);

      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("is disabled when the disabled prop is set", () => {
      render(<RepositoryLink repository={repoUrl} variant="full" disabled />);

      expect(screen.queryByRole("link")).not.toBeInTheDocument();
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("full variant", () => {
    it("shows the default label", () => {
      render(<RepositoryLink repository={repoUrl} variant="full" />);

      expect(
        screen.getByRole("link", { name: "Template repository" }),
      ).toBeInTheDocument();
    });

    it("shows a custom label", () => {
      render(
        <RepositoryLink
          repository={repoUrl}
          variant="full"
          label="Visit the repository"
        />,
      );

      expect(
        screen.getByRole("link", { name: "Visit the repository" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("Template repository")).not.toBeInTheDocument();
    });

    it("shows the GitHub and arrow icons alongside the label", () => {
      render(<RepositoryLink repository={repoUrl} variant="full" />);

      expect(screen.getByTestId("GitHubIcon")).toBeInTheDocument();
      expect(screen.getByTestId("ArrowForwardIosIcon")).toBeInTheDocument();
    });

    it("shows the label even on a small screen", () => {
      setScreenSize("small");
      render(<RepositoryLink repository={repoUrl} variant="full" />);

      expect(screen.getByText("Template repository")).toBeInTheDocument();
    });
  });

  describe("icon variant", () => {
    it("shows only the icon, with no label", () => {
      render(<RepositoryLink repository={repoUrl} variant="icon" />);

      expect(screen.getByTestId("GitHubIcon")).toBeInTheDocument();
      expect(screen.queryByText("Template repository")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("ArrowForwardIosIcon"),
      ).not.toBeInTheDocument();
    });

    it("shows the icon even on a large screen", () => {
      setScreenSize("large");
      render(<RepositoryLink repository={repoUrl} variant="icon" />);

      expect(screen.queryByText("Template repository")).not.toBeInTheDocument();
    });

    it("still links to the repository", () => {
      render(<RepositoryLink repository={repoUrl} variant="icon" />);

      expect(screen.getByRole("link")).toHaveAttribute("href", repoUrl);
    });

    it("shows a tooltip on hover", async () => {
      render(<RepositoryLink repository={repoUrl} variant="icon" />);

      await userEvent.hover(screen.getByTestId("GitHubIcon"));

      expect(
        await screen.findByRole("tooltip", { name: "Template repository" }),
      ).toBeInTheDocument();
    });
  });

  describe("auto variant", () => {
    it("is the default variant", () => {
      setScreenSize("small");
      render(<RepositoryLink repository={repoUrl} />);

      expect(screen.queryByText("Template repository")).not.toBeInTheDocument();
    });

    it("shows the full button on a large screen", () => {
      setScreenSize("large");
      render(<RepositoryLink repository={repoUrl} variant="auto" />);

      expect(screen.getByText("Template repository")).toBeInTheDocument();
    });

    it("shows only the icon on a small screen", () => {
      setScreenSize("small");
      render(<RepositoryLink repository={repoUrl} variant="auto" />);

      expect(screen.getByTestId("GitHubIcon")).toBeInTheDocument();
      expect(screen.queryByText("Template repository")).not.toBeInTheDocument();
    });
  });
});
