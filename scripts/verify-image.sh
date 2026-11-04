#!/usr/bin/env bash
# Fail the build if the image is missing something the AC2100 needs to boot
# with working Wi-Fi, a working LuCI page and Chinese translations.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMG="$(find "$ROOT/openwrt/bin/targets/ramips/mt7621" -maxdepth 1 -name '*sysupgrade.bin' | head -n1)"

if [ -z "$IMG" ]; then
	echo "ERROR: no sysupgrade image found" >&2
	exit 1
fi

if ! command -v unsquashfs >/dev/null 2>&1; then
	echo "ERROR: unsquashfs not installed" >&2
	exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

tar -xf "$IMG" -C "$TMP"
ROOTFS_IMG="$(find "$TMP" -type f -name root | head -n1)"
[ -n "$ROOTFS_IMG" ] || { echo "ERROR: no rootfs in image" >&2; exit 1; }

unsquashfs -q -d "$TMP/rootfs" "$ROOTFS_IMG" >/dev/null
R="$TMP/rootfs"

fail=0
need_file() {
	if [ -e "$R$1" ]; then
		echo "OK   $1"
	else
		echo "MISS $1"
		fail=1
	fi
}
need_link() {
	if [ -L "$R$1" ]; then
		echo "OK   $1 (symlink)"
	else
		echo "MISS $1 (symlink)"
		fail=1
	fi
}

need_file /usr/sbin/wpad
need_file /usr/sbin/hostapd
need_file /usr/bin/jq
need_file /usr/sbin/umdns
need_file /www/luci-static/resources/view/travel/clients.js
need_file /etc/init.d/travel-router
need_link /etc/rc.d/S99travel-router
need_file /etc/hotplug.d/ieee80211/20-travel-router
need_file /www/luci-static/resources/view/travel/common.js
need_file /usr/lib/lua/luci/i18n/base.zh-cn.lmo

if ! find "$R/lib/modules" -name 'mt7603e.ko' | grep -q .; then
	echo "MISS mt7603e.ko"; fail=1
else
	echo "OK   mt7603e.ko"
fi

if ! find "$R/lib/modules" -name 'mt7615e.ko' | grep -q .; then
	echo "MISS mt7615e.ko"; fail=1
else
	echo "OK   mt7615e.ko"
fi

for fw in /lib/firmware/mediatek/mt7615_n9.bin /lib/firmware/mediatek/mt7615_cr4.bin /lib/firmware/mt7603_e2.bin; do
	need_file "$fw"
done

if ! grep -q 'umdns' "$R/usr/bin/travel-router"; then
	echo "MISS travel-router mDNS name support"; fail=1
else
	echo "OK   travel-router mDNS"
fi

if ! grep -q 'connected time' "$R/usr/bin/travel-router"; then
	echo "MISS travel-router connected-time sorting"; fail=1
else
	echo "OK   connected-time sorting"
fi

if ! grep -q 'baseclass.extend' "$R/www/luci-static/resources/view/travel/common.js"; then
	echo "MISS common.js is not a LuCI class"; fail=1
else
	echo "OK   common.js class"
fi

if [ "$fail" -ne 0 ]; then
	echo
	echo "ERROR: firmware verification failed" >&2
	exit 1
fi

echo
echo "Image verification passed: $IMG"
