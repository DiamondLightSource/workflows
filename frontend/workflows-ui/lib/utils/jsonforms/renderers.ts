import { materialRenderers } from "@jsonforms/material-renderers";
import JsonFormsFileUploadRenderer from "../../components/jsonforms/JsonFormsFileUploadRenderer";
import JsonFormsScanRangeRenderer from "../../components/jsonforms/JsonFormsScanRangeRenderer";
import { fileUploadTester, scanRangeTester } from "./testers";

export const rendererSet = [
  ...materialRenderers,
  { tester: fileUploadTester, renderer: JsonFormsFileUploadRenderer },
  { tester: scanRangeTester, renderer: JsonFormsScanRangeRenderer },
];
