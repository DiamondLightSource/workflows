import ApolloTemplateList from "./TemplateList";
import { templatesOverviewQuery } from "../../apollo/queries/TemplateListQuery";
import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing/react";
import {
  ThemeProvider,
  DiamondDSTheme,
} from "@diamondlightsource/sci-react-ui";
import { Component, ReactElement } from "react";

const templatesData = [
  {
    __typename: "WorkflowTemplate",
    name: "first-template",
    maintainer: "m1",
    title: "First",
    description: "First mock template",
  },
  {
    __typename: "WorkflowTemplate",
    name: "second-template",
    maintainer: "m2",
    title: "Second",
    description: "Second mock template",
  },
];

const sucessfulQueryMock = [
  {
    request: {
      query: templatesOverviewQuery,
      variables: {},
    },
    result: {
      data: {
        workflowTemplates: { nodes: templatesData },
      },
    },
  },
];

it("Shows card on query", async () => {
  render(
    <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
      <MockedProvider mocks={sucessfulQueryMock}>
        <ApolloTemplateList selectedName={null} setSelectedName={vi.fn()} />
      </MockedProvider>
    </ThemeProvider>,
  );

  for (const templateData of templatesData) {
    expect(
      await screen.findByText(templateData.name, { exact: false }),
    ).toBeDefined();
    expect(
      await screen.findByText(templateData.maintainer, { exact: false }),
    ).toBeDefined();
    expect(await screen.findByText(templateData.title)).toBeDefined();
    expect(await screen.findByText(templateData.description)).toBeDefined();
  }
});

it("Shows loading when fetching data", () => {
  render(
    <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
      <MockedProvider mocks={sucessfulQueryMock}>
        <ApolloTemplateList selectedName={null} setSelectedName={vi.fn()} />
      </MockedProvider>
    </ThemeProvider>,
  );

  expect(screen.getByRole("progressbar")).toBeDefined();
});

interface ErrorBoundaryTestProps {
  children: ReactElement;
}
interface ErrorBoundaryTestState {
  errorCaught: null | Error;
}

class ErrorBoundaryTest extends Component<
  ErrorBoundaryTestProps,
  ErrorBoundaryTestState
> {
  constructor(props: ErrorBoundaryTestProps) {
    super(props);
    this.state = { errorCaught: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { errorCaught: error };
  }

  render() {
    if (this.state.errorCaught !== null) {
      return (
        <div>
          <p> {this.state.errorCaught.name} </p>
          <p> {this.state.errorCaught.message} </p>
        </div>
      );
    }

    return this.props.children;
  }
}

const undefinedDataMock = [
  {
    request: {
      query: templatesOverviewQuery,
      variables: {},
    },
    result: {
      data: undefined,
    },
  },
];

it("Errors on undefined data when not loading", async () => {
  render(
    <ErrorBoundaryTest>
      <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
        <MockedProvider mocks={undefinedDataMock}>
          <ApolloTemplateList selectedName={null} setSelectedName={vi.fn()} />
        </MockedProvider>
      </ThemeProvider>
    </ErrorBoundaryTest>,
  );

  expect(await screen.findByText("UndefinedData")).toBeDefined();
});

const errorMock = [
  {
    request: {
      query: templatesOverviewQuery,
      variables: {},
    },
    result: {
      errors: [new Error("GQL Error")],
    },
  },
];

it("Escalates error", async () => {
  render(
    <ErrorBoundaryTest>
      <ThemeProvider theme={DiamondDSTheme} defaultMode="light">
        <MockedProvider mocks={errorMock}>
          <ApolloTemplateList selectedName={null} setSelectedName={vi.fn()} />
        </MockedProvider>
      </ThemeProvider>
    </ErrorBoundaryTest>,
  );

  expect(await screen.findByText("CombinedGraphQLErrors")).toBeDefined();
  expect(await screen.findByText("GQL Error")).toBeDefined();
});
