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

		var ocInstalled = s.openclash_installed === '1';
		var ocRunning = s.openclash_running === '1';
		var ocCore = s.openclash_core === '1';
		var scInstalled = s.shellcrash_installed === '1';
		var scRunning = s.shellcrash_running === '1';

		function refreshOpenClash(expectRunning) {
			var tries = 0;
			var timer = window.setInterval(function() {
				tries++;

				tr.exec(['proxy', 'status']).then(function(out) {
					var st = tr.parseKV(out);
					var done = expectRunning ? (st.openclash_running === '1') : (st.openclash_running !== '1');

					if (done || tries >= 20) {
						window.clearInterval(timer);
						location.reload();
					}
				}).catch(function() {
					if (tries >= 20) {
						window.clearInterval(timer);
						location.reload();
					}
				});
			}, 3000);
		}

		function toggleOpenClash(btn) {
			btn.disabled = true;
			btn.classList.add('spinning');

			tr.exec(['openclash', ocRunning ? 'stop' : 'start']).then(function() {
				tr.notify(ocRunning ? '正在停止 OpenClash…' : '正在启动 OpenClash，首次启动可能需要几十秒…');
				refreshOpenClash(!ocRunning);
			}).catch(function(e) {
				tr.notify(e.message, 'danger');
				btn.disabled = false;
				btn.classList.remove('spinning');
			});
		}

		var ocCard;

		if (ocInstalled) {
			ocCard = E('section', { 'class': 'tr-card' }, [
				E('div', { 'class': 'tr-card-head' }, [
					E('h3', {}, 'OpenClash'),
					E('span', { 'class': 'tr-pill ' + (ocRunning ? 'on' : 'off') }, ocRunning ? '运行中' : '已停止')
				]),
				E('div', { 'class': 'tr-row' }, [
					E('span', { 'class': 'tr-label' }, '流量接管'),
					E('span', { 'class': 'tr-value' }, ocRunning ? '已开启透明代理' : '未接管流量')
				]),
				E('div', { 'class': 'tr-row' }, [
					E('span', { 'class': 'tr-label' }, 'OpenClash 版本'),
					E('span', { 'class': 'tr-value' }, tr.text(s.openclash_version || '未知'))
				]),
				E('div', { 'class': 'tr-row' }, [
					E('span', { 'class': 'tr-label' }, 'Mihomo 内核'),
					E('span', { 'class': 'tr-value' }, tr.text(ocCore ? (s.openclash_core_version || '已安装') : '未安装'))
				]),
				!ocCore ? E('div', { 'class': 'tr-alert tr-mt' }, [
					E('div', {}, [
						E('strong', {}, '还没有 Mihomo 内核'),
						E('div', { 'class': 'tr-dim tr-small' },
							'打开 OpenClash 页面，在“全局设置 → 更新内核”中下载（约 20 MB），然后回到这里启动。')
					])
				]) : E('span', {}),
				E('div', { 'class': 'tr-actions tr-mt' }, [
					E('button', {
						'class': 'cbi-button ' + (ocRunning ? 'cbi-button-negative' : 'cbi-button-apply'),
						'click': function(ev) { toggleOpenClash(ev.currentTarget); }
					}, ocRunning ? '停止' : '启动'),
					E('a', {
						'class': 'cbi-button',
						'href': L.url('admin/services/openclash')
					}, '打开 OpenClash')
				])
			]);
		}
		else {
			ocCard = E('section', { 'class': 'tr-card' }, [
				E('div', { 'class': 'tr-card-head' }, [
					E('h3', {}, 'OpenClash'),
					E('span', { 'class': 'tr-pill off' }, '未安装')
				]),
				E('p', { 'class': 'tr-dim' }, '当前是轻量版固件，没有集成 OpenClash 和 Ruby。'),
				E('p', { 'class': 'tr-dim tr-small' },
					'这样可以省下闪存和运行内存。需要图形界面代理时，可以改用 full 版本；轻量版建议搭配下面的 ShellCrash。')
			]);
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
					'ShellCrash 没有 LuCI 页面。SSH 登录路由器后输入 crash 进入管理菜单，可配置订阅、规则、内核和开机自启。'),
				E('div', { 'class': 'tr-actions tr-mt' }, [
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
					'安装时选择 mihomo 内核；不要和 OpenClash 同时运行。路由器需要能访问 jsDelivr 或 GitHub，失败可换安装源或在电脑下载后 scp 到路由器。'),
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
				E('span', { 'class': 'tr-value' }, ocInstalled ? 'AC2100 Travel Router（full）' : 'AC2100 Travel Router（lite）')
			]),
			E('p', { 'class': 'tr-dim tr-small tr-mt' },
				'轻量版适合 128 MB 内存的设备：保留中继、客户端和 MT3000 风格菜单，代理交给 ShellCrash，避免 Ruby/LuCI 的额外开销。')
		]);

		return E('div', { 'class': 'tr-wrap' }, [
			E('div', { 'class': 'tr-head' }, [
				E('div', {}, [
					E('h1', {}, '应用'),
					E('div', { 'class': 'tr-dim' }, '代理工具与常用管理入口')
				])
			]),
			E('div', { 'class': 'tr-grid' }, [ocCard, scCard, linksCard, aboutCard])
		]);
	}
});
