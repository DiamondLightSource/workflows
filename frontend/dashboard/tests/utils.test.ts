import "@testing-library/jest-dom";
import { getFilterFromParams } from "../src/routes/utils";

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
