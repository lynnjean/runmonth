// 결산 카드(1080x1920) 렌더링 — renderCard(state)로 카드 안의 숫자·문구·그래프를 모두 채운다.
const pad = n => String(n).padStart(2, '0');
const toSec = t => {
  const p = String(t ?? '').trim().split(':').map(Number);
  if (!p.length || p.some(n => !Number.isFinite(n))) return NaN;
  return p.reduce((a, b) => a * 60 + b, 0);
};
const fmtTime = s => (s >= 3600
  ? `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(Math.round(s % 60))}`
  : `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}`);
const fmtHMS = s => `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(Math.round(s % 60))}`;
const fmtPace = secPerKm => {
  const r = Math.round(secPerKm);
  return `${Math.floor(r / 60)}'${pad(r % 60)}"`;
};
const parsePace = p => {
  const m = String(p ?? '').match(/(\d{1,2})\D+(\d{1,2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
const toDate = d => new Date(d + 'T00:00:00');
const md = d => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const paceOf = r => r.pace || fmtPace(toSec(r.time) / r.km);
const validRun = r => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && r.km > 0 && toSec(r.time) > 0;

function renderCard(S) {
  const C = id => document.getElementById(id);
  const START = toDate(S.start);
  const DAYS = Math.max(1, Math.round((toDate(S.end) - START) / 86400000) + 1);
  const dayIndex = d => Math.round((toDate(d) - START) / 86400000);
  const runs = S.runs.filter(r => validRun(r) && dayIndex(r.date) >= 0 && dayIndex(r.date) < DAYS);

  const totalKm = runs.reduce((a, r) => a + r.km, 0);
  const totalSec = runs.reduce((a, r) => a + toSec(r.time), 0);
  const totalKcal = runs.reduce((a, r) => a + (Number(r.kcal) || 0), 0);
  const daily = Array.from({ length: DAYS }, () => ({ real: 0, est: 0 }));
  runs.forEach(r => { daily[dayIndex(r.date)][r.est ? 'est' : 'real'] += r.km; });
  const runDays = daily.filter(d => d.real + d.est > 0).length;
  const sumDays = arr => arr.reduce((a, d) => a + d.real + d.est, 0);
  const firstWeek = sumDays(daily.slice(0, 7));
  const lastWeek = sumDays(daily.slice(Math.max(0, DAYS - 7)));

  const recorded = runs.filter(r => !r.est);
  const pool = recorded.length ? recorded : runs;
  const faster = (a, r) => (toSec(r.time) / r.km < toSec(a.time) / a.km ? r : a);
  const longest = pool.length ? pool.reduce((a, r) => (r.km > a.km ? r : a)) : null;
  const fastest = pool.length ? pool.reduce(faster) : null;
  const tenK = pool.filter(r => r.km >= 10);
  const best10 = tenK.length ? tenK.reduce(faster) : null;
  // 배지: 50km 단위로 내림 (200.77 → 200), 50km 미만이면 10km 단위
  const milestone = totalKm >= 50 ? Math.floor(totalKm / 50) * 50 : Math.max(10, Math.floor(totalKm / 10) * 10);

  const s = START, e = toDate(S.end);
  C('period').textContent = `${s.getFullYear()}. ${pad(s.getMonth() + 1)}. ${pad(s.getDate())} — ${pad(e.getMonth() + 1)}. ${pad(e.getDate())} · ${DAYS} DAYS`;
  C('headline').innerHTML = `${DAYS}일 동안 <u>${Math.floor(totalKm)}km</u>를 달렸다!`;
  C('badgeNum').textContent = milestone;
  C('badgeSub').textContent = S.badgeSub || 'RUNNING';
  C('totalSub').textContent = totalKm >= 10 ? `${DAYS}일 만에 ${milestone}km 고지를 넘었다!` : '첫 걸음을 내디뎠다!';
  document.querySelectorAll('.card .days').forEach(n => { n.textContent = DAYS; });

  C('totalKm').textContent = totalKm.toFixed(2);
  C('runCount').textContent = runs.length;
  C('totalTime').textContent = fmtHMS(totalSec);
  C('avgPace').textContent = totalKm ? fmtPace(totalSec / totalKm) : `0'00"`;
  C('totalKcal').textContent = totalKcal.toLocaleString('ko-KR');

  C('weeklyAvg').textContent = (totalKm / DAYS * 7).toFixed(1);
  C('perWeek').textContent = Math.round(runDays / DAYS * 7);
  C('runDays').textContent = runDays;
  C('runRate').textContent = Math.round(runDays / DAYS * 100);
  C('wFirst').textContent = firstWeek.toFixed(1);
  C('wLast').textContent = lastWeek.toFixed(1);
  C('wGrowth').innerHTML = lastWeek > firstWeek && firstWeek > 0
    ? `주간 거리 <b class="lime">${(lastWeek / firstWeek).toFixed(1)}배 UP</b> 성장 중!`
    : '꾸준히 페이스를 지키는 중!';

  C('hlLong').innerHTML = longest ? `${longest.km.toFixed(2)}km <span>${md(longest.date)}</span>` : '—';
  C('hlFast').innerHTML = fastest ? `${paceOf(fastest)}/km <span>${md(fastest.date)}</span>` : '—';
  C('hl10k').innerHTML = tenK.length ? `${tenK.length}회 <span>장거리 베이스 완성</span>` : `0회 <span>다음엔 10km 도전!</span>`;
  C('hlBest10').innerHTML = best10 ? `${paceOf(best10)}/km <span>${md(best10.date)}</span>` : '—';

  const score = Math.min(10, Math.max(0, Number(S.score) || 0));
  const stars = Math.round(score / 2);
  C('scoreNum').textContent = score;
  C('stars').textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  C('scoreText').textContent = S.scoreText || '아주 잘하고 있어요!';
  const circ = 2 * Math.PI * 84;
  C('ringFg').style.strokeDasharray = `${circ * score / 10} ${circ}`;

  const g = S.goal;
  const gDays = Math.max(1, Number(g.days) || 30);
  const gKm = Number(g.km) || 0;
  C('goalStatus').textContent = g.status || '진행 중';
  C('goalKm').textContent = gKm;
  C('goalDays').textContent = gDays;
  if (g.start) {
    const gEnd = new Date(toDate(g.start).getTime() + (gDays - 1) * 86400000);
    C('goalDate').textContent = `${md(g.start)} – ${gEnd.getMonth() + 1}/${gEnd.getDate()}`;
  } else C('goalDate').textContent = '';
  C('goalDaily').textContent = `${(gKm / gDays).toFixed(1)}km`;
  const diff = gKm - totalKm;
  C('goalDiff').textContent = `${diff >= 0 ? '+' : '−'}${Math.abs(diff).toFixed(1)}km`;

  C('quote').textContent = S.quote || '달리는 것은 나의 한계를 넘는 가장 확실한 방법이다.';
  const est = runs.filter(r => r.est);
  C('note').hidden = !est.length;
  C('estLegend').hidden = !est.length;
  if (est.length) {
    const paces = [...new Set(est.map(paceOf))];
    C('note').textContent = `* ${est.map(r => `${md(r.date)} ${r.km}km`).join(' · ')}는 기록 누락분으로 ${paces.join('/')}/km 페이스 기준 시간·칼로리 추정치 포함`;
  }

  drawChart(daily, START, DAYS, runDays ? totalKm / runDays : 0);
}

function drawChart(daily, START, DAYS, avg) {
  const svg = document.getElementById('chart');
  svg.innerHTML = '';
  const NS = 'http://www.w3.org/2000/svg';
  const W = 960, H = 300, L = 44, R = 16, T = 18, B = 40;
  const peak = Math.max(0, ...daily.map(d => d.real + d.est));
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
  const dateAt = i => new Date(START.getTime() + i * 86400000);
  const labels = [0, DAYS - 1];
  for (let i = 1; i < DAYS - 1; i++) if (dateAt(i).getDate() === 1) labels.push(i);
  for (let i = 1; i < DAYS - 1; i++) {
    if ([8, 15, 22].includes(dateAt(i).getDate()) && labels.every(j => Math.abs(j - i) > 3)) labels.push(i);
  }
  daily.forEach((d, i) => {
    const x = L + i * step + (step - bw) / 2;
    const total = d.real + d.est;
    if (total > 0) {
      if (d.est > 0) el('rect', { x, y: y(total), width: bw, height: y(d.real) - y(total), rx: 3, class: 'bar-est' });
      if (d.real > 0) el('rect', { x, y: y(d.real), width: bw, height: y(0) - y(d.real), rx: d.est ? 0 : 3, class: 'bar' });
      if (DAYS <= 40) el('text', { x: x + bw / 2, y: y(total) - 7, class: 'bar-val', 'text-anchor': 'middle' }, total.toFixed(1));
    }
    if (labels.includes(i)) {
      const dt = dateAt(i);
      el('text', { x: x + bw / 2, y: H - 12, class: 'ax', 'text-anchor': 'middle' },
        dt.getDate() === 1 || i === 0 ? `${dt.getMonth() + 1}/${dt.getDate()}` : dt.getDate());
    }
  });
  if (avg > 0) el('line', { x1: L, x2: W - R, y1: y(avg), y2: y(avg), class: 'avg' });
  document.getElementById('avgLabel').textContent = `달린 날 평균 ${avg.toFixed(1)}km`;
}
