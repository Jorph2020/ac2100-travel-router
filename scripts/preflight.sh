#!/bin/bash
# Fast local checks before pushing a firmware build.
# It verifies the packaging rules and boot-critical files without waiting for CI.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail=0
ok()   { printf 'OK   %s\n' "$*"; }
bad()  { printf 'FAIL %s\n' "$*"; fail=1; }
need() { if [ -e "$1" ]; then ok "$1"; else bad "missing $1"; fi; }
grepq(){ if grep -q "$2" "$1" 2>/dev/null; then ok "$3"; else bad "$3"; fi; }

# 1. Workflow syntax and action versions
if command -v ruby >/dev/null 2>&1; then
	ruby -ryaml -e 'YAML.load_file(ARGV[0])' "$ROOT/.github/workflows/build.yml" \
		&& ok "workflow YAML" || bad "workflow YAML"
fi
for a in 'actions/checkout@v7' 'actions/cache@v6' 'actions/upload-artifact@v7'; do
	grepq "$ROOT/.github/workflows/build.yml" "$a" "workflow uses $a"
done
grepq "$ROOT/.github/workflows/build.yml" 'set -o pipefail' 'verify output logged'
grepq "$ROOT/.github/workflows/build.yml" 'cancel-in-progress: true' 'concurrency cancel enabled'

# 2. Package rules
grepq "$ROOT/package/shellcrash-bundle/Makefile" 'rm -f $(1)/etc/rc.d/S99shellcrash' 'stale S99 removed'
grepq "$ROOT/package/travel-router-core/Makefile" '99-travel-wireless-css' 'wireless CSS installed'
grepq "$ROOT/package/travel-router-core/files/etc/init.d/travel-router" 'wifi reload' 'AP watchdog'
grepq "$ROOT/package/travel-router-core/files/usr/bin/travel-router" 'bridge fdb' 'wired client detection'
grepq "$ROOT/package/shellcrash-bundle/files/configs/ShellCrash.cfg" 'network_check=OFF' 'ShellCrash network check off'
grepq "$ROOT/package/shellcrash-bundle/files/configs/ShellCrash.cfg" "hostdir=':9998/ui'" 'Yacd port 9998'
if grep -q 'start.sh start' "$ROOT/package/shellcrash-bundle/files/init.d/shellcrash"; then
	bad "ShellCrash init recursion risk"
else
	ok "ShellCrash init has no recursion"
fi

# 3. Fake package root: only installed files that matter
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/etc/rc.d" "$TMP/etc/uci-defaults" "$TMP/etc/init.d"
# shellcrash bundle install intentionally does not create S99
[ -e "$TMP/etc/rc.d/S99shellcrash" ] && bad "fake root has S99shellcrash" || ok "fake root has no S99shellcrash"
cp "$ROOT/package/travel-router-core/files/etc/uci-defaults/99-travel-wireless-css" "$TMP/etc/uci-defaults/"
cp "$ROOT/package/travel-router-core/files/etc/init.d/travel-router" "$TMP/etc/init.d/"
cp "$ROOT/package/shellcrash-bundle/files/init.d/shellcrash" "$TMP/etc/init.d/"
need "$TMP/etc/uci-defaults/99-travel-wireless-css"
need "$TMP/etc/init.d/travel-router"
need "$TMP/etc/init.d/shellcrash"

# 4. Verify script rules
grepq "$ROOT/scripts/verify-image.sh" 'need_file /etc/uci-defaults/99-travel-wireless-css' 'verify CSS check'
grepq "$ROOT/scripts/verify-image.sh" 'S99shellcrash' 'verify no-autostart check'
grepq "$ROOT/scripts/verify-image.sh" 'sudo -n unsquashfs' 'verify sudo unsquashfs'

echo
if [ "$fail" -ne 0 ]; then
	echo "PREFLIGHT FAILED"
	exit 1
fi
echo "PREFLIGHT PASSED"
