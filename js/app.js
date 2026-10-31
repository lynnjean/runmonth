// ---------- 처음 열었을 때 보여 줄 예시 기록 ----------
const DEFAULT_STATE = {
  start: '2026-09-22', end: '2026-10-21',
  badgeSub: 'JEJU RUNNING', score: 9.5, scoreText: '미쳤다, 200km 돌파!',
  goal: { km: 210, days: 30, start: '2026-10-29', status: '진행 중' },
  quote: '달리는 것은 나의 한계를 넘는 가장 확실한 방법이다.',
  source: 'example',
  runs: [
    ['2026-09-22', 5.02, '26:12', 340, "5'13\""], ['2026-09-23', 8.00, '44:34', 541, "5'34\""],
    ['2026-09-24', 8.13, '47:23', 553, "5'49\""], ['2026-09-27', 8.70, '54:47', 590, "6'18\""],
    ['2026-09-30', 10.02, '57:32', 678, "5'45\""], ['2026-10-01', 6.00, '37:25', 409, "6'14\""],
    ['2026-10-03', 7.00, '41:17', 480, "5'54\""], ['2026-10-04', 10.01, '56:43', 682, "5'40\""],
    ['2026-10-05', 10.00, '56:09', 680, "5'37\""], ['2026-10-06', 5.20, '30:41', 352, "5'54\""],
    ['2026-10-08', 6.50, '40:09', 446, "6'11\""], ['2026-10-08', 4.00, '23:20', 272, "5'50\"", true],
    ['2026-10-09', 5.00, '25:58', 337, "5'11\""], ['2026-10-10', 8.01, '47:16', 554, "5'54\""],
    ['2026-10-10', 3.00, '17:30', 204, "5'50\"", true], ['2026-10-12', 9.01, '54:15', 624, "6'01\""],
    ['2026-10-13', 11.01, '1:02:59', 766, "5'43\""], ['2026-10-14', 10.00, '56:44', 698, "5'40\""],
    ['2026-10-16', 12.16, '1:08:40', 989, "5'39\""], ['2026-10-17', 8.00, '49:07', 556, "6'08\""],
    ['2026-10-18', 13.00, '1:27:14', 897, "6'43\""], ['2026-10-19', 11.00, '59:13', 745, "5'23\""],
    ['2026-10-20', 12.00, '1:16:40', 830, "6'23\""], ['2026-10-21', 10.00, '1:00:04', 692, "6'00\""],
  ].map(([date, km, time, kcal, pace, est]) => ({ date, km, time, kcal, pace, est: !!est })),
};

const STORE_KEY = 'run-recap-maker-v1';
const $ = id => document.getElementById(id);
const isoOf = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

// ---------- 상태 (이 브라우저에만 저장) ----------
let S = structuredClone(DEFAULT_STATE);
try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  if (saved && Array.isArray(saved.runs)) S = { ...S, ...saved, goal: { ...S.goal, ...saved.goal } };
} catch (e) { /* 저장된 초안이 없거나 읽을 수 없음 */ }

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 */ }
}
function update() { save(); renderTable(); renderCard(S); }

