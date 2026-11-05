import {
  ApolloProvider,
  ApolloWorkflowTest,
} from "relay-workflows-lib";

export default function ApolloTestPage() {
  return (
    <ApolloProvider>
      <div style={{ padding: 24 }}>
        <h1>Apollo Client POC</h1>
        <ApolloWorkflowTest />
      </div>
    </ApolloProvider>
  );
}