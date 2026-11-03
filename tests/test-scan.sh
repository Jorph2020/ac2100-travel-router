#!/bin/sh
# Unit test for the iwinfo scan parser.  Runs on any POSIX shell.
set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

TRAVEL_ROUTER_LIB=1
export TRAVEL_ROUTER_LIB
. "$DIR/../package/travel-router-core/files/usr/bin/travel-router"

out=$(scan_parse 2g < "$DIR/fixtures/iwinfo-scan.txt")

printf '%s\n' "$out"

printf '%s\n' "$out" | grep -q '^MiFi-1234	AA:BB:CC:DD:EE:01	-45	2g	6	WPA2 PSK (CCMP)$' || {
	echo "FAIL: MiFi-1234 row" >&2
	exit 1
}

printf '%s\n' "$out" | grep -q '^FreeWiFi	AA:BB:CC:DD:EE:03	-78	2g	11	none$' || {
	echo "FAIL: FreeWiFi row" >&2
	exit 1
}

count=$(printf '%s\n' "$out" | grep -c .)
[ "$count" -eq 3 ] || {
	echo "FAIL: expected 3 rows, got $count" >&2
	exit 1
}

echo "scan parser: OK"
