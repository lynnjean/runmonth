// 런달결산 템플릿 — 모든 숫자/문구는 data.js의 window.RECAP에서 읽는다.
const D = window.RECAP;
const RUNS = D.runs;

const toSec = t => t.split(':').reduce((a, b) => a * 60 + Number(b), 0);
const pad = n => String(n).padStart(2, '0');
const fmtHMS = s => `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`;
const fmtPace = secPerKm => {
  const r = Math.round(secPerKm);
  return `${Math.floor(r / 60)}'${pad(r % 60)}"`;
};
const toDate = d => new Date(d + 'T00:00:00');
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const paceOf = r => r.pace || fmtPace(toSec(r.time) / r.km);
const $ = id => document.getElementById(id);
const setText = (id, v) => { $(id).textContent = v; };

const START = toDate(D.start);
const DAYS = Math.round((toDate(D.end) - START) / 86400000) + 1;
const dayIndex = d => Math.round((toDate(d) - START) / 86400000);

// ---- 집계 ----
const totalKm = RUNS.reduce((a, r) => a + r.km, 0);
const totalSec = RUNS.reduce((a, r) => a + toSec(r.time), 0);
const totalKcal = RUNS.reduce((a, r) => a + r.kcal, 0);

const daily = Array.from({ length: DAYS }, () => ({ real: 0, est: 0 }));
RUNS.forEach(r => {
  const i = dayIndex(r.date);
  if (i >= 0 && i < DAYS) daily[i][r.est ? 'est' : 'real'] += r.km;
});
const runDays = daily.filter(d => d.real + d.est > 0).length;

const sumDays = arr => arr.reduce((a, d) => a + d.real + d.est, 0);
const firstWeek = sumDays(daily.slice(0, 7));
const lastWeek = sumDays(daily.slice(Math.max(0, DAYS - 7)));

const recorded = RUNS.filter(r => !r.est);
const faster = (a, r) => (toSec(r.time) / r.km < toSec(a.time) / a.km ? r : a);
const longest = recorded.reduce((a, r) => (r.km > a.km ? r : a));
const fastest = recorded.reduce(faster);
const tenK = recorded.filter(r => r.km >= 10);
const best10 = tenK.length ? tenK.reduce(faster) : null;

// 배지: 50km 단위로 내림 (200.77 → 200), 50km 미만이면 10km 단위
const milestone = totalKm >= 50
  ? Math.floor(totalKm / 50) * 50
  : Math.max(10, Math.floor(totalKm / 10) * 10);

// ---- 헤더 / 요약 ----
const s = START, e = toDate(D.end);
document.title = `런달결산 ${md(D.start)}–${md(D.end)}`;
setText('period', `${s.getFullYear()}. ${pad(s.getMonth() + 1)}. ${pad(s.getDate())} — ${pad(e.getMonth() + 1)}. ${pad(e.getDate())} · ${DAYS} DAYS`);
$('headline').innerHTML = D.headline || `${DAYS}일 동안 <u>${Math.floor(totalKm)}km</u>를 달렸다!`;
setText('badgeNum', milestone);
setText('badgeSub', D.badgeSub || 'RUNNING');
setText('totalSub', D.totalSub || `${DAYS}일 만에 ${milestone}km 고지를 넘었다!`);
document.querySelectorAll('.days').forEach(n => { n.textContent = DAYS; });

setText('totalKm', totalKm.toFixed(2));
setText('runCount', RUNS.length);
setText('totalTime', fmtHMS(totalSec));
setText('avgPace', fmtPace(totalSec / totalKm));
setText('totalKcal', totalKcal.toLocaleString('ko-KR'));

// ---- 3열 카드 ----
setText('weeklyAvg', (totalKm / DAYS * 7).toFixed(1));
setText('perWeek', Math.round(runDays / DAYS * 7));
setText('runDays', runDays);
setText('runRate', Math.round(runDays / DAYS * 100));
setText('wFirst', firstWeek.toFixed(1));
setText('wLast', lastWeek.toFixed(1));
$('wGrowth').innerHTML = lastWeek > firstWeek && firstWeek > 0
  ? `주간 거리 <b class="lime">${(lastWeek / firstWeek).toFixed(1)}배 UP</b> 성장 중!`
  : '꾸준히 페이스를 지키는 중!';

// ---- 하이라이트 ----
$('hlLong').innerHTML = `${longest.km.toFixed(2)}km <span>${md(longest.date)}</span>`;
$('hlFast').innerHTML = `${paceOf(fastest)}/km <span>${md(fastest.date)}</span>`;
$('hl10k').innerHTML = tenK.length
  ? `${tenK.length}회 <span>장거리 베이스 완성</span>`
  : `0회 <span>다음엔 10km 도전!</span>`;
$('hlBest10').innerHTML = best10 ? `${paceOf(best10)}/km <span>${md(best10.date)}</span>` : '—';

// ---- 종합 평가 ----
const score = D.score ?? 9;
setText('scoreNum', score);
setText('stars', '★'.repeat(Math.round(score / 2)) + '☆'.repeat(5 - Math.round(score / 2)));
setText('scoreText', D.scoreText || '아주 잘하고 있어요!');
const C = 2 * Math.PI * 84;
$('ringFg').style.strokeDasharray = `${C * score / 10} ${C}`;

