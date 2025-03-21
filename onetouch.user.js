// ==UserScript==
// @name         깡갤 노벨 AI 원터치 번역
// @namespace    https://novelai.net/
// @version      3.3
// @description  novel ai 보조툴
// @author       ㅇㅇ
// @match        https://novelai.net/*
// @icon         https://novelai.net/_next/static/media/settings.37ac2cdf.svg
// @grant        none
// ==/UserScript==
(function() {
    'use strict';
    // 새로운 style 요소를 생성합니다.
    var styleElement = document.createElement('style');
    // CSS 코드를 작성합니다.
    var cssCode = `
:root {
    --Tmain-color: azure;
    --Thighlight-color: inherit;
    --italic-active: normal;
    --bold-active: normal;
    --highlight-color: inherit;
    --tMini-url: none;
    --tMini-size: 30px;
}
.loading {
  animation: bounce 0.8s infinite; /* 애니메이션 이름, 지속 시간, 반복 횟수 */
}
@keyframes bounce {
  0% {
    transform: translateY(0) scaleY(1); /* 초기 상태 */
  }
  40% {
    transform: translateY(-15px) scaleY(1); /* 정점 */
  }
  70% {
    transform: translateY(-5px) scaleY(1); /* 아래로 내려올 때 짜부 */
  }
  100% {
    transform: translateY(0) scaleX(1.1) scaleY(0.75); /* 원래 상태 */
  }
}
#t-mini {
    display: flex;
    cursor: pointer;
    position: absolute;
    z-index: 9999;
    width: var(--tMini-size);
    height: var(--tMini-size);
    background: var(--tMini-url);
    border-radius: 50%;
    bottom: 20%;
    right: 15px;
    background-size: cover;
}

#t-wide {
    display: none;
    flex-direction: column;
    cursor: default;
    position: absolute;
    z-index: 9998;
    width: 350px;
    max-width: 95%;
    background: var(--Tmain-color);
    height: 100%;
    bottom: 0px;
    right: 0px;
    padding: 10px;
    transition: width 0.2s, height 0.2s;
    backdrop-filter: blur(30px);
}

#extracted-text {
    min-height: 90%;
    overflow: scroll;
}

#ns-settings-div {
    /* 설정창 스타일 */
    width: 250px;
    height: 500px;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--Tmain-color);
    padding: 10px 20px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    display: none;
    z-index: 9999;
    backdrop-filter: blur(30px) !important;
}

#ns-settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0;
    margin: 0;
}

#setExit {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #000;
    padding: 0;
    margin: 0;
    line-height: 1;
}

#setExit:hover {
    color: #f00;
}

#ns-settings-button {
    /* 설정 오픈 버튼 스타일 */
    position: fixed;
    top: 10px;
    right: 10px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    z-index: 9999;
    background-image: url('https://novelai.net/_next/static/media/settings.37ac2cdf.svg');
    background-size: cover;
    filter: invert(50%);
}

.ns-check {
    vertical-align: middle;
    display: inline-block;
    width: 13px;
    margin-right: 5px;
}

.ns-input {
    width: 65px;
    padding: 2px;
    margin: 1px;
    backdrop-filter: blur(50px);
}
#dplApi {
width: 100px;
}

#ns-color-code {
    color: var(--Thighlight-color) !important;
}

#ns-longCopy {
    top: 0;
    left: 0;
    display: flex;
    gap: 10px;
}

.longCopyBtn {
    width: 50px;
    padding: 5px;
}

span.hT {
    font-style: var(--italic-active) !important;
    font-weight: var(--bold-active) !important;
    color: var(--highlight-color) !important;
}

.cStock {
    text-align: center;
    border-radius: 5px;
    margin: 2px;
    padding: 5px;
    gap: 5px;
    transition: background-color 0.3s;
}

.cStock:hover {
    background-color: var(--Thighlight-color);
}

.btnOn {
    color: var(--loader-color);
    font-weight: bold;
}

#stockDiv {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    z-index: 10003;
    background: var(--Tmain-color);
    width: 80%;
    max-width: 500px;
    padding: 10px;
    gap: 10px;
    backdrop-filter: blur(30px);
}

.stockContainer {
    position: relative;
    display: flex;
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
}

.cssInputStyle {
    padding: 5px 10px;
    backdrop-filter: blur(50px);
}

.setBtn {
    background-color: inherit;
    border: 0px;
    margin: 2px 2px;
    padding: 2px 2px;
}

.setBtn:hover {
    backdrop-filter: blur(50px);
}

.setBtn-name {
    width: 150px;
}

.setBtn-edit {
    right: 0px;
    position: absolute;
}

#cssDel {
    flex: 1;
    width: 15%;
    padding: 10px;
}

#cssSave {
    flex: 3;
    padding: 10px;
}

#cssExit {
    flex: 1;
    width: 15%;
    padding: 10px;
}

#cssList {
    overflow: scroll;
    max-height: 200px;
}

#tfList {
margin: 0;
    overflow: scroll;
    max-height: 200px;
}

#setInMenu {
    margin: 5px 0px;
}

#setInDiv {
    height: 310px;
}

#comebackIcon {
    width: 70%;
    padding: 5px;
    margin: 5px auto;
    border: 1px solid white;
    text-align: center;
}

.subBtn {
    background-color: var(--Tmain-color);
    display: inline-block;
    min-width: 3em;
    height: 1.8em;
    border-radius: 5px 5px 0 0;
    padding: 5px;
    border: 1px solid gray;
    border-bottom: none;
    font-weight: bold;
    line-height: 1;
    text-align: center;
    place-items: center;
}
.nm {
    margin: 0;
}

h1, h2, h3 {
  font-family: inherit;
}
#translation-input-container {
    display: none;
    width: 100%;
    margin-top: 10px;
}

#ko-en-input {
    width: 100%;
    padding: 8px;
    margin-top: 5px;
    border: 1px solid #ccc;
    border-radius: 4px;
    backdrop-filter: blur(50px);
}

`;
    // style 요소에 CSS 코드를 추가합니다.
    styleElement.textContent = cssCode;
    // style 요소를 문서의 head에 추가합니다.
    document.head.appendChild(styleElement);


    // 로컬 스토리지에서 설정 값을 로드합니다.
    var textExtraction = localStorage.getItem('textExtraction') || '750';
    var italicActive = JSON.parse(localStorage.getItem('ns-italic')) || false;
    var boldActive = JSON.parse(localStorage.getItem('ns-bold')) || false;
    var highlightActive = JSON.parse(localStorage.getItem('ns-highlight')) || false;
    var colorCode = localStorage.getItem('colorCode') || 'royalblue';
    var tMainColor = localStorage.getItem('tMainColor');
    var nsIconSize = localStorage.getItem('ns-icon-size') || '30';
    var nsIconUrl = localStorage.getItem('ns-icon-url') || 'url 입력';
    var dplD = JSON.parse(localStorage.getItem('dplD')) || false;
    var dplApi = localStorage.getItem('dplApi') || '';
    nsIconLoad();

    function nsIconLoad() {
        document.documentElement.style.setProperty('--tMini-size', nsIconSize + 'px');
        var img = new Image();
        img.onload = function() {
            document.documentElement.style.setProperty('--tMini-url', 'url(' + nsIconUrl + ')');
        };
        img.onerror = function() {
            var gradation = 'repeating-linear-gradient(-45deg, white, white 2px, RoyalBlue 2px, RoyalBlue 4px)';
            document.documentElement.style.setProperty('--tMini-url', gradation);
        };
        img.src = nsIconUrl;
    }



    // 스킨 세팅
    document.documentElement.style.setProperty('--Tmain-color', tMainColor);
    document.documentElement.style.setProperty('--Thighlight-color', colorCode);


    // 아이콘 생성
    var tMini = document.createElement('div');
    tMini.id = 't-mini';
    // 확장창 생성
    var tWide = document.createElement('div');
    tWide.id = 't-wide';
    var extractedText = document.createElement('div');
    extractedText.id = 'extracted-text';
    // 생성한 요소들을 문서의 body에 추가합니다.
    document.body.appendChild(tMini);
    document.body.appendChild(tWide);


    // 아이콘 클릭

    tMini.addEventListener("click", tIconClick);

    function tIconClick() {

        extractedText.removeAttribute('translate');
        tColorEx();
        tWide.style.display = 'flex';
        getExtractedText(textExtraction);
    }

    // 확장창 클릭
    extractedText.addEventListener("click", tWideClick);

    function tWideClick() {
        tColorEx();
        tWide.style.display = 'none';
    }
    // 단축키 컨트롤 + /
    document.addEventListener('keydown', handleCtrlSlash);

    function handleCtrlSlash(event) {
        // 눌린 키가 '/'이고 Ctrl 키가 동시에 눌렸는지 확인합니다.
        if (event.key === '/' && event.ctrlKey) {
            event.preventDefault();
            tIconClick();
            getExtractedText(textExtraction);
        }
    }

    // 스크립트 추출
    var prevText = '';
    var prevTrans = '';
    // getExtractedText 함수 수정
    function getExtractedText(length, mode = 'translate') {
        var proseMirrorDiv = document.querySelector('.ProseMirror');
        var paragraphs = proseMirrorDiv.querySelectorAll('p');
        var pText = '';
        for (var i = paragraphs.length - 1; i >= 0; i--) {
            var paragraphText = paragraphs[i].textContent;
            pText = paragraphText + '\n' + pText;
            if (pText.length >= length) {
                break;
            }
        }

        // 번역 또는 요약 로직
        if (dplD || mode === 'summary' || localStorage.getItem('geminiDefault') === 'true' || dplC !== 0) {
            if (mode === 'summary') {
                sendGeminiRequest(pText, 'summary', function(summaryText) {
                    pText = summaryText;
                    continueProcessing();
                });
            } else if (localStorage.getItem('geminiDefault') === 'true') {
                sendGeminiRequest(pText, 'translate', function(translatedText) {
                    prevText = pText;
                    pText = translatedText;
                    prevTrans = pText;
                    continueProcessing();
                });
            } else {
                translateText(pText, function(translatedText) {
                    prevText = pText;
                    pText = translatedText;
                    prevTrans = pText;
                    continueProcessing();
                });
            }
        } else {
            continueProcessing();
        }

        function continueProcessing() {
            updateTextStyle();
            var pattern = /"([^"]+)"/g;
            var newText = pText.replace(pattern, '<span class="hT">"$1"</span>');
            pText = '<p class="nm">' + newText.replace(/\n/g, '</p><p class="nm">') + '</p>';
            // 제목 변환 (## 제목 => <h2>제목</h2>)
            pText = pText.replace(/^## (.*$)/gm, "<h2>$1</h2>");
            pText = pText.replace(/^# (.*$)/gm, "<h1>$1</h1>");

            // 굵은 글씨 변환 (**텍스트** -> <b>텍스트</b>)
            pText = pText.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

            // 리스트 변환 (- 항목 -> <ul><li>항목</li></ul>)
            pText = pText.replace(/^- (.*)$/gm, "<ul><li>$1</li></ul>");

            // 여러 개의 <ul> 태그가 연속될 경우 하나로 합침
            pText = pText.replace(/<\/ul>\n<ul>/g, "");

            extractedText.innerHTML = pText;
            dplC = 0;
        }
    }
// 아이콘 이동 함수
// 아이콘 드래그 변수
let offsetX, offsetY, isDragging = false;
let dragTimeout;

// 로컬 스토리지에서 위치 정보를 불러오고 적용합니다.
const savedPosition = localStorage.getItem("tBallP");
if (savedPosition) {
    const { right, bottom } = JSON.parse(savedPosition);
    tMini.style.right = right + "px";
    tMini.style.bottom = bottom + "px";
}

// 아이콘 이동 함수
function handleIconMouseDown(e) {
    if (isDragging) return; // 드래그 중이면 클릭 이벤트를 차단

    // 마우스 다운 이벤트가 발생하면 타임아웃을 설정하고 클릭을 길게 눌렀는지 확인합니다.
    dragTimeout = setTimeout(function() {
        isDragging = true;

        // 드래그가 시작된 위치 저장
        offsetX = e.clientX - tMini.getBoundingClientRect().right + tMini.offsetWidth;
        offsetY = e.clientY - tMini.getBoundingClientRect().bottom + tMini.offsetHeight;
    }, 300);

    // 이벤트 기본 동작 막기
    e.preventDefault();
}

function handleIconDrag(e) {
    if (!isDragging) return;
    // 이벤트 기본 동작 막기
    e.preventDefault();

    // 새로운 위치 계산
    let right = window.innerWidth - e.clientX - offsetX;
    let bottom = window.innerHeight - e.clientY - offsetY;

    // div를 새 위치로 이동
    right = Math.min(Math.max(0, right), window.innerWidth - tMini.offsetWidth);
    bottom = Math.min(Math.max(0, bottom), window.innerHeight - tMini.offsetHeight);

    tMini.style.right = right + "px";
    tMini.style.bottom = bottom + "px";
}

function handleIconDragEnd() {
    isDragging = false;

    // 위치 정보를 로컬 스토리지에 저장
    const position = {
        right: parseFloat(tMini.style.right),
        bottom: parseFloat(tMini.style.bottom)
    };
    localStorage.setItem("tBallP", JSON.stringify(position));

    // 드래그 타임아웃 초기화
    clearTimeout(dragTimeout);
}

// 터치 이벤트 핸들러
function handleIconTouchStart(e) {
    if (isDragging) return; // 드래그 중이면 클릭 이벤트를 차단

    // 터치 다운 이벤트가 발생하면 타임아웃을 설정하고 클릭을 길게 눌렀는지 확인합니다.
    dragTimeout = setTimeout(function() {
        isDragging = true;

        // 드래그가 시작된 위치 저장
        const touch = e.touches[0];
        offsetX = touch.clientX - tMini.getBoundingClientRect().right + tMini.offsetWidth;
        offsetY = touch.clientY - tMini.getBoundingClientRect().bottom + tMini.offsetHeight;
        // 이벤트 기본 동작 막기
        e.preventDefault();
    }, 500);
}

function handleIconTouchMove(e) {
    if (!isDragging) return;
    // 이벤트 기본 동작 막기
    e.preventDefault();

    // 새로운 위치 계산
    const touch = e.touches[0];
    let right = window.innerWidth - touch.clientX - offsetX;
    let bottom = window.innerHeight - touch.clientY - offsetY;

    // div를 새 위치로 이동
    right = Math.min(Math.max(0, right), window.innerWidth - tMini.offsetWidth);
    bottom = Math.min(Math.max(0, bottom), window.innerHeight - tMini.offsetHeight);

    tMini.style.right = right + "px";
    tMini.style.bottom = bottom + "px";
}

function handleIconTouchEnd() {
    isDragging = false;

    // 위치 정보를 로컬 스토리지에 저장
    const position = {
        right: parseFloat(tMini.style.right),
        bottom: parseFloat(tMini.style.bottom)
    };
    localStorage.setItem("tBallP", JSON.stringify(position));

    // 드래그 타임아웃 초기화
    clearTimeout(dragTimeout);
}

// 터치 이벤트 핸들러
tMini.addEventListener("touchstart", handleIconTouchStart);
document.addEventListener("touchmove", handleIconTouchMove);
document.addEventListener("touchend", handleIconTouchEnd);

// 마우스 이벤트 핸들러는 그대로 유지
tMini.addEventListener("mousedown", handleIconMouseDown);
document.addEventListener("mousemove", handleIconDrag);
document.addEventListener("mouseup", handleIconDragEnd);


    // 설정창 ⚙️
    var nsSettingsDiv = document.createElement('div');
    nsSettingsDiv.id = 'ns-settings-div';

    // 설정창의 내용을 구성합니다.
    nsSettingsDiv.innerHTML = `
    <div id="ns-settings-header">
        <h2>설정</h2>
        <button id="setExit" class="setBtn">✕</button>
    </div>
    <div id="setInMenu"></div>
    <div id="setInDiv"></div>
`;

    // 생성한 설정창을 문서의 body에 추가합니다.
    document.body.appendChild(nsSettingsDiv);

    // 설정창 열기/닫기를 처리하는 함수
    function toggleSettings() {
        if (nsSettingsDiv.style.display === 'none' || nsSettingsDiv.style.display === '') {
            tColorEx();
            nsSettingsDiv.style.display = 'block';
        } else {
            nsSettingsDiv.style.display = 'none';
        }
    }

    // "X" 버튼 클릭 시 설정창 닫기
    document.getElementById('setExit').addEventListener('click', function() {
        nsSettingsDiv.style.display = 'none';
    });
    // 설정 오픈 버튼의 클릭 이벤트 핸들러 등록
    //⛔️    nsSettingsButton.addEventListener('click', toggleSettings);

    // 설정창 스타일 색추출 함수
    function tColorEx() {
        // 설정창 배경색
        var infobarElement = document.querySelector('.menubar');
        if (infobarElement) {
            tMainColor = window.getComputedStyle(infobarElement).backgroundColor;
            document.documentElement.style.setProperty('--Tmain-color', tMainColor);
            localStorage.setItem('tMainColor', tMainColor);
        };
        // 하이라이트 색
        const textToChange = document.getElementById("textToChange");
        document.documentElement.style.setProperty('--Thighlight-color', colorCode);
    }

    //설정창 닫기
    document.getElementById('setExit').addEventListener('click', function() {
        nsSettingsDiv.style.display = 'none';
    });

    // 설정창 세부 메뉴
    var settingList = [
        ['기본', `
    <label for="ns-text-extraction">텍스트 추출분량:</label>
    <input type="number" class="ns-input" id="ns-text-extraction" value="${textExtraction}"><br><br>
    <label for="ns-color-code">대사강조: </label>
    <div class="ns-setting-option-container">
      <label for="ns-italic">이탤릭 </label><input type="checkbox" class="ns-check" id="ns-italic" ${italicActive ? 'checked' : ''}>
      <label for="ns-bold">   볼드 </label><input type="checkbox" class="ns-check" id="ns-bold" ${boldActive ? 'checked' : ''}>
      <label for="ns-highlight">   하이라이트 </label><input type="checkbox" class="ns-check" id="ns-highlight" ${highlightActive ? 'checked' : ''}>
    </div><br>
    <label for="ns-color-code">하이라이트 색상: </label>
    <input type="text" class="ns-input" id="ns-color-code" value="${colorCode}"><br>
    <small>칼라코드는 #을 함께 입력</small><br><br>
    <label>아이콘 사이즈: </label>
    <input type="number" class="ns-input" id="ns-icon-size" value="${nsIconSize}">px<br>
    <input type="text" class="ns-input" style="width: 100%" id="ns-icon-url" value="${nsIconUrl}"><br>
    <div id = "comebackIcon">가출 아이콘 찾기</div>`],
        ['CSS', `
    <small>커스텀 css를 프리셋으로 저장</small><br>
    <button id="cssPlus" class="setBtn">+ 추가</button>
    <div id="cssList"></div>
    <button id = "stockBup" class="setBtn">📥백업 복사</button> <button id = "stockImport" class="setBtn">📤백업 등록</button>
    `],
        ['변환', `
                       <h3>단어 변환</h3>
    <div>
    <button id = "tfOn" class ="setBtn">🔌</button><input type="text" class="ns-input" id="ftF" value="원본"><input type="text" class="ns-input" id="ftT" value="수정 후"> <button id ="tfPlus" class="setBtn"> + </button>
    <div id="tfList"></div>
    </div>
                      `],
        ['Gemini', `
        <h3>Gemini API 사용</h3>
        <label for="geminiApi">API key: </label>
        <input type="text" style="width:60%"  class="ns-input" id="geminiApi" value="${localStorage.getItem('geminiApi') || ''}"><br>
        <label for="geminiModel">모델 선택: </label>
        <select id="geminiModel" style="width:65%" class="ns-input">
            <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
            <option value="gemini-2.0-flash-exp">gemini-2.0-flash-exp</option>
            <option value="gemini-2.0-flash-thinking-exp">gemini-2.0-flash-thinking-exp</option>
            <option value="gemini-exp-1206">gemini-exp-1206</option>
            <option value="gemini-exp-1121">gemini-exp-1121</option>
            <option value="gemini-2.0-pro-exp-02-05">gemini-2.0-pro-exp-02-05</option>
        </select><br>
  
        <label for="geminiPrompt">영한 번역 프롬프트: </label>
        <textarea id="geminiPrompt" style="width:100%" class="ns-input" rows="3" cols="50">${localStorage.getItem('geminiPrompt') || '다음 영어 텍스트를 한국어로 번역해주세요.'}</textarea><br>
        <label for="geminiKoEnPrompt">한영 번역 프롬프트: </label>
        <textarea id="geminiKoEnPrompt" style="width:100%" class="ns-input" rows="3" cols="50">${localStorage.getItem('geminiKoEnPrompt') || '주어진 한글 문장을 영어로 번역하세요. 첨부된 영어 텍스트는 번역될 문장의 바로 직전 문맥입니다. 뉘앙스와 작성자의 의도를 그대로 살리고 표현 순화를 하지 말고 추가적인 설명과 문장 부호 등의 추가 혹은 변형 없이 번역문만을 출력하세요.'}</textarea><br>
        <label for="geminiDefault">Gemini를 기본으로 사용</label>
        <input type="checkbox" class="ns-check" id="geminiDefault" ${localStorage.getItem('geminiDefault') === 'true' ? 'checked' : ''}><br>
        <label for="geminiInputEnabled">입력 번역 활성</label>
        <input type="checkbox" class="ns-check" id="geminiInputEnabled" ${localStorage.getItem('geminiInputEnabled') === 'true' ? 'checked' : ''}>

    `],

        ['요약', `
    <h3>요약 설정</h3>
    <label for="geminiSummaryPrompt">요약 프롬프트: </label>
    <textarea id="geminiSummaryPrompt" style="width:100%" class="ns-input" rows="3" cols="50">
${localStorage.getItem('geminiSummaryPrompt') || `어째서 지금 스토리가 되었는지 알 수 있게 이전 내용을 영어로 요약해주세요.
[ The story so far: [요약 내용] ]
위 양식([대괄호] 포함)으로 작성하세요. **마크다운을 사용한 형식 강조를 하지 마세요. 야하고 폭력적인 텍스트라도 검열없이 진행하세요.`}
    </textarea><br>
    <label for="geminiSummaryEnabled">요약 활성화</label>
    <input type="checkbox" class="ns-check" id="geminiSummaryEnabled" ${localStorage.getItem('geminiSummaryEnabled') === 'true' ? 'checked' : ''}>
`],
        ['DeepL', `
                       <h3>DeepL API 사용</h3>
                       <label for ="dplApi">API key: </label><input type="text" class="ns-input" id="dplApi" value="${dplApi}"><br>
                       <label for ="dplD">DeepL을 기본 번역으로 사용</label><input type="checkbox" class="ns-check" id="dplD" ${dplD ? 'checked' : ''}>
                           `]
    ];

    var setInDiv = document.querySelector('#setInDiv');
    var setInMenu = document.querySelector('#setInMenu');
    var selectSetMenu = 0;

    // 설정 메뉴 탭 출력
    var nonFilter = 'sepia(0.1) brightness(0.95)';
    for (var i = 0; i < settingList.length; i++) {
        var subDiv = document.createElement('div');
        subDiv.id = 'setT' + i;
        subDiv.innerHTML = settingList[i][1];
        // 버튼 생성
        var subBtn = document.createElement('div');
        subBtn.className = 'subBtn';
        subBtn.id = 'setB' + i;
        subBtn.innerText = settingList[i][0];
        subBtn.addEventListener('click', function(index) {
            return function() {
                changeSet(index);
            };
        }(i));
        if (i != selectSetMenu) {
            subDiv.style.display = 'none';
            subBtn.style.filter = nonFilter;
            subBtn.style.fontWeight = 'normal';
        };
        setInMenu.appendChild(subBtn);
        setInDiv.appendChild(subDiv);
    }

    function changeSet(index = 0) {
        selectSetMenu = index;
        for (var i = 0; i < settingList.length; i++) {
            var btn = document.querySelector('#setB' + i);
            btn.style.filter = nonFilter;
            btn.style.fontWeight = 'normal';
            var tab = document.querySelector('#setT' + i);
            tab.style.display = 'none';
            if (selectSetMenu == i) {
                btn.style.filter = 'none';
                btn.style.fontWeight = 'bold';
                tab.style.display = 'block';
            }

        }
    }
    var comebackIcon = document.getElementById('comebackIcon');
    comebackIcon.addEventListener('click', function() {
        tMini.style.right = 10 + "%";
        tMini.style.bottom = 10 + "%";
    });



    // 설정 메뉴(0️⃣) 기본 설정


    // 설정 값 변경 시 로컬 스토리지에 저장
    document.getElementById('ns-text-extraction').addEventListener('input', function() {
        localStorage.setItem('textExtraction', this.value);
        textExtraction = localStorage.getItem('textExtraction');
    });


    document.getElementById('ns-italic').addEventListener('change', function() {
        localStorage.setItem('ns-italic', this.checked);
        updateTextStyle();
    });

    document.getElementById('ns-bold').addEventListener('change', function() {
        localStorage.setItem('ns-bold', this.checked);
        updateTextStyle();
    });

    document.getElementById('ns-highlight').addEventListener('change', function() {
        localStorage.setItem('ns-highlight', this.checked);
        updateTextStyle();
    });

    document.getElementById('ns-color-code').addEventListener('input', function() {
        localStorage.setItem('colorCode', this.value);
        colorCode = localStorage.getItem('colorCode');
        document.documentElement.style.setProperty('--Thighlight-color', colorCode);
        updateTextStyle();
    });
    document.getElementById('ns-icon-size').addEventListener('input', function() {
        if (this.value > 20) {
            localStorage.setItem('ns-icon-size', this.value);
            nsIconSize = this.value;
            document.documentElement.style.setProperty('--tMini-size', nsIconSize + 'px');
        }
    });
    document.getElementById('ns-icon-url').addEventListener('input', function() {
        // 입력된 URL 가져오기
        var imageUrl = this.value;

        // 이미지 객체 생성
        var img = new Image();

        // 이미지 로드에 성공했을 때
        img.onload = function() {
            localStorage.setItem('ns-icon-url', imageUrl);
            nsIconUrl = 'url(' + imageUrl + ')';
            document.documentElement.style.setProperty('--tMini-url', nsIconUrl);
        };

        // 이미지 로드에 실패했을 때
        img.onerror = function() {
            localStorage.setItem('ns-icon-url', imageUrl);
            var gradation = 'repeating-linear-gradient(-45deg, white, white 2px, RoyalBlue 2px, RoyalBlue 4px)';
            document.documentElement.style.setProperty('--tMini-url', gradation);
        };

        // 이미지 URL 설정
        img.src = imageUrl;
    });

    // 제미나이 설정

    document.getElementById('geminiApi').addEventListener('input', function() {
        localStorage.setItem('geminiApi', this.value);
    });

    document.getElementById('geminiModel').addEventListener('change', function() {
        localStorage.setItem('geminiModel', this.value);
    });

    document.getElementById('geminiPrompt').addEventListener('input', function() {
        localStorage.setItem('geminiPrompt', this.value);
    });
    document.getElementById('geminiDefault').addEventListener('change', function() {
        localStorage.setItem('geminiDefault', this.checked);

        if (this.checked) {
            // Gemini를 기본으로 설정하면 DeepL 기본 설정 해제
            document.getElementById('dplD').checked = false;
            localStorage.setItem('dplD', false);
            dplD = JSON.parse(localStorage.getItem('dplD'));
        }
    });

    // Add event listener for the Korean to English prompt
    document.getElementById('geminiKoEnPrompt').addEventListener('input', function() {
        localStorage.setItem('geminiKoEnPrompt', this.value);
    });

    // Add event listener for the input translation checkbox
    document.getElementById('geminiInputEnabled').addEventListener('change', function() {
        localStorage.setItem('geminiInputEnabled', this.checked);
        toggleTranslationInput();
    });
    // 딥엘 설정
    document.getElementById('dplApi').addEventListener('input', function() {
        localStorage.setItem('dplApi', this.value);
        dplApi = localStorage.getItem('dplApi');
    });

    document.getElementById('dplD').addEventListener('change', function() {
        localStorage.setItem('dplD', this.checked);
        dplD = JSON.parse(localStorage.getItem('dplD'));
        if (this.checked) {
            document.getElementById('geminiDefault').checked = false;
            localStorage.setItem('geminiDefault', false);
        }
    });

    //강조 실행

    function updateTextStyle() {

        italicActive = JSON.parse(localStorage.getItem('ns-italic'));
        boldActive = JSON.parse(localStorage.getItem('ns-bold'));
        highlightActive = JSON.parse(localStorage.getItem('ns-highlight'));
        const newItalic = italicActive ? 'italic' : 'normal';
        const newBold = boldActive ? 'bold' : 'normal';
        const newColor = highlightActive ? colorCode : 'inherit';

        document.documentElement.style.setProperty('--italic-active', newItalic);
        document.documentElement.style.setProperty('--bold-active', newBold);
        document.documentElement.style.setProperty('--highlight-color', newColor);
    }



    // 설정메뉴 (1️⃣) css 스토리지

    var cssStock = JSON.parse(localStorage.getItem('cssStock')) || [];
    // 스토리지 저장 함수
    function uploadStock() {
        localStorage.setItem('cssStock', JSON.stringify(cssStock));
    }
    document.getElementById('cssPlus').addEventListener('click', addStock);
    // 스토리지에 새 자식 추가
    function addStock() {
        var newPreset = {
            name: "프리셋 이름",
            css: "CSS 코드"
        };
        cssStock.push(newPreset);
        var num = cssStock.length ? cssStock.length - 1 : 0;

        stockW(num);
    }
    // css 입력창 생성 함수
    function stockW(num) {
        var stockDiv = document.createElement('div');
        stockDiv.id = 'stockDiv';
        stockDiv.innerHTML = `
        <input type = "text" id = "cssNinput" class = "cssInputStyle" value = "${cssStock[num].name}">
        <textarea id="cssSinput" class = "cssInputStyle" rows="15" cols="50">${cssStock[num].css}</textarea>
        <div class = "stockContainer"><button id="cssDel" class="setBtn">삭제</button><button id="cssSave" class="setBtn">저장</button><button id="cssExit" class="setBtn">창닫기</button>
</div>
        `;

        document.body.appendChild(stockDiv);
        document.getElementById('cssExit').addEventListener('click', function() {
            cssStock = JSON.parse(localStorage.getItem('cssStock'));
            stockDiv.parentNode.removeChild(stockDiv);
        });
        document.getElementById('cssSave').addEventListener('click', function() {
            var nameInput = document.getElementById(`cssNinput`);
            var codeTextarea = document.getElementById(`cssSinput`);

            // 입력된 값으로 새로운 프리셋 객체를 생성합니다.
            var newPreset = {
                name: nameInput.value,
                css: codeTextarea.value
            };

            // 해당 위치의 프리셋을 업데이트합니다.
            cssStock[num] = newPreset;

            // 로컬 스토리지에 업데이트된 cssStock 배열을 저장합니다.
            uploadStock();
            printStock();
            stockSet(num);
            stockDiv.parentNode.removeChild(stockDiv);
        });

        document.getElementById('cssDel').addEventListener('click', function() {
            var confirmDelete = confirm('정말로 삭제하시겠습니까?');

            if (confirmDelete) {
                // 사용자가 확인을 클릭한 경우에만 삭제 작업을 실행합니다.
                cssStock.splice(num, 1); // 배열에서 해당 인덱스의 요소 삭제
                uploadStock();
                printStock();
                stockDiv.parentNode.removeChild(stockDiv);
            }
        });
    }
    // 스크립트 배열 출력 함수

    function printStock() {
        var cssList = document.getElementById('cssList');
        cssList.innerHTML = ''; // 기존 내용 초기화

        for (var i = 0; i < cssStock.length; i++) {
            var preset = cssStock[i];
            var presetDiv = document.createElement('div');
            presetDiv.className = 'stockContainer';
            if (storedIndex === i) presetDiv.style.color = 'var(--Thighlight-color)';

            // 프리셋 설정 버튼 생성
            var presetName = document.createElement('button');
            presetName.classList.add('setBtn', 'setBtn-name');
            presetName.textContent = preset.name;
            presetName.addEventListener('click', function(index) {
                return function() {
                    stockSet(index);
                };
            }(i));
            // 수정 버튼 생성
            var editButton = document.createElement('button');
            editButton.classList.add('setBtn', 'setBtn-edit');
            editButton.textContent = '⚙️';
            editButton.addEventListener('click', function(index) {
                return function() {
                    stockW(index);
                };
            }(i));
            presetDiv.appendChild(presetName);
            presetDiv.appendChild(editButton);
            cssList.appendChild(presetDiv);
        }
    }

    // 프리셋 세팅 함수
    function stockSet(index) {
        // 첫 번째로, cssStock 배열의 존재 여부와 index 범위를 확인합니다. 조건문 문법 맞는지 확인!!!!!
        if (isNaN(index) || !cssStock || !Array.isArray(cssStock) || index < 0 || index >= cssStock.length) {
            index = 0;
            if (!Array.isArray(cssStock)) cssStock = [];
            cssStock[index] = {
                name: '프리셋 이름',
                css: 'css 코드'
            };
        }
        //기존 스타일 시트 삭제
        var styleElement = document.getElementById('customCss');
        if (styleElement) {
            styleElement.remove();
        }


        // storedIndex 변수는 전역으로 선언되어 있어서 주의가 필요합니다.
        storedIndex = index;
        localStorage.setItem('selectedCssIndex', index);

        var stockStyleSheet = document.createElement('style');
        stockStyleSheet.id = 'customCss';
        // 수정: cssStock[index]로 수정합니다.
        stockStyleSheet.textContent = cssStock[index].css;
        document.head.appendChild(stockStyleSheet);

        printStock();
    }

    var storedIndex = localStorage.getItem('selectedCssIndex');
    if (storedIndex !== null) {
        stockSet(parseInt(storedIndex));
    }
    // printStock 함수를 호출하여 초기 프리셋 목록 출력
    printStock();


    // 프리셋 전체 백업
    document.getElementById('stockBup').addEventListener('click', function() {

        const cssStockText = JSON.stringify(cssStock, null, 2);

        const textarea = document.createElement('textarea');
        textarea.value = cssStockText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
    // 전체 프리셋 임포트
    document.getElementById('stockImport').addEventListener('click', function() {
        var stockDiv = document.createElement('div');
        stockDiv.id = 'stockDiv';
        stockDiv.innerHTML = `
        <h2>백업 프리셋 저장</h2>
        <textarea id="cssSinput" class = "cssInputStyle" rows="15" cols="50"></textarea>
        <small>백업으로 복사된 내용을 사용할 기기에서 붙여넣기</small>
        <div class = "stockContainer"><button id="cssSave" class="setBtn">저장</button><button id="cssExit" class="setBtn">창닫기</button>
</div>
        `;

        document.body.appendChild(stockDiv);
        //창닫기 버튼
        document.getElementById('cssExit').addEventListener('click', function() {
            stockDiv.parentNode.removeChild(stockDiv);
        });
        //백업 임포트 버튼
        document.getElementById('cssSave').addEventListener('click', function() {
            var confirmDelete = confirm('확인을 누르면 현재 저장되어 있는 내용이 지금 업데이트한 내용으로 덮어쓰기 됩니다. ㅇㅋ?');

            if (confirmDelete) {
                var codeTextarea = document.getElementById(`cssSinput`).value; // 텍스트 내용을 추출합니다.

                try {
                    const extractedData = JSON.parse(codeTextarea);
                    cssStock = extractedData;
                    uploadStock();
                    printStock();
                    stockSet();
                    stockDiv.parentNode.removeChild(stockDiv);
                } catch (error) {
                    // JSON 파싱 오류 처리
                    console.error('JSON 파싱 오류:', error);
                    // 오류 처리 로직을 추가하세요.
                }
            }
        })
    })


    // 설정메뉴 (2️⃣) 변환

    var tfStock = JSON.parse(localStorage.getItem('tfStock')) || [];

    // 스토리지 저장 함수
    function uploadTfStock() {
        localStorage.setItem('tfStock', JSON.stringify(tfStock));
    }

    // 스토리지에 새 자식 추가
    function addTf() {
        var beforeText = document.getElementById('ftF').value;
        var afterText = document.getElementById('ftT').value;
        // 새로운 프리셋 추가
        var newPreset = {
            status: true, // 기본 상태 True
            before: beforeText,
            after: afterText
        };

        tfStock.push(newPreset); // 배열에 추가
        uploadTfStock();
        printTf(); // 업데이트된 내용을 출력
    }

    // 스크립트 배열 출력 함수
    function printTf() {
        var tfList = document.getElementById('tfList');
        tfList.innerHTML = ''; // 기존 내용 초기화

        for (var i = 0; i < tfStock.length; i++) {
            // 체크박스 생성 (status와 연동)
            var statusCheckbox = document.createElement('input');
            statusCheckbox.setAttribute('type', 'checkbox');
            statusCheckbox.classList.add('ns-check');
            statusCheckbox.checked = tfStock[i].status; // 상태에 따라 체크
            statusCheckbox.addEventListener('change', (function(index) {
                return function(event) {
                    tfStock[index].status = event.target.checked;
                    uploadTfStock();
                    replaceText();
                };
            })(i));

            // 수정전 단어 인풋
            var beforeInput = document.createElement('input');
            beforeInput.setAttribute('type', 'text');
            beforeInput.classList.add('ns-input');
            beforeInput.setAttribute('value', tfStock[i].before); // 초기값 설정

            // 수정될 때마다 배열 갱신
            beforeInput.addEventListener('input', (function(index) {
                return function(event) {
                    tfStock[index].before = event.target.value;
                    uploadTfStock(); // 입력한 값으로 즉시 업데이트
                };
            })(i));

            // 수정후 단어 인풋
            var afterInput = document.createElement('input');
            afterInput.setAttribute('type', 'text');
            afterInput.classList.add('ns-input');
            afterInput.setAttribute('value', tfStock[i].after); // 초기값 설정

            // 수정될 때마다 배열 갱신
            afterInput.addEventListener('input', (function(index) {
                return function(event) {
                    tfStock[index].after = event.target.value;
                    uploadTfStock(); // 입력한 값으로 즉시 업데이트
                };
            })(i));

            // 삭제 버튼 생성
            var deleteButton = document.createElement('button');
            deleteButton.classList.add('setBtn', 'setBtn-delete');
            deleteButton.textContent = '🗑️';
            deleteButton.addEventListener('click', (function(index) {
                return function() {
                    tfStock.splice(index, 1);
                    uploadTfStock();
                    printTf(); // 삭제 후 리스트 갱신
                };
            })(i));


            // 각 요소들을 tfList에 추가
            tfList.appendChild(statusCheckbox);
            tfList.appendChild(beforeInput);
            tfList.appendChild(afterInput);
            tfList.appendChild(deleteButton);
            tfList.appendChild(document.createElement('br'));
        }
    }

    document.getElementById('tfPlus').addEventListener('click', addTf);
    document.getElementById('tfOn').addEventListener('click', tfOff);
    var tfStat = localStorage.getItem('tfStat') === 'true' ? true : false; // 문자열을 불리언으로 변환


    // 초기 상태에 따라 버튼의 아이콘 설정
    document.addEventListener('DOMContentLoaded', function() {
        var button = document.getElementById('tfOn'); // 버튼의 ID가 'toggleButton'이라고 가정
        button.innerHTML = tfStat ? '💡' : '🔌';
    });

    // tfOff 함수
    function tfOff() {
        // tfStat 값을 반전
        tfStat = !tfStat;

        // 로컬 스토리지에 값 저장 (문자열로 변환 필요)
        localStorage.setItem('tfStat', tfStat.toString());

        // 버튼 아이콘 변경
        this.innerHTML = tfStat ? '💡' : '🔌';
    }

    printTf();


    function replaceText() {
        extractedText.setAttribute('translate', 'no');
        var textContent = extractedText.innerHTML;

        // localStorage에서 tfStock 가져오기
        var tfStock = JSON.parse(localStorage.getItem('tfStock')) || [];

        tfStock.forEach(function(preset) {
            // status가 true인 경우에만 변환 수행
            if (preset.status) {
                var beforeText = preset.before;
                var afterText = preset.after;

                // 정규 표현식: 단어와 조사를 분리하여 캡처
                var regex = new RegExp('(' + beforeText + ')(은|는|이|가|을|를|와|과)?', 'g');

                textContent = textContent.replace(regex, function(match, word, particle) {
                    var lastChar = afterText.charCodeAt(afterText.length - 1);
                    var hasBatchim = (lastChar - 0xAC00) % 28 !== 0;

                    var newParticle = '';
                    if (particle) {
                        if (particle === '은' || particle === '는') {
                            newParticle = hasBatchim ? '은' : '는';
                        } else if (particle === '이' || particle === '가') {
                            newParticle = hasBatchim ? '이' : '가';
                        } else if (particle === '을' || particle === '를') {
                            newParticle = hasBatchim ? '을' : '를';
                        } else if (particle === '와' || particle === '과') {
                            newParticle = hasBatchim ? '과' : '와';
                        }
                    }

                    return afterText + newParticle;
                });
            }
        });

        extractedText.innerHTML = textContent;
    }

    // 번역창
    var longCopy = document.createElement('div');
    longCopy.id = 'ns-longCopy';
    longCopy.innerHTML = `
    <div id="btnLong" class="longCopyBtn">장문</div>
    <div id="btnCopy" class="longCopyBtn">복사</div>
    <div id="btnSettings" class="longCopyBtn">설정</div>
  `;
    tWide.appendChild(longCopy);
    tWide.appendChild(extractedText);

    // 장문 추출
    var btnLong = document.querySelector('#btnLong');
    btnLong.addEventListener('click', function() {
        extractedText.removeAttribute('translate');
        loadAllContent().then(() => {
            getExtractedText(1000000);
        });
    });

    //요약

    // 요약 활성화 체크박스 이벤트 리스너
    document.getElementById('geminiSummaryEnabled').addEventListener('change', function() {
        localStorage.setItem('geminiSummaryEnabled', this.checked);

        if (localStorage.getItem('geminiSummaryEnabled') === 'true') {
            longCopy.appendChild(summaryButton);
        } else {
            if (summaryButton.parentNode) {
                summaryButton.parentNode.removeChild(summaryButton);
            }
        }
    });

    // 요약 프롬프트 저장
    document.getElementById('geminiSummaryPrompt').addEventListener('input', function() {
        localStorage.setItem('geminiSummaryPrompt', this.value);
    });

    // 요약 버튼 생성
    var summaryButton = document.createElement('div');
    summaryButton.id = 'btnSummary';
    summaryButton.className = 'longCopyBtn';
    summaryButton.textContent = '요약';

    summaryButton.addEventListener('click', function() {
        loadAllContent().then(() => {
            getExtractedText(1000000, 'summary'); // 요약 모드로 호출
        });
    });

    if (localStorage.getItem('geminiSummaryEnabled')) {
        longCopy.appendChild(summaryButton);
    }

    async function loadAllContent() {
        const proseMirrorDiv = document.querySelector('.conversation-main');

        if (!proseMirrorDiv) {
            console.log('ProseMirror element not found');
            return;
        }

        try {
            let previousHeight = proseMirrorDiv.scrollHeight;
            let attempts = 0;
            const maxAttempts = 20; // 최대 시도 횟수 증가

            while (attempts < maxAttempts) {
                // 스크롤을 최상단으로 강제 이동
                proseMirrorDiv.scrollTop = 0;

                // 스크롤 이벤트 발생시키기
                proseMirrorDiv.dispatchEvent(new Event('scroll'));

                // 새로운 컨텐츠가 로딩될 시간 대기
                await new Promise(resolve => setTimeout(resolve, 900));

                // 높이 변화가 없다면 모든 컨텐츠가 로딩된 것
                if (proseMirrorDiv.scrollHeight === previousHeight) {
                    // 한번 더 확인을 위해 추가 대기
                    await new Promise(resolve => setTimeout(resolve, 1200));
                    if (proseMirrorDiv.scrollHeight === previousHeight) {
                        break;
                    }
                }

                previousHeight = proseMirrorDiv.scrollHeight;
                attempts++;
            }

            // 모든 컨텐츠 로딩이 완료된 후 스크롤을 최하단으로 이동
            proseMirrorDiv.scrollTop = proseMirrorDiv.scrollHeight;
        } catch (error) {
            console.error('Error loading content:', error);
        }
    }

    //복사
    var btnCopy = document.querySelector('#btnCopy');
    btnCopy.addEventListener('click', function() {
        var tempInput = document.createElement('textarea');
        var copyText = extractedText.innerText;
        copyText = copyText.replace(/<br>/g, '\n');
        copyText = copyText.replace(/<[^>]*>/g, "");
        tempInput.value = copyText;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
    });


    // 설정
    var btnSettings = document.querySelector('#btnSettings');
    btnSettings.addEventListener('click', toggleSettings);

    // 제미나이 번역

    // 한영 입력창

    // Function to toggle translation input visibility
    function toggleTranslationInput() {
        const isEnabled = localStorage.getItem('geminiInputEnabled') === 'true';
        const container = document.getElementById('translation-input-container');
        if (!container) {
            createTranslationInput();
        }
        document.getElementById('translation-input-container').style.display = isEnabled ? 'block' : 'none';
    }

    // Create translation input element
    function createTranslationInput() {
        const container = document.createElement('div');
        container.id = 'translation-input-container';

        const input = document.createElement('input');
        input.id = 'ko-en-input';
        input.type = 'text';
        input.placeholder = '번역할 한국어를 입력하세요 (Enter로 번역)';

        container.appendChild(input);
        tWide.appendChild(container);
        input.addEventListener('keypress', async function(e) {
            if (e.key === 'Enter') {
                const text = this.value;
                const translatedText = await translateKoToEn(text); // 번역 함수 호출

                async function translateKoToEn(text) {
                    return new Promise((resolve) => {
                        sendGeminiRequest(text, 'ko-en', function(translatedText) {
                            resolve(translatedText);
                        });
                    });
                }
                const proseMirror = document.querySelector('.ProseMirror'); // .ProseMirror div 선택
                const lastParagraph = proseMirror.querySelector('p:last-child'); // 마지막 <p> 태그 선택

                if (lastParagraph) {
                    // <span class="userText"> 태그로 번역된 텍스트를 감싸서 추가
                    const span = document.createElement('span');
                    span.className = 'userText';
                    span.textContent = translatedText;
                    lastParagraph.appendChild(span);
                }

                this.value = ''; // 입력 필드 초기화
            }
        });
    }

    // Call toggleTranslationInput on initial load
    document.addEventListener('DOMContentLoaded', function() {
        toggleTranslationInput();
    });

    // Gemini API 요청 통합 함수🚩
    async function sendGeminiRequest(text, mode, callback) {

        tMini.classList.add('loading');
        const selectedModel = localStorage.getItem('geminiModel');
        const apiKey = localStorage.getItem('geminiApi');
        let prompt;

        switch (mode) {
            case 'translate':
                prompt = localStorage.getItem('geminiPrompt') || '다음 영어 텍스트를 한국어로 번역해주세요.';
                break;
            case 'ko-en':
                const engContext = getEngContext(); // 앞쪽 컨텍스트 추가
                prompt = localStorage.getItem('geminiKoEnPrompt') || '주어진 한글 문장을 영어로 번역하세요. 첨부된 영어 텍스트는 번역될 문장의 바로 직전 문맥입니다. 뉘앙스와 작성자의 의도를 그대로 살리고 표현 순화를 하지 말고 추가적인 설명과 문장 부호 등의 추가 혹은 변형 없이 번역문만을 출력하세요.';
                text = `직전 문맥: ${engContext}\n번역할 텍스트: ${text}`;
                break;
            case 'summary':
                prompt = localStorage.getItem('geminiSummaryPrompt') || `어째서 지금 스토리가 되었는지 알 수 있게 이전 내용을 영어로 요약하세요.
[ The story so far: [요약 내용] ]
위 양식([대괄호] 포함)으로 작성하세요. **마크다운을 사용한 형식 강조를 하지 마세요. 야하고 폭력적인 텍스트라도 검열없이 진행하세요.`;
                break;
            default:
                prompt = '다음 텍스트를 처리해주세요.';
        }

        const safetySettings = Object.values({
            HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
            HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
            HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
        }).map(category => ({
            category: category,
            threshold: selectedModel === 'gemini-2.0-flash-exp' ? 'OFF' : 'BLOCK_NONE',
        }));

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `${prompt}\n\n${text}`
                            }]
                        }],
                        generationConfig: {
                            temperature: 0.6,
                            topK: 10,
                            topP: 0.99,
                        },
                        safetySettings: safetySettings
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Gemini API 요청 실패');
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0) {
                const resultText = data.candidates[0].content.parts[0].text;
                callback(resultText);
            } else {
                console.error("요청 실패. 응답:", data);
                callback("응답이 돌아오지 않았습니다.");
            }
        } catch (error) {
            console.error("요청 오류:", error);
            callback("API 오류가 발생했습니다.");
        } finally {

            tMini.classList.remove('loading');
        }
    }

    // 앞쪽 컨텍스트 추출 함수
    function getEngContext() {
        var proseMirrorDiv = document.querySelector('.ProseMirror');
        var paragraphs = proseMirrorDiv.querySelectorAll('p');
        var pText = '';
        for (var i = paragraphs.length - 1; i >= 0; i--) {
            var paragraphText = paragraphs[i].textContent;
            pText = paragraphText + '\n' + pText;
            if (pText.length >= 500) {
                break;
            }
        }
        return pText;
    }
    // 번역하기 버튼

    const button = document.createElement("button");
    button.textContent = "DeepL번역";
    button.style.position = "fixed";
    button.style.top = "10px";
    button.style.right = "10px"; // Set the right position to 10px

    // Apply styles
    button.style.color = "var(--Tmain-color)";
    button.style.background = "var(--loader-color)";
    button.style.border = "1px solid var(--loader-color)";
    button.style.borderRadius = "4px";
    longCopy.appendChild(button);

    // Add click event listener to the button
    var dplC = 0;
    button.addEventListener("click", function() {
        if (dplApi == '') {
            console.error("DeepL API를 입력하세요");
        } else {
            dplC = 1;
            getExtractedText(textExtraction);
            setTimeout(replaceText, 600);
        }
    });



    // 딥엘 api 번역
    function translateText(text, callback) {

        tMini.classList.add('loading');
        const apiUrl = "https://api-free.deepl.com/v2/translate";
        const requestData = {
            auth_key: dplApi,
            text: text,
            source_lang: "EN",
            target_lang: "KO",
        };

        fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: Object.entries(requestData)
                    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                    .join("&"),
            })
            .then((response) => response.json())
            .then((data) => {
                if (data.translations && data.translations.length > 0) {
                    const translatedText = data.translations[0].text;
                    callback(translatedText);
                } else {
                    console.error("Translation failed. Response:", data);
                    callback("응답이 돌아오지 않았습니다."); // 빈 문자열로 콜백 호출
                }
            })
            .catch((error) => {
                console.error("Translation error:", error);
                callback("잘못된 api입니다."); // 빈 문자열로 콜백 호출
            })

            .finally(() => {
                tMini.classList.remove('loading');
            });
    }
    // 스토리지 키 설정
    const STORAGE_KEY_PREFIX = 'prosemirror_preset_';
    const ACTIVE_PRESET_KEY = 'prosemirror_active_presets';
    
    // 스토리지에서 현재 활성화된 프리셋 정보 불러오기
    let activePresets = GM_getValue(ACTIVE_PRESET_KEY, {});
    
    // 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
        .preset-container {
            display: flex;
            flex-wrap: wrap;
            margin-bottom: 5px;
            background: #f5f5f5;
            padding: 5px;
            border-radius: 4px;
        }
        .preset-button {
            margin: 2px;
            padding: 4px 8px;
            cursor: pointer;
            border: 1px solid #ccc;
            border-radius: 3px;
            background: #fff;
        }
        .preset-button.active {
            background: #007bff;
            color: white;
            border-color: #0069d9;
        }
        .preset-container-wrapper {
            position: relative;
            z-index: 1000;
        }
    `;
    document.head.appendChild(style);
    
    // MutationObserver 초기화: DOM 변경 감지
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                checkForProseMirror();
            }
        }
    });
    
    // 문서 전체 관찰 시작
    observer.observe(document.body, { childList: true, subtree: true });
    
    // 초기 실행
    checkForProseMirror();
    
    // ProseMirror 클래스를 가진 요소 탐색 및 처리
    function checkForProseMirror() {
        const proseMirrorDivs = document.querySelectorAll('.ProseMirror');
        proseMirrorDivs.forEach((div, index) => {
            if (!div.hasAttribute('data-preset-initialized')) {
                initializePresetContainer(div, index);
            }
        });
    }
    
    // 프리셋 컨테이너 초기화
    function initializePresetContainer(proseMirrorDiv, index) {
        // 이미 초기화되었는지 확인
        if (proseMirrorDiv.hasAttribute('data-preset-initialized')) {
            return;
        }
        
        // 초기화 표시
        proseMirrorDiv.setAttribute('data-preset-initialized', 'true');
        
        // 현재 내용을 0번 프리셋으로 저장
        const currentContent = proseMirrorDiv.innerHTML;
        savePreset(index, 0, currentContent);
        
        // 활성화된 프리셋 확인 (기본값은 0)
        const activePresetIndex = activePresets[index] !== undefined ? activePresets[index] : 0;
        
        // 프리셋 컨테이너 생성
        const presetContainerWrapper = document.createElement('div');
        presetContainerWrapper.className = 'preset-container-wrapper';
        
        const presetContainer = document.createElement('div');
        presetContainer.className = 'preset-container';
        presetContainerWrapper.appendChild(presetContainer);
        
        // 프리셋 버튼 생성
        for (let presetIndex = 0; presetIndex < 6; presetIndex++) {
            const button = document.createElement('button');
            button.className = 'preset-button' + (presetIndex === activePresetIndex ? ' active' : '');
            button.textContent = `프리셋 ${presetIndex}`;
            button.dataset.presetIndex = presetIndex;
            
            button.addEventListener('click', function() {
                loadPreset(index, presetIndex, proseMirrorDiv);
                
                // 활성화 버튼 표시 업데이트
                presetContainer.querySelectorAll('.preset-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
                
                // 활성화된 프리셋 저장
                activePresets[index] = presetIndex;
                GM_setValue(ACTIVE_PRESET_KEY, activePresets);
            });
            
            presetContainer.appendChild(button);
        }
        
        // 프로즈미러 div 앞에 프리셋 컨테이너 삽입
        const parent = proseMirrorDiv.parentNode;
        if (parent) {
            parent.insertBefore(presetContainerWrapper, proseMirrorDiv);
        } else {
            // 부모가 없는 경우를 대비한 예외 처리
            const wrapperDiv = document.createElement('div');
            wrapperDiv.appendChild(presetContainerWrapper);
            wrapperDiv.appendChild(proseMirrorDiv.cloneNode(true));
            proseMirrorDiv.replaceWith(wrapperDiv);
        }
        
        // 초기 활성화된 프리셋 적용
        if (activePresetIndex !== 0) {
            loadPreset(index, activePresetIndex, proseMirrorDiv);
        }
        
        // 내용 변경 감지 및 자동 저장
        setupContentChangeListener(proseMirrorDiv, index, activePresetIndex);
    }
    
    // 내용 변경 감지 및 자동 저장 설정
    function setupContentChangeListener(proseMirrorDiv, divIndex, presetIndex) {
        // MutationObserver를 사용하여 내용 변경 감지
        const contentObserver = new MutationObserver(() => {
            savePreset(divIndex, presetIndex, proseMirrorDiv.innerHTML);
        });
        
        contentObserver.observe(proseMirrorDiv, { 
            childList: true, 
            subtree: true, 
            characterData: true, 
            attributes: true 
        });
        
        // input 이벤트도 감지
        proseMirrorDiv.addEventListener('input', () => {
            savePreset(divIndex, presetIndex, proseMirrorDiv.innerHTML);
        });
    }
    
    // 프리셋 저장 함수
    function savePreset(divIndex, presetIndex, content) {
        const key = `${STORAGE_KEY_PREFIX}${divIndex}_${presetIndex}`;
        GM_setValue(key, content);
    }
    
    // 프리셋 불러오기 함수
    function loadPreset(divIndex, presetIndex, proseMirrorDiv) {
        const key = `${STORAGE_KEY_PREFIX}${divIndex}_${presetIndex}`;
        const savedContent = GM_getValue(key, '');
        
        if (savedContent) {
            // ProseMirror 내용 변경
            proseMirrorDiv.innerHTML = savedContent;
            
            // ProseMirror 이벤트 발생시키기 (내용 변경 감지를 위해)
            triggerInputEvent(proseMirrorDiv);
        }
    }
    
    // 입력 이벤트 트리거 함수
    function triggerInputEvent(element) {
        const event = new Event('input', {
            bubbles: true,
            cancelable: true,
        });
        element.dispatchEvent(event);
    }
    
    // 페이지 로드 시, 각 ProseMirror에 활성 프리셋 적용
    window.addEventListener('load', () => {
        setTimeout(checkForProseMirror, 1000); // 페이지 완전히 로드 후 실행
    });

})();
