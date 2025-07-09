import { withJsonFormsControlProps } from "@jsonforms/react";
import { ControlProps } from "@jsonforms/core";
import FileUploadButton from "../controls/FileUploadButton";

// eslint-disable-next-line @typescript-eslint/unbound-method
const FileUpload = ({ path, handleChange }: ControlProps) => {
  return <FileUploadButton name={path} handleChange={handleChange} />;
};

const JsonFormsFileUploadRenderer = withJsonFormsControlProps(FileUpload);

export default JsonFormsFileUploadRenderer;
