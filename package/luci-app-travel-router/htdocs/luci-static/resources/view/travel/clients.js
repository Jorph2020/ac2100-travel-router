'use strict';
'require view';
'require poll';
'require view.travel.common as tr';

function hostLabel(host) {
	if (!host || host === '*' || host === '?')
		return '未知设备';
	return host;
}

function isOnline(c) {
	return c && c[6] === '1';
}

function clientRow(c) {
	var ip = c[0] || '—';
	var mac = c[1] || '';
	var host = c[2] || '';
	var signal = c[3] || '';
	var iface = c[4] || '';
	var lease = c[5];
	var online = isOnline(c);

	return E('tr', {}, [
		E('td', {}, [
			E('div', { 'class': 'tr-ssid' }, tr.text(hostLabel(host))),
			E('div', { 'class': 'tr-dim tr-small' }, tr.text(iface || ''))
		]),
		E('td', {}, tr.text(ip)),
		E('td', { 'class': 'tr-mono' }, tr.text(mac)),
		E('td', {}, online
			? E('span', { 'class': 'tr-pill on' }, '在线')
			: E('span', { 'class': 'tr-pill off' }, '离线')),
		E('td', {}, (online && signal)
			? E('span', {}, [
				tr.bars(signal),
				E('span', { 'class': 'tr-dim tr-ml tr-small' }, tr.text(signal + ' dBm'))
			])
			: E('span', { 'class': 'tr-dim' }, '—')),
		E('td', {}, tr.text(tr.fmtLease(lease)))
	]);
}

function counts(list) {
	var online = 0;
	list.forEach(function(c) {
		if (isOnline(c))
			online++;
	});
	return { online: online, total: list.length };
}

return view.extend({
	load: function() {
		return tr.exec(['clients']).then(tr.parseTSV);
	},

	render: function(rows) {
		tr.injectCss();

		var body = E('tbody', { 'id': 'tr-clients-body' }, rows.map(clientRow));
		var initial = counts(rows);

		function updateCounts(list) {
			var c = counts(list);
			var a = document.getElementById('tr-client-count');
			var b = document.getElementById('tr-lease-count');
			if (a) a.textContent = String(c.online);
			if (b) b.textContent = String(c.total);
		}

		var page = E('div', { 'class': 'tr-wrap' }, [
			E('div', { 'class': 'tr-head' }, [
				E('div', {}, [
					E('h1', {}, '客户端'),
					E('div', { 'class': 'tr-dim' }, [
						E('span', { 'id': 'tr-client-count' }, String(initial.online)),
						' 台在线 / ',
						E('span', { 'id': 'tr-lease-count' }, String(initial.total)),
						' 条 DHCP 租约'
					])
				])
			]),
			E('section', { 'class': 'tr-card' }, [
				rows.length ? E('table', { 'class': 'table tr-table' }, [
					E('thead', {}, E('tr', {}, [
						E('th', {}, '主机名'),
						E('th', {}, 'IP 地址'),
						E('th', {}, 'MAC'),
						E('th', {}, '状态'),
						E('th', {}, '信号'),
						E('th', {}, '租期剩余')
					])),
					body
				]) : E('p', { 'class': 'tr-dim' }, '暂无客户端。设备连接本机 Wi-Fi 或 LAN 后会显示在这里。')
			]),
			E('p', { 'class': 'tr-dim tr-small' },
				'列表来自 dnsmasq 租约文件；离线表示租约还在但设备当前未关联 Wi-Fi。静态 IP 设备不会出现在这里。')
		]);

		poll.add(function() {
			return tr.exec(['clients']).then(function(out) {
				var list = tr.parseTSV(out);
				var tbody = document.getElementById('tr-clients-body');
				if (!tbody)
					return;
				tbody.textContent = '';
				list.forEach(function(c) {
					tbody.appendChild(clientRow(c));
				});
				updateCounts(list);
			}).catch(function() {});
		}, 15);

		return page;
	}
});
