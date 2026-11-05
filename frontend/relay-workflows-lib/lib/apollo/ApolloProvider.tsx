
import {
  ApolloProvider as BaseApolloProvider,
} from "@apollo/client/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getApolloClient } from "./ApolloEnvironment";

interface Props {
  children: ReactNode;
}

export function ApolloProvider({ children }: Props) {
  const [client, setClient] = useState<
    Awaited<ReturnType<typeof getApolloClient>> | null
  >(null);

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
  }, []);

  if (error) {
    throw error;
  }

  if (!client) {
    return null;
  }

  return (
    <BaseApolloProvider client={client}>
      {children}
    </BaseApolloProvider>
  );
}
