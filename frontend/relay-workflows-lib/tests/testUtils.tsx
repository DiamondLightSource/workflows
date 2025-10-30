import { useLazyLoadQuery } from "react-relay";

export function mockLazyLoadQuery<T>(response: T): T {
  vi.mocked(useLazyLoadQuery as () => T).mockReturnValueOnce(response);

  return response;
}
