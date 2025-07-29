import { render, screen, fireEvent } from "@testing-library/react";
import { ArtifactFilteredList } from "../../lib/components/workflow/ArtifactFilteredList";
import "@testing-library/jest-dom";
import { mockArtifacts } from "./data";

describe("ArtifactFilteredList", () => {
  it("renders all artifacts by default - ascending order by artifact name", () => {
    render(<ArtifactFilteredList artifactList={mockArtifacts} />);
    const artifactElements = screen.getAllByRole("row").slice(1);
    const artifactNames = artifactElements.map(
      (el) => (el as HTMLTableRowElement).cells[0].textContent,
    );
    expect(artifactNames).toEqual([
      "image1.png",
      "image2.jpeg",
      "main.log",
      "textfile.txt",
    ]);
  });

  it("sorts artifact by name in descending order", () => {
    render(<ArtifactFilteredList artifactList={mockArtifacts} />);
    fireEvent.click(screen.getByLabelText("sort-name"));
    const artifactElements = screen.getAllByRole("row").slice(1);
    const artifactNames = artifactElements.map(
      (el) => (el as HTMLTableRowElement).cells[0].textContent,
    );
    expect(artifactNames).toEqual([
      "textfile.txt",
      "main.log",
      "image2.jpeg",
      "image1.png",
    ]);
  });

  it("sorts artifact by parent-task in ascending order", () => {
    render(<ArtifactFilteredList artifactList={mockArtifacts} />);
    fireEvent.click(screen.getByLabelText("sort-parent-task"));
    const artifactElements = screen.getAllByRole("row").slice(1);
    const artifactNames = artifactElements.map(
      (el) => (el as HTMLTableRowElement).cells[1].textContent,
    );
    expect(artifactNames).toEqual(["task", "task1", "task2", "task3"]);
  });

  it("sorts artifact by parent-task in descending order", () => {
    render(<ArtifactFilteredList artifactList={mockArtifacts} />);
    fireEvent.click(screen.getByLabelText("sort-parent-task"));
    fireEvent.click(screen.getByLabelText("sort-parent-task"));
    const artifactElements = screen.getAllByRole("row").slice(1);
    const artifactNames = artifactElements.map(
      (el) => (el as HTMLTableRowElement).cells[1].textContent,
    );
    expect(artifactNames).toEqual(["task3", "task2", "task1", "task"]);
  });
});
