#!/usr/bin/env bash
# Compute chart version bumps since the last chart-apps@v<version> tag
# and apply them to the working tree, using git-cliff.
#
# Prints to on stdout:
#   INITIAL chart-apps@vX.Y.Z      initial tag on first run
#   RELEASE <chart> vX, ...        version bumps applied to charts/<chart>/Chart.yaml
#   NONE                           nothing to release
#
# Run from the repository root. Requires git-cliff on PATH. Set DRY_RUN=true to
# preview changes that would be made.
set -euo pipefail

DRY_RUN="${DRY_RUN:-}"

apps_file="charts/apps/Chart.yaml"
apps_current=$(sed -n 's/^version: *//p' "${apps_file}")
apps_tag="chart-apps@v${apps_current}"

# No apps tag yet: first run. Create an initial for the current state.
if ! git rev-parse -q --verify "refs/tags/${apps_tag}" >/dev/null; then
  git tag "${apps_tag}" HEAD
  echo "INITIAL ${apps_tag}"
  exit 0
fi

# Nothing changed since the last apps tag: no release.
if [ -z "$(git log --format=%h "${apps_tag}..HEAD" -- charts/)" ]; then
  echo "NONE"
  exit 0
fi

bumped=()

# Determine next charts/apps version
apps_next=$(git cliff "${apps_tag}..HEAD" \
  --include-path "charts/apps/**" \
  --tag-pattern "chart-apps@v[0-9]*" \
  --bumped-version 2>/dev/null)
apps_next=${apps_next#chart-apps@v}
if [ -z "${apps_next}" ]; then
  echo "error: could not determine the next version for apps" >&2
  exit 1
fi
if [ "${apps_next}" = "${apps_current}" ]; then
  # apps itself but another changed. Patch bump apps.
  apps_next=$(awk -F. '{$NF=$NF+1; print}' OFS=. <<<"${apps_current}")
fi
echo "apps: ${apps_current} -> ${apps_next}"
bumped+=("apps v${apps_next}")
if [ "${DRY_RUN:-false}" != "true" ]; then
  sed -i "s/^version: .*/version: ${apps_next}/" "${apps_file}"
fi

# Determine next charts/apps version
for dir in charts/*/; do
  [ -f "${dir}Chart.yaml" ] || continue
  [ "${dir%/}" = "charts/apps" ] && continue
  chart=$(basename "${dir}")
  file="${dir}Chart.yaml"
  current=$(sed -n 's/^version: *//p' "${file}")
  # Baseline = this chart's released version at the last apps tag.
  baseline=$(git show "${apps_tag}:${file}" 2>/dev/null | sed -n 's/^version: *//p')
  baseline="${baseline:-${current}}"   # chart added after the apps tag

  # Temporary tag needed by git-cliff to compute
  # this chart's version bump since last release
  git tag -f "temporary-chart-${chart}@v${baseline}" "${apps_tag}" >/dev/null

  next=$(git cliff "${apps_tag}..HEAD" \
    --include-path "charts/${chart}/**" \
    --tag-pattern "temporary-chart-${chart}@v[0-9]*" \
    --bumped-version 2>/dev/null)
  next=${next#temporary-chart-"${chart}"@v}

  git tag -d "temporary-chart-${chart}@v${baseline}" >/dev/null

  if [ -z "${next}" ]; then
    echo "error: could not determine the next version for ${chart}" >&2
    exit 1
  fi
  if [ "${next}" = "${current}" ]; then
    continue
  fi

  echo "${chart}: ${current} -> ${next}"
  bumped+=("${chart} v${next}")
  if [ "${DRY_RUN:-false}" != "true" ]; then
    sed -i "s/^version: .*/version: ${next}/" "${file}"
  fi
done

if [ ${#bumped[@]} -eq 0 ]; then
  echo "NONE"
  exit 0
fi

echo "RELEASE $(printf '%s, ' "${bumped[@]}" | sed 's/, $//')"
