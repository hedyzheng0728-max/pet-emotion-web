let audioCtx, source, analyzer;
let running = false;
const statusEl = document.getElementById('status');
const levelEl = document.getElementById('level');
const emotionEl= document.getElementById('emotion');
const emojiEl = document.getElementById('emoji');
const bubbleEl = document.getElementById('bubble');
const featEl = document.getElementById('feat');
const LABELS = ["平静","焦虑","呼唤","开心"];
const EMOJI = { "平静":"￿￿","焦虑":"￿￿","呼唤":"￿￿ ","开心":"￿￿" };
// 为了更稳定，做一个“滑动窗口多数投票”
const windowSize = 10;
let recentLabels = [];
function updateMeters(rms) {
// rms 一般在 0~0.2 左右（取决于设备/环境）
const pct = Math.min(100, Math.max(0, rms * 800)); // 简单线性放大
levelEl.style.width = pct + "%";
}
// 启发式分类：根据几个常见音频特征的范围作“粗略判断”
function classify(features) {
const { rms, zcr, spectralCentroid } = features;
// 先给默认值
let label = "平静";
// 经验+直觉的“if 判断”：
if (zcr > 0.15 && spectralCentroid > 2500) label = "焦虑"; // 高频+过零率高
5
if (rms > 0.10 && spectralCentroid < 1500) label = "呼唤"; // 声音大但偏低频
if (rms > 0.05 && spectralCentroid > 1800) label = "开心"; // 中等以上能量+中
高频
return label;
}
async function start() {
if (running) return;
running = true;
document.getElementById('btnStart').disabled = true;
document.getElementById('btnStop').disabled = false;
// iOS/Safari 需要“用户手势”后再创建 AudioContext
audioCtx = new (window.AudioContext || window.webkitAudioContext)();
try {
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
source = audioCtx.createMediaStreamSource(stream);
if (!Meyda) {
alert("Meyda 未加载。请检查网络或CDN。");
return;
}
analyzer = Meyda.createMeydaAnalyzer({
audioContext: audioCtx,
source,
bufferSize: 2048,
featureExtractors: ['rms','zcr','spectralCentroid','mfcc'],
callback: (features) => {
const label = classify(features);
// 滑动窗口多数投票，减少“抖动”
recentLabels.push(label);
if (recentLabels.length > windowSize) recentLabels.shift();
const finalLabel = majority(recentLabels);
// 渲染 UI
updateMeters(features.rms || 0);
6
emotionEl.textContent = `情绪：${finalLabel}`;
emojiEl.textContent = EMOJI[finalLabel] || "￿￿";
bubbleEl.textContent = `我现在感觉：${finalLabel}（演示版）`;
// 调试信息可展开查看
featEl.textContent = JSON.stringify({
rms: round(features.rms),
zcr: round(features.zcr),
spectralCentroid: round(features.spectralCentroid),
mfcc0: features.mfcc ? round(features.mfcc[0]) : null
}, null, 2);
}
});
analyzer.start();
statusEl.textContent = "状态：监听中";
} catch (err) {
console.error(err);
alert("无法访问麦克风：请检查浏览器权限与HTTPS。");
statusEl.textContent = "状态：失败（权限/设备）";
running = false;
document.getElementById('btnStart').disabled = false;
document.getElementById('btnStop').disabled = true;
}
}
function stop() {
if (!running) return;
running = false;
document.getElementById('btnStart').disabled = false;
document.getElementById('btnStop').disabled = true;
if (analyzer) analyzer.stop();
if (audioCtx) audioCtx.close();
statusEl.textContent = "状态：已停止";
}
function majority(arr) {
const m = {};
arr.forEach(x => m[x] = (m[x] || 0) + 1);
7
return Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0];
}
function round(x) {
if (typeof x !== "number") return x;
return Math.round(x*1000)/1000;
}
document.getElementById('btnStart').addEventListener('click', start);
document.getElementById('btnStop').addEventListener('click', stop);
