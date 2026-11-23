import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipProps,
  Typography,
  TypographyProps,
} from "@mui/material";

type ContractedTypographyProps = TypographyProps & {
  noWrapAfterLines?: number;
  tooltipProps?: Partial<TooltipProps>;
};

export default function ContractedTypography({
  noWrapAfterLines = 1,
  tooltipProps,
  ...typographyProps
}: ContractedTypographyProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    if (divRef.current?.firstChild === undefined) {
      console.log("returning early");
      setOverflowing(false);
      return;
    }
    const widthElement = divRef.current.firstChild as Element;

    const lineHeightStr = window.getComputedStyle(
      widthElement,
      null,
    ).lineHeight;
    const lineHeightNum = Number.parseFloat(
      lineHeightStr.substring(0, lineHeightStr.length - 2),
    );

    const maxNonOverflowHeight = lineHeightNum * (noWrapAfterLines + 1) - 1;

    setOverflowing(widthElement.scrollHeight > maxNonOverflowHeight);
  }, [noWrapAfterLines]);

  return (
    <Tooltip
      title={
        overflowing
          ? tooltipProps !== undefined && tooltipProps.title
            ? tooltipProps.title
            : typographyProps.children
          : ""
      }
      disableInteractive
      enterDelay={1000}
      enterNextDelay={500}
      {...tooltipProps}
    >
      <div ref={divRef}>
        <Typography
          {...typographyProps}
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: noWrapAfterLines,
            WebkitBoxOrient: "vertical",
            // eslint-disable-next-line @typescript-eslint/no-misused-spread
            ...typographyProps.sx,
          }}
        />
      </div>
    </Tooltip>
  );
}