// ---------- 기록 표 ----------
function renderTable() {
  const tb = $('runRows');
  const order = S.runs.map((r, i) => i).sort((a, b) => S.runs[a].date.localeCompare(S.runs[b].date));
  tb.innerHTML = '';
  if (!S.runs.length) {
    tb.innerHTML = '<tr><td colspan="6" class="empty">아직 기록이 없어요. 스크린샷을 올리거나 아래에서 직접 추가하세요.</td></tr>';
  }
  order.forEach(i => {
    const r = S.runs[i];
    const check = r.check || [];
    const cls = key => (check.includes(key) ? ' class="need-check"' : '');
    const tr = document.createElement('tr');
    const pace = r.km > 0 && toSec(r.time) > 0 ? paceOf(r) : '—';
    tr.innerHTML = `
      <td><input type="date" id="r${i}-date" aria-label="날짜" value="${r.date}"${cls('date')}></td>
      <td class="c-km"><input type="number" id="r${i}-km" aria-label="거리" step="0.01" min="0" value="${r.km}"${cls('km')}></td>
      <td class="c-time"><input type="text" id="r${i}-time" aria-label="시간" value="${r.time}"${cls('time')}></td>
      <td class="c-kcal"><input type="number" id="r${i}-kcal" aria-label="칼로리" step="1" min="0" value="${r.kcal}"${cls('kcal')}></td>
      <td class="c-pace">${pace}${r.est ? '<span class="chip">추정</span>' : ''}${check.length ? '<span class="chip warn">확인 필요</span>' : ''}</td>
      <td><button class="del" type="button" aria-label="이 기록 삭제">×</button></td>`;
    tr.querySelector('.del').onclick = () => { S.runs.splice(i, 1); update(); };
    tr.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('change', () => {
        const key = inp.id.split('-')[1];
        if (key === 'km' || key === 'kcal') r[key] = Number(inp.value) || 0;
        else if (key === 'time') { const sec = toSec(inp.value); r.time = sec > 0 ? fmtTime(sec) : inp.value; }
        else r[key] = inp.value;
        if (key === 'km' || key === 'time') r.pace = '';
        if (r.check) r.check = r.check.filter(k => k !== key);
        update();
      });
    });
    tb.appendChild(tr);
  });

  const ok = S.runs.filter(validRun);
  const km = ok.reduce((a, r) => a + r.km, 0);
  const toCheck = S.runs.filter(r => r.check && r.check.length).length;
  $('totals').innerHTML = `<span>러닝<b>${ok.length}회</b></span><span>총 거리<b>${km.toFixed(2)}km</b></span>` +
    (toCheck ? `<span class="status warn">노란 칸 ${toCheck}줄은 스크린샷과 비교해 확인해 주세요</span>` : '') +
    (ok.length < S.runs.length ? `<span class="status err">입력이 덜 된 기록 ${S.runs.length - ok.length}개는 결산에서 빠져요</span>` : '');
  $('sourceHint').textContent = {
    example: '지금은 예시 기록(9/22–10/21)이 들어 있어요. 스크린샷을 읽으면 새 기록으로 바뀌어요.',
    read: '스크린샷에서 읽은 기록이에요. 숫자가 다르면 칸을 눌러 고치세요.',
  }[S.source] || '직접 입력한 기록이에요.';
}

// ---------- 누락 기록 추가 ----------
$('addBtn').onclick = () => {
  const date = $('addDate').value;
  const km = Number($('addKm').value);
  const paceSec = parsePace($('addPace').value);
  if (!date || !(km > 0) || !(paceSec > 0)) {
    $('addStatus').className = 'status err';
    $('addStatus').textContent = '날짜, 거리, 페이스(예: 5:50)를 모두 입력하세요.';
    return;
  }
  // 칼로리: 페이스가 가장 비슷한 실제 기록의 km당 칼로리로 추정
  const ref = S.runs.filter(r => !r.est && validRun(r) && r.kcal > 0)
    .sort((a, b) => Math.abs(toSec(a.time) / a.km - paceSec) - Math.abs(toSec(b.time) / b.km - paceSec))[0];
  const perKm = ref ? ref.kcal / ref.km : 68;
  S.runs.push({ date, km, time: fmtTime(Math.round(km * paceSec)), kcal: Math.round(perKm * km), pace: fmtPace(paceSec), est: true });
  $('addStatus').className = 'status ok';
  $('addStatus').textContent = ref
    ? `추가했어요. 칼로리는 ${md(ref.date)} 기록(${paceOf(ref)}) 기준 km당 ${perKm.toFixed(0)}kcal로 계산했어요.`
    : '추가했어요. 비교할 기록이 없어 km당 68kcal로 계산했어요.';
  $('addKm').value = '';
  update();
};

$('clearBtn').onclick = () => {
  S.runs = [];
  S.source = 'manual';
  $('addStatus').className = 'status';
  $('addStatus').textContent = '';
  update();
};

// ---------- 결산 설정 ----------
const FIELDS = [
  ['fStart', v => { S.start = v; }, () => S.start],
  ['fEnd', v => { S.end = v; }, () => S.end],
  ['fBadge', v => { S.badgeSub = v; }, () => S.badgeSub],
  ['fScore', v => { S.score = v === '' ? 0 : Number(v); }, () => S.score],
  ['fScoreText', v => { S.scoreText = v; }, () => S.scoreText],
  ['gKm', v => { S.goal.km = Number(v); }, () => S.goal.km],
  ['gDays', v => { S.goal.days = Number(v); }, () => S.goal.days],
  ['gStart', v => { S.goal.start = v; }, () => S.goal.start],
  ['gStatus', v => { S.goal.status = v; }, () => S.goal.status],
  ['fQuote', v => { S.quote = v; }, () => S.quote],
];
function fillFields() { FIELDS.forEach(([id, , get]) => { $(id).value = get() ?? ''; }); }
FIELDS.forEach(([id, set]) => {
  $(id).addEventListener('input', () => {
    set($(id).value);
    if ((id === 'fStart' || id === 'fEnd') && (!S.start || !S.end || S.end < S.start)) return;
    save();
    renderCard(S);
  });
});

