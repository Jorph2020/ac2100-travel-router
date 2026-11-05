# 小米 / 红米 AC2100 旅行路由固件

基于 **OpenWrt 24.10.8** 的 AC2100（Redmi Router AC2100 / RM2100）固件源码工程：
把 AC2100 变成一台类 **GL.iNet MT3000** 的旅行路由器 —— 连上随身 Wi-Fi / 手机热点，
再用自己的 Wi-Fi 和网口共享网络，并内置 **ShellCrash** 代理管理。

> 这是一个**可编译的固件工程**，不包含预编译的 `.bin`。固件需在 Linux 或
> GitHub Actions 上编译（macOS 无法直接交叉编译 OpenWrt），编译产物为
> `sysupgrade.bin` / `kernel1.bin` / `rootfs0.bin`。

## 功能

- **无线中继（WISP / NAT）**：扫描附近 Wi-Fi、选择频段、输入密码即可把随身 Wi-Fi
  或手机热点变成自己的网络；2.4G / 5G 可分别作为上游。
- **类 MT3000 菜单**：`首页 / 互联网 / 客户端 / 应用 / 网络 / 系统`，首页是状态卡片
  仪表盘，中继页带扫描列表和一键连接。
- **ShellCrash 集成**：应用页与首页显示运行状态，支持一键开启/停用和 Yacd 面板；
  默认不自启，优先保证 Wi-Fi 与中继。
- **中文 LuCI**，默认 LAN `192.168.8.1`，默认 Wi-Fi `AC2100-Travel` /
  `AC2100-Travel-5G`。
- **首次登录安全提醒**：首页会检测 root 是否仍未设置密码。
- 保留完整 LuCI 网络、防火墙、软件包、日志页面，方便排障。

## 重要说明（先读）

1. **中继是 NAT，不是二层桥接。** 上游 Wi-Fi 与 LAN 之间做地址转换，客户端位于
   `192.168.8.0/24`。这是旅行路由器的常见做法：不依赖上游支持 WDS/4-addr，
   兼容随身 Wi-Fi、手机热点、酒店网络，也不会因为上游也是 `192.168.1.1` 而断网。
   真正的二层桥接需要 `relayd`，会带来 LAN 侧无法访问路由器、DHCP 冲突等问题，
   本项目默认不启用。
2. **AC2100 没有 USB 接口**，因此不支持 USB 随身 Wi-Fi / 4G 网卡，只支持 Wi-Fi 中继
   和有线 WAN。
3. **默认 Wi-Fi 密码是固定的 `ac2100travel`**，root 初始无密码。刷机后请立刻在
   LuCI 中修改 Wi-Fi 密码并设置 root 密码。
4. 代理由 ShellCrash 管理，内核（约 20–25 MB）需联网下载；固件本身不内置内核。

## 型号确认（重要）

OpenWrt 里有两个容易混淆的 profile：

| 设备 | OpenWrt profile | 本工程 |
| --- | --- | --- |
| Redmi Router AC2100（RM2100，常被叫作“小米 AC2100”） | `xiaomi_redmi-router-ac2100` | 默认支持 |
| Mi Router AC2100 | `xiaomi_mi-router-ac2100` | 需改 profile（见下） |

如果你确认自己的设备是 **Mi Router AC2100**，把 `config/ac2100.config` 中的

```
CONFIG_TARGET_ramips_mt7621_DEVICE_xiaomi_redmi-router-ac2100=y
```

改成

```
CONFIG_TARGET_ramips_mt7621_DEVICE_xiaomi_mi-router-ac2100=y
```

并核对其刷机方式（不同型号的 bootloader/分区名可能不同）。不要跨型号刷镜像。

## 硬件与软件基线

