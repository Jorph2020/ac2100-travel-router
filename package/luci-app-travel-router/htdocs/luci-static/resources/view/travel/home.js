'use strict';
'require view';
'require poll';
'require ui';
'require view.travel.common as tr';

function setText(id, value) {
	var el = document.getElementById(id);

	if (el)
		el.textContent = (value == null) ? '' : String(value);
}

function card(title, body, extra) {
	return E('section', { 'class': 'tr-card' }, [
		E('div', { 'class': 'tr-card-head' }, [
			E('h3', {}, title),
			extra || ''
		]),
		body
	]);
}

function row(label, value, id) {
	return E('div', { 'class': 'tr-row' }, [
		E('span', { 'class': 'tr-label' }, label),
		E('span', { 'class': 'tr-value', 'id': id || null }, tr.text(value))
	]);
}

function relayStateLabel(state) {
	switch (state) {
	case 'connected':
		return '已连接';
	case 'connecting':
		return '正在获取地址';
	case 'disabled':
		return '已断开';
	case 'unconfigured':
		return '未设置';
	default:
		return '未连接';
	}
}

return view.extend({
	load: function() {
		return tr.exec(['home']).then(tr.parseKV);
	},

	render: function(s) {
		tr.injectCss();

		var online = !!s.wan_ip && (s.uplink === 'wifi' || s.uplink === 'ethernet');
		var uplinkText = (s.uplink === 'wifi')
			? ('无线中继 · ' + (s.relay_ssid || '已关联'))
			: ((s.uplink === 'ethernet') ? '有线 WAN' : '未连接上游网络');

		var hero = E('div', { 'class': 'tr-hero ' + (online ? 'ok' : 'warn'), 'id': 'tr-hero' }, [
			E('div', { 'class': 'tr-hero-icon' }, online ? '✓' : '!'),
			E('div', { 'class': 'tr-hero-body' }, [
				E('div', { 'class': 'tr-hero-title', 'id': 'tr-hero-title' }, online ? '已连接互联网' : '未连接互联网'),
				E('div', { 'class': 'tr-hero-sub', 'id': 'tr-hero-sub' }, tr.text(uplinkText))
			]),
			E('div', { 'class': 'tr-hero-ip' }, [
				E('span', { 'id': 'tr-wan-ip' }, tr.text(s.wan_ip || '—')),
				E('small', {}, '外网地址')
			])
		]);

		var cards = [
			card('无线中继', E('div', {}, [
				row('上游 Wi-Fi', s.relay_ssid || '—', 'tr-relay-ssid'),
				E('div', { 'class': 'tr-row' }, [
					E('span', { 'class': 'tr-label' }, '信号'),
					E('span', { 'class': 'tr-value' }, [
						E('span', { 'id': 'tr-relay-bars' }, tr.bars(s.relay_signal)),
						E('span', { 'id': 'tr-relay-signal', 'class': 'tr-dim tr-ml' }, tr.text(s.relay_signal ? (s.relay_signal + ' dBm') : '—'))
					])
				]),
				row('状态', relayStateLabel(s.relay_state), 'tr-relay-state'),
				row('中继地址', s.relay_ip || '—', 'tr-relay-ip')
			]), E('a', {
				'class': 'tr-link',
				'href': L.url('admin/internet/repeater')
			}, '设置 ›')),

			card('客户端', E('div', {}, [
				E('div', { 'class': 'tr-metric' }, [
					E('strong', { 'id': 'tr-clients' }, tr.text(s.clients || '0')),
					E('span', {}, ' 台设备')
				]),
				E('div', { 'class': 'tr-dim' }, tr.text('Wi-Fi 在线 ' + (s.wifi_clients || '0') + ' 台')),
				E('div', { 'class': 'tr-mt' }, E('a', {
					'class': 'cbi-button',
					'href': L.url('admin/clients')
				}, '查看客户端'))
			])),

			card('OpenClash', E('div', {}, [
				E('div', { 'class': 'tr-row' }, [
					E('span', { 'class': 'tr-label' }, '状态'),
					E('span', {
						'class': 'tr-pill ' + (s.openclash_running === '1' ? 'on' : 'off'),
						'id': 'tr-oc-pill'
					}, s.openclash_running === '1' ? '运行中' : '已停止')
				]),
				E('div', { 'class': 'tr-row' }, [
					E('span', { 'class': 'tr-label' }, '开机自启'),
					E('span', { 'class': 'tr-value' }, s.openclash_enabled === '1' ? '已启用' : '未启用')
				]),
				E('div', { 'class': 'tr-dim tr-mt' }, '订阅、规则与内核由 OpenClash 管理。'),
				E('div', { 'class': 'tr-mt' }, E('a', {
					'class': 'cbi-button',
					'href': L.url('admin/apps')
				}, '打开应用'))
			])),

			card('系统', E('div', {}, [
				row('运行时间', tr.fmtUptime(s.uptime), 'tr-uptime'),
				row('负载', s.load || '0', 'tr-load'),
				E('div', { 'class': 'tr-row' }, [
					E('span', { 'class': 'tr-label' }, '内存'),
					E('span', { 'class': 'tr-value', 'id': 'tr-mem' }, tr.text(s.mem_used + ' / ' + s.mem_total + ' MB'))
				]),
				E('div', { 'class': 'tr-bar' }, E('i', {
					'id': 'tr-mem-bar',
					'style': 'width:' + Math.min(parseInt(s.mem_pct, 10) || 0, 100) + '%'
				}))
			])),

			card('Wi-Fi 与地址', E('div', {}, [
				row('2.4 GHz', s.ssid_2g || '—'),
				row('5 GHz', s.ssid_5g || '—'),
				row('管理地址', 'http://' + (s.lan_ip || '192.168.8.1'))
			]))
		];

		var warn = null;

		if (s.rootpw === '0') {
			warn = E('div', { 'class': 'tr-alert' }, [
				E('div', {}, [
					E('strong', {}, '尚未设置 root 密码'),
					E('div', { 'class': 'tr-dim' }, '任何人都能登录路由器，请立即设置密码。')
				]),
				E('a', { 'class': 'cbi-button cbi-button-apply', 'href': L.url('admin/system/admin') }, '去设置')
			]);
		}

		var children = [
			E('div', { 'class': 'tr-head' }, [
				E('div', {}, [
					E('h1', {}, 'AC2100 旅行路由'),
					E('div', { 'class': 'tr-dim' }, tr.text((s.hostname || 'AC2100-Travel') + ' · ' + (s.model || 'Xiaomi Redmi Router AC2100')))
				]),
				E('div', { 'class': 'tr-fw' }, tr.text(s.firmware || ''))
			]),
			hero
		];

		if (warn)
			children.push(warn);

		children.push(E('div', { 'class': 'tr-grid' }, cards));

		children.push(E('div', { 'class': 'tr-actions' }, [
				E('button', {
					'class': 'cbi-button cbi-button-action',
					'click': function() { location.href = L.url('admin/internet/repeater'); }
				}, '中继设置'),
				E('button', {
					'class': 'cbi-button',
					'click': function() { location.href = L.url('admin/network/wireless'); }
				}, '无线设置'),
				E('button', {
					'class': 'cbi-button',
					'click': function() {
						tr.confirm('重启网络', '将重新加载 WAN 和 Wi-Fi，已连接的客户端会短暂断线。', '重启').then(function(ok) {
							if (!ok)
								return;

							tr.exec(['reconnect']).then(function() {
								tr.notify('网络正在重新加载，请稍候…');
							}).catch(function(e) {
								tr.notify(e.message, 'danger');
							});
						});
					}
				}, '重启网络')
			]));

		var page = E('div', { 'class': 'tr-wrap' }, children);

		poll.add(function() {
			return tr.exec(['home']).then(function(out) {
				var d = tr.parseKV(out);
				var on = !!d.wan_ip && (d.uplink === 'wifi' || d.uplink === 'ethernet');

				setText('tr-hero-title', on ? '已连接互联网' : '未连接互联网');
				setText('tr-hero-sub', (d.uplink === 'wifi')
					? ('无线中继 · ' + (d.relay_ssid || '已关联'))
					: ((d.uplink === 'ethernet') ? '有线 WAN' : '未连接上游网络'));
				setText('tr-wan-ip', d.wan_ip || '—');
				setText('tr-relay-ssid', d.relay_ssid || '—');
				setText('tr-relay-signal', d.relay_signal ? (d.relay_signal + ' dBm') : '—');
				setText('tr-relay-state', relayStateLabel(d.relay_state));
				setText('tr-relay-ip', d.relay_ip || '—');
				setText('tr-clients', d.clients || '0');
				setText('tr-uptime', tr.fmtUptime(d.uptime));
				setText('tr-load', d.load || '0');
				setText('tr-mem', d.mem_used + ' / ' + d.mem_total + ' MB');

				var heroEl = document.getElementById('tr-hero');
				if (heroEl && on !== online) {
					heroEl.className = 'tr-hero ' + (on ? 'ok' : 'warn');
					online = on;
				}

				var bar = document.getElementById('tr-mem-bar');
				if (bar)
					bar.style.width = Math.min(parseInt(d.mem_pct, 10) || 0, 100) + '%';

				var pill = document.getElementById('tr-oc-pill');
				if (pill) {
					pill.textContent = (d.openclash_running === '1') ? '运行中' : '已停止';
					pill.className = 'tr-pill ' + (d.openclash_running === '1' ? 'on' : 'off');
				}
			}).catch(function() { /* transient errors while reloading are expected */ });
		}, 15);

		return page;
	}
});
