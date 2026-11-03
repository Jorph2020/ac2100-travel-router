include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-travel-router
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=MIT
PKG_MAINTAINER:=AC2100 Travel Router contributors

LUCI_TITLE:=AC2100 travel router UI (GL-MT3000 style)
LUCI_DESCRIPTION:=Dashboard, Wi-Fi repeater wizard, client list and application shortcuts for the Xiaomi/Redmi AC2100 travel router firmware.
LUCI_DEPENDS:=+luci-base +travel-router-core
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
