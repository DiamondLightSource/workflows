/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { withJsonFormsControlProps } from "@jsonforms/react";
import { ControlProps } from "@jsonforms/core";
import ScanRangeInput from "../controls/ScanRangeInput";
import { ScanRange } from "../../../types";
import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/unbound-method
const ScanRangeControl = ({ data, path, handleChange }: ControlProps) => {
  const [localValue, setLocalValue] = useState<ScanRange>({
    start: data?.start,
    end: data?.end,
    excluded: data?.excluded ?? [],
  });

  const handleBufferedChange = (_: string, value: ScanRange) => {
    setLocalValue(value);
    handleChange(path, value);
  };

  useEffect(() => {
    setLocalValue({
      start: data?.start,
      end: data?.end,
      excluded: data?.excluded ?? [],
    });
  }, [data]);

  return (
    <ScanRangeInput
      name={path}
      value={localValue}
      handleChange={handleBufferedChange}
    />
  );
};

const JsonFormsScanRangeRenderer = withJsonFormsControlProps(ScanRangeControl);

export default JsonFormsScanRangeRenderer;
