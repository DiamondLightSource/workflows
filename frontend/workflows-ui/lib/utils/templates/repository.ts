import { TemplateSource } from "../../types";

export function templateSourceToLink(
  source: TemplateSource | string | null | undefined,
) {
  if (!source) {
    return null;
  }

  if (typeof source === "string") return source;
  let repo = source.repositoryUrl;
  let path = source.path;
  let rev = source.targetRevision;
  if (!repo || !path || !rev) {
    return null;
  }

  // Assumes a GitHub repo - this may need updating in future
  if (rev === "HEAD") {
    rev = "main";
  }

  if (repo.endsWith("/")) {
    repo = repo.slice(0, -1);
  }
  if (path.startsWith("/")) {
    path = path.slice(1);
  }
  return repo + "/tree/" + rev + "/" + path;
}
