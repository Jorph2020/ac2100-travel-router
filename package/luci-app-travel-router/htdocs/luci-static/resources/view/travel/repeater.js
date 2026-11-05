'use strict';
'require view';
'require fs';
'require ui';
'require view.travel.common as tr';

var stateLabels = {
	connected: '已连接',
	connecting: '正在获取地址',
	disconnected: '未连接',
	disabled: '已断开',
	unconfigured: '未设置'
};

function stateLabel(state) {
	return stateLabels[state] || '未连接';
}

function pill(state) {
	var cls = (state === 'connected') ? 'on' : ((state === 'connecting') ? 'wait' : 'off');

	return E('span', { 'class': 'tr-pill ' + cls }, stateLabel(state));
}

return view.extend({
	load: function() {
		return Promise.all([
			tr.exec(['status']).then(tr.parseKV),
			tr.exec(['scan']).then(tr.parseTSV).catch(function() { return []; })
		]);
	},

	render: function(data) {
		tr.injectCss();

		var st = data[0] || {};
		// Strongest signal first; the backend already sorts, this also covers
		// entries coming from a scan cached by an older script version.
		var networks = (data[1] || []).slice().sort(function(a, b) {
			return (parseInt(b[2], 10) || -999) - (parseInt(a[2], 10) || -999);
		});

		function connectTo(ssid, key, band, enc, hidden) {
			ui.hideModal();

			return fs.write('/tmp/travel.key', key || '', 384).then(function() {
				return tr.exec(['connect', ssid, '/tmp/travel.key', band, enc, hidden ? '1' : '0']);
			}).then(function() {
				waitForLink(ssid);
			}).catch(function(e) {
				tr.notify(e.message, 'danger');
			});
		}

		function waitForLink(ssid) {
			ui.showModal('正在连接…', [
				E('p', { 'class': 'spinning' }, tr.text('正在连接 ' + ssid + '，并等待上游分配 IP 地址…')),
				E('p', { 'class': 'tr-dim' }, '最多等待 30 秒。若失败，请检查密码、频段与信号强度。')
			]);

			var tries = 0;
			var timer = window.setInterval(function() {
				tries++;

				tr.exec(['status']).then(function(out) {
					var s = tr.parseKV(out);

					if (s.state === 'connected' || tries >= 12) {
						window.clearInterval(timer);
						location.reload();
					}
				}).catch(function() {
					if (tries >= 12) {
						window.clearInterval(timer);
						location.reload();
					}
				});
			}, 2500);
		}

		function openJoin(net) {
			var ssid = net[0];
			var band = net[3] || '2g';
			var enc = tr.encFromScan(net[5]);

			if ((net[5] || '').toUpperCase().indexOf('ENTERPRISE') >= 0) {
				tr.notify('暂不支持 802.1X 企业认证网络', 'danger');
				return;
			}

			if (enc === 'none') {
				connectTo(ssid, '', band, 'none', false);
				return;
			}

			var pw = E('input', {
				'type': 'password',
				'class': 'cbi-input-text',
				'placeholder': '输入 Wi-Fi 密码'
			});

			var bsel = E('select', { 'class': 'cbi-input-select' }, [
				E('option', { 'value': band, 'selected': '' }, band === '5g' ? '5 GHz' : '2.4 GHz'),
				E('option', { 'value': band === '5g' ? '2g' : '5g' }, band === '5g' ? '2.4 GHz' : '5 GHz')
			]);

			ui.showModal('连接 ' + tr.esc(ssid), [
				E('div', { 'class': 'tr-modal' }, [
					E('div', { 'class': 'tr-dim' },
						tr.text(tr.encLabel(net[5]) + (net[2] ? (' · ' + net[2] + ' dBm') : ''))),
					E('label', { 'class': 'tr-field' }, [
						E('span', {}, '密码'),
						pw
					]),
					E('label', { 'class': 'tr-field' }, [
						E('span', {}, '频段'),
						bsel
					])
				]),
				E('div', { 'class': 'right tr-mt' }, [
					E('button', {
						'class': 'btn',
						'click': function() { ui.hideModal(); }
					}, '取消'),
					E('button', {
						'class': 'cbi-button cbi-button-apply',
						'click': function() {
							var key = pw.value || '';

							if (enc !== 'wep' && key.length < 8) {
								tr.notify('WPA/WPA2/WPA3 密码至少需要 8 位', 'danger');
								return;
							}

							connectTo(ssid, key, bsel.value, enc, false);
						}
					}, '连接')
				])
			]);
		}

		function confirmAction(title, message, label, args) {
			tr.confirm(title, message, label).then(function(ok) {
				if (!ok)
					return;

				tr.exec(args).then(function() {
					tr.notify('操作已提交，正在重新加载 Wi-Fi…');
					window.setTimeout(function() { location.reload(); }, 6000);
				}).catch(function(e) {
					tr.notify(e.message, 'danger');
				});
			});
		}

		var statusCard = E('section', { 'class': 'tr-card' }, [
			E('div', { 'class': 'tr-card-head' }, [
				E('h3', {}, '当前中继'),
				pill(st.state)
			]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, '上游 Wi-Fi'),
				E('span', { 'class': 'tr-value' }, tr.text(st.ssid || st.cfg_ssid || '—'))
			]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, '信号'),
				E('span', { 'class': 'tr-value' }, [
					tr.bars(st.signal),
					E('span', { 'class': 'tr-dim tr-ml' }, tr.text(st.signal ? (st.signal + ' dBm') : '—'))
				])
			]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, '获取的地址'),
				E('span', { 'class': 'tr-value' }, tr.text(st.ip || '—'))
			]),
			E('div', { 'class': 'tr-row' }, [
				E('span', { 'class': 'tr-label' }, '模式'),
				E('span', { 'class': 'tr-value' }, 'NAT 中继（WISP）')
			]),
			E('div', { 'class': 'tr-actions tr-mt' }, [
				E('button', {
					'class': 'cbi-button',
					'disabled': (st.configured !== '1') ? '' : null,
					'click': function() {
						confirmAction('断开中继', '断开后上游 Wi-Fi 将不再提供网络，配置会保留。', '断开', ['disconnect']);
					}
				}, '断开'),
				E('button', {
					'class': 'cbi-button cbi-button-negative',
					'disabled': (st.configured !== '1') ? '' : null,
					'click': function() {
						confirmAction('忘记上游 Wi-Fi', '将删除保存的上游 Wi-Fi 配置和 wwan 接口。', '删除', ['forget']);
					}
				}, '忘记')
			])
		]);

		var rows = networks.map(function(net) {
			return E('tr', {}, [
				E('td', {}, [
					E('div', { 'class': 'tr-ssid' }, tr.text(net[0])),
					E('div', { 'class': 'tr-dim tr-small' }, tr.text(net[1] || ''))
				]),
				E('td', {}, [
					tr.bars(net[2]),
					E('span', { 'class': 'tr-dim tr-ml tr-small' }, tr.text((net[2] || '?') + ' dBm'))
				]),
				E('td', {}, E('span', { 'class': 'tr-tag' }, net[3] === '5g' ? '5 GHz' : '2.4 GHz')),
				E('td', {}, tr.text(tr.encLabel(net[5]))),
				E('td', { 'class': 'tr-right' }, E('button', {
					'class': 'cbi-button cbi-button-action',
					'click': function() { openJoin(net); }
				}, '连接'))
			]);
		});

		var scanCard = E('section', { 'class': 'tr-card tr-span-2' }, [
			E('div', { 'class': 'tr-card-head' }, [
				E('h3', {}, '附近的 Wi-Fi'),
				E('button', {
					'class': 'cbi-button',
					'click': function(ev) {
						var btn = ev.currentTarget;
						btn.disabled = true;
						btn.classList.add('spinning');

						tr.exec(['scan', '--force']).then(function() {
							location.reload();
						}).catch(function(e) {
							tr.notify(e.message, 'danger');
							btn.disabled = false;
							btn.classList.remove('spinning');
						});
					}
				}, '重新扫描')
			]),
			networks.length ? E('table', { 'class': 'table tr-table' }, [
				E('thead', {}, E('tr', {}, [
					E('th', {}, 'SSID'),
					E('th', {}, '信号'),
					E('th', {}, '频段'),
					E('th', {}, '加密'),
					E('th', {})
				])),
				E('tbody', {}, rows)
			]) : E('p', { 'class': 'tr-dim' }, '未扫描到网络。请确认无线已启用，然后点击“重新扫描”。'),
			E('p', { 'class': 'tr-dim tr-small tr-mt' },
				'扫描时 5 GHz 接入点可能会短暂中断；连接成功后建议在“无线设置”中检查信道。')
		]);

		var manualCard = E('section', { 'class': 'tr-card tr-span-2' }, [
			E('div', { 'class': 'tr-card-head' }, [
				E('h3', {}, '手动连接 / 隐藏网络')
			]),
			E('div', { 'class': 'tr-form' }, [
				E('label', { 'class': 'tr-field' }, [
					E('span', {}, 'SSID'),
					E('input', { 'id': 'tr-manual-ssid', 'class': 'cbi-input-text', 'placeholder': '上游 Wi-Fi 名称' })
				]),
				E('label', { 'class': 'tr-field' }, [
					E('span', {}, '频段'),
					E('select', { 'id': 'tr-manual-band', 'class': 'cbi-input-select' }, [
						E('option', { 'value': 'auto' }, '自动'),
						E('option', { 'value': '2g' }, '2.4 GHz'),
						E('option', { 'value': '5g' }, '5 GHz')
					])
				]),
				E('label', { 'class': 'tr-field' }, [
					E('span', {}, '加密'),
					E('select', { 'id': 'tr-manual-enc', 'class': 'cbi-input-select' }, [
						E('option', { 'value': 'psk2' }, 'WPA2-PSK'),
						E('option', { 'value': 'sae-mixed' }, 'WPA2/WPA3'),
						E('option', { 'value': 'sae' }, 'WPA3-SAE'),
						E('option', { 'value': 'psk' }, 'WPA-PSK'),
						E('option', { 'value': 'none' }, '开放网络'),
						E('option', { 'value': 'wep' }, 'WEP')
					])
				]),
				E('label', { 'class': 'tr-field' }, [
					E('span', {}, '密码'),
					E('input', { 'id': 'tr-manual-key', 'class': 'cbi-input-text', 'type': 'password', 'placeholder': '开放网络留空' })
				]),
				E('label', { 'class': 'tr-check' }, [
					E('input', { 'id': 'tr-manual-hidden', 'type': 'checkbox' }),
					E('span', {}, '隐藏网络（不广播 SSID）')
				]),
				E('div', { 'class': 'tr-mt' }, E('button', {
					'class': 'cbi-button cbi-button-apply',
					'click': function() {
						var ssid = document.getElementById('tr-manual-ssid').value.trim();
						var band = document.getElementById('tr-manual-band').value;
						var enc = document.getElementById('tr-manual-enc').value;
						var key = document.getElementById('tr-manual-key').value || '';
						var hidden = document.getElementById('tr-manual-hidden').checked;

						if (!ssid) {
							tr.notify('请输入上游 Wi-Fi 名称', 'danger');
							return;
						}

						if (enc !== 'none' && enc !== 'wep' && key.length < 8) {
							tr.notify('密码至少需要 8 位', 'danger');
							return;
						}

						connectTo(ssid, key, band, enc, hidden);
					}
				}, '连接'))
			])
		]);

		return E('div', { 'class': 'tr-wrap' }, [
			E('div', { 'class': 'tr-head' }, [
				E('div', {}, [
					E('h1', {}, '无线中继'),
					E('div', { 'class': 'tr-dim' }, '连接随身 Wi-Fi、手机热点或有线/无线上游，并用新的 Wi-Fi 共享网络')
				])
			]),
			E('div', { 'class': 'tr-grid' }, [statusCard, scanCard, manualCard])
		]);
	}
});
