# 刷机与救砖

> **刷机有风险。** 本文仅记录社区常用流程，无法覆盖所有 bootloader/固件版本。
> 操作前请确认设备型号、备份数据，并准备 TTL 串口或可用的恢复方式。

## 确认型号

本固件面向 **Redmi Router AC2100（RM2100）**，OpenWrt profile 为
`xiaomi_redmi-router-ac2100`。

小米/红米 AC2100 在 OpenWrt 中还有另一个 profile `xiaomi_mi-router-ac2100`
（Mi Router AC2100），两者硬件接近但镜像不可混刷。请以设备底标和 OpenWrt
设备页为准。

## 选择镜像

| 当前系统 | 使用镜像 |
| --- | --- |
| 官方 MIUI 固件 | `*kernel1.bin` + `*rootfs0.bin` |
| OpenWrt / 本固件 | `*sysupgrade.bin` |
| pb-boot 引导 / TFTP 救援 | `*initramfs-kernel.bin` |

所有镜像位于编译产物的 `out/` 目录。先校验：

```bash
sha256sum -c sha256sums
```

## 已刷 Breed / pb-boot + Padavan

这是 AC2100 最常见的状态：机器已经刷了“不死系统”（Breed 或 pb-boot），当前跑
Padavan（老毛子）。**不需要再走官方固件的漏洞流程**，但也不能在 Padavan 的
“固件升级”页面直接刷 OpenWrt。

### 先判断是不死系统是哪一种

断电，按住 reset 键上电，约 5 秒后松开，观察状态灯并访问 <http://192.168.1.1>：

| bootloader | 状态灯 | Web 界面 | 适用镜像 |
| --- | --- | --- | --- |
| **Breed** | 蓝色闪烁 | “Breed Web 恢复控制台” | `squashfs-kernel1.bin` + `squashfs-rootfs0.bin` |
| **pb-boot** | 橙色呼吸 | 简单的固件更新页 | `initramfs-kernel.bin` → 再刷 `squashfs-sysupgrade.bin` |

如果进不去，先断开电脑的其他网络（尤其是 VPN/代理），只用网线连接路由器的 LAN
口，浏览器无痕模式重试；仍不行可换一台电脑。

> 有些批次的 NAND 存在坏块：Breed 在坏块机器上可能刷入失败或无法启动，pb-boot
> 对坏块的处理更好。若 Breed 刷入报错/启动失败，可先刷 pb-boot 再按 pb-boot 流程。

### 通用准备（两种都做）

1. 在 bootloader 的 Web 界面里先备份：
   - Breed：**固件备份 → 编程器固件**（整片 Flash）和 **EEPROM**；
   - pb-boot：使用页面上的备份功能，至少备份 EEPROM/Factory。
2. 备份文件保存到电脑，不要只放在路由器里。
3. 电脑网线接 LAN 口，IP 设为自动获取（或 `192.168.1.2/24`）。
4. 准备好编译产物中的对应镜像，并校验 `sha256sums`。

### Breed 刷入步骤

1. 进入 Breed Web（<http://192.168.1.1>）。
2. 先确认/选择 **分区布局 = OpenWrt**（新版 Breed 有该选项；老版 Breed 没有的话
   先升级 Breed，或改用 pb-boot 流程）。
3. 在“固件更新”中先选择 `...-squashfs-kernel1.bin`，刷入内核分区。
4. 再选择 `...-squashfs-rootfs0.bin`，刷入 rootfs 分区。
5. 勾选自动重启，等待设备重启（**不要断电**）。
6. 重启后连接 `AC2100-Travel` / `AC2100-Travel-5G`（密码 `ac2100travel`），
   或网线接 LAN，访问 <http://192.168.8.1>。

> 不同 Breed 版本的界面字段名称略有差异（“固件/内核/rootfs”），以页面提示为准。
> 关键点是：**分区布局必须是 OpenWrt**，且 kernel1/rootfs0 不要写反。

### pb-boot 刷入步骤

1. 进入 pb-boot Web（<http://192.168.1.1>，橙色呼吸灯）。
2. 选择 `...-initramfs-kernel.bin`，刷入并等待重启。
3. 设备会进入 **临时 OpenWrt（initramfs，运行在内存里）**：
   - 先试 <http://192.168.8.1>（本固件的默认 LAN）；
   - 如果打不开，再试 <http://192.168.1.1>（OpenWrt 默认 LAN）。
   - SSH：`ssh root@192.168.8.1`（或 `192.168.1.1`），初始无密码。
4. 把 `...-squashfs-sysupgrade.bin` 传到 `/tmp`：

   ```sh
   scp openwrt-*-squashfs-sysupgrade.bin root@192.168.8.1:/tmp/
   ssh root@192.168.8.1
   sysupgrade -n /tmp/openwrt-*-squashfs-sysupgrade.bin
   ```

   或在临时系统的 LuCI：**系统 → 备份/刷机 → 刷写新固件**，选择
   `squashfs-sysupgrade.bin`，**取消“保留配置”**。

5. 等待重启，进入正式系统（<http://192.168.8.1>）。

> initramfs 只用于“引导 + 刷机”，重启后配置不会保留；不要在里面长期使用。
> `-n` 表示不保留配置，从 Padavan/其他 OpenWrt 过来时必须这样刷。