// ---------- 스크린샷 업로드 + OCR ----------
let files = [];
let stopRequested = false;
const drop = $('drop');

function setFiles(list) {
  files = [...list].filter(f => /^image\//.test(f.type));
  const th = $('thumbs');
  th.innerHTML = '';
  files.forEach(f => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    img.alt = f.name;
    th.appendChild(img);
  });
  th.hidden = !files.length;
  $('readStatus').className = 'status';
  $('readStatus').textContent = files.length ? `${files.length}장 선택됨` : '';
  $('readBtn').disabled = !files.length;
}
$('fileInput').addEventListener('change', e => setFiles(e.target.files));
['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => setFiles(e.dataTransfer.files));

$('readBtn').onclick = async () => {
  if (!files.length) return;
  if (!window.Tesseract) {
    $('readStatus').className = 'status err';
    $('readStatus').textContent = '글자 인식 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.';
    return;
  }
  stopRequested = false;
  $('readBtn').disabled = true;
  $('stopBtn').hidden = false;
  const st = $('readStatus');
  st.className = 'status';
  const found = [];
  let skipped = 0;
  try {
    for (let i = 0; i < files.length && !stopRequested; i++) {
      st.textContent = `스크린샷을 읽는 중… (${i + 1}/${files.length}장)`;
      const run = await RunOCR.readRun(files[i], msg => { st.textContent = msg; });
      if (!run.date && !(run.km > 0) && !run.time) { skipped++; continue; }
      delete run.raw;
      found.push({ ...run, est: false });
    }
    if (!found.length) {
      st.className = 'status err';
      st.textContent = stopRequested ? '읽기를 중지했어요.' : '러닝 기록을 찾지 못했어요. 운동 상세 화면 스크린샷인지 확인해 주세요.';
      return;
    }
    found.sort((a, b) => a.date.localeCompare(b.date));
    S.runs = found;
    S.source = 'read';
    const dates = found.map(r => r.date).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    if (dates.length) { S.start = dates[0]; S.end = dates[dates.length - 1]; }
    fillFields();
    update();
    const toCheck = found.filter(r => r.check.length).length;
    st.className = toCheck ? 'status warn' : 'status ok';
    st.textContent = `${found.length}개 기록을 읽었어요.` +
      (skipped ? ` 러닝 기록이 아닌 이미지 ${skipped}장은 건너뛰었어요.` : '') +
      (toCheck ? ` ${toCheck}개는 노란 칸을 확인해 주세요.` : '') +
      (stopRequested ? ' (중간에 중지함)' : '');
  } catch (e) {
    st.className = 'status err';
    st.textContent = '읽는 중 문제가 생겼어요. 인터넷 연결을 확인하고 다시 눌러 주세요.';
  } finally {
    $('stopBtn').hidden = true;
    $('readBtn').disabled = !files.length;
  }
};
$('stopBtn').onclick = () => { stopRequested = true; };

// ---------- 미리보기 크기 ----------
const stage = $('stage');
const card = document.querySelector('.card');
function fit() {
  const k = stage.clientWidth / 1080;
  card.style.transform = `scale(${k})`;
  card.style.transformOrigin = 'top left';
  stage.style.height = `${1920 * k}px`;
}
new ResizeObserver(fit).observe(stage);

// ---------- 이미지 저장 ----------
async function renderPng() {
  await document.fonts.ready;
  const prev = card.style.transform;
  card.style.transform = 'none';
  try {
    return await html2canvas(card, { scale: 1, width: 1080, height: 1920, backgroundColor: '#0b1420', logging: false });
  } finally {
    card.style.transform = prev;
  }
}

$('saveBtn').onclick = async () => {
  const btn = $('saveBtn');
  const st = $('saveStatus');
  btn.disabled = true;
  st.className = 'status';
  st.textContent = '이미지를 만드는 중…';
  try {
    const canvas = await renderPng();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const name = `런달결산_${S.start.slice(5).replace('-', '')}-${S.end.slice(5).replace('-', '')}.png`;
    const file = new File([blob], name, { type: 'image/png' });
    // 휴대폰: 공유 시트로 사진 앱/인스타에 바로 저장
    if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        st.textContent = '';
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') { st.textContent = ''; return; }
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    st.className = 'status ok';
    st.textContent = `${name} 저장했어요.`;
  } catch (e) {
    st.className = 'status err';
    st.textContent = '이미지를 만들지 못했어요. 다시 눌러 주세요.';
  } finally {
    btn.disabled = false;
  }
};

// ---------- 시작 ----------
fillFields();
renderTable();
renderCard(S);
fit();
