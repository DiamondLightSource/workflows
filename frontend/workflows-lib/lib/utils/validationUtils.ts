import { ScanRange } from "../types";

export const isStrictPositiveInteger = (value: string): boolean =>
  /^\d+$/.test(value) && Number(value) >= 0;

export const parseExcludedScans = (input: string): number[] => {
  const cleaned = input.replace(/[[\]]/g, "");

  const parts = cleaned
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");

  const resultSet = new Set<number>();

  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      resultSet.add(Number(part));
    } else if (/^\d+-\d+$/.test(part)) {
      const [startStr, endStr] = part.split("-");
      if (
        !isStrictPositiveInteger(startStr) ||
        !isStrictPositiveInteger(endStr)
      ) {
        throw new Error("Invalid range");
      }
      const start = Number(startStr);
      const end = Number(endStr);
      if (start >= end) {
        throw new Error("Invalid range");
      }
      for (let i = start; i <= end; i++) {
        resultSet.add(i);
      }
    } else {
      throw new Error("Must be positive integers or ranges");
    }
  }

  return Array.from(resultSet).sort((a, b) => a - b);
};

export interface ScanRangeValidationResult {
  errors: {
    start: string;
    end: string;
    excluded: string;
  };
  parsed?: ScanRange;
}

export const validateScanRange = (
  startStr: string,
  endStr: string,
  excludedRaw: string,
): ScanRangeValidationResult => {
  const validStart = isStrictPositiveInteger(startStr);
  const validEnd = isStrictPositiveInteger(endStr);

  const newStart = parseInt(startStr, 10);
  const newEnd = parseInt(endStr, 10);

  let excludedScans: number[] = [];
  let excludedError = "";

  try {
    excludedScans =
      excludedRaw.trim() === "" ? [] : parseExcludedScans(excludedRaw);
    const outOfRange = excludedScans.filter(
      (num) => num < newStart || num > newEnd,
    );
    if (outOfRange.length > 0) {
      excludedError = "Excluded values out of range";
    }
  } catch (err: unknown) {
    excludedError = (err as Error).message;
  }

  const startError = validStart ? "" : "Start must be a positive integer";
  const endError = !validEnd
    ? "End must be a positive integer"
    : newEnd < newStart
      ? "End cannot be less than start"
      : "";

  const hasErrors = startError || endError || excludedError;

  return {
    errors: {
      start: startError,
      end: endError,
      excluded: excludedError,
    },
    parsed: hasErrors
      ? undefined
      : {
          start: newStart,
          end: newEnd,
          excluded: excludedScans,
        },
  };
};
