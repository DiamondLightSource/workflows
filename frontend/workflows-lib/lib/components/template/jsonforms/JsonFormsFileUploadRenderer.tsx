/* eslint-disable @typescript-eslint/unbound-method */
import { withJsonFormsControlProps } from "@jsonforms/react";
import { ControlProps } from "@jsonforms/core";
import FileUploadButton from "../controls/FileUploadButton";

const FileUpload = ({
  path,
  handleChange,
  id,
  label,
  description,
  required,
  errors,
  visible,
  enabled,
}: ControlProps) => {
  return (
    <FileUploadButton
      name={path}
      label={label}
      error={errors}
      required={required}
      visible={visible}
      enabled={enabled}
      id={id}
      description={description}
      handleChange={handleChange}
    />
  );
};

const JsonFormsFileUploadRenderer = withJsonFormsControlProps(FileUpload);

export default JsonFormsFileUploadRenderer;
