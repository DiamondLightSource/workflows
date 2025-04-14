import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGallery } from '../../lib/components/workflow/ImageGallery';
import '@testing-library/jest-dom';
import { mockArtifacts } from './data';

describe('ImageGallery', () => {
  it('renders the first image by default', () => {
    render(<ImageGallery artifactList={mockArtifacts} />);
    const imgElement = screen.getByAltText('Gallery Image 1');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', 'fakepath/to/image1.png');
  });

  it('renders the next image when the next button is clicked', async () => {
    render(<ImageGallery artifactList={mockArtifacts} />);
    const nextButton = await screen.findByRole('button', { name: /next image/i });
    fireEvent.click(nextButton);
    const imgElement = screen.getByAltText('Gallery Image 2');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', 'fakepath/to/image2.png');
  });

  it('renders the previous image when the previous button is clicked', async () => {
    render(<ImageGallery artifactList={mockArtifacts} />);
    const nextButton = await screen.findByRole('button', { name: /next image/i });
    fireEvent.click(nextButton);
    const prevButton = await screen.findByRole('button', { name: /previous image/i });
    fireEvent.click(prevButton);
    const imgElement = screen.getByAltText('Gallery Image 1');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', 'fakepath/to/image1.png');
  });

  it('cycles to the last image when the previous button is clicked on the first image', async () => {
    render(<ImageGallery artifactList={mockArtifacts} />);
    const prevButton = await screen.findByRole('button', { name: /previous image/i });
    fireEvent.click(prevButton);
    const imgElement = screen.getByAltText('Gallery Image 2');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', 'fakepath/to/image2.png');
  });

  it('cycles to the first image when the next button is clicked on the last image', async () => {
    render(<ImageGallery artifactList={mockArtifacts} />);
    const nextButton = await screen.findByRole('button', { name: /next image/i });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    const imgElement = screen.getByAltText('Gallery Image 1');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', 'fakepath/to/image1.png');
  });

  it('does not render anything if there are no image artifacts', () => {
    render(<ImageGallery artifactList={[]} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
