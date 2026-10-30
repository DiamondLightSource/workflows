#!/usr/bin/env bash
# Bump each chart's version from the conventional commits that touched it
# since its last chart-<name>-v<version> tag.
#
# fix / perf -> patch, feat -> minor, "type!:" or BREAKING CHANGE -> major.
# Nothing else bumps. Only the top-level `version:` line is rewritten, so no
# file is reformatted.
#
# Run from the repository root. TARGET_REF is the branch to push to (default main).
set -euo pipefail

versions=()   # "<chart> v<version>" entries for the commit message
refs=()       # tag refs to push

for dir in charts/*/; do
  [ -f "${dir}Chart.yaml" ] || continue
  chart=$(basename "$dir")
  file="${dir}Chart.yaml"
  current=$(sed -n 's/^version: *//p' "$file")

  tag=$(git tag --merged HEAD --list "chart-${chart}-v[0-9]*" --sort=-v:refname | head -n1)

  if [ -z "${tag}" ]; then
    # Bootstrap: record the chart's current state as released, bump nothing.
    git tag "chart-${chart}-v${current}" "$(git log -1 --format=%H -- "charts/${chart}")"
    refs+=("chart-${chart}-v${current}")
    echo "${chart}: bootstrapped at ${current}"
    continue
  fi

  range="${tag}..HEAD"
  subjects=$(git log --format=%s "${range}" -- "charts/${chart}")
  [ -n "${subjects}" ] || continue

  if printf '%s\n' "${subjects}" | grep -qE '^[a-zA-Z]+(\([^)]+\))?!:' \
    || git log --format=%B "${range}" -- "charts/${chart}" | grep -qE '^BREAKING[ -]CHANGE:'; then
    part="major"
  elif printf '%s\n' "${subjects}" | grep -qE '^feat(\([^)]+\))?:'; then
    part="minor"
  elif printf '%s\n' "${subjects}" | grep -qE '^(fix|perf)(\([^)]+\))?:'; then
    part="patch"
  else
    continue
  fi

  IFS=. read -r maj min pat <<< "${current}"
  case "${part}" in
    major) maj=$((maj + 1)); min=0; pat=0 ;;
    minor) min=$((min + 1)); pat=0 ;;
    patch) pat=$((pat + 1)) ;;
  esac
  new="${maj}.${min}.${pat}"

  VERSION="${new}" perl -i -pe 's/^version: \K.*/$ENV{VERSION}/' "${file}"
  versions+=("${chart} v${new}")
  refs+=("chart-${chart}-v${new}")
  echo "${chart}: ${current} -> ${new} (${part})"
done

if [ ${#versions[@]} -gt 0 ]; then
  git add -u charts
  git -c user.name="chart-release[bot]" \
    -c user.email="chart-release[bot]@users.noreply.github.com" \
    commit -m "chore(charts): release $(printf '%s, ' "${versions[@]}" | sed 's/, $//') [skip ci]"

  # Tags are created after the commit so they point at the released versions.
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
