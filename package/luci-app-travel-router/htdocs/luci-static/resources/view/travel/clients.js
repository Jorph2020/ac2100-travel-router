'use strict';
'require view';
'require poll';
'require view.travel.common as tr';

function hostLabel(host) {
	if (!host || host === '*' || host === '?')
		return '未知设备';

	return host;
}

function clientRow(c) {
	var ip = c[0] || '—';
	var mac = c[1] || '';
	var host = c[2] || '';
	var signal = c[3] || '';
	var iface = c[4] || '';
	var lease = c[5];

	return E('tr', {}, [
		E('td', {}, [
			E('div', { 'class': 'tr-ssid' }, tr.text(hostLabel(host))),
			E('div', { 'class': 'tr-dim tr-small' }, tr.text(iface || ''))
		]),
		E('td', {}, tr.text(ip)),
		E('td', { 'class': 'tr-mono' }, tr.text(mac)),
		E('td', {}, signal ? E('span', {}, [tr.bars(signal), E('span', { 'class': 'tr-dim tr-ml tr-small' }, tr.text(signal + ' dBm'))]) : E('span', { 'class': 'tr-dim' }, '有线')),
		E('td', {}, tr.text(tr.fmtLease(lease)))
	]);
}

return view.extend({
	load: function() {
		return tr.exec(['clients']).then(tr.parseTSV);
	},

	render: function(rows) {
		tr.injectCss();

		var body = E('tbody', { 'id': 'tr-clients-body' }, rows.map(clientRow));

		function updateCount(list) {
			var el = document.getElementById('tr-client-count');

			if (el)
				el.textContent = String(list.length);
		}

		var page = E('div', { 'class': 'tr-wrap' }, [
			E('div', { 'class': 'tr-head' }, [
				E('div', {}, [
					E('h1', {}, '客户端'),
					E('div', { 'class': 'tr-dim' }, [
						E('span', { 'id': 'tr-client-count' }, String(rows.length)),
						' 台设备通过 DHCP 获取了地址'
					])
				])
			]),
			E('section', { 'class': 'tr-card' }, [
				rows.length ? E('table', { 'class': 'table tr-table' }, [
					E('thead', {}, E('tr', {}, [
						E('th', {}, '主机名'),
						E('th', {}, 'IP 地址'),
						E('th', {}, 'MAC'),
						E('th', {}, '信号'),
						E('th', {}, '租期剩余')
					])),
					body
				]) : E('p', { 'class': 'tr-dim' }, '暂无客户端。设备连接本机 Wi-Fi 或 LAN 后会显示在这里。')
			]),
			E('p', { 'class': 'tr-dim tr-small' },
				'列表来自 dnsmasq 租约文件；为静态 IP 的设备不会出现在这里。')
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

				updateCount(list);
			}).catch(function() { /* ignore transient errors */ });
		}, 15);

		return page;
	}
});
