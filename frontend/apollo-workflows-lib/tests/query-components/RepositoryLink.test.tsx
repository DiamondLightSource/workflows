import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RepositoryLink } from "../../lib/main";
import { RepositoryLinkBaseProps, templateSourceToLink } from "workflows-lib";
import { getRelayEnvironment } from "relay-workflows-lib";
import { RelayEnvironmentProvider } from "react-relay";
import { server } from "../mocks/server.ts";

vi.mock("workflows-lib", async () => ({
  ...(await vi.importActual("workflows-lib")),
  RepositoryLinkBase: ({ repository, variant }: RepositoryLinkBaseProps) => (
    <p>
      {" "}
      Repo: {templateSourceToLink(repository)}, Var: {variant}{" "}
    </p>
  ),
}));

describe("RepositoryLink", () => {
  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it("should obtain source from template ref", async () => {
    const environment = await getRelayEnvironment();
    render(
      <RelayEnvironmentProvider environment={environment}>
        <RepositoryLink templateRef="conditional-steps" />
      </RelayEnvironmentProvider>,
    );
    expect(
      await screen.findByText(
        /https:\/\/github.com\/DiamondLightSource\/workflows/i,
      ),
    ).toBeInTheDocument();
  });
});
