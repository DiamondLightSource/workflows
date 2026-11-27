import { Divider, Stack } from "@mui/material";
import { kebabToTitle } from "../../utils";
import { useTheme } from "@mui/material/styles";
import ContractedTypography from "../common/ContractedTypography";

// NOT for exporting from the library

export interface TemplateOverviewCommonProps {
  title: string | null;
  name: string;
  maintainer: string;
  description: string | null;
}

export default function TemplateOverviewCommon({
  title,
  name,
  maintainer,
  description,
}: TemplateOverviewCommonProps) {
  const theme = useTheme();

  const cardTitleText = title === null ? kebabToTitle(name) : title;
  const cardDescriptionText =
    description === null ? "No description." : description;

  return (
    <Stack padding={theme.spacing(1)} textAlign="left">
      <ContractedTypography variant="h5" tooltipProps={{ placement: "top" }}>
        {cardTitleText}
      </ContractedTypography>
      <Stack
        direction="row"
        spacing={theme.spacing(1)}
        color={theme.vars?.palette.text.secondary}
      >
        <ContractedTypography
          variant="subtitle1"
          tooltipProps={{ placement: "top" }}
        >
          {name}
        </ContractedTypography>
        <Divider orientation="vertical" flexItem />
        <ContractedTypography
          variant="subtitle1"
          tooltipProps={{ placement: "top" }}
        >
          {maintainer}
        </ContractedTypography>
      </Stack>
      <ContractedTypography noWrapAfterLines={3}>
        {cardDescriptionText}
      </ContractedTypography>
    </Stack>
  );
}
