import { templateSourceToLink } from "../../lib/utils/commonUtils";
import { TemplateSource } from "../../lib/types";

describe("templateSourceToLink", () => {
  const defaultInput: TemplateSource = {
    repositoryUrl: "https://github.com/DiamondLightSource/workflows",
    path: "examples",
    targetRevision: "HEAD",
  };

  it("should return a link to a main branch", () => {
    expect(templateSourceToLink(defaultInput)).toBe(
      "https://github.com/DiamondLightSource/workflows/tree/main/examples",
    );
  });

  it("should return a link to a side branch", () => {
    const input: TemplateSource = {
      ...defaultInput,
      targetRevision: "test-branch",
    };
    expect(templateSourceToLink(input)).toBe(
      "https://github.com/DiamondLightSource/workflows/tree/test-branch/examples",
    );
  });

  it("should return null for null input", () => {
    expect(templateSourceToLink(null)).toBeNull();
  });

  it("should return null for undefined input", () => {
    expect(templateSourceToLink(undefined)).toBeNull();
  });

  test.each([
    ["repository", { ...defaultInput, repositoryUrl: undefined }],
    ["path", { ...defaultInput, path: undefined }],
    ["targetRevision", { ...defaultInput, targetRevision: undefined }],
  ])("returns null for missing %s", (_, input) => {
    expect(templateSourceToLink(input)).toBeNull();
  });

  it("should return a string unchanged", () => {
    expect(templateSourceToLink("string")).toBe("string");
  });
});
