import { render, screen, fireEvent } from "@testing-library/react";
import { ArtifactFilteredList } from "../../lib/components/workflow/ArtifactFilteredList";
import "@testing-library/jest-dom";
import { mockArtifacts } from "./data";

describe("ArtifactFilteredList", () => {
  it("renders all artifacts by default", () => {
    render(<ArtifactFilteredList artifactList={mockArtifacts} />);
    expect(screen.getByText("image1.png")).toBeInTheDocument();
    expect(screen.getByText("main.log")).toBeInTheDocument();
    expect(screen.getByText("textfile.txt")).toBeInTheDocument();
    expect(screen.getByText("image2.jpeg")).toBeInTheDocument();
  });

  it('filters and displays only image artifacts when "IMAGES" filter is selected', () => {
    render(<ArtifactFilteredList artifactList={mockArtifacts} />);
    fireEvent.click(screen.getByLabelText("images"));
    expect(screen.getByText("image1.png")).toBeInTheDocument();
    expect(screen.getByText("image2.jpeg")).toBeInTheDocument();
    expect(screen.queryByText("main.log")).not.toBeInTheDocument();
    expect(screen.queryByText("textfile.txt")).not.toBeInTheDocument();
  });

  it('filters and displays only log artifacts when "LOG" filter is selected', () => {
    render(<ArtifactFilteredList artifactList={mockArtifacts} />);
    fireEvent.click(screen.getByLabelText("log"));
    expect(screen.getByText("main.log")).toBeInTheDocument();
    expect(screen.queryByText("image1.png")).not.toBeInTheDocument();
    expect(screen.queryByText("textfile.txt")).not.toBeInTheDocument();
    expect(screen.queryByText("image2.jpeg")).not.toBeInTheDocument();
  });

  it('filters and displays only text artifacts when "TEXT" filter is selected', () => {
    render(<ArtifactFilteredList artifactList={mockArtifacts} />);
    fireEvent.click(screen.getByLabelText("text"));
    expect(screen.getByText("main.log")).toBeInTheDocument();
    expect(screen.getByText("textfile.txt")).toBeInTheDocument();
    expect(screen.queryByText("image1.png")).not.toBeInTheDocument();
    expect(screen.queryByText("image2.jpeg")).not.toBeInTheDocument();
  });
});
