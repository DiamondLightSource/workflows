import "@testing-library/jest-dom";
import { getUser } from "relay-workflows-lib";
import * as utils from "../../lib/utils/coreUtils";

describe("getUser", () => {
  it("should return the mock user", async () => {
    expect(await getUser()).toStrictEqual({
      name: "Mo C. Kuser",
      fedid: "mockuser",
    });
  });

  it("should handle failed JWT parsing", async () => {
    vi.spyOn(utils, "parseJwt").mockImplementationOnce(() => {
      throw new Error("test error");
    });
    expect(await getUser()).toStrictEqual({
      name: undefined,
      fedid: undefined,
    });
  });

  it("should handle missing fedid/user", async () => {
    vi.spyOn(utils, "parseJwt").mockReturnValueOnce({ name: "I. Matest" });
    expect(await getUser()).toStrictEqual({
      name: "I. Matest",
      fedid: undefined,
    });
  });
});
