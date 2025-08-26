import { materialRenderers } from "@jsonforms/material-renderers";
import JsonFormsFileUploadRenderer from "../components/template/jsonforms/JsonFormsFileUploadRenderer";
import JsonFormsScanRangeRenderer from "../components/template/jsonforms/JsonFormsScanRangeRenderer";
import { fileUploadTester, scanRangeTester } from ".//testers";

export const rendererSet = [
  ...materialRenderers,
  { tester: fileUploadTester, renderer: JsonFormsFileUploadRenderer },
  { tester: scanRangeTester, renderer: JsonFormsScanRangeRenderer },
];
