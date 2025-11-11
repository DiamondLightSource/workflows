import { GitHub } from "@mui/icons-material";
import { Stack, Tooltip } from "@mui/material";

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
    <Stack direction={"row"} justifyContent={"center"}>
      <div>
        <GitHub />
      </div>
      <div>Visit the repository</div>
    </Stack>
  );
};

const GitHubNavigator = ({
  repository,
  variant = "Icon",
}: {
  repository: string | null | undefined;
  variant?: "Icon" | "TextIcon";
}) => {
  return repository ? (
    <a
      href={repository}
      target="_blank"
      onClick={(event) => {
        event.stopPropagation();
      }}
      style={{
        color: "inherit",
      }}
    >
      {(() => {
        if (variant === "Icon") {
          return <PlainIcon />;
        } else {
          return <TextIcon />;
        }
      })()}
    </a>
  ) : (
    <NoRepoIcon />
  );
};

export default GitHubNavigator;
