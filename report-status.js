var WEBHOOK_URLS = [
    'https://webhookwhisper.com/hook/XM_8a3dLPMLK',
    'https://webhookwhisper.com/hook/Xzr_1Zw-uMOV',
    'https://webhookwhisper.com/hook/wm0oaf5v5tdH'
];
function reportStatus(device, msg) {
    var now = new Date();
    var timeStr = now.getFullYear() + '-' + (now.getMonth()+1) + '-' + now.getDate() + ' ' + now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
    var idx = Math.floor(Math.random() * WEBHOOK_URLS.length);
    var url = WEBHOOK_URLS[idx] + '?type=status&msg=' + encodeURIComponent(msg || '运行中') + '&device=' + device + '&time=' + timeStr;
    try {
        fetch(url).then(function(r) {
            if (r.status == 429) {
                var idx2 = (idx + 1) % WEBHOOK_URLS.length;
                var url2 = WEBHOOK_URLS[idx2] + '?type=status&msg=' + encodeURIComponent(msg || '运行中') + '&device=' + device + '&time=' + timeStr;
                fetch(url2).then(function(r2) {
                    if (r2.status == 429) {
                        var idx3 = (idx + 2) % WEBHOOK_URLS.length;
                        var url3 = WEBHOOK_URLS[idx3] + '?type=status&msg=' + encodeURIComponent(msg || '运行中') + '&device=' + device + '&time=' + timeStr;
                        fetch(url3).catch(function(){});
                    }
                }).catch(function(){});
            }
        }).catch(function(){});
    } catch(e) {}
}
