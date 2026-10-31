// 러닝 앱 스크린샷 OCR — Tesseract.js로 브라우저 안에서 읽는다 (서버로 보내지 않음).
// 지원: Apple 피트니스/운동 앱 상세 화면, Nike Run Club 상세 화면
(function () {
  const pad = n => String(n).padStart(2, '0');
  let workerPromise = null;

  function getWorker(onProgress) {
    if (!workerPromise) {
      workerPromise = Tesseract.createWorker('kor+eng', 1, {
        logger: m => { if (onProgress && m.status === 'loading language traineddata') onProgress('글자 인식 데이터를 받는 중…'); },
      });
    }
    return workerPromise;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = typeof file === 'string' ? file : URL.createObjectURL(file);
    });
  }

  // 화면 상단 80%만 잘라 흑백으로 만들고, 어두운 화면은 반전해 "흰 바탕 검은 글씨"로 맞춘다.
  // 색 글씨(노랑·파랑·빨강)가 잘 보이도록 밝기 대신 RGB 최댓값/최솟값을 쓴다.
  function prepare(img) {
    const W = img.naturalWidth, H = Math.round(img.naturalHeight * 0.8);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, W, H, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H);
    const p = d.data;
    let sum = 0;
    for (let i = 0; i < p.length; i += 4) sum += p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11;
    const dark = sum / (p.length / 4) < 128;
    for (let i = 0; i < p.length; i += 4) {
      const v = dark ? 255 - Math.max(p[i], p[i + 1], p[i + 2]) : Math.min(p[i], p[i + 1], p[i + 2]);
      const t = v < 150 ? 0 : 255;
      p[i] = p[i + 1] = p[i + 2] = t;
    }
    ctx.putImageData(d, 0, 0);
    return c;
  }

  const toSec = t => t.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
  const fmtTime = s => (s >= 3600
    ? `${Math.floor(s / 3600)}:${pad(Math.floor(s % 3600 / 60))}:${pad(s % 60)}`
    : `${Math.floor(s / 60)}:${pad(s % 60)}`);

  // 연도가 없는 날짜(Apple)는 오늘 이전의 가장 가까운 날짜가 되도록 연도를 정한다
  function resolveYear(m, d, today = new Date()) {
    let y = today.getFullYear();
    if (new Date(y, m - 1, d) > today) y -= 1;
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  const fmtPace = s => `${Math.floor(s / 60)}'${pad(Math.round(s % 60))}"`;

  // 결과의 check 배열에는 OCR이 확실하지 않아 사람이 확인해야 할 칸 이름이 들어간다
  function parse(raw) {
    const text = raw.replace(/[’‘′`´]/g, "'").replace(/[“”″]/g, '"').replace(/(\d),(\d)/g, '$1.$2');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const flat = lines.join(' ');
    const after = re => { const i = lines.findIndex(l => re.test(l)); return i >= 0 ? (lines[i + 1] || '') : ''; };
    const out = { date: '', km: 0, time: '', kcal: 0, pace: '', check: [] };
    const nike = /킬로미터/.test(text) && !/운동\s*세부|킬로칼로리/.test(text);

    // 날짜: Nike "2026. 10. 16." / Apple "9월 22일"
    let m = flat.match(/(20\d{2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})/);
    if (m) out.date = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
    else if ((m = flat.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/))) out.date = resolveYear(+m[1], +m[2]);

    // 페이스 5'13" — 초가 60 이상이면 잘못 읽은 것
    m = flat.match(/(\d{1,2})\s*'\s*(\d{2})/);
    let paceSec = m && +m[2] < 60 ? +m[1] * 60 + +m[2] : NaN;

    if (!nike) {
      // Apple: "운동 시간  거리" 다음 줄 = "0:26:12  5.02KM"
      const tl = after(/운동\s*시간/);
      m = tl.match(/(\d{1,2}:\d{2}:\d{2})/) || flat.match(/\b(\d{1,2}:\d{2}:\d{2})\b/);
      if (m) out.time = fmtTime(toSec(m[1]));
      m = tl.replace(/\d{1,2}:\d{2}:\d{2}/, '').match(/(\d{1,3}\.\d{1,2})/) || flat.match(/(\d{1,3}\.\d{2})\s*K\s*M/i);
      if (m) out.km = +m[1];
      // "활동 킬로칼로리  총 킬로칼로리" 다음 줄의 오른쪽 값이 총 칼로리
      const kl = after(/킬로칼로리/);
      const kc = [...kl.matchAll(/(\d{2,4})\s*K/gi)].map(x => +x[1]);
      if (kc.length >= 2) out.kcal = kc[kc.length - 1];
      else if (kc.length === 1) { out.kcal = kc[0]; out.check.push('kcal'); }
    } else {
      // Nike: "5'39''  1:08:40  989" 한 줄에 페이스·시간·칼로리
      m = text.match(/(\d{1,3}\.\d{2})\s*\n?\s*킬로미터/);
      if (m) out.km = +m[1];
      const line = lines.find(l => /\d{1,2}\s*'\s*\d{2}/.test(l) && /\d:\d{2}/.test(l)) || '';
      const t = line.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
      if (t) {
        out.time = fmtTime(toSec(t[1]));
        const k = line.slice(line.indexOf(t[1]) + t[1].length).match(/(\d{2,4})/);
        if (k) out.kcal = +k[1];
      }
    }

    const sec = out.time ? toSec(out.time) : 0;
    if (!(out.km > 0) && sec && paceSec) {          // 거리를 못 읽으면 시간 ÷ 페이스
      out.km = Math.round(sec / paceSec * 100) / 100;
      out.check.push('km');
    }
    if (!paceSec && out.km > 0 && sec) paceSec = sec / out.km;  // 페이스를 못 읽으면 시간 ÷ 거리
    if (paceSec) out.pace = fmtPace(paceSec);
    if (out.km > 0 && sec && Math.abs(sec / out.km - paceSec) > 15) out.check.push('km');
    if (!out.date) out.check.push('date');
    if (!sec) out.check.push('time');
    if (!(out.kcal > 0)) out.check.push('kcal');
    out.check = [...new Set(out.check)];
    return out;
  }

  async function readRun(file, onProgress) {
    const worker = await getWorker(onProgress);
    const img = await loadImage(file);
    const { data } = await worker.recognize(prepare(img));
    const run = parse(data.text);
    run.raw = data.text;
    return run;
  }

  window.RunOCR = { readRun, parse };
})();
