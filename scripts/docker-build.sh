#!/usr/bin/env bash
#
# Build the firmware inside a Debian container.  Works on macOS and Linux
# without installing the OpenWrt build dependencies on the host.
#
# The container runs as uid 1000.  On Linux, either make sure your user has
# uid 1000 or run the build directly with ./scripts/build.sh.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! command -v docker >/dev/null 2>&1; then
	echo "docker was not found; install Docker Desktop or run ./scripts/build.sh on Linux" >&2
	exit 1
fi

docker build -t ac2100-travel-router-builder -f Dockerfile .
mkdir -p out openwrt

docker run --rm -it \
	-v "$PWD:/src" \
	ac2100-travel-router-builder
