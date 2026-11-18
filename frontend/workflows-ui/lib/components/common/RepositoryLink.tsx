import { ArrowForwardIos, GitHub } from "@mui/icons-material";
import {
  Button,
  ButtonProps,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { TemplateSource } from "../../types";
import { templateSourceToLink } from "../../utils/templates/repository";

type ButtonVariants = ButtonProps["variant"];
type ButtonColours = ButtonProps["color"];

export interface RepositoryLinkBaseProps {
  /**
   * A string link or TemplateSource object (as retrieved by the `templateSource` field of a `workflowTemplate` query)
   * that will redirected to when the button is clicked
   */
  repository?: TemplateSource | string | null;
  /** Disply the full button or just the logo icon. `auto` will select based on screen size */
  variant?: "icon" | "full" | "auto";
  /** Disables the link when true */
  disabled?: boolean;
  /** The variant of button used */
  buttonVariant?: ButtonVariants;
  /** The colour of button used */
  colour?: ButtonColours;
  /** The text to display in the button */
  label?: string;
}

const Icon = ({ label }: { label?: string }) => {
  return (
    <Tooltip title={label ?? "Go to repository"}>
      <GitHub />
    </Tooltip>
  );
};

const TextButtonContents = ({ label }: { label: string }) => {
  return (
    <Stack direction={"row"} spacing={1}>
      <GitHub sx={{ alignSelf: "center" }} />
      <Typography sx={{ paddingTop: 0.25 }}>{label}</Typography>
      <ArrowForwardIos fontSize="inherit" sx={{ alignSelf: "center" }} />
    </Stack>
  );
};

export function RepositoryLink({
  repository,
  variant = "auto",
  disabled = false,
  buttonVariant = "outlined",
  colour = "secondary",
  label = "Template repository",
}: RepositoryLinkBaseProps) {
  const theme = useTheme();
  const link = templateSourceToLink(repository);
  const smallScreen = useMediaQuery(theme.breakpoints.down("xl"));
  const iconMode = variant === "icon" || (variant === "auto" && smallScreen);

  return (
    <Button
      aria-label={label}
      variant={buttonVariant}
      {...(!link || disabled
        ? { disabled: true }
        : { href: link, color: colour })}
    >
      {iconMode ? <Icon label={label} /> : <TextButtonContents label={label} />}
    </Button>
  );
}

export default RepositoryLink;
