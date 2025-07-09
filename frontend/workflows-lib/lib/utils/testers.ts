import { isControl, rankWith } from "@jsonforms/core";

export const fileUploadTester = rankWith(
  5,
  (uischema) =>
    isControl(uischema) && uischema.options?.useFileUploadControl === true,
);
