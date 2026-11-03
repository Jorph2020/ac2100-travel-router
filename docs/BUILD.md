# 编译指南

本项目基于 OpenWrt 24.10.8 源码编译，额外加入：

- `travel-router-core`：中继后端脚本与首次启动默认值
- `luci-app-travel-router`：类 MT3000 的 LuCI 页面
- `luci-app-openclash`：来自 OpenClash feed（固定 commit）

## 方式一：GitHub Actions（推荐）

1. 新建 GitHub 仓库，把本项目全部文件推送上去。
2. **Actions** 页面启用 workflows。
3. 选择 **Build AC2100 travel router firmware** → **Run workflow**。
   - `openwrt_version` 默认 `v24.10.8`，可改成其他 24.10.x tag。
4. 首次编译约 60–150 分钟；之后有 `openwrt/dl` 缓存会快一些。
5. 完成后在运行页面底部下载 Artifact。

Actions 会自动释放磁盘、安装依赖并执行 `./scripts/build.sh`。若失败，可下载
`build-log-<run>` 查看完整日志。

## 方式二：Linux 本机

### 依赖（Debian/Ubuntu）

```bash
sudo apt update
sudo apt install build-essential clang flex bison g++ gawk gcc-multilib \
  g++-multilib gettext git libncurses-dev libssl-dev libelf-dev python3 \
  python3-setuptools python3-pyelftools rsync swig unzip zlib1g-dev file wget
```

### 编译

```bash
./scripts/build.sh
```

脚本会：

1. 浅克隆 OpenWrt `v24.10.8` 到 `./openwrt/`（可用 `BUILD_DIR` 改路径）
2. 复制 `feeds.conf`，执行 `feeds update/install`
3. 复制 `package/` 下的本地包
4. 复制 `config/ac2100.config` 为 `.config`，执行 `make defconfig`
5. 校验设备 profile 与关键包已选中
6. `make -j$(nproc)`；失败时自动用 `-j1 V=s` 重跑并记录日志
7. 把镜像复制到 `./out/`

常用环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OPENWRT_VERSION` | `v24.10.8` | OpenWrt tag |
| `BUILD_DIR` | `<repo>/openwrt` | 源码目录 |
| `JOBS` | CPU 核数 | 并行任务数 |

### 增量编译

修改 `package/` 下的脚本或 JS 后，无需重新克隆：

```bash
cd openwrt
# 重新同步本地包
rm -rf package/travel-router-core package/luci-app-travel-router
cp -a ../package/. package/
make package/luci-app-travel-router/compile V=s
make package/travel-router-core/compile V=s
make -j$(nproc)
```

修改 `package/` 内文件不会自动同步，务必先复制再编译。

## 方式三：Docker（macOS / Windows）

```bash
./scripts/docker-build.sh
```

等价于：

```bash
docker build -t ac2100-travel-router-builder .
docker run --rm -it -v "$PWD:/src" ac2100-travel-router-builder
```

镜像基于 Debian bookworm，容器内用户 uid 1000。Linux 上若宿主机 uid 不是 1000，
建议直接用本机编译，或在容器运行后修正 `openwrt/`、`out/` 的属主。

## 产物

`out/` 中应包含：

| 文件 | 用途 |
| --- | --- |
| `*sysupgrade.bin` | 已是 OpenWrt 时升级 |
| `*kernel1.bin` | 官方固件首次刷入（内核分区） |
| `*rootfs0.bin` | 官方固件首次刷入（根文件系统分区） |
| `*initramfs-kernel.bin` | pb-boot 引导 / 临时 OpenWrt |
| `sha256sums` | 校验和 |

校验：

```bash
cd out
sha256sum -c sha256sums
```

## 配置说明

`config/ac2100.config` 是 **种子配置**，`make defconfig` 会解析依赖并补齐默认值。
关键项：

- `CONFIG_TARGET_ramips_mt7621_DEVICE_xiaomi_redmi-router-ac2100=y`
  （Mi Router AC2100 请改成 `..._DEVICE_xiaomi_mi-router-ac2100=y`）
- `CONFIG_PACKAGE_luci=y`
- `CONFIG_PACKAGE_luci-app-travel-router=y`
- `CONFIG_PACKAGE_travel-router-core=y`
- `CONFIG_PACKAGE_luci-app-openclash=y`
- `CONFIG_PACKAGE_dnsmasq-full=y`（与 `dnsmasq` 互斥）
- `CONFIG_PACKAGE_wpad-mbedtls=y`（支持 WPA3-SAE 上游）

OpenClash 依赖 `ruby`、`ruby-yaml`、`bash`、`curl`、`unzip`、`ip-full`、
`kmod-tun`、`kmod-nft-tproxy` 等，已由包依赖自动带入。

## 更新 OpenClash

`feeds.conf` 最后一行固定了 commit：

```
src-git openclash https://github.com/vernesong/OpenClash.git^e553e82e01c697aefbe1555261a503f425e00ccd
```

更新方式：

1. 获取 OpenClash 新 commit；
2. 替换 `^` 后的 SHA（或改成 `;master` 跟踪最新）；
3. 重新编译。

> OpenClash 0.48.x 的 LuCI 页面是 Lua 实现，依赖 `luci-compat` 与
> `luci-lua-runtime`；本项目已显式选中。

## 编译排错

**`feeds update` 下载慢/失败**：为 GitHub 配置代理，或把 `feeds.conf` 换成可达镜像。

**磁盘不足**：完整编译需要约 25 GB；GitHub Actions 已释放无用 SDK。清理
`openwrt/build_dir/`、`openwrt/staging_dir/` 后重试（会全量重编）。

**`dnsmasq` 与 `dnsmasq-full` 冲突**：确认 `.config` 中同时存在
`CONFIG_PACKAGE_dnsmasq-full=y` 和 `# CONFIG_PACKAGE_dnsmasq is not set`。

**镜像过大**：不要额外加入 `luci-app-statistics`、Docker、AdGuard Home 等大包；
OpenClash 内核不在镜像内。

**本机 macOS 编译失败**：OpenWrt 构建系统依赖大小写敏感文件系统与 GNU 工具链，
请使用 Linux 或 Docker。
