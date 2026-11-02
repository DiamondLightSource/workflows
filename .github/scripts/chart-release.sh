#!/usr/bin/env bash
# Compute chart version bumps since the last chart-apps-v<version> tag (the
# single release anchor) and apply them to the working tree, using git-cliff.
#
# Prints a single status line on stdout:
#   BOOTSTRAP chart-apps-vX.Y.Z   baseline tag created locally; push it
#   RELEASE <chart> vX, ...        bumps applied to the working tree
#   NONE                           nothing to release
#
# Run from the repository root. Requires git-cliff on PATH. Set DRY_RUN=true to
# preview: local tags are created and bumps are printed, but not applied.
set -euo pipefail

DRY_RUN="${DRY_RUN:-}"

apps_file="charts/apps/Chart.yaml"
apps_current=$(sed -n 's/^version: *//p' "${apps_file}")
apps_tag="chart-apps-v${apps_current}"

# No apps tag yet: first run. Establish the baseline at the current state.
if ! git rev-parse -q --verify "refs/tags/${apps_tag}" >/dev/null; then
  git tag "${apps_tag}" HEAD
  echo "BOOTSTRAP ${apps_tag}"
  exit 0
fi

# Nothing changed since the last apps tag: no release.
if [ -z "$(git log --format=%h "${apps_tag}..HEAD" -- charts/)" ]; then
  echo "NONE"
  exit 0
fi

bumped=()   # "<chart> v<version>" entries for the commit message

# apps version: its own commits, floored to a patch bump when any chart changed.
apps_next=$(git cliff "${apps_tag}..HEAD" \
  --include-path "charts/apps/**" \
  --tag-pattern "chart-apps-v[0-9]*" \
  --bumped-version 2>/dev/null)
apps_next=${apps_next#chart-apps-v}
if [ -z "${apps_next}" ]; then
  echo "error: could not determine the next version for apps" >&2
  exit 1
fi
if [ "${apps_next}" = "${apps_current}" ]; then
  # apps untouched but something changed: at least a patch bump.
  apps_next=$(awk -F. '{$NF=$NF+1; print}' OFS=. <<<"${apps_current}")
fi
echo "apps: ${apps_current} -> ${apps_next}"
bumped+=("apps v${apps_next}")
if [ -z "${DRY_RUN}" ]; then
  sed -i "s/^version: .*/version: ${apps_next}/" "${apps_file}"
fi

for dir in charts/*/; do
  [ -f "${dir}Chart.yaml" ] || continue
  [ "${dir%/}" = "charts/apps" ] && continue
  chart=$(basename "${dir}")
  file="${dir}Chart.yaml"
  current=$(sed -n 's/^version: *//p' "${file}")
  # Baseline = this chart's released version at the last apps tag.
  baseline=$(git show "${apps_tag}:${file}" 2>/dev/null | sed -n 's/^version: *//p')
  baseline="${baseline:-${current}}"   # chart added after the apps tag

  # Ephemeral local tag anchored at the apps tag so git-cliff can compute this
  # chart's own bump. Never pushed.
  git tag -f "chart-${chart}-v${baseline}" "${apps_tag}" >/dev/null

  next=$(git cliff "${apps_tag}..HEAD" \
    --include-path "charts/${chart}/**" \
    --tag-pattern "chart-${chart}-v[0-9]*" \
    --bumped-version 2>/dev/null)
  next=${next#chart-"${chart}"-v}
  if [ -z "${next}" ]; then
    echo "error: could not determine the next version for ${chart}" >&2
    exit 1
  fi
  if [ "${next}" = "${current}" ]; then
    continue
  fi

  echo "${chart}: ${current} -> ${next}"
  bumped+=("${chart} v${next}")
  if [ -z "${DRY_RUN}" ]; then
    sed -i "s/^version: .*/version: ${next}/" "${file}"
  fi
done

if [ ${#bumped[@]} -eq 0 ]; then
  echo "NONE"
  exit 0
fi

echo "RELEASE $(printf '%s, ' "${bumped[@]}" | sed 's/, $//')"
