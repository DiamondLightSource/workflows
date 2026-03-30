#!/bin/sh
set -eu

exec "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/local-profile-up.sh" "$@"
