include $(TOPDIR)/rules.mk

PKG_NAME:=travel-router-core
PKG_VERSION:=1.0.0
PKG_RELEASE:=1
PKG_LICENSE:=MIT
PKG_MAINTAINER:=AC2100 Travel Router contributors
PKGARCH:=all

include $(INCLUDE_DIR)/package.mk

# This package only ships scripts and configuration files.  Without an
# explicit (empty) Build/Compile, the package infrastructure tries to run
# make inside an empty build directory and fails with "No targets specified".
define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
endef

define Build/Compile
endef

define Package/travel-router-core
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Wi-Fi repeater control scripts for Xiaomi/Redmi AC2100
  DEPENDS:=+uci +ubus +iwinfo +ip-full +wifi-scripts
  PKGARCH:=all
endef

define Package/travel-router-core/description
  Backend scripts for the AC2100 travel router firmware. Provides the
  travel-router command used by the LuCI pages to scan for upstream Wi-Fi
  networks, configure a STA + AP repeater (WISP/NAT) uplink and report
  status information.
endef

define Package/travel-router-core/conffiles
/etc/config/travel
/etc/openclash/config/00-gl-direct.yaml
endef

define Package/travel-router-core/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) ./files/usr/bin/travel-router $(1)/usr/bin/travel-router

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/travel $(1)/etc/config/travel

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/etc/uci-defaults/99-travel-router $(1)/etc/uci-defaults/99-travel-router

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/travel-router $(1)/etc/init.d/travel-router

	$(INSTALL_DIR) $(1)/etc/rc.d
	ln -sf ../init.d/travel-router $(1)/etc/rc.d/S99travel-router

	$(INSTALL_DIR) $(1)/etc/hotplug.d/ieee80211
	$(INSTALL_BIN) ./files/etc/hotplug.d/ieee80211/20-travel-router $(1)/etc/hotplug.d/ieee80211/20-travel-router

	$(INSTALL_DIR) $(1)/etc/openclash/config
	$(INSTALL_DATA) ./files/etc/openclash/config/00-gl-direct.yaml $(1)/etc/openclash/config/00-gl-direct.yaml
endef

$(eval $(call BuildPackage,travel-router-core))
