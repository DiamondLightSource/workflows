import TemplateOverviewCommon, {
  TemplateOverviewCommonProps,
} from "./TemplateOverviewCommon";
import { ButtonBase, Card } from "@mui/material";
import { useTheme } from "@mui/material";

export interface TemplateOverviewButtonProps {
  cardProps: TemplateOverviewCommonProps;
  selected: boolean;
  onSelect: () => void;
}

export default function TemplateOverviewButton({
  cardProps,
  selected,
  onSelect,
}: TemplateOverviewButtonProps) {
  const theme = useTheme();

  return (
    <Card
      elevation={2}
      sx={{
        margin: theme.spacing(1),
        transition: "all 0.3s ease",
        bgcolor: selected ? theme.vars?.palette.info.container : undefined,
        outline: "2px solid",
        outlineColor: "transparent",
        "&:hover": { outlineColor: theme.vars?.palette.primary.light },
      }}
    >
      <ButtonBase
        aria-label={"focus " + cardProps.name + " card"}
        onClick={onSelect}
        sx={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      >
        <TemplateOverviewCommon {...cardProps} />
      </ButtonBase>
    </Card>
  );
}
