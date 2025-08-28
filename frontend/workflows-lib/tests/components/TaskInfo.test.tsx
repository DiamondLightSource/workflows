import { render, screen } from "@testing-library/react";
import { TaskInfo } from "../../lib/components/workflow/TaskInfo";
import type { Artifact } from "workflows-lib";
import "@testing-library/jest-dom";
import { mockArtifacts } from "./data";

describe("TaskInfo", () => {
  it("renders ArtifactFilteredList and ImageGallery components", () => {
    render(<TaskInfo artifactList={mockArtifacts} />);
    expect(screen.getByText("image1.png")).toBeInTheDocument();
    expect(screen.getByText("main.log")).toBeInTheDocument();
    expect(screen.getByText("textfile.txt")).toBeInTheDocument();
    expect(screen.getByAltText("Gallery Image 1")).toBeInTheDocument();
  });

  it("passes artifactList to ArtifactFilteredList and ImageGallery components", () => {
    render(<TaskInfo artifactList={mockArtifacts} />);
    const artifactFilteredList = screen.getByText("image1.png").closest("div");
    const imageGallery = screen.getByAltText("Gallery Image 1").closest("div");
    expect(artifactFilteredList).toBeInTheDocument();
    expect(imageGallery).toBeInTheDocument();
  });

  it("does not render ImageGallery if there are no image artifacts", () => {
    const noImageArtifacts: Artifact[] = [
      {
        name: "main.log",
        mimeType: "text/plain",
        url: "fakepath/to/main.log",
        parentTask: "task1",
        parentTaskId: "id-12345",
      },
      {
        name: "textfile.txt",
        mimeType: "text/plain",
        url: "fakepath/to/textfile.txt",
        parentTask: "task2",
        parentTaskId: "id-54321",
      },
    ];
    render(<TaskInfo artifactList={noImageArtifacts} />);
    expect(screen.queryByAltText("Gallery Image 1")).not.toBeInTheDocument();
  });

  it("counts png as an image type", () => {
    const pngArtifact: Artifact[] = [
      {
        name: "image1.png",
        mimeType: "image/png",
        url: "fakepath/to/image1.png",
        parentTask: "task1",
        parentTaskId: "id-12345",
      },
    ];
    render(<TaskInfo artifactList={pngArtifact} />);
    expect(screen.queryByAltText("Gallery Image 1")).toBeInTheDocument();
  });

  it("counts jpeg as an image type", () => {
    const pngArtifact: Artifact[] = [
      {
        name: "image1.jpeg",
        mimeType: "image/jpeg",
        url: "fakepath/to/image1.jpeg",
        parentTask: "task1",
        parentTaskId: "id-12345",
      },
    ];
    render(<TaskInfo artifactList={pngArtifact} />);
    expect(screen.queryByAltText("Gallery Image 1")).toBeInTheDocument();
  });

  it("counts tiff as an image type", () => {
    const pngArtifact: Artifact[] = [
      {
        name: "image1.tiff",
        mimeType: "image/tiff",
        url: "fakepath/to/image1.tiff",
        parentTask: "task1",
        parentTaskId: "id-12345",
      },
    ];
    render(<TaskInfo artifactList={pngArtifact} />);
    expect(screen.queryByAltText("Gallery Image 1")).toBeInTheDocument();
  });
});
