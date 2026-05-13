import "@testing-library/jest-dom";
import { getFilterFromParams, parseJwt } from "../src/routes/utils";
import {
  mockJwtPayload,
  default as mockKeycloak,
} from "../src/mocks/mockKeycloak";

describe("getFilterFromParams", () => {
  test.each([
    ["?group=MX", ["MX"]],
    ["?group=MX,EXAMPLES", ["MX", "EXAMPLES"]],
    ["?group=SPECTROSCOPY&search=testsearch", ["SPECTROSCOPY"]],
    [undefined, undefined],
  ])("%s should be parsed as %s", (input, expected) => {
    const params = new URLSearchParams(input);
    expect(getFilterFromParams(params)).toStrictEqual({
      scienceGroup: expected,
    });
  });
});

describe("parseJwt", () => {
  it("should decode a JWT", () => {
    expect(parseJwt(mockKeycloak.token)).toStrictEqual(mockJwtPayload);
  });
});
