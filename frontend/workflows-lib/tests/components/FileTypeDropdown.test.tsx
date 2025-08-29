import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import Box from "@mui/material/Box";
import userEvent from "@testing-library/user-event";
import { TaskInfo } from "../../lib/components/workflow/TaskInfo";
import type { Artifact } from "workflows-lib";
import { mockArtifacts } from "./data";

vi.mock("../../lib/components/workflow/ArtifactFilteredList", () => ({
  ArtifactFilteredList: ({ artifactList }: { artifactList: Artifact[] }) => (
    <Box data-testid="artifact-list">
      {artifactList.map((artifact, index) => (
        <Box key={index} data-testid={`artifact-${artifact.name}`}>
          {artifact.name}
        </Box>
      ))}
    </Box>
  ),
}));

vi.mock("../../lib/components/workflow/ScrollableImages", () => ({
  ScrollableImages: () => <Box data-testid="scrollable-images" />,
}));

vi.mock("../../lib/components/workflow/FuzzySearchBar", () => ({
  FuzzySearchBar: ({
    searchQuery,
    setSearchQuery,
  }: {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
  }) => (
    <input
      data-testid="search-bar"
      value={searchQuery}
      onChange={(e) => {
        setSearchQuery(e.target.value);
      }}
      placeholder="Search..."
    />
  ),
}));

describe("FileTypeDropdown Integration", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display correct file types in dropdown based on available artifacts", () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    const dropdown = screen.getByLabelText("File Types");
    fireEvent.mouseDown(dropdown);

    expect(screen.getByText(".log")).toBeInTheDocument();
    expect(screen.getByText(".png")).toBeInTheDocument();
    expect(screen.getByText(".jpeg")).toBeInTheDocument();
    expect(screen.getByText(".txt")).toBeInTheDocument();
  });

  it("should clear file type filters when the clear button is selected", async () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    const dropdown = screen.getByLabelText("File Types");

    await user.click(dropdown);
    await user.click(screen.getByText(".log"));
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.getByText("main.log")).toBeInTheDocument();
      expect(screen.queryByText("textfile.txt")).not.toBeInTheDocument();
      expect(screen.queryByText("image1.png")).not.toBeInTheDocument();
      expect(screen.queryByText("image2.jpeg")).not.toBeInTheDocument();
    });

    const clear = screen.getByLabelText("clearFileTypes");
    await user.click(clear);
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.getByText("main.log")).toBeInTheDocument();
      expect(screen.getByText("textfile.txt")).toBeInTheDocument();
      expect(screen.queryByText("image1.png")).toBeInTheDocument();
      expect(screen.queryByText("image2.jpeg")).toBeInTheDocument();
    });
  });

  it("should render all artifacts when no file type is selected", () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    expect(screen.getByText("main.log")).toBeInTheDocument();
    expect(screen.getByText("image1.png")).toBeInTheDocument();
    expect(screen.getByText("textfile.txt")).toBeInTheDocument();
    expect(screen.getByText("image2.jpeg")).toBeInTheDocument();
  });

  it("should filter artifacts by multiple file types", async () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    const dropdown = screen.getByLabelText("File Types");
    await user.click(dropdown);
    await user.click(screen.getByText(".log"));
    await user.click(screen.getByText(".txt"));
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.getByText("main.log")).toBeInTheDocument();
      expect(screen.getByText("textfile.txt")).toBeInTheDocument();
      expect(screen.queryByText("image1.png")).not.toBeInTheDocument();
      expect(screen.queryByText("image2.jpeg")).not.toBeInTheDocument();
    });
  });

  it("filter artifacts by png and show all artifacts when all file types are deselected", async () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    const dropdown = screen.getByLabelText("File Types");
    await user.click(dropdown);

    const pngOption = screen.getByRole("option", { name: ".png" });
    await user.click(pngOption);
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.getByText("image1.png")).toBeInTheDocument();
      expect(screen.queryByText("main.log")).not.toBeInTheDocument();
    });

    await user.click(dropdown);
    const pngOptionToDeselect = screen.getByRole("option", { name: ".png" });
    await user.click(pngOptionToDeselect);
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.getByText("main.log")).toBeInTheDocument();
      expect(screen.getByText("image1.png")).toBeInTheDocument();
      expect(screen.getByText("textfile.txt")).toBeInTheDocument();
      expect(screen.getByText("image2.jpeg")).toBeInTheDocument();
    });
  });

  it("should not render dropdown when no artifacts have file extensions", () => {
    const artifactsWithoutExtensions: Artifact[] = [
      {
        name: "file1",
        url: "http://example.com/file1",
        mimeType: "text/plain",
        parentTask: "task1",
      },
      {
        name: "file2",
        url: "http://example.com/file2",
        mimeType: "text/plain",
        parentTask: "task2",
      },
    ];

    render(<TaskInfo artifactList={artifactsWithoutExtensions} />);

    expect(screen.queryByLabelText("File Types")).not.toBeInTheDocument();
  });
});
