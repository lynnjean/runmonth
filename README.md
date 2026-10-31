# 런달결산 메이커

러닝 앱 스크린샷을 올리면 기록을 자동으로 읽어서, 인스타 스토리 크기(1080×1920)의 **한 달 러닝 결산 이미지**를 만들어 주는 웹페이지입니다.

- 서버 없이 브라우저 안에서만 동작합니다. 스크린샷은 어디에도 업로드되지 않습니다.
- GitHub Pages 같은 정적 호스팅에 그대로 올리면 됩니다. 빌드 과정이 없습니다.

## 사용 방법

1. **스크린샷 올리기**: 운동 상세 화면 스크린샷을 여러 장 한 번에 선택하고 **기록 읽기**를 누릅니다.
   - 지원: Apple 피트니스(운동) 앱, Nike Run Club
   - 처음 한 번은 글자 인식 데이터(몇 MB)를 받느라 조금 걸립니다.
2. **기록 확인**: 읽은 기록이 표에 들어갑니다. **노란 칸**은 자동 인식이 확실하지 않은 값이니 스크린샷과 비교해 고쳐 주세요.
   - 빠진 기록은 **누락된 기록 추가**에 날짜·거리·페이스를 넣으면, 시간은 페이스로, 칼로리는 페이스가 가장 비슷한 기록의 km당 칼로리로 추정합니다. 결산 이미지에 점선 막대와 안내 문구로 표시됩니다.
3. **결산 설정**: 기간, 종합 평가, 다음 목표, 하단 문구를 정합니다. 미리보기에 바로 반영됩니다.
4. **이미지로 저장**: PNG로 내려받습니다. 휴대폰에서는 공유 시트가 열려 사진 앱에 바로 저장할 수 있습니다.

입력한 내용은 이 브라우저(localStorage)에만 저장되고, 다른 기기나 사람과 공유되지 않습니다.

## GitHub Pages로 배포하기

```bash
cd 런달결산
git init -b main
git add .
git commit -m "런달결산 메이커"
git remote add origin https://github.com/<내 아이디>/<저장소 이름>.git
git push -u origin main
```

그다음 GitHub 저장소에서 **Settings → Pages → Build and deployment**:
- Source: **Deploy from a branch**
- Branch: **main** / **/(root)** → Save

1~2분 뒤 `https://<내 아이디>.github.io/<저장소 이름>/` 에서 열립니다.

## 내 컴퓨터에서 열기

`index.html`을 브라우저로 바로 열어도 동작합니다. (글꼴·글자 인식·이미지 저장 라이브러리를 CDN에서 받으므로 인터넷 연결은 필요합니다.)

## 파일 구조

```
index.html      화면 구조 (입력 패널 + 결산 카드)
css/style.css   화면 스타일과 결산 카드 디자인
js/card.js      결산 카드 계산·그리기 (총 거리, 그래프, 하이라이트 등)
js/ocr.js       스크린샷 글자 인식과 기록 추출
js/app.js       표 편집, 누락 기록 추가, 설정, 이미지 저장
```

## 고치고 싶을 때

- **처음 열었을 때 보이는 예시 기록**: `js/app.js` 맨 위의 `DEFAULT_STATE`
- **카드 디자인(색·글꼴·배치)**: `css/style.css`의 `결산 카드` 아래 부분
- **다른 러닝 앱 지원**: `js/ocr.js`의 `parse()` — 인식된 글자에서 날짜·거리·시간·칼로리·페이스를 찾는 규칙

## 사용한 라이브러리

- [Tesseract.js](https://github.com/naptha/tesseract.js) 5.1.1 — 브라우저 OCR (Apache-2.0)
- [html2canvas](https://github.com/niklasvh/html2canvas) 1.4.1 — 카드를 PNG로 변환 (MIT)
- Google Fonts — Black Han Sans, Nanum Pen Script, Noto Sans KR, Oswald (OFL)
