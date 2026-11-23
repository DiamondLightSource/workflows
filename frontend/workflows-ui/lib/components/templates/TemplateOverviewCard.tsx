import { Card } from "@mui/material";
import TemplateOverviewCommon, {
  TemplateOverviewCommonProps,
} from "./TemplateOverviewCommon";
import { useTheme } from "@mui/material";

export default function TemplateOverviewCard(
  props: TemplateOverviewCommonProps,
) {
  const theme = useTheme();

  return (
    <Card elevation={2} sx={{ margin: theme.spacing(1) }}>
      <TemplateOverviewCommon {...props} />
    </Card>
  );
}
