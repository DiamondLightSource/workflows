#!/usr/bin/env bash
# Bump each chart's version from the conventional commits that touched it since
# the last chart-apps-v<version> tag (the single release anchor), using git-cliff.
#
# Only the app-of-apps chart (charts/apps) gets a tag. Every chart's version is
# bumped per its own commits; any change to any chart bumps charts/apps by at
# least a patch.
#
# Run from the repository root. TARGET_REF is the branch to push to (default main).
# Requires git-cliff on PATH.
#
# Set DRY_RUN=true to preview: local tags are created (so a second run can
# compute real bumps), but nothing is written, committed or pushed.
set -euo pipefail

DRY_RUN="${DRY_RUN:-}"

versions=()   # "<chart> v<version>" entries for the commit message
refs=()       # tag refs to push (only chart-apps-v<version>)

apps_dir="charts/apps"
apps_file="${apps_dir}/Chart.yaml"
apps_current=$(sed -n 's/^version: *//p' "${apps_file}")
apps_tag="chart-apps-v${apps_current}"

# No apps tag yet: first run, or the apps version was bumped by hand. Mark the
# current apps version released and stop.
if ! git rev-parse -q --verify "refs/tags/${apps_tag}" >/dev/null; then
  git tag "${apps_tag}" HEAD
  echo "${apps_tag}: bootstrapped"
  if [ -n "${DRY_RUN}" ]; then
    echo "DRY RUN: no changes made (created local tags)"
    exit 0
  fi
  git push --atomic origin "HEAD:${TARGET_REF:-main}" "${apps_tag}"
  echo "Pushed 1 tag(s)."
  exit 0
fi

# Nothing changed since the last apps tag: no release.
if [ -z "$(git log --format=%h "${apps_tag}..HEAD" -- charts/)" ]; then
  echo "No chart releases."
  exit 0
fi

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
if [ -n "${DRY_RUN}" ]; then
  versions+=("apps v${apps_next} (dry run)")
else
  sed -i "s/^version: .*/version: ${apps_next}/" "${apps_file}"
  versions+=("apps v${apps_next}")
fi
refs+=("chart-apps-v${apps_next}")

for dir in charts/*/; do
  [ -f "${dir}Chart.yaml" ] || continue
  [ "${dir%/}" = "${apps_dir}" ] && continue
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
  if [ -n "${DRY_RUN}" ]; then
    versions+=("${chart} v${next} (dry run)")
    continue
  fi
  sed -i "s/^version: .*/version: ${next}/" "${file}"
  versions+=("${chart} v${next}")
done

if [ -n "${DRY_RUN}" ]; then
  echo "DRY RUN: would release $(printf '%s, ' "${versions[@]}" | sed 's/, $//')"
  echo "DRY RUN: no changes made (created local tags)"
  exit 0
fi

if [ ${#versions[@]} -gt 0 ]; then
  git add -u charts
  git -c user.name="chart-release[bot]" \
    -c user.email="chart-release[bot]@users.noreply.github.com" \
    commit -m "chore(charts): release $(printf '%s, ' "${versions[@]}" | sed 's/, $//') [skip ci]"
fi

# Tags are created after the commit so they point at the released versions.
for ref in "${refs[@]}"; do
  git tag "${ref}"
done

if [ ${#refs[@]} -eq 0 ]; then
  echo "No chart releases."
else
  git push --atomic origin "HEAD:${TARGET_REF:-main}" "${refs[@]}"
  echo "Pushed ${#refs[@]} tag(s)."
fi
