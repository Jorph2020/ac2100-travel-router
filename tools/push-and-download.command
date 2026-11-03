#!/bin/bash
# Double-click (or: open -a Terminal this-file) to:
#   1. ask for a GitHub token (hidden input)
#   2. store it in the macOS keychain
#   3. push the current commit
#   4. wait for the GitHub Actions lite build
#   5. download the firmware to ~/Desktop/ac2100-firmware
#   6. on failure, download the build log so the agent can fix it
set -u

OWNER="Jorph2020"
REPO_NAME="ac2100-travel-router"
REPO_DIR="/Users/zhoufukang/Documents/deepseek-harness/default-workspace/ac2100-travel-router"

cd "$REPO_DIR" || exit 1

printf "GitHub token (classic: repo + workflow): "
stty -echo
read -r TOKEN
stty echo
echo

if [ -z "$TOKEN" ]; then
	echo "没有输入 token，退出。"
	exit 1
fi

printf 'protocol=https\nhost=github.com\nusername=%s\npassword=%s\n\n' "$OWNER" "$TOKEN" \
	| git credential-osxkeychain store 2>/dev/null || true

ASKPASS=$(mktemp /tmp/ac2100-askpass.XXXXXX)
cat > "$ASKPASS" <<'ASKPASS_EOF'
#!/bin/sh
case "$1" in
	*Username*) printf '%s\n' "$GH_USER" ;;
	*Password*) printf '%s\n' "$GH_PASS" ;;
esac
ASKPASS_EOF
chmod 700 "$ASKPASS"

echo "==> 推送代码"
if ! GH_USER="$OWNER" GH_PASS="$TOKEN" GIT_ASKPASS="$ASKPASS" GIT_TERMINAL_PROMPT=0 git push origin main; then
	rm -f "$ASKPASS"
	echo "推送失败：检查 token 的 repo + workflow 权限。"
	exit 1
fi
rm -f "$ASKPASS"

SHA=$(git rev-parse HEAD)
echo "==> 等待编译（提交 ${SHA:0:7}）"
echo "   这个窗口不要关，编译约 30-90 分钟。"

RUN_ID=""
for _ in $(seq 1 120); do
	RUN_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" \
		"https://api.github.com/repos/$OWNER/$REPO_NAME/actions/runs?per_page=10")
	RUN_ID=$(printf '%s' "$RUN_JSON" | python3 -c '
import sys, json
d = json.load(sys.stdin)
sha = sys.argv[1]
for r in d.get("workflow_runs", []):
    if r.get("head_sha") == sha:
        print(r["id"])
        break
' "$SHA")
	[ -n "$RUN_ID" ] && break
	sleep 10
done

if [ -z "$RUN_ID" ]; then
	echo "没有找到这次提交对应的 Actions 运行。"
	exit 1
fi

echo "   Run: https://github.com/$OWNER/$REPO_NAME/actions/runs/$RUN_ID"

STATUS=""
CONCLUSION=""
while :; do
	RUN_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" \
		"https://api.github.com/repos/$OWNER/$REPO_NAME/actions/runs/$RUN_ID")
	STATUS=$(printf '%s' "$RUN_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("status",""))')
	CONCLUSION=$(printf '%s' "$RUN_JSON" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("conclusion","") or "")')
	printf "\r    状态: %s %s   " "$STATUS" "$CONCLUSION"
	if [ "$STATUS" = "completed" ]; then
		echo
		break
	fi
	sleep 20
done

ART_JSON=$(curl -s -H "Authorization: Bearer $TOKEN" \
	"https://api.github.com/repos/$OWNER/$REPO_NAME/actions/runs/$RUN_ID/artifacts")

mkdir -p "$REPO_DIR/out"

if [ "$CONCLUSION" = "success" ]; then
	ART_URL=$(printf '%s' "$ART_JSON" | python3 -c '
import sys, json
for a in json.load(sys.stdin).get("artifacts", []):
    if a["name"].startswith("ac2100-travel-router-lite"):
        print(a["archive_download_url"])
        break
')
	if [ -z "$ART_URL" ]; then
		echo "编译成功，但没找到 lite Artifact。"
		exit 1
	fi

	echo "==> 下载固件"
	curl -sL -H "Authorization: Bearer $TOKEN" "$ART_URL" -o "$REPO_DIR/out/firmware.zip"
	rm -rf "$REPO_DIR/out/firmware"
	mkdir -p "$REPO_DIR/out/firmware"
	unzip -oq "$REPO_DIR/out/firmware.zip" -d "$REPO_DIR/out/firmware"

	DESKTOP_DIR="$HOME/Desktop/ac2100-firmware"
	mkdir -p "$DESKTOP_DIR"
	cp "$REPO_DIR/out/firmware/"* "$DESKTOP_DIR/" 2>/dev/null

	echo
	echo "==> 完成"
	echo "固件已放到：$DESKTOP_DIR"
	ls -lh "$DESKTOP_DIR"
	open "$DESKTOP_DIR"
	echo
	echo "刷机：台式机 LuCI → System → Backup / Flash Firmware"
	echo "选择 *-squashfs-sysupgrade.bin，取消“保留配置”，点 Flash。"
else
	echo
	echo "==> 编译失败，下载 build-log"
	LOG_URL=$(printf '%s' "$ART_JSON" | python3 -c '
import sys, json
for a in json.load(sys.stdin).get("artifacts", []):
    if a["name"].startswith("build-log"):
        print(a["archive_download_url"])
        break
')
	if [ -n "$LOG_URL" ]; then
		curl -sL -H "Authorization: Bearer $TOKEN" "$LOG_URL" -o "$REPO_DIR/out/build-log.zip"
		rm -rf "$REPO_DIR/out/build-log"
		mkdir -p "$REPO_DIR/out/build-log"
		unzip -oq "$REPO_DIR/out/build-log.zip" -d "$REPO_DIR/out/build-log"
		find "$REPO_DIR/out/build-log" -name 'build.log' -exec cp {} "$REPO_DIR/build-last.log" \;
		echo "日志已保存：$REPO_DIR/build-last.log"
		open "$REPO_DIR/out/build-log"
	else
		echo "没有 build-log，Artifacts 列表为空。"
	fi
	echo "把这个窗口的内容或 build-last.log 发给 agent。"
fi

echo
echo "token 已存入钥匙串，后续 agent 可以直接 push。"
