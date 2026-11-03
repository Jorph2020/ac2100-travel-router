# 使用说明

## 首次启动

刷入后等待 30–60 秒，设备会：

1. 生成无线配置，开启 2.4G / 5G 接入点（若驱动较晚就绪，`travel-router`
   启动服务会在 20 秒内重试补齐 AP）；
2. 把 LAN 设为 `192.168.8.1/24`，DHCP 池 `100–249`；
3. 设置主机名 `AC2100-Travel`、时区 `Asia/Shanghai`、中文 LuCI；
4. 写入 OpenClash 默认配置（不启动）。

默认连接信息：

| 项目 | 值 |
| --- | --- |
| 2.4G SSID | `AC2100-Travel` |
| 5G SSID | `AC2100-Travel-5G` |
| Wi-Fi 密码 | `ac2100travel` |
| 管理地址 | <http://192.168.8.1> |
| root 密码 | 空（首次登录时设置） |

> 首件事：设置 root 密码，并修改 Wi-Fi 密码。首页会持续提示未设置 root 密码。

## 用中继连接随身 Wi-Fi

进入 **互联网 → 中继**。

### 从扫描列表连接

1. 等待“附近的 Wi-Fi”列表出现（首次进入会自动扫描，最多约 10 秒）。
2. 找到随身 Wi-Fi / 手机热点，点击“连接”。
3. 输入密码，确认频段（默认使用扫描到的频段）。
4. 页面显示“正在连接…”并等待 DHCP；成功后自动刷新，首页显示
   “无线中继 · <SSID>”。

### 手动连接

用于隐藏 SSID 或扫描不到的网络：

- SSID：上游 Wi-Fi 名称；
- 频段：自动 / 2.4 GHz / 5 GHz；
- 加密：WPA2-PSK（最常见）、WPA2/WPA3、WPA3-SAE、WPA-PSK、开放、WEP；
- 密码：WPA 系列至少 8 位；
- 隐藏网络：勾选后会设置 `scan_ssid`。

### 频段怎么选

- 随身 Wi-Fi 多为 2.4 GHz（覆盖好、速度低）；
- 手机热点/家用路由优先 5 GHz（速度快、干扰少、穿墙差）；
- “自动”会从最近一次扫描缓存中挑选该 SSID 信号更强的频段，缓存不存在时默认
  2.4 GHz。

### 连接状态说明

| 状态 | 含义 |
| --- | --- |
| 已连接 | 已关联上游并拿到 IP |
| 正在获取地址 | 已关联，等待 DHCP |
| 未连接 | 未关联或密码错误 |
| 已断开 | 在页面上点了“断开” |
| 未设置 | 还没有配置上游 |

断开只停链路、保留配置；忘记会删除 `wwan` 接口与无线配置。

## 网络结构

```
随身 Wi-Fi / 热点
        │  STA (2.4G 或 5G)
        ▼
   AC2100 (wwan, DHCP)
        │  NAT + 防火墙
        ▼
   LAN 192.168.8.1/24
     ├── 2.4G AP / 5G AP
     └── LAN1–LAN3
```

- 上游接口：`wwan`（`proto dhcp`），加入 `wan` 防火墙区域并开启 masquerade；
- 本机 LAN 固定 `192.168.8.1`，与常见上游网段错开；
- 有线 WAN 与无线中继可同时存在：有线默认优先级更高（metric 10 vs 20），
  拔掉网线会自动走中继。

常用排查命令：

```sh
ifstatus wwan                 # 上游是否拿到地址/DNS
iwinfo sta0 info              # 关联状态、信号、速率
logread | grep -E 'wpa|netifd|udhcpc'
ip route show default
```

## OpenClash

### 1. 下载内核

进入 **应用 → OpenClash → 打开 OpenClash**，在 **全局设置 → 更新内核** 中下载
Mihomo 内核（mipsle-softfloat，约 20–25 MB）。设备必须已经能上网。

也可以手动放置：`/etc/openclash/core/clash_meta`（可执行权限）。

### 2. 导入订阅

在 OpenClash 的 **配置文件 → 订阅** 中添机场订阅并更新，或上传本地 YAML。
本项目预置了 `00-gl-direct.yaml`（全直连），可用于验证内核与防火墙是否正常。

### 3. 启动

回到 **应用** 页点“启动”，或 OpenClash 页面中的“启用”。启动过程约 10–60 秒，
状态变为“运行中”后代理生效。

### 4. 验证

```sh
pidof clash                       # 有输出即进程在运行
cat /tmp/openclash.log | tail -50
nft list ruleset | grep -i clash  # firewall4/nftables 规则
```

浏览器访问 `https://ip.sb` 或 `https://www.cloudflare.com/cdn-cgi/trace` 查看出口 IP。

### 注意事项

- 128 MB 内存跑 Mihomo 偏紧，尽量使用体积小的规则集，避免同时开启多个插件。
- 若 OpenClash 启动后 LAN 无法上网，先在 OpenClash 中“停止”，确认基础网络正常，
  再检查 DNS/Fake-IP 设置。
- 使用上游酒店/机场网络时，先完成 captive portal 认证，再启动 OpenClash。
- 更新订阅/内核需要设备能直连 GitHub 或镜像；必要时在 OpenClash 中配置代理下载。

## 客户端列表

**客户端** 页显示 dnsmasq 租约（IP、MAC、主机名、租期）以及 Wi-Fi 关联信号。
每 15 秒自动刷新。静态 IP 设备不会出现在租约列表中。

## 命令行工具

后台脚本 `/usr/bin/travel-router` 也可直接调用：

```sh
travel-router status
travel-router setup
travel-router scan --force
travel-router connect "MiFi-1234" /tmp/key.txt 2g psk2 0
travel-router disconnect
travel-router forget
travel-router clients
travel-router home
travel-router openclash status
travel-router openclash start
travel-router openclash stop
travel-router reconnect
```

`connect` 的密码通过临时文件传入（LuCI 页面会写入 `/tmp/travel.key`，脚本读取后
立即删除），避免密码出现在进程命令行中。

## 修改默认网络

- **LAN 地址/DHCP**：LuCI **网络 → 接口 → LAN**，或修改
  `99-travel-router` 中的 `LAN_IP` 后重刷；
- **Wi-Fi 名称/密码**：LuCI **网络 → 无线**，或修改默认脚本；
- **时区/NTP**：LuCI **系统 → 系统**；
- **主机名**：同上。

默认脚本只在 `/etc/travel/configured` 不存在时执行一次；恢复出厂设置
（`firstboot` 或 `sysupgrade -n`）后会重新应用。

## 恢复出厂 / 重刷

```sh
# 保留当前固件，清空配置并重启
firstboot -y && reboot

# 重新刷写本固件（清空配置）
sysupgrade -n /tmp/openwrt-*-sysupgrade.bin
```

## 性能与稳定性建议

- 5 GHz 中继优先；2.4 GHz 干扰大时在 **网络 → 无线** 中固定 1/6/11 信道。
- 上游与 AP 使用同一射频时，AP 会跟随上游信道，属正常现象。
- 不要同时启用多个代理/去广告插件；128 MB 内存容易吃紧。
- 长时间高负载可加装散热片（AC2100 原厂散热一般）。
- 若中继频繁掉线，检查上游是否开启了“节能/随机 MAC”，并在上游关闭。