// ---- 다음 목표 ----
const g = D.goal;
const gStart = toDate(g.start);
const gEnd = new Date(gStart.getTime() + (g.days - 1) * 86400000);
setText('goalStatus', g.status || '진행 중');
setText('goalKm', g.km);
setText('goalDays', g.days);
setText('goalDate', `${md(g.start)} – ${gEnd.getMonth() + 1}/${gEnd.getDate()}`);
setText('goalDaily', `${(g.km / g.days).toFixed(1)}km`);
const diff = g.km - totalKm;
setText('goalDiff', `${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)}km`);

// ---- 푸터 ----
setText('quote', D.quote || '달리는 것은 나의 한계를 넘는 가장 확실한 방법이다.');
const est = RUNS.filter(r => r.est);
if (est.length) {
  const paces = [...new Set(est.map(paceOf))];
  setText('note', `* ${est.map(r => `${md(r.date)} ${r.km}km`).join(' · ')}는 기록 누락분으로 ${paces.join('/')}/km 페이스 기준 시간·칼로리 추정치 포함`);
} else {
  $('note').remove();
  $('estLegend').remove();
}

// ---- 막대 그래프 ----
(function drawChart() {
  const svg = $('chart');
  const NS = 'http://www.w3.org/2000/svg';
  const W = 960, H = 300, L = 44, R = 16, T = 18, B = 40;
  const peak = Math.max(...daily.map(d => d.real + d.est));
  const max = Math.max(15, Math.ceil(peak / 5) * 5);
  const pw = W - L - R, ph = H - T - B;
  const step = pw / DAYS;
  const bw = step * 0.56;
  const y = v => T + ph - (v / max) * ph;
  const el = (tag, attrs, text) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (text != null) n.textContent = text;
    svg.appendChild(n);
    return n;
  };

  for (let v = 0; v <= max; v += 5) {
    el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' });
    el('text', { x: L - 10, y: y(v) + 5, class: 'ax', 'text-anchor': 'end' }, v);
  }

  // x축 라벨: 시작일, 매월 1일, 8·15·22일, 마지막 날 (서로 너무 가까우면 생략)
  const labels = [0, DAYS - 1];
  for (let i = 1; i < DAYS - 1; i++) {
    const dd = new Date(START.getTime() + i * 86400000).getDate();
    if (dd === 1) labels.push(i);
  }
  for (let i = 1; i < DAYS - 1; i++) {
    const dd = new Date(START.getTime() + i * 86400000).getDate();
    if ([8, 15, 22].includes(dd) && labels.every(j => Math.abs(j - i) > 3)) labels.push(i);
  }

  daily.forEach((d, i) => {
    const x = L + i * step + (step - bw) / 2;
    const total = d.real + d.est;
    if (total > 0) {
      if (d.est > 0) {
        el('rect', { x, y: y(total), width: bw, height: y(d.real) - y(total), rx: 3, class: 'bar-est' });
      }
      el('rect', { x, y: y(d.real), width: bw, height: y(0) - y(d.real), rx: d.est ? 0 : 3, class: 'bar' });
      el('text', { x: x + bw / 2, y: y(total) - 7, class: 'bar-val', 'text-anchor': 'middle' }, total.toFixed(1));
    }
    if (labels.includes(i)) {
      const date = new Date(START.getTime() + i * 86400000);
      const dd = date.getDate();
      el('text', { x: x + bw / 2, y: H - 12, class: 'ax', 'text-anchor': 'middle' },
        dd === 1 || i === 0 ? `${date.getMonth() + 1}/${dd}` : dd);
    }
  });

  const avg = totalKm / runDays;
  el('line', { x1: L, x2: W - R, y1: y(avg), y2: y(avg), class: 'avg' });
  setText('avgLabel', `달린 날 평균 ${avg.toFixed(1)}km`);
})();

// ---- 화면 크기에 맞춰 축소 ----
const stage = $('stage');
const card = $('card');
const exportMode = new URLSearchParams(location.search).has('export');
if (exportMode) document.body.classList.add('export');
function fit() {
  const k = exportMode ? 1 : Math.min(1, (window.innerWidth - 32) / 1080);
  card.style.transform = `scale(${k})`;
  stage.style.height = `${1920 * k}px`;
  stage.style.width = `${1080 * k}px`;
}
window.addEventListener('resize', fit);
fit();

// ---- 이미지 저장 ----
$('saveBtn').addEventListener('click', async () => {
  const btn = $('saveBtn');
  btn.disabled = true;
  btn.textContent = '저장 중…';
  const prev = card.style.transform;
  card.style.transform = 'none';
  try {
    await document.fonts.ready;
    const canvas = await html2canvas(card, { scale: 1, backgroundColor: '#0b1420', useCORS: true });
    const a = document.createElement('a');
    a.download = `런달결산_${D.start.slice(5).replace('-', '')}-${D.end.slice(5).replace('-', '')}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } finally {
    card.style.transform = prev;
    btn.disabled = false;
    btn.textContent = '이미지로 저장';
  }
});