| 项目 | 参数 |
| --- | --- |
| 设备 | Xiaomi Redmi Router AC2100（RM2100） |
| SoC | MediaTek MT7621A（MIPS 1004Kc，mipsel_24kc，软浮点） |
| RAM / Flash | 128 MB DDR3 / 128 MB ESMT NAND |
| 无线 | MT7603EN 2.4G 2×2 + MT7615N 5G 4×4 |
| 有线 | 3×LAN + 1×WAN 千兆 |
| OpenWrt | 24.10.8，profile `xiaomi_redmi-router-ac2100` |
| 代理 | ShellCrash（不自启，应用页/首页手动启停） |
| 内核 | Mihomo / sing-box（mipsle-softfloat，`crash` 菜单切换） |

## 快速开始：用 GitHub Actions 编译

1. 把本目录上传到一个 GitHub 仓库（公开或私有均可）。
2. **推送到 `main` 会自动编译 lite 版**；也可以在 Actions 里手动 Run workflow：
   - `lite`（默认）：精简种子配置
   - `full`：完整种子配置
3. 等待约 60–150 分钟（首次编译含工具链）。
4. 在运行记录的 **Artifacts** 中下载 `ac2100-travel-router-lite-<run>`（或 `-full-`），解压后得到：

```
openwrt-24.10.8-ramips-mt7621-xiaomi_redmi-router-ac2100-squashfs-sysupgrade.bin
openwrt-24.10.8-ramips-mt7621-xiaomi_redmi-router-ac2100-squashfs-kernel1.bin
openwrt-24.10.8-ramips-mt7621-xiaomi_redmi-router-ac2100-squashfs-rootfs0.bin
openwrt-24.10.8-ramips-mt7621-xiaomi_redmi-router-ac2100-initramfs-kernel.bin
sha256sums
```

> 文件名中的版本号随 `OPENWRT_VERSION` 变化。
> - **官方固件首次刷入**：`kernel1.bin` + `rootfs0.bin`
> - **pb-boot（不死系统）**：`initramfs-kernel.bin` 先引导，再刷 `sysupgrade.bin`
> - **已是 OpenWrt / Breed**：`sysupgrade.bin` 或 `kernel1.bin` + `rootfs0.bin`

## 本地编译

### Linux

```bash
sudo apt install build-essential clang flex bison g++ gawk gcc-multilib \
  g++-multilib gettext git libncurses-dev libssl-dev libelf-dev python3 \
  python3-setuptools rsync swig unzip zlib1g-dev file wget

./scripts/build.sh          # 产物在 out/
```

可用环境变量覆盖：

```bash
OPENWRT_VERSION=v24.10.8 JOBS=8 ./scripts/build.sh
```

### macOS / Windows（Docker）

```bash
./scripts/docker-build.sh
```

Docker 容器内以 uid 1000 运行；Linux 上如果当前用户不是 uid 1000，建议直接用
`./scripts/build.sh`，或给仓库目录相应权限。

更完整的编译说明见 [docs/BUILD.md](docs/BUILD.md)。

## 刷机

**风险提示：刷机可能变砖。** 请先备份原厂固件、准备 TTL 刷机线或确认可以进入
恢复模式，并仔细阅读 [docs/FLASH.md](docs/FLASH.md)。

### 已刷 Breed / pb-boot + Padavan

可以，但**不能在 Padavan 的“固件升级”页面直接刷 OpenWrt**。Padavan 只认自己的
`.trx`，OpenWrt 的 `sysupgrade.bin` 也不是给 bootloader 直接写的裸镜像。

- **Breed**：断电按住 reset 上电，蓝灯闪烁时进入 <http://192.168.1.1>；先备份
  编程器固件和 EEPROM，再把“分区布局”设为 **OpenWrt**，依次刷入
  `squashfs-kernel1.bin` 和 `squashfs-rootfs0.bin`，重启。
- **pb-boot**：同样进 <http://192.168.1.1>（橙灯呼吸）；先备份，再刷入
  `initramfs-kernel.bin` 引导，进入临时 OpenWrt 后用 `sysupgrade` 刷
  `squashfs-sysupgrade.bin`（不要保留配置）。

