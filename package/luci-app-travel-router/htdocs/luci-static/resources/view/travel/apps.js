'use strict';
'require view';
'require ui';
'require view.travel.common as tr';

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
		return tr.exec(['openclash', 'status']).then(tr.parseKV);
	},

	render: function(oc) {
		tr.injectCss();

		var running = oc.running === '1';
		var core = oc.core === '1';

		function refreshUntil(expectRunning) {
			var tries = 0;
			var timer = window.setInterval(function() {
				tries++;

				tr.exec(['openclash', 'status']).then(function(out) {
					var s = tr.parseKV(out);
					var done = expectRunning ? (s.running === '1') : (s.running !== '1');

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

		function toggle(btn) {
			btn.disabled = true;
			btn.classList.add('spinning');

			tr.exec(['openclash', running ? 'stop' : 'start']).then(function() {
				tr.notify(running ? '正在停止 OpenClash…' : '正在启动 OpenClash，首次启动可能需要几十秒…');
				refreshUntil(!running);
			}).catch(function(e) {
				tr.notify(e.message, 'danger');
				btn.disabled = false;
				btn.classList.remove('spinning');
			});
		}

		var ocCard = E('section', { 'class': 'tr-card' }, [
			E('div', { 'class': 'tr-card-head' }, [
				E('h3', {}, 'OpenClash'),
				E('span', { 'class': 'tr-pill ' + (running ? 'on' : 'off') }, running ? '运行中' : '已停止')
			]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, '流量接管'),
				E('span', { 'class': 'tr-value' }, running ? '已开启透明代理' : '未接管流量')
			]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, 'OpenClash 版本'),
				E('span', { 'class': 'tr-value' }, tr.text(oc.oc_version || '未知'))
			]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, 'Mihomo 内核'),
				E('span', { 'class': 'tr-value' }, tr.text(core ? (oc.core_version || '已安装') : '未安装'))
			]),
			!core ? E('div', { 'class': 'tr-alert tr-mt' }, [
				E('div', {}, [
					E('strong', {}, '还没有 Mihomo 内核'),
					E('div', { 'class': 'tr-dim tr-small' },
						'打开 OpenClash 页面，在“全局设置 → 更新内核”中下载（约 20 MB），然后回到这里启动。')
				])
			]) : E('span', {}),
			E('div', { 'class': 'tr-actions tr-mt' }, [
				E('button', {
					'class': 'cbi-button ' + (running ? 'cbi-button-negative' : 'cbi-button-apply'),
					'click': function(ev) { toggle(ev.currentTarget); }
				}, running ? '停止' : '启动'),
				E('a', {
					'class': 'cbi-button',
					'href': L.url('admin/services/openclash')
				}, '打开 OpenClash')
			])
		]);

		var linksCard = E('section', { 'class': 'tr-card' }, [
			E('div', { 'class': 'tr-card-head' }, [E('h3', {}, '快捷入口')]),
			linkRow('软件包', L.url('admin/system/package'), '安装或卸载插件'),
			linkRow('防火墙', L.url('admin/network/firewall'), '端口转发、区域与规则'),
			linkRow('无线设置', L.url('admin/network/wireless'), 'SSID、密码、信道'),
			linkRow('系统日志', L.url('admin/status/logs'), '排查中继与 OpenClash 问题')
		]);

		var aboutCard = E('section', { 'class': 'tr-card' }, [
			E('div', { 'class': 'tr-card-head' }, [E('h3', {}, '关于')]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, '设备'),
				E('span', { 'class': 'tr-value' }, 'Xiaomi Redmi Router AC2100')
			]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, '固件'),
				E('span', { 'class': 'tr-value' }, 'AC2100 Travel Router 1.0')
			]),
			E('p', { 'class': 'tr-dim tr-small tr-mt' },
				'OpenClash 使用 Fake-IP + nftables 透明代理。若代理未生效，请先确认 OpenClash 页面中的内核、配置文件与规则均为正常状态。')
		]);

		return E('div', { 'class': 'tr-wrap' }, [
			E('div', { 'class': 'tr-head' }, [
				E('div', {}, [
					E('h1', {}, '应用'),
					E('div', { 'class': 'tr-dim' }, 'OpenClash 与常用管理入口')
				])
			]),
			E('div', { 'class': 'tr-grid' }, [ocCard, linksCard, aboutCard])
		]);
	}
});
