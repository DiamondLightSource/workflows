import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RepositoryLink } from "../../lib/main";
import { RepositoryLinkBaseProps } from "workflows-lib/lib/components/common/RepositoryLinkBase";
import { getRelayEnvironment } from "dashboard/src/RelayEnvironment";
import { RelayEnvironmentProvider } from "react-relay";
import { templateSourceToLink } from "workflows-lib/lib/utils/commonUtils";
import { server } from "relay-workflows-lib/tests/mocks/browser.ts";

vi.mock("workflows-lib/lib/components/common/RepositoryLinkBase", () => ({
  default: ({ repository, variant }: RepositoryLinkBaseProps) => (
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
