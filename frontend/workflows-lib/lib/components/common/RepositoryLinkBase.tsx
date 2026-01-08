import { GitHub } from "@mui/icons-material";
import { Link, Stack, Tooltip, Typography } from "@mui/material";
import { TemplateSource } from "../../types";
import { templateSourceToLink } from "../../utils/commonUtils";

export interface RepositoryLinkBaseProps {
  repository?: TemplateSource | string | null;
  variant?: "Icon" | "TextIcon";
}

const NoRepoIcon = () => {
  return (
    <Tooltip title="No repository found">
      <GitHub color="disabled" />
    </Tooltip>
  );
};

const PlainIcon = () => {
  return (
    <Tooltip title="Go to repository">
      <GitHub />
    </Tooltip>
  );
};

const TextIcon = () => {
  return (
    <Stack direction={"row"} spacing={1}>
      <GitHub />
      <Typography sx={{ paddingTop: 0.25 }}>Visit the repository</Typography>
    </Stack>
  );
};

const RepositoryLinkBase = ({
  repository,
  variant = "Icon",
}: RepositoryLinkBaseProps) => {
  const link = templateSourceToLink(repository);

  return link ? (
    <Link href={link} target="_blank">
      {variant === "Icon" ? <PlainIcon /> : <TextIcon />}
    </Link>
  ) : (
    <NoRepoIcon />
  );
};

export default RepositoryLinkBase;