完整步骤、判断 Breed/pb-boot 的方法和救砖说明见
[FLASH.md 的“已刷 Breed/pb-boot + Padavan”](docs/FLASH.md#已刷-breed--pb-boot--padavan)。

### 从官方固件首次刷入

Redmi AC2100 官方固件没有可用的 SSH，需要先通过 CVE-2020-8597（PPPoE）漏洞拿到
shell（详见 [OpenWrt 设备页](https://openwrt.org/toh/xiaomi/xiaomi_redmi_router_ac2100)
与 [支持提交](https://github.com/openwrt/openwrt/commit/f3792690c4f0567a8965d82898295b9d50c3bb7e)）。
拿到 root shell 后，把两个镜像传到 `/tmp`，执行：

```sh
mtd write openwrt-*-ramips-mt7621-xiaomi_redmi-router-ac2100-squashfs-kernel1.bin kernel1
nvram set uart_en=1
nvram set bootdelay=5
nvram set flag_try_sys1_failed=1
nvram commit
mtd -r write openwrt-*-ramips-mt7621-xiaomi_redmi-router-ac2100-squashfs-rootfs0.bin rootfs0
```

设备会自动重启进入 OpenWrt。**不要写错分区名，不要在写入过程中断电。**

### 已经是 OpenWrt

```sh
scp openwrt-*-squashfs-sysupgrade.bin root@192.168.8.1:/tmp/
ssh root@192.168.8.1 'sysupgrade -n /tmp/openwrt-*-squashfs-sysupgrade.bin'
```

或在 LuCI：**系统 → 备份/刷机 → 刷写新固件**（不要保留旧配置，首次刷入本固件时
建议勾选“不保留配置”）。

### 恢复原厂

参见支持提交中的 PXE/TFTP 恢复步骤，或使用 TTL + `pb-boot`/原厂恢复镜像。
恢复流程因 bootloader 版本而异，请先确认自己的设备版本。

## 首次使用

1. 电脑/手机连接 Wi-Fi：
   - 2.4G：`AC2100-Travel`
   - 5G：`AC2100-Travel-5G`
   - 密码：`ac2100travel`
2. 打开 <http://192.168.8.1>，首次登录会提示设置 root 密码，**立即设置**。
3. 进入 **互联网 → 中继**：
   - 在“附近的 Wi-Fi”里找到随身 Wi-Fi / 手机热点，点“连接”，输入密码；
   - 或使用“手动连接 / 隐藏网络”；
   - 连接成功后首页会显示“无线中继 · <SSID>”和获取到的地址。
4. 进入 **应用 → ShellCrash**：
   - 未安装时按页面提示通过 SSH 安装，并选择 mihomo 内核；
   - 在 `crash` 菜单导入订阅、选择规则；
   - 回到应用页或首页点“开启”，状态变为“运行中”即生效。
5. 建议在 **网络 → 无线** 中修改 Wi-Fi 名称/密码，在 **系统 → 管理权** 中确认 root 密码。

### 菜单对照 MT3000

| MT3000 | 本固件 | 说明 |
| --- | --- | --- |
| Internet / Repeater | 互联网 → 中继 | 扫描并连接上游 Wi-Fi（NAT） |
| Internet / Ethernet | 互联网 → 上网设置 | 原 LuCI 接口页（WAN/LAN） |
| Clients | 客户端 | DHCP 租约 + Wi-Fi 信号 |
| Applications / Proxy | 应用 → ShellCrash | 启动/停止、Yacd 与安装入口 |
| Network | 网络 | 原 LuCI 网络菜单 |
| System | 系统 | 原 LuCI 系统菜单 |

## 目录结构

```
.
├── config/ac2100.config              # full 种子配置
├── config/ac2100-lite.config         # lite 种子配置（默认）
├── feeds.conf                        # packages / luci
├── package/
│   ├── travel-router-core/           # 后端脚本 + 首次启动默认值
│   │   └── files/usr/bin/travel-router
│   └── luci-app-travel-router/       # 首页/中继/客户端/应用页面 + 菜单 + ACL
├── scripts/build.sh                  # Linux 编译脚本
├── scripts/docker-build.sh           # Docker 编译入口
├── Dockerfile
├── .github/workflows/build.yml
├── docs/                             # 编译、刷机、使用说明
└── tests/                            # 扫描解析单元测试
```

## 自定义

### 改默认 Wi-Fi / LAN / 主机名

编辑 `package/travel-router-core/files/etc/uci-defaults/99-travel-router`：

```sh
WIFI_KEY="ac2100travel"
LAN_IP="192.168.8.1"
HOSTNAME="AC2100-Travel"
```

同时修改 `ssid="AC2100-Travel"` / `ssid="AC2100-Travel-5G"` 两处。该脚本只在
`/etc/travel/configured` 不存在时执行，升级固件不会覆盖用户配置。

### 增删软件包

在 `config/ac2100.config` 中追加 `CONFIG_PACKAGE_xxx=y`，重新编译。注意
NAND 根分区约 120 MB，代理内核还要占 20–25 MB，不要塞入过多大包。

### 换主题

默认使用 `luci-theme-bootstrap`。可把 `luci-theme-argon` 加入 `feeds.conf` 和
`.config`，再把 `/etc/config/luci` 的 `mediaurlbase` 指向新主题；本项目页面
使用独立 CSS（`travel/style.css`），不依赖具体主题。

## 常见问题

**扫描不到随身 Wi-Fi？**
确认随身 Wi-Fi 已开机并广播 SSID；5 GHz 信号穿墙差，优先试 2.4 GHz；隐藏网络
请用“手动连接”。扫描时 5 GHz AP 可能短暂中断，属正常现象。

**提示密码错误 / 一直“正在获取地址”？**
先确认频段正确（2.4G / 5G），再试把上游加密改为 WPA2-PSK（部分老设备对
WPA2/WPA3 混合模式兼容性差）；查看日志：

```sh
logread | grep -E 'wpa|netifd|udhcpc'
```

**中继成功但上不了网？**
酒店/机场网络可能需要网页认证（captive portal）。先用手机或电脑连接上游完成
认证，或把上游换成随身 Wi-Fi。也可以检查 `ifstatus wwan` 是否拿到地址和 DNS。

**ShellCrash 启动失败？**
常见原因是内核未下载、订阅配置无效，或 DNS 被上游劫持。查看：

```sh
logread | grep -i -E 'shellcrash|CrashCore'
cat /tmp/travel-shellcrash.log
```

**会不会和光猫/上游冲突？**
本机 LAN 固定为 `192.168.8.1`，且中继为 NAT，不会与常见的 `192.168.1.1` /
`192.168.31.1` 冲突。若上游恰好也是 `192.168.8.1`（例如另一台 GL 路由器），
请在 **网络 → 接口 → LAN** 中改成其他网段（如 `192.168.9.1`）。

**刷完没有 Wi-Fi？**
首次启动需要几十秒生成 `/etc/config/wireless` 并应用配置；若仍无 Wi-Fi，用网线
连接 LAN 口访问 `192.168.8.1`，检查 **网络 → 无线** 是否被禁用。

## 已知限制

- 仅支持 Wi-Fi 中继（NAT），不支持二层桥接 / WDS / 802.11s。
- 无 USB，因此不支持 USB 4G 网卡或 USB 随身 Wi-Fi。
- 未集成 AdGuard Home、Docker、多 WAN 负载均衡等大体积功能。
- ShellCrash 内核与订阅需要设备联网后自行下载；管理入口为应用页或 SSH 的 `crash` 菜单。
- 本项目未在真实硬件上做完整回归测试；首次刷机请保留救砖手段。

## 许可

本项目代码以 MIT 许可发布（见 `LICENSE`）。OpenWrt、LuCI、ShellCrash、Mihomo
分别遵循其各自许可证；发布的固件镜像应同时遵守这些项目的许可条款。
