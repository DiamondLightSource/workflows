import { render } from "@testing-library/react";
import { ContractedTypography } from "../../main";
import { Typography, Tooltip } from "@mui/material";
import { Component, CSSProperties } from "react";

const TypographyComponentClass = Typography as unknown as Component;
const TypographySpy = vi.spyOn(TypographyComponentClass, "render");

it("allows typography overrides", () => {
  const testVariant = "h5";
  const testWidth = "100px";
  const testText = "test text";

  render(
    <ContractedTypography variant={testVariant} sx={{ width: testWidth }}>
      {testText}
    </ContractedTypography>,
  );

  // fix toHaveBeenCalledWith here!!
  expect(TypographySpy).toHaveBeenCalledWith(
    expect.objectContaining({
      children: "test text",
      variant: "h5",
      sx: expect.objectContaining({ width: "100px" }) as CSSProperties,
    }),
    null,
  );
});

const TooltipComponentClass = Tooltip as unknown as Component;
const TooltipSpy = vi.spyOn(TooltipComponentClass, "render");

it("allows tooltip overrides", () => {
  const enterDelayOverride = 2000;
  const arrow = true;

  render(
    <ContractedTypography
      tooltipProps={{ enterDelay: enterDelayOverride, arrow }}
    >
      test text
    </ContractedTypography>,
  );

  expect(TooltipSpy).toHaveBeenCalledWith(
    expect.objectContaining({ enterDelay: enterDelayOverride, arrow }),
    null,
  );
});
