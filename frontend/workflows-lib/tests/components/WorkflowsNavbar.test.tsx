import { render } from '@testing-library/react';
import "@testing-library/jest-dom";
import { ThemeProvider } from '@mui/material/styles';
import { DiamondTheme } from "@diamondlightsource/sci-react-ui";
import WorkflowsNavbar from '../../lib/components/workflow/WorkflowsNavbar';

describe('WorkflowsNavbar', () => {
  it('renders with title and sessionInfo', () => {
    const { getByText } = render(
      <ThemeProvider theme={DiamondTheme}>
        <WorkflowsNavbar sessionInfo="cm12345-6" />
      </ThemeProvider>
    );
    expect(getByText('cm12345-6')).toBeInTheDocument();
  });

  it('applies the correct styles', () => {
    const { getByText } = render(
      <ThemeProvider theme={DiamondTheme}>
        <WorkflowsNavbar sessionInfo="cm34567-8" />
      </ThemeProvider>
    );
    const sessionElement = getByText('cm34567-8');
    expect(sessionElement).toHaveStyle(`color: ${DiamondTheme.palette.primary.contrastText}`);
  });
});
