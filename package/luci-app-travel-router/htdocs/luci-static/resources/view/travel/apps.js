'use strict';
'require view';
'require ui';
'require view.travel.common as tr';

var SHELLCRASH_URL = 'https://github.com/juewuy/ShellCrash';
var SHELLCRASH_CMD = [
	'ssh root@192.168.8.1',
	'',
	"export url='https://testingcf.jsdelivr.net/gh/juewuy/ShellCrash@master'",
	'sh -c "$(curl -kfsSl $url/install.sh)"',
	'. /etc/profile',
	'crash'
].join('\n');

function linkRow(label, href, desc) {
	return E('a', { 'class': 'tr-app-link', 'href': href }, [
		E('div', {}, [
			E('div', { 'class': 'tr-app-name' }, label),
			E('div', { 'class': 'tr-dim tr-small' }, desc)
		]),
		E('span', { 'class': 'tr-link' }, '打开 ›')
	]);
}

return view.extend({
	load: function() {
		return tr.exec(['proxy', 'status']).then(tr.parseKV);
	},

	render: function(s) {
		tr.injectCss();

		var scInstalled = s.shellcrash_installed === '1';
		var scRunning = s.shellcrash_running === '1';

		function toggleShellCrash(btn) {
			if (btn) btn.disabled = true;
			tr.exec(['shellcrash', scRunning ? 'stop' : 'start']).then(function() {
				tr.notify(scRunning ? 'ShellCrash 已停用' : 'ShellCrash 已启动', 'info');
				window.setTimeout(function() { location.reload(); }, 1200);
			}).catch(function(e) {
				tr.notify(e.message, 'danger');
				if (btn) btn.disabled = false;
			});
		}

		function switchCore(core, btn) {
			if (btn) btn.disabled = true;
			tr.notify('正在切换 ' + core + ' 内核…');
			tr.exec(['shellcrash', 'core', core]).then(function() {
				tr.notify('内核已切换，正在重载…', 'info');
				window.setTimeout(function() { location.reload(); }, 1500);
			}).catch(function(e) {
				tr.notify(e.message, 'danger');
				if (btn) btn.disabled = false;
			});
		}

		var scCard = E('section', { 'class': 'tr-card' }, [
			E('div', { 'class': 'tr-card-head' }, [
				E('h3', {}, 'ShellCrash'),
				E('span', {
					'class': 'tr-pill ' + (scInstalled ? (scRunning ? 'on' : 'off') : 'off')
				}, scInstalled ? (scRunning ? '运行中' : '已停止') : '未安装')
			]),
			scInstalled ? E('div', {}, [
				E('div', { 'class': 'tr-row' }, [
					E('span', { 'class': 'tr-label' }, '安装目录'),
					E('span', { 'class': 'tr-value tr-mono' }, tr.text(s.shellcrash_dir || '—'))
				]),
				E('p', { 'class': 'tr-dim tr-small tr-mt' },
					'ShellCrash 没有 LuCI 配置页，配置入口是 SSH 菜单。订阅、规则、内核切换都在下面的菜单里完成。'),
				E('div', { 'class': 'tr-actions tr-mt' }, [
					E('button', {
						'class': 'cbi-button ' + (scRunning ? 'cbi-button-reset' : 'cbi-button-apply'),
						'click': function(ev) { toggleShellCrash(ev.target); }
					}, scRunning ? '停用 ShellCrash' : '启动 ShellCrash')
				]),
				E('div', { 'class': 'tr-row' }, [
					E('span', { 'class': 'tr-label' }, '当前内核'),
					E('span', { 'class': 'tr-value tr-mono' },
						tr.text((s.shellcrash_core || '—') + (s.shellcrash_core_version ? ' · ' + s.shellcrash_core_version : '')))
				]),
				E('div', { 'class': 'tr-actions tr-mt' }, [
					E('button', {
						'class': 'cbi-button cbi-button-action',
						'click': function(ev) { switchCore('mihomo', ev.target); }
					}, '切换 Mihomo'),
					E('button', {
						'class': 'cbi-button',
						'click': function(ev) { switchCore('singbox', ev.target); }
					}, '切换 sing-box')
				]),
				E('div', { 'class': 'tr-row' }, [
					E('span', { 'class': 'tr-label' }, '开机自启'),
					E('span', { 'class': 'tr-value' }, s.shellcrash_autostart === '1' ? '已启用' : '未启用')
				]),
				E('h4', {}, '订阅配置（SSH）'),
				E('pre', { 'class': 'tr-code' }, tr.text('ssh root@192.168.8.1\ncrash')),
				E('ol', { 'class': 'tr-dim tr-small' }, [
					E('li', {}, 'crash 进入菜单'),
					E('li', {}, '6 配置文件管理 → a 添加订阅'),
					E('li', {}, '填写名称和订阅链接 → a 保存 → 0 返回'),
					E('li', {}, '1 启动/重启服务')
				]),
				E('h4', {}, '内核切换'),
				E('p', { 'class': 'tr-dim tr-small' },
					'crash → 9 更新与支持 → 2 切换/更新内核 → 1 Mihomo 或 2 SingBox，下载后会自动切换。'),
				E('p', { 'class': 'tr-dim tr-small' },
					'实测最小配置 RSS：Mihomo v1.19.17 ≈ 13.5 MB（当前默认，较省）；sing-box 1.13.0-alpha.27 ≈ 17.8 MB。实际占用会随订阅规则增加。'),
				E('div', { 'class': 'tr-actions tr-mt' }, [
					E('a', {
						'class': 'cbi-button cbi-button-action',
						'href': s.yacd_url || '#',
						'target': '_blank',
						'rel': 'noopener'
					}, '打开 Yacd 面板'),
					E('a', {
						'class': 'cbi-button',
						'href': SHELLCRASH_URL,
						'target': '_blank',
						'rel': 'noopener'
					}, 'ShellCrash 项目')
				])
			]) : E('div', {}, [
				E('p', { 'class': 'tr-dim' }, '轻量版没有内置 ShellCrash，需要刷机后通过 SSH 安装（约 1 MB，另需下载 20–25 MB 内核）。'),
				E('pre', { 'class': 'tr-code' }, tr.text(SHELLCRASH_CMD)),
				E('p', { 'class': 'tr-dim tr-small' },
					'安装时选择 mihomo 内核。路由器需要能访问 jsDelivr 或 GitHub，失败可换安装源或在电脑下载后 scp 到路由器。'),
				E('div', { 'class': 'tr-actions tr-mt' }, [
					E('a', {
						'class': 'cbi-button',
						'href': SHELLCRASH_URL,
						'target': '_blank',
						'rel': 'noopener'
					}, '安装说明')
				])
			])
		]);

		var linksCard = E('section', { 'class': 'tr-card' }, [
			E('div', { 'class': 'tr-card-head' }, [E('h3', {}, '快捷入口')]),
			linkRow('软件包', L.url('admin/system/package'), '安装或卸载插件'),
			linkRow('防火墙', L.url('admin/network/firewall'), '端口转发、区域与规则'),
			linkRow('无线设置', L.url('admin/network/wireless'), 'SSID、密码、信道'),
			linkRow('系统日志', L.url('admin/status/logs'), '排查中继与代理问题')
		]);

		var aboutCard = E('section', { 'class': 'tr-card' }, [
			E('div', { 'class': 'tr-card-head' }, [E('h3', {}, '关于')]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, '设备'),
				E('span', { 'class': 'tr-value' }, 'Xiaomi Redmi Router AC2100')
			]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, '固件'),
				E('span', { 'class': 'tr-value' }, 'AC2100 Travel Router')
			]),
			E('p', { 'class': 'tr-dim tr-small tr-mt' },
				'为 128 MB 内存设备精简：保留中继、客户端和 MT3000 风格菜单，代理交给 ShellCrash。')
		]);

		return E('div', { 'class': 'tr-wrap' }, [
			E('div', { 'class': 'tr-head' }, [
				E('div', {}, [
					E('h1', {}, '应用'),
					E('div', { 'class': 'tr-dim' }, '代理工具与常用管理入口')
				])
			]),
			E('div', { 'class': 'tr-grid' }, [scCard, linksCard, aboutCard])
		]);
	}
});
