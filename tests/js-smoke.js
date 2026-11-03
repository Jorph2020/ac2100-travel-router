'use strict';
/*
 * Minimal harness that executes the LuCI view modules outside of LuCI and
 * calls render() with representative data.  It catches undefined variables,
 * typos and other runtime errors that a pure syntax check would miss.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'package/luci-app-travel-router/htdocs/luci-static/resources');

const documentStub = {
	getElementById: () => null,
	createTextNode: value => ({ text: String(value) }),
	head: { appendChild: () => {} },
	body: { classList: { add: () => {}, remove: () => {} } }
};

function E(tag, attrs, children) {
	return { tag, attrs: attrs || {}, children };
}

const L = {
	url: (...parts) => '/cgi-bin/luci/' + parts.join('/'),
	resource: p => '/luci-static/resources/' + p
};

function load(file, params) {
	const src = fs.readFileSync(path.join(root, file), 'utf8');
	const names = Object.keys(params);
	const fn = new Function(...names, src);
	return fn(...names.map(n => params[n]));
}

const fsStub = {
	exec: () => Promise.resolve({ code: 0, stdout: '', stderr: '' }),
	write: () => Promise.resolve()
};

const uiStub = {
	addNotification: () => {},
	showModal: () => ({}),
	hideModal: () => {}
};

const viewStub = { extend: obj => obj };
const pollStub = { add: () => {} };

const common = load('view/travel/common.js', {
	E, L, document: documentStub, fs: fsStub, ui: uiStub
});

const sampleHome = {
	hostname: 'AC2100-Travel',
	model: 'Xiaomi Redmi Router AC2100',
	firmware: 'OpenWrt 24.10.8 r1',
	uptime: '3600',
	load: '0.12',
	mem_used: '60',
	mem_total: '120',
	mem_pct: '50',
	uplink: 'wifi',
	wan_ip: '192.168.31.22',
	wan_dev: 'sta0',
	relay_state: 'connected',
	relay_ssid: 'MiFi-1234',
	relay_signal: '-52',
	relay_quality: '65/70',
	relay_ip: '192.168.31.22',
	clients: '3',
	wifi_clients: '3',
	openclash_running: '0',
	openclash_enabled: '0',
	rootpw: '0',
	lan_ip: '192.168.8.1',
	ssid_2g: 'AC2100-Travel',
	ssid_5g: 'AC2100-Travel-5G'
};

const cases = [];

cases.push({
	name: 'home',
	file: 'view/travel/home.js',
	params: { E, L, document: documentStub, view: viewStub, poll: pollStub, ui: uiStub, tr: common },
	render: sampleHome
});

cases.push({
	name: 'clients',
	file: 'view/travel/clients.js',
	params: { E, document: documentStub, view: viewStub, poll: pollStub, tr: common },
	render: [
		['192.168.8.100', 'AA:BB:CC:DD:EE:01', 'phone', '-55', 'phy0-ap0', '120'],
		['192.168.8.101', 'AA:BB:CC:DD:EE:02', '*', '', '', '-1']
	]
});

cases.push({
	name: 'apps',
	file: 'view/travel/apps.js',
	params: { E, L, document: documentStub, view: viewStub, ui: uiStub, tr: common },
	render: {
		openclash_installed: '1',
		openclash_running: '1',
		openclash_core: '1',
		openclash_version: '0.48.002',
		openclash_core_version: 'Mihomo v1.19.33',
		shellcrash_installed: '1',
		shellcrash_running: '0',
		shellcrash_dir: '/etc/ShellCrash'
	}
});

cases.push({
	name: 'apps-lite',
	file: 'view/travel/apps.js',
	params: { E, L, document: documentStub, view: viewStub, ui: uiStub, tr: common },
	render: {
		openclash_installed: '0',
		openclash_running: '0',
		openclash_core: '0',
		openclash_version: '',
		openclash_core_version: '',
		shellcrash_installed: '0',
		shellcrash_running: '0',
		shellcrash_dir: ''
	}
});

cases.push({
	name: 'repeater',
	file: 'view/travel/repeater.js',
	params: { E, L, document: documentStub, view: viewStub, fs: fsStub, ui: uiStub, tr: common },
	render: [
		{
			configured: '1',
			state: 'connected',
			cfg_ssid: 'MiFi-1234',
			ssid: 'MiFi-1234',
			signal: '-52',
			quality: '65/70',
			ip: '192.168.31.22',
			device: 'sta0',
			band: '2g',
			mode: 'nat'
		},
		[
			['MiFi-1234', 'AA:BB:CC:DD:EE:01', '-52', '2g', '6', 'WPA2 PSK (CCMP)'],
			['FreeWiFi', 'AA:BB:CC:DD:EE:03', '-70', '5g', '149', 'none']
		]
	]
});

let failed = 0;

for (const c of cases) {
	try {
		const mod = load(c.file, c.params);
		const out = mod.render(c.render);

		if (!out || !out.tag)
			throw new Error('render did not return a node');

		console.log('OK  ' + c.name);
	}
	catch (e) {
		failed++;
		console.error('ERR ' + c.name + ': ' + (e.stack || e.message));
	}
}

process.exit(failed ? 1 : 0);
