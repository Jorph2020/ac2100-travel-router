'use strict';
'require baseclass';
'require fs';
'require ui';

var BASE = '/usr/bin/travel-router';

/* Run a travel-router subcommand and resolve with its stdout. */
function exec(args) {
	return fs.exec(BASE, args || []).then(function(res) {
		if (res.code !== 0) {
			var out = (res.stderr || res.stdout || '').trim();
			throw new Error(out || '命令执行失败（退出码 ' + res.code + '）');
		}
		return res.stdout;
	});
}

/* Parse "key=value" lines into a plain object. */
function parseKV(text) {
	var out = {};

	(text || '').split('\n').forEach(function(line) {
		var pos = line.indexOf('=');

		if (pos > 0)
			out[line.substring(0, pos)] = line.substring(pos + 1);
	});

	return out;
}

/* Parse tab separated lines into an array of field arrays. */
function parseTSV(text) {
	var out = [];

	(text || '').split('\n').forEach(function(line) {
		if (line.length)
			out.push(line.split('\t'));
	});

	return out;
}

/* Load the stylesheet once. */
function injectCss() {
	if (document.getElementById('travel-router-css'))
		return;

	document.head.appendChild(E('link', {
		'id': 'travel-router-css',
		'rel': 'stylesheet',
		'href': L.resource('travel/style.css')
	}));
}

/* Four signal bars for a dBm value. */
function bars(dbm) {
	var dbmNum = parseInt(dbm, 10);
	var level = 0;

	if (!isNaN(dbmNum)) {
		if (dbmNum >= -55) level = 4;
		else if (dbmNum >= -65) level = 3;
		else if (dbmNum >= -75) level = 2;
		else if (dbmNum >= -85) level = 1;
	}

	var items = [];

	for (var i = 1; i <= 4; i++)
		items.push(E('i', { 'class': (i <= level) ? 'on' : '' }));

	return E('span', { 'class': 'tr-bars' }, items);
}

function fmtUptime(sec) {
	var s = parseInt(sec, 10) || 0;
	var d = Math.floor(s / 86400);
	var h = Math.floor((s % 86400) / 3600);
	var m = Math.floor((s % 3600) / 60);

	if (d > 0)
		return d + ' 天 ' + h + ' 小时';
	if (h > 0)
		return h + ' 小时 ' + m + ' 分';
	return m + ' 分钟';
}

function fmtLease(minutes) {
	var m = parseInt(minutes, 10);

	if (isNaN(m) || m < 0)
		return '永久';

	if (m >= 60)
		return Math.floor(m / 60) + ' 小时 ' + (m % 60) + ' 分';

	return m + ' 分钟';
}

/* Human readable label for a hostapd encryption string. */
function encLabel(enc) {
	var s = (enc || '').toUpperCase();

	if (!s || s === 'UNKNOWN')
		return '未知';
	if (s.indexOf('WEP') >= 0)
		return 'WEP';
	if (s.indexOf('WPA3') >= 0 && s.indexOf('WPA2') >= 0)
		return 'WPA2/WPA3';
	if (s.indexOf('WPA3') >= 0 || s.indexOf('SAE') >= 0)
		return 'WPA3';
	if (s.indexOf('ENTERPRISE') >= 0)
		return '企业';
	if (s.indexOf('WPA2') >= 0 || s.indexOf('RSN') >= 0)
		return 'WPA2';
	if (s.indexOf('WPA') >= 0)
		return 'WPA';
	if (s.indexOf('NONE') >= 0 || s.indexOf('OPEN') >= 0)
		return '开放';

	return '未知';
}

/* Map a scanned encryption string to an OpenWrt wifi-iface encryption. */
function encFromScan(enc) {
	var s = (enc || '').toUpperCase();

	if (s.indexOf('WEP') >= 0)
		return 'wep';
	if (s.indexOf('WPA3') >= 0 && s.indexOf('WPA2') >= 0)
		return 'sae-mixed';
	if (s.indexOf('WPA3') >= 0 || s.indexOf('SAE') >= 0)
		return 'sae';
	if (s.indexOf('ENTERPRISE') >= 0)
		return 'wpa2';
	if (s.indexOf('WPA2') >= 0 || s.indexOf('RSN') >= 0)
		return 'psk2';
	if (s.indexOf('WPA') >= 0)
		return 'psk';
	if (s.indexOf('NONE') >= 0 || s.indexOf('OPEN') >= 0)
		return 'none';

	return 'psk2';
}

function text(value) {
	return document.createTextNode((value == null) ? '' : String(value));
}

function esc(value) {
	return String(value == null ? '' : value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function notify(message, kind) {
	ui.addNotification(null, E('p', {}, text(message)), kind || 'info');
}

/* Simple yes/no modal, resolves to a boolean. */
function confirm(title, message, okLabel) {
	return new Promise(function(resolve) {
		ui.showModal(title, [
			E('p', {}, text(message)),
			E('div', { 'class': 'right' }, [
				E('button', {
					'class': 'btn',
					'click': function() { ui.hideModal(); resolve(false); }
				}, '取消'),
				E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() { ui.hideModal(); resolve(true); }
				}, okLabel || '确定')
			])
		]);
	});
}

return baseclass.extend({
	exec: exec,
	parseKV: parseKV,
	parseTSV: parseTSV,
	injectCss: injectCss,
	bars: bars,
	fmtUptime: fmtUptime,
	fmtLease: fmtLease,
	encLabel: encLabel,
	encFromScan: encFromScan,
	text: text,
	esc: esc,
	notify: notify,
	confirm: confirm
});