### 不要做的事

- ❌ 在 Padavan 的“固件升级”里选 OpenWrt 的 `sysupgrade.bin`；
- ❌ 在 Breed/pb-boot 里把 `sysupgrade.bin` 当裸镜像刷；
- ❌ 在 pb-boot 里刷 `kernel1.bin` + `rootfs0.bin`（pb-boot 用 initramfs 流程）；
- ❌ 写错分区（`kernel1`/`rootfs0`/`Bootloader`），或刷入过程中断电；
- ❌ 不备份 EEPROM/Factory 就反复试错。

### 刷完后

- 默认 LAN：`192.168.8.1`；
- 默认 Wi-Fi：`AC2100-Travel` / `AC2100-Travel-5G`，密码 `ac2100travel`；
- 首次登录设置 root 密码，然后到 **互联网 → 中继** 连接随身 Wi-Fi；

## 从官方固件首次刷入

Redmi AC2100 官方固件关闭了 SSH/telnet，需要先通过 **CVE-2020-8597**（PPPoE
漏洞）拿到 shell。该利用需要电脑接在路由器 **WAN 口** 并建立 PPPoE 会话，
成功后会向 `192.168.31.177:31337` 反弹 shell。

原始说明见 OpenWrt 支持提交：
<https://github.com/openwrt/openwrt/commit/f3792690c4f0567a8965d82898295b9d50c3bb7e>

拿到 shell 后，把 `kernel1.bin` 和 `rootfs0.bin` 上传到 `/tmp`（可用
`wget`/`tftp`/`nc`），然后严格按下面顺序执行：

```sh
# 1. 写入内核分区（第二个内核槽位）
mtd write /tmp/openwrt-*-ramips-mt7621-xiaomi_redmi-router-ac2100-squashfs-kernel1.bin kernel1

# 2. 打开串口并保留 bootloader 的启动延时，方便救砖
nvram set uart_en=1
nvram set bootdelay=5
nvram set flag_try_sys1_failed=1
nvram commit

# 3. 写入根文件系统并重启
mtd -r write /tmp/openwrt-*-ramips-mt7621-xiaomi_redmi-router-ac2100-squashfs-rootfs0.bin rootfs0
```

注意事项：

- `kernel1` / `rootfs0` 是**分区名**，不要写错；写错可能直接变砖。
- 写入过程中**绝对不能断电**。
- 不要用 `sysupgrade` 刷 `kernel1/rootfs0`，也不要用 `mtd` 刷 `sysupgrade.bin`。
- 首次启动会自动生成 `/etc/config/wireless` 并应用默认配置，约 30–60 秒后出现
  `AC2100-Travel` / `AC2100-Travel-5G`。

## 已经是 OpenWrt：sysupgrade

推荐命令行（不保留旧配置）：

```sh
scp openwrt-*-ramips-mt7621-xiaomi_redmi-router-ac2100-squashfs-sysupgrade.bin \
    root@192.168.8.1:/tmp/
ssh root@192.168.8.1
sysupgrade -n /tmp/openwrt-*-squashfs-sysupgrade.bin
```

或在 LuCI：**系统 → 备份/刷机 → 刷写新固件**，取消勾选“保留配置”。

> 从其他 OpenWrt 固件切换过来时，建议 `-n` 清空配置，避免无线/网络配置不兼容。

## 恢复原厂固件

支持提交给出的方法：

1. 在电脑上搭建 PXE + TFTP 服务器，提供原厂固件镜像（dnsmasq 的 `dhcp-boot`）；
2. 断电，按住 reset 键上电，等待状态灯呈琥珀色闪烁；
3. 松开 reset，等待状态灯由闪烁琥珀色变为白色。

不同批次/ bootloader 版本可能不同。也可以使用 TTL 串口 + `pb-boot`/原厂恢复
工具。恢复前请确认自己设备的分区布局与 bootloader 类型。

## 常见问题

**刷完后只有电源灯亮，没有 Wi-Fi**

用网线接 LAN 口，电脑设为 DHCP，访问 <http://192.168.8.1>。若仍无法访问，
接 TTL 查看启动日志；可能内核/rootfs 写入不完整。

**`mtd write` 报错 `Could not open mtd device`**

分区名不对。先在 shell 中执行 `cat /proc/mtd` 查看实际分区名，常见为
`kernel1`、`rootfs0`、`ubi`。不要凭猜测写入。

**刷完无法 PPPoE 拨号 / WAN 不亮**

本固件默认 WAN 为 DHCP，适合接光猫/上级路由。若需要 PPPoE，在
**网络 → 接口 → WAN** 中把协议改为 PPPoE 并填写账号。

**想回到官方固件但不会 PXE**

可以尝试 TTL + 原厂 bootloader 的 TFTP 恢复，或使用社区提供的“官方固件恢复
镜像”。操作前先备份 `Factory`/`EEPROM` 分区（无线校准数据），丢失会导致信号
异常。

**无线校准数据（EEPROM）**

AC2100 的 5G 校准数据在 `Factory` 分区。刷机不会主动改它，但误写会损坏。
不要执行来源不明的 `mtd write ... Factory`。
