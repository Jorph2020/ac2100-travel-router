#!/usr/bin/env bash
#
# Build the AC2100 travel router firmware image.
#
# Requirements: Linux (x86_64), git, the usual OpenWrt build dependencies and
# roughly 25 GB of free disk space.  On macOS use Docker (scripts/docker-build.sh)
# or the GitHub Actions workflow instead.
#
# Environment variables:
#   OPENWRT_VERSION  OpenWrt tag to build (default: v24.10.8)
#   BUILD_DIR        OpenWrt checkout directory (default: <repo>/openwrt)
#   JOBS             Parallel make jobs (default: number of CPUs)

set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENWRT_VERSION="${OPENWRT_VERSION:-v24.10.8}"
BUILD_DIR="${BUILD_DIR:-$ROOT/openwrt}"
JOBS="${JOBS:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)}"
CONFIG_FILE="${CONFIG_FILE:-$ROOT/config/ac2100.config}"
case "$CONFIG_FILE" in
	/*) ;;
	*) CONFIG_FILE="$ROOT/$CONFIG_FILE" ;;
esac
LOG="$ROOT/build.log"
# Capture everything, including failures before make starts, so the log
# artifact is always useful.
exec > >(tee -a "$LOG") 2>&1

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

if [ "$(uname -s)" != "Linux" ]; then
	die "OpenWrt 只能在 Linux 上编译。macOS 请使用 Docker 或 GitHub Actions。"
fi

log "OpenWrt $OPENWRT_VERSION -> $BUILD_DIR ($JOBS jobs)"

CACHE_DL="$ROOT/.openwrt-dl-cache"

if [ ! -d "$BUILD_DIR/.git" ]; then
	# The GitHub Actions cache restores openwrt/dl before this script runs,
	# so the build directory may exist without being a git checkout.
	if [ -d "$BUILD_DIR" ]; then
		log "Existing non-git build directory found, preserving downloads"
		rm -rf "$CACHE_DL"
		[ -d "$BUILD_DIR/dl" ] && mv "$BUILD_DIR/dl" "$CACHE_DL"
		rm -rf "$BUILD_DIR"
	fi

	log "Cloning OpenWrt"
	git clone --depth 1 --branch "$OPENWRT_VERSION" \
		https://github.com/openwrt/openwrt.git "$BUILD_DIR"

	if [ -d "$CACHE_DL" ]; then
		mkdir -p "$BUILD_DIR/dl"
		mv "$CACHE_DL"/* "$BUILD_DIR/dl/" 2>/dev/null || true
		rm -rf "$CACHE_DL"
	fi
else
	log "Reusing existing checkout"
fi

cd "$BUILD_DIR"

log "Configuring feeds"
cp "$ROOT/feeds.conf" feeds.conf
./scripts/feeds update -a
./scripts/feeds install -a

log "Installing local packages"
rm -rf package/travel-router-core package/luci-app-travel-router
cp -a "$ROOT/package/." package/

log "Generating .config from $CONFIG_FILE"
[ -f "$CONFIG_FILE" ] || die "Config file not found: $CONFIG_FILE"
cp "$CONFIG_FILE" .config
make defconfig

grep -q '^CONFIG_TARGET_ramips_mt7621_DEVICE_xiaomi_redmi-router-ac2100=y' .config \
	|| die "AC2100 device profile was not selected"
grep -q '^CONFIG_PACKAGE_luci-app-travel-router=y' .config \
	|| die "luci-app-travel-router was not selected"
log "Variant: $(basename "$CONFIG_FILE" .config)"

# Warn about packages that would produce an image without Wi-Fi.  Do not
# abort the build here: a wrong symbol name should not cost a full rebuild.
grep -Eq '^CONFIG_PACKAGE_wpad-(mbedtls|basic-mbedtls)=y' .config \
	|| log "WARNING: no wpad selected, Wi-Fi may not start"
grep -q '^CONFIG_PACKAGE_kmod-mt7603=y' .config \
	|| log "WARNING: kmod-mt7603 not selected, 2.4 GHz may not work"
grep -q '^CONFIG_PACKAGE_kmod-mt7615-firmware=y' .config \
	|| log "WARNING: kmod-mt7615-firmware not selected, 5 GHz may not work"
grep -q '^CONFIG_LUCI_LANG_zh_Hans=y' .config \
	|| log "WARNING: CONFIG_LUCI_LANG_zh_Hans not selected, Chinese may be incomplete"

log "Downloading sources (best effort)"
make download -j"$JOBS" >/dev/null 2>&1 || true

log "Building firmware (this takes 60-150 minutes)"
set -o pipefail
if ! make -j"$JOBS" 2>&1 | tee "$LOG"; then
	log "Build failed, retrying single-threaded for a readable error"
	make -j1 V=s 2>&1 | tee -a "$LOG" || die "Build failed, see $LOG"
fi

log "Collecting artifacts"
rm -rf "$ROOT/out"
mkdir -p "$ROOT/out"
find bin/targets/ramips/mt7621 -maxdepth 1 -type f \
	\( -name '*sysupgrade.bin' -o -name '*kernel1.bin' -o -name '*rootfs0.bin' -o -name '*initramfs-kernel.bin' \) \
	-exec cp -f {} "$ROOT/out/" \;

[ -n "$(ls -A "$ROOT/out" 2>/dev/null)" ] || die "No firmware images were produced"
( cd "$ROOT/out" && sha256sum ./*.bin > sha256sums )

ls -lh "$ROOT/out"
log "Done"
