import type { ReactNode } from "react";
import {
  ApolloProvider,
} from "@apollo/client/react";
import { useEffect, useState } from "react";
import {
  ApolloClient,
} from "@apollo/client";
import { getApolloClient } from "./ApolloEnvironment";

interface ProviderProps {
  children: ReactNode;
}

export default function({ children } : ProviderProps) {

  // TODO: Replace use state / use effect malarchy
  const [client, setClient] = useState<ApolloClient | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;

    getApolloClient()
      .then((apolloClient) => {
        if (active) {
          setClient(apolloClient);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error ? err : new Error(String(err)),
          );
        }
      });

    return () => {
      active = false;
    };
  }, [])

  // TODO: Improve this error handling
  if (error) {
    throw error;
  }

  if (!client) {
    return null;
  }

  return (
    <ApolloProvider client={client}>
      { children }
    </ApolloProvider>
  );
}