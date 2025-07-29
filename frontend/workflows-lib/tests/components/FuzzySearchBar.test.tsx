import { render, screen, waitFor } from '@testing-library/react';
import "@testing-library/jest-dom";
import userEvent from '@testing-library/user-event';
import { TaskInfo } from '../../lib/components/workflow/TaskInfo';
import type { Artifact } from 'workflows-lib';
import { mockArtifacts } from "./data";

vi.mock('../../lib/components/workflow/ArtifactFilteredList', () => ({
  ArtifactFilteredList: ({ artifactList }: { artifactList: Artifact[] }) => (
    <div data-testid="artifact-list">
      {artifactList.map((artifact, index) => (
        <div key={index} data-testid={`artifact-${artifact.name}`}>
          {artifact.name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('../../lib/components/workflow/ScrollableImages', () => ({
  ScrollableImages: () => <div data-testid="scrollable-images" />,
}));

describe('FuzzySearchBar Integration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all artifacts when search is empty', () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    expect(screen.getByText('main.log')).toBeInTheDocument();
    expect(screen.getByText('image1.png')).toBeInTheDocument();
    expect(screen.getByText('textfile.txt')).toBeInTheDocument();
    expect(screen.getByText('image2.png')).toBeInTheDocument();
  });

  it('should filter artifacts by name search', async () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    const searchInput = screen.getByLabelText('Search Outputs');
    await user.type(searchInput, 'image1');

    await waitFor(() => {
      expect(screen.getByText('image1.png')).toBeInTheDocument();
      expect(screen.queryByText('main.log')).not.toBeInTheDocument();
      expect(screen.queryByText('textfile.txt')).not.toBeInTheDocument();
      expect(screen.queryByText('image2.png')).not.toBeInTheDocument();
    });
  });

  it('should filter artifacts by partial name match', async () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    const searchInput = screen.getByLabelText('Search Outputs');
    await user.type(searchInput, 'image');

    await waitFor(() => {
      expect(screen.getByText('image1.png')).toBeInTheDocument();
      expect(screen.getByText('image2.png')).toBeInTheDocument();
      expect(screen.queryByText('main.log')).not.toBeInTheDocument();
      expect(screen.queryByText('textfile.txt')).not.toBeInTheDocument();
    });
  });

  it('should filter artifacts by parent task search', async () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    const searchInput = screen.getByLabelText('Search Outputs');
    await user.type(searchInput, 'sk2');

    await waitFor(() => {
      expect(screen.getByText('textfile.txt')).toBeInTheDocument();
      expect(screen.queryByText('main.log')).not.toBeInTheDocument();
      expect(screen.queryByText('image1.png')).not.toBeInTheDocument();
      expect(screen.queryByText('image2.png')).not.toBeInTheDocument();
    });
  });

  it('should show no results for non-matching search', async () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    const searchInput = screen.getByLabelText('Search Outputs');
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.queryByText('main.log')).not.toBeInTheDocument();
      expect(screen.queryByText('image1.png')).not.toBeInTheDocument();
      expect(screen.queryByText('textfile.txt')).not.toBeInTheDocument();
      expect(screen.queryByText('image2.png')).not.toBeInTheDocument();
    });
  });

  it('should clear search and show all artifacts when clear button is clicked', async () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    const searchInput = screen.getByLabelText('Search Outputs');
    await user.type(searchInput, 'image1');

    await waitFor(() => {
      expect(screen.getByText('image1.png')).toBeInTheDocument();
      expect(screen.queryByText('textfile.txt')).not.toBeInTheDocument();
      expect(screen.queryByText('image2.png')).not.toBeInTheDocument();
      expect(screen.queryByText('main.log')).not.toBeInTheDocument();
    });

    const clearButton = screen.getByLabelText('clear search');
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('main.log')).toBeInTheDocument();
      expect(screen.getByText('image1.png')).toBeInTheDocument();
      expect(screen.getByText('textfile.txt')).toBeInTheDocument();
      expect(screen.getByText('image2.png')).toBeInTheDocument();
    });
  });

  it('should restore all artifacts when search is cleared manually', async () => {
    render(<TaskInfo artifactList={mockArtifacts} />);

    const searchInput = screen.getByLabelText('Search Outputs');
    await user.type(searchInput, 'image');

    await waitFor(() => {
      expect(screen.getByText('image1.png')).toBeInTheDocument();
      expect(screen.getByText('image2.png')).toBeInTheDocument();
      expect(screen.queryByText('main.log')).not.toBeInTheDocument();
      expect(screen.queryByText('textfile.txt')).not.toBeInTheDocument();
    });

    await user.clear(searchInput);

    await waitFor(() => {
      expect(screen.getByText('main.log')).toBeInTheDocument();
      expect(screen.getByText('image1.png')).toBeInTheDocument();
      expect(screen.getByText('textfile.txt')).toBeInTheDocument();
      expect(screen.getByText('image2.png')).toBeInTheDocument();
    });
  });
});
