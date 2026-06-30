// 远程控制JS代码 - 2026-07-01v6：家庭服务器优先+GitHub备用+双重上报+容错+超时+降频+缓存fallback
// 注意：本脚本内的上报用reportNow()同步直发，不走状态上报()异步链
// 原因：状态上报()是fetch异步，while循环里zdjl.sleep同步阻塞，async回调无法执行
var 脚本编号 = zdjl.getVar('脚本编号', 'global') || '';
if (!脚本编号 || 脚本编号.charAt(0) !== 'x') { return; }

// ★★★ 家庭服务器地址（SakuraFrp固定地址，不再变化） ★★★
var HOME_SERVER = 'https://frp-use.com:19564';

// 三通道：家庭服务器秒生效(无缓存) → GitHub raw即时 → Gist备用
var CONFIG_URLS = [
  HOME_SERVER + '/remote-control-config.json',
  'https://raw.githubusercontent.com/gozi-msgbox/cdn-configs/master/remote-control-config.json',
  'https://gist.githubusercontent.com/gozi-msgbox/fda2baba49feb6659bfc7f968d3a1489/raw/remote-control-config.json'
];
var MAX_WAIT_MS = 8 * 60 * 60 * 1000; // 最多等8小时
var POLL_INTERVAL = 15000; // 轮询间隔15秒

// 同步上报：直发webhook+家庭服务器，不走fetch异步链，while循环里也能用
var _WEBHOOKS = [
  'https://webhookwhisper.com/hook/XM_8a3dLPMLK',
  'https://webhookwhisper.com/hook/Xzr_1Zw-uMOV',
  'https://webhookwhisper.com/hook/wm0oaf5v5tdH'
];
function reportNow(msg) {
  var now = new Date();
  var timeStr = now.getFullYear() + '-' + (now.getMonth()+1) + '-' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
  // 上报WebhookWhisper（保留双重上报）
  var idx = Math.floor(Math.random() * _WEBHOOKS.length);
  var url = _WEBHOOKS[idx] + '?type=status&msg=' + encodeURIComponent(msg) + '&device=' + 脚本编号 + '&time=' + encodeURIComponent(timeStr);
  try { zdjl.requestUrl({url: url, method: 'GET'}); } catch(e) {}
  // 上报家庭服务器（POST JSON，仪表盘实时看）
  try {
    var body = JSON.stringify({id: 脚本编号, status: msg, time: timeStr});
    zdjl.requestUrl({url: HOME_SERVER + '/report', method: 'POST', body: body, headers: {'Content-Type': 'application/json'}});
  } catch(e) {}
}

// 安全读取配置，主通道失败走备用通道，都失败用上次缓存
var _lastConfig = null;
function readConfig() {
  for (var i = 0; i < CONFIG_URLS.length; i++) {
    try {
      var resp = zdjl.requestUrl({url: CONFIG_URLS[i], method: 'GET'});
      var parsed = JSON.parse(resp.body);
      _lastConfig = parsed;
      return parsed;
    } catch(e) {
      continue; // 当前通道失败，试下一个
    }
  }
  return _lastConfig; // 全部失败，用上次缓存
}

var data = readConfig();
if (!data) { return; } // 首次就读不到，不做控制

var cmd = data.cmd || 'start';
var target = data.targetDevice || '';
var controlled = data.controlledDevices || {};

function isTargeted() {
  if (!target) return true;
  return 脚本编号.indexOf(target) === 0;
}

var myCmd = controlled[脚本编号] || '';
if (myCmd === 'stop') { cmd = 'stop'; }
else if (myCmd === 'wait') { cmd = 'wait'; }
else if (myCmd === 'start') { return; }

if (!isTargeted()) { return; }

if (cmd === 'wait') {
  reportNow("待命中，等待新指令");
  var waitStart = Date.now();
  while (true) {
    if (Date.now() - waitStart > MAX_WAIT_MS) {
      reportNow("等待超时，自动恢复运行");
      break;
    }
    zdjl.toast('脚本等待指令中...', 5000);
    zdjl.sleep(POLL_INTERVAL);
    var d = readConfig();
    if (!d) { continue; }
    var tc = (d.controlledDevices || {})[脚本编号] || '';
    var newCmd = tc || d.cmd || 'start';
    if (newCmd === 'start') { break; }
    if (newCmd === 'stop') {
      reportNow("已停止");
      zdjl.toast('脚本已停止', 3000);
      zdjl.runAction({"type":"控制执行","delayUnit":1,"controlRunType":"stop","ContinueParentExecute":true});
      return;
    }
  }
  reportNow("已恢复运行");
} else if (cmd === 'stop') {
  reportNow("已停止");
  zdjl.toast('脚本已停止', 3000);
  zdjl.runAction({"type":"控制执行","delayUnit":1,"controlRunType":"stop","ContinueParentExecute":true});
}
