#!/usr/bin/env bash
# Bump each chart's version from the conventional commits that touched it
# since its last chart-<name>-v<version> tag, using git-cliff.
#
# Run from the repository root. TARGET_REF is the branch to push to (default main).
# Requires git-cliff on PATH.
#
# Set DRY_RUN=true to preview: local tags for untagged charts are created (so a
# second run can compute real bumps), but nothing is written, committed or pushed.
set -euo pipefail

DRY_RUN="${DRY_RUN:-}"

versions=()   # "<chart> v<version>" entries for the commit message
refs=()       # tag refs to push

for dir in charts/*/; do
  [ -f "${dir}Chart.yaml" ] || continue
  chart=$(basename "$dir")
  file="${dir}Chart.yaml"
  current=$(sed -n 's/^version: *//p' "$file")
  tag="chart-${chart}-v${current}"

  # No tag for this version yet: first run, or a version bumped by hand.
  # Mark it released and bump nothing.
  if ! git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
    git tag "${tag}" "$(git log -1 --format=%H -- "charts/${chart}")"
    refs+=("${tag}")
    echo "${chart}: tagged ${tag}"
    continue
  fi

  next=$(git cliff \
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
  refs+=("chart-${chart}-v${next}")
done

if [ -n "${DRY_RUN}" ]; then
  if [ ${#versions[@]} -gt 0 ]; then
    echo "DRY RUN: would release $(printf '%s, ' "${versions[@]}" | sed 's/, $//')"
  fi
  echo "DRY RUN: no changes made (created local bootstrap tags)"
  exit 0
fi

if [ ${#versions[@]} -gt 0 ]; then
  git add -u charts
  git -c user.name="chart-release[bot]" \
    -c user.email="chart-release[bot]@users.noreply.github.com" \
    commit -m "chore(charts): release $(printf '%s, ' "${versions[@]}" | sed 's/, $//') [skip ci]"

  for ref in "${refs[@]}"; do
    git tag "${ref}"
  done
fi

if [ ${#refs[@]} -eq 0 ]; then
  echo "No chart releases."
else
  git push --atomic origin "HEAD:${TARGET_REF:-main}" "${refs[@]}"
  echo "Pushed ${#refs[@]} tag(s)."
fi
