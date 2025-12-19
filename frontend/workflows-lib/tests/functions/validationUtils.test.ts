import { RawScanRange } from "../../lib/components/template/controls/ScanRangeInput";
import {
  isStrictPositiveInteger,
  parseExcludedScans,
  validateScanRange,
} from "../../lib/utils/validationUtils";

describe("isStrictPositiveInteger", () => {
  it("returns true for positive integers", () => {
    expect(isStrictPositiveInteger("1")).toBe(true);
    expect(isStrictPositiveInteger("100")).toBe(true);
  });

  it("returns true for zero", () => {
    expect(isStrictPositiveInteger("0")).toBe(true);
  });

  it("returns false for negative, floats, string and scientific notation", () => {
    expect(isStrictPositiveInteger("-1")).toBe(false);
    expect(isStrictPositiveInteger("1.5")).toBe(false);
    expect(isStrictPositiveInteger("1e3")).toBe(false);
    expect(isStrictPositiveInteger("abc")).toBe(false);
  });
});

describe("parseExcludedScans", () => {
  it("parses comma-separated integers", () => {
    expect(parseExcludedScans("1, 2, 3")).toEqual([1, 2, 3]);
  });

  it("parses bracketed input", () => {
    expect(parseExcludedScans("[4, 5]")).toEqual([4, 5]);
  });

  it("parses hyphenated ranges", () => {
    expect(parseExcludedScans("6-8")).toEqual([6, 7, 8]);
  });

  it("parses mixed input", () => {
    expect(parseExcludedScans("1, 3-5, [7, 8]")).toEqual([1, 3, 4, 5, 7, 8]);
  });

  it("trims spaces", () => {
    expect(parseExcludedScans("1  ,    3-5, [  7,     ,  8 ]")).toEqual([
      1, 3, 4, 5, 7, 8,
    ]);
  });
  it("removes extra commas and square brackets", () => {
    expect(parseExcludedScans("[][][[4-5]]]], ],,]7")).toEqual([4, 5, 7]);
  });

  it("orders output", () => {
    expect(parseExcludedScans("10, 3-5, [8]")).toEqual([3, 4, 5, 8, 10]);
  });

  it("throws error for invalid range format", () => {
    expect(() => parseExcludedScans("5-")).toThrow(
      "Must be positive integers or ranges",
    );
    expect(() => parseExcludedScans("a-b")).toThrow(
      "Must be positive integers or ranges",
    );
    expect(() => parseExcludedScans("10-5")).toThrow("Invalid range");
  });
});

describe("validateScanRange", () => {
  it("validates correct input", () => {
    const result = validateScanRange({
      start: "1",
      end: "10",
      excludedRaw: "3, 4, 5",
    } as RawScanRange);
    expect(result.errors).toEqual({ start: "", end: "", excluded: "" });
    expect(result.parsed).toEqual({ start: 1, end: 10, excluded: [3, 4, 5] });
  });

  it("returns error for invalid start", () => {
    const result = validateScanRange({
      start: "abc",
      end: "10",
      excludedRaw: "3, 4",
    } as RawScanRange);
    expect(result.errors.start).toBe("Start must be a positive integer");
    expect(result.parsed).toBeUndefined();
  });

  it("returns error for invalid end", () => {
    const result = validateScanRange({
      start: "1",
      end: "abc",
      excludedRaw: "3, 4",
    } as RawScanRange);
    expect(result.errors.end).toBe("End must be a positive integer");
    expect(result.parsed).toBeUndefined();
  });

  it("returns error when end < start", () => {
    const result = validateScanRange({
      start: "10",
      end: "5",
      excludedRaw: "3, 4",
    } as RawScanRange);
    expect(result.errors.end).toBe("End cannot be less than start");
    expect(result.parsed).toBeUndefined();
  });

  it("returns error for excluded values out of range", () => {
    const result = validateScanRange({
      start: "1",
      end: "5",
      excludedRaw: "2, 6",
    } as RawScanRange);
    expect(result.errors.excluded).toBe("Excluded values out of range");
    expect(result.parsed).toBeUndefined();
  });

  it("returns error for invalid excluded format", () => {
    const result = validateScanRange({
      start: "1",
      end: "10",
      excludedRaw: "abc",
    } as RawScanRange);
    expect(result.errors.excluded).toBe("Must be positive integers or ranges");
    expect(result.parsed).toBeUndefined();
  });

  it("returns empty excluded array for empty input", () => {
    const result = validateScanRange({
      start: "1",
      end: "10",
      excludedRaw: "",
    } as RawScanRange);
    expect(result.errors.excluded).toBe("");
    expect(result.parsed?.excluded).toEqual([]);
  });
  it("handles duplicates", () => {
    const result = validateScanRange({
      start: "1",
      end: "10",
      excludedRaw: "1, 1, 9",
    } as RawScanRange);
    expect(result.errors).toEqual({ start: "", end: "", excluded: "" });
    expect(result.parsed?.excluded).toEqual([1, 9]);
  });

  it("handles overlapping ranges", () => {
    const result = validateScanRange({
      start: "1",
      end: "10",
      excludedRaw: "3-5, 4-6",
    });
    expect(result.errors).toEqual({ start: "", end: "", excluded: "" });
    expect(result.parsed?.excluded).toEqual([3, 4, 5, 6]);
  });

  it("handles mixed excluded input", () => {
    const result = validateScanRange({
      start: "1",
      end: "10",
      excludedRaw: "3, 3-5, [4, 5]",
    });
    expect(result.errors).toEqual({ start: "", end: "", excluded: "" });
    expect(result.parsed?.excluded).toEqual([3, 4, 5]);
  });
});
