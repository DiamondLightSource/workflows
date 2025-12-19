/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { withJsonFormsControlProps } from "@jsonforms/react";
import { ControlProps } from "@jsonforms/core";
import ScanRangeInput from "../controls/ScanRangeInput";
import { ScanRange } from "../../../types";

const ScanRangeControl = ({
  data,
  path,
  handleChange,
  label,
  description,
  errors,
  required,
  enabled,
  visible,
  id,
}: ControlProps) => {
  const handleBufferedChange = (_: string, value: ScanRange) => {
    handleChange(path, value);
  };

  return (
    <ScanRangeInput
      name={path}
      value={{
        start: data?.start,
        end: data?.end,
        excluded: data?.excluded ?? [],
      }}
      handleChange={handleBufferedChange}
      label={label}
      description={description}
      error={errors}
      required={required}
      enabled={enabled}
      visible={visible}
      id={id}
    />
  );
};

const JsonFormsScanRangeRenderer = withJsonFormsControlProps(ScanRangeControl);

export default JsonFormsScanRangeRenderer;
