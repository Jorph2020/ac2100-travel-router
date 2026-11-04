include $(TOPDIR)/rules.mk

PKG_NAME:=shellcrash-bundle
PKG_VERSION:=1.9.5beta4
PKG_RELEASE:=1
PKG_LICENSE:=GPL-3.0

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/shellcrash-bundle
  SECTION:=net
  CATEGORY:=Network
  TITLE:=ShellCrash + Yacd + Mihomo for AC2100
  DEPENDS:=+curl +jq +ca-bundle +umdns +zram-swap
endef

define Package/shellcrash-bundle/description
  Offline ShellCrash bundle with the Yacd dashboard and the Mihomo core.
  No subscription is embedded; the user imports their own in the crash menu.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)/sc $(PKG_BUILD_DIR)/core $(PKG_BUILD_DIR)/core-sing $(PKG_BUILD_DIR)/ui
	cd $(PKG_BUILD_DIR) && \
	curl -fL --retry 3 --connect-timeout 20 -o ShellCrash.tar.gz \
		https://testingcf.jsdelivr.net/gh/juewuy/ShellCrash@master/ShellCrash.tar.gz && \
	tar -xzf ShellCrash.tar.gz -C sc && \
	curl -fL --retry 3 --connect-timeout 20 -o meta.tar.gz \
		https://testingcf.jsdelivr.net/gh/juewuy/ShellCrash@master/bin/meta/clash-linux-mipsle-softfloat.tar.gz && \
	tar -xzf meta.tar.gz -C core && \
	curl -fL --retry 3 --connect-timeout 20 -o singbox.tar.gz \
		https://testingcf.jsdelivr.net/gh/juewuy/ShellCrash@master/bin/singboxr/singbox-linux-mipsle-softfloat.tar.gz && \
	tar -xzf singbox.tar.gz -C core-sing && \
	curl -fL --retry 3 --connect-timeout 20 -o yacd.tar.gz \
		https://testingcf.jsdelivr.net/gh/juewuy/ShellCrash@master/bin/dashboard/yacd.tar.gz && \
	tar -xzf yacd.tar.gz -C ui && \
	curl -fL --retry 3 --connect-timeout 20 -o Country.mmdb \
		https://testingcf.jsdelivr.net/gh/juewuy/ShellCrash@master/bin/geodata/cn_mini.mmdb && \
	curl -fL --retry 3 --connect-timeout 20 -o geosite.dat \
		https://testingcf.jsdelivr.net/gh/juewuy/ShellCrash@master/bin/geodata/geosite.dat
endef

define Build/Compile
endef

define Package/shellcrash-bundle/install
	$(INSTALL_DIR) $(1)/etc/ShellCrash
	cp -fpR $(PKG_BUILD_DIR)/sc/. $(1)/etc/ShellCrash/
	$(INSTALL_DIR) $(1)/etc/ShellCrash/configs $(1)/etc/ShellCrash/yamls $(1)/etc/ShellCrash/ui
	$(INSTALL_DATA) ./files/configs/ShellCrash.cfg $(1)/etc/ShellCrash/configs/ShellCrash.cfg
	$(INSTALL_DATA) ./files/configs/directories.env $(1)/etc/ShellCrash/configs/directories.env
	$(INSTALL_DATA) ./files/configs/command.env $(1)/etc/ShellCrash/configs/command.env
	$(INSTALL_DATA) ./files/yamls/config.yaml $(1)/etc/ShellCrash/yamls/config.yaml
	cp -fpR $(PKG_BUILD_DIR)/ui/. $(1)/etc/ShellCrash/ui/
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/core/CrashCore $(1)/etc/ShellCrash/CrashCore.raw
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/core-sing/CrashCore $(1)/etc/ShellCrash/CrashCore.singbox
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/Country.mmdb $(1)/etc/ShellCrash/Country.mmdb
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/geosite.dat $(1)/etc/ShellCrash/geosite.dat
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/init.d/shellcrash $(1)/etc/init.d/shellcrash
	$(INSTALL_DIR) $(1)/etc/rc.d
	ln -sf ../init.d/shellcrash $(1)/etc/rc.d/S99shellcrash
	$(INSTALL_BIN) ./files/usr/bin/crash $(1)/usr/bin/crash
	$(INSTALL_DIR) $(1)/etc/profile.d
	$(INSTALL_DATA) ./files/profile.d/shellcrash.sh $(1)/etc/profile.d/shellcrash.sh
endef

$(eval $(call BuildPackage,shellcrash-bundle))
