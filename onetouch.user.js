// ==UserScript==
// @name         깡갤 노벨 AI 원터치 번역
// @namespace    https://novelai.net/
// @version      2.2
// @description  novel ai 보조툴 (번역용 추출 + css 커스텀 프리셋) + 익명 변환 통합 + 딥엘 api 통합
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
    width: 240px;
    height: 500px;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--Tmain-color);
    padding: 20px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    display: none;
    z-index: 9999;
    backdrop-filter: blur(30px) !important;
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
}

.ns-input {
    width: 80px;
    padding: 2px;
    margin: 1px;
    backdrop-filter: blur(50px);
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

#setExit {
    width: 100%;
    margin: 0 auto;
    text-align: center;
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
        img.onload = function () {
            document.documentElement.style.setProperty('--tMini-url', 'url(' + nsIconUrl + ')');
        };
        img.onerror = function () {
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
        tColorEx();
        tWide.style.display = 'flex';
        getExtractedText(textExtraction);
    }

    // 확장창 클릭
    extractedText.addEventListener("click", tWideClick);
    function tWideClick () {
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
    var apiN = 0;
    function getExtractedText(length) {
        // 본문 내용 추출
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
        // api 번역
        if ((apiN == 0 || pText !== prevText) && (dplD || dplC !== 0)) {
            translateText(pText, function (translatedText) {
                apiN++
                prevText = pText;
                pText = translatedText;
                prevTrans = pText;
                continueProcessing(); // 번역이 완료된 후에 추가 로직 실행
            });
        } else {
            // 번역이 필요하지 않은 경우 바로 추가 로직 실행
            if (pText == prevText && (dplD || dplC !== 0)) pText = prevTrans + '\n<중복 요청>';
            prevText = pText;
            continueProcessing();
        }


        function continueProcessing() {
            // 하이라이트 처리
            updateTextStyle();
            var pattern = /"([^"]+)"/g;
            var newText = pText.replace(pattern, '<span class="hT">"$1"</span>');
            pText = '<p class="nm">' + newText.replace(/\n/g, '</p><p class="nm">') + '</p>';

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
        // 마우스 다운 이벤트가 발생하면 타임아웃을 설정하고 클릭을 길게 눌렀는지 확인합니다.
        dragTimeout = setTimeout(function () {
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
        const position = { right: parseFloat(tMini.style.right), bottom: parseFloat(tMini.style.bottom) };
        localStorage.setItem("tBallP", JSON.stringify(position));

        // 드래그 타임아웃 초기화
        clearTimeout(dragTimeout);
    }
    // 아이콘 이동 함수
    function handleIconTouchStart(e) {
        // 터치 다운 이벤트가 발생하면 타임아웃을 설정하고 클릭을 길게 눌렀는지 확인합니다.
        dragTimeout = setTimeout(function () {
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
        const position = { right: parseFloat(tMini.style.right), bottom: parseFloat(tMini.style.bottom) };
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



    // 설정창 탭 세번
    var tapCount = 0;
    var lastTapTime = 0;

    document.addEventListener("click", function() {
        var currentTime = new Date().getTime();
        var tapInterval = currentTime - lastTapTime;

        if (tapInterval < 500) {
            tapCount++;
        } else {
            tapCount = 0;
        }

        lastTapTime = currentTime;

        if (tapCount === 2) {
            // 세 번 탭할 때 수행할 동작
            toggleSettings();
            tapCount = 0; // 초기화
        }
    });


    // 설정창 ⚙️
    var nsSettingsDiv = document.createElement('div');
    nsSettingsDiv.id = 'ns-settings-div';

    // 설정창의 내용을 구성합니다.
    nsSettingsDiv.innerHTML = `
    <h2>설정</h2>
    <div id="setInMenu"></div>
    <div id="setInDiv"></div>
    <button id = "setExit" class="setBtn">창닫기</button>
  `;
    // 생성한 설정창을 문서의 body에 추가합니다.
    document.body.appendChild(nsSettingsDiv);


    // 설정 오픈 버튼을 생성합니다. ⛔️ 설정창 토글 버튼 비활성화
    //⛔️    var nsSettingsButton = document.createElement('div');
    //⛔️    nsSettingsButton.id = 'ns-settings-button';
    // 설정 오픈 버튼을 문서의 body에 추가합니다.
    //⛔️    document.body.appendChild(nsSettingsButton);

    // 설정창 열기/닫기를 처리하는 함수
    function toggleSettings() {
        if (nsSettingsDiv.style.display === 'none' || nsSettingsDiv.style.display === '') {
            tColorEx();
            nsSettingsDiv.style.display = 'block';
        } else {
            nsSettingsDiv.style.display = 'none';
        }
    }

    // 설정 오픈 버튼의 클릭 이벤트 핸들러 등록
    //⛔️    nsSettingsButton.addEventListener('click', toggleSettings);

    // 설정창 스타일 색추출 함수
    function tColorEx () {
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
    document.getElementById('setExit').addEventListener('click', function () {
        nsSettingsDiv.style.display = 'none';
    });

    // 설정창 세부 메뉴
    var settingList = [['기본',`
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
                       ['CSS',`
    <small>커스텀 css를 프리셋으로 저장</small><br>
    <button id="cssPlus" class="setBtn">+ 추가</button>
    <div id="cssList"></div>
    <button id = "stockBup" class="setBtn">📥백업 복사</button> <button id = "stockImport" class="setBtn">📤백업 등록</button>
    `],
                       ['변환',`
                       <h3>변환</h3>
    <div>
        <div style="padding-bottom: 10px;">
            <div style="padding-bottom: 10px;">
                <label for="find-text-input1">단어1: </label><br>
                <input type="text" id="find-text-input1" class="ns-input" value="Jane" />
                <label for="replace-text-input1"> → </label>
                <input type="text" id="replace-text-input1" class="ns-input" value="깡캐" />
            </div>
            <div>
                <label for="find-text-input2">단어2: </label><br>
                <input type="text" id="find-text-input2" class="ns-input" value="John" />
                <label for="replace-text-input2"> → </label>
                <input type="text" id="replace-text-input2" class="ns-input" value="깡통" />
            </div>
        </div>
        <button id="replace-button" class="setBtn">변환</button><br>
    </div>
                      `],
                       ['DeepL',`
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
        subBtn.addEventListener('click', function (index) {
            return function () {
                changeSet(index);
            };
        }(i));
        if(i != selectSetMenu) {
            subDiv.style.display = 'none';
            subBtn.style.filter = nonFilter;
            subBtn.style.fontWeight = 'normal';
        };
        setInMenu.appendChild(subBtn);
        setInDiv.appendChild(subDiv);
    }

    function changeSet(index = 0){
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
    document.getElementById('ns-text-extraction').addEventListener('input', function () {
        localStorage.setItem('textExtraction', this.value);
        textExtraction = localStorage.getItem('textExtraction');
    });


    document.getElementById('ns-italic').addEventListener('change', function () {
        localStorage.setItem('ns-italic', this.checked);
        updateTextStyle();
    });

    document.getElementById('ns-bold').addEventListener('change', function () {
        localStorage.setItem('ns-bold', this.checked);
        updateTextStyle();
    });

    document.getElementById('ns-highlight').addEventListener('change', function () {
        localStorage.setItem('ns-highlight', this.checked);
        updateTextStyle();
    });

    document.getElementById('ns-color-code').addEventListener('input', function () {
        localStorage.setItem('colorCode', this.value);
        colorCode = localStorage.getItem('colorCode');
        document.documentElement.style.setProperty('--Thighlight-color', colorCode);
        updateTextStyle();
    });
    document.getElementById('ns-icon-size').addEventListener('input', function () {
        if (this.value > 20) {
            localStorage.setItem('ns-icon-size', this.value);
            nsIconSize = this.value;
            document.documentElement.style.setProperty('--tMini-size', nsIconSize + 'px');
        }
    });
    document.getElementById('ns-icon-url').addEventListener('input', function () {
        // 입력된 URL 가져오기
        var imageUrl = this.value;

        // 이미지 객체 생성
        var img = new Image();

        // 이미지 로드에 성공했을 때
        img.onload = function () {
            localStorage.setItem('ns-icon-url', imageUrl);
            nsIconUrl = 'url(' + imageUrl + ')';
            document.documentElement.style.setProperty('--tMini-url', nsIconUrl);
        };

        // 이미지 로드에 실패했을 때
        img.onerror = function () {
            localStorage.setItem('ns-icon-url', imageUrl);
            var gradation = 'repeating-linear-gradient(-45deg, white, white 2px, RoyalBlue 2px, RoyalBlue 4px)';
            document.documentElement.style.setProperty('--tMini-url', gradation);
        };

        // 이미지 URL 설정
        img.src = imageUrl;
    });

    // 딥엘 설정
    document.getElementById('dplApi').addEventListener('input', function () {
        localStorage.setItem('dplApi', this.value);
        dplApi = localStorage.getItem('dplApi');
    });
    document.getElementById('dplD').addEventListener('change', function () {
        localStorage.setItem('dplD', this.checked);
        dplD = JSON.parse(localStorage.getItem('dplD'));
    });

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
    function stockW (num) {
        var stockDiv = document.createElement('div');
        stockDiv.id = 'stockDiv';
        stockDiv.innerHTML = `
        <input type = "text" id = "cssNinput" class = "cssInputStyle" value = "${cssStock[num].name}">
        <textarea id="cssSinput" class = "cssInputStyle" rows="15" cols="50">${cssStock[num].css}</textarea>
        <div class = "stockContainer"><button id="cssDel" class="setBtn">삭제</button><button id="cssSave" class="setBtn">저장</button><button id="cssExit" class="setBtn">창닫기</button>
</div>
        `;

        document.body.appendChild(stockDiv);
        document.getElementById('cssExit').addEventListener('click', function () {
            cssStock = JSON.parse(localStorage.getItem('cssStock'));
            stockDiv.parentNode.removeChild(stockDiv);
        });
        document.getElementById('cssSave').addEventListener('click', function () {
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

        document.getElementById('cssDel').addEventListener('click', function () {
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
            presetName.addEventListener('click', function (index) {
                return function () {
                    stockSet(index);
                };
            }(i));
            // 수정 버튼 생성
            var editButton = document.createElement('button');
            editButton.classList.add('setBtn', 'setBtn-edit');
            editButton.textContent = '⚙️';
            editButton.addEventListener('click', function (index) {
                return function () {
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
            cssStock[index] = { name: '프리셋 이름', css: 'css 코드' };
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
        document.getElementById('cssExit').addEventListener('click', function () {
            stockDiv.parentNode.removeChild(stockDiv);
        });
        //백업 임포트 버튼
        document.getElementById('cssSave').addEventListener('click', function () {
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



    // 번역창
    var longCopy = document.createElement('div');
    longCopy.id = 'ns-longCopy';
    longCopy.innerHTML = `
    <div id="btnLong" class="longCopyBtn">장문</div>
    <div id="btnCopy" class="longCopyBtn">복사</div>
    <div id="btnAuto" class="longCopyBtn">자동</div>
    <div id="btnSettings" class="longCopyBtn">설정</div>
  `;
    tWide.appendChild(longCopy);
    tWide.appendChild(extractedText);

    // 장문 추출
    var btnLong = document.querySelector('#btnLong');
    btnLong.addEventListener('click', function () {
        getExtractedText(10000);
    });

    //복사
    var btnCopy = document.querySelector('#btnCopy');
    btnCopy.addEventListener('click', function () {
        var tempInput = document.createElement('textarea');
        var copyText = extractedText.innerHTML;
        copyText = copyText.replace(/<br>/g, '\n');
        copyText = copyText.replace(/<[^>]*>/g, "");
        tempInput.value = copyText;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
    });


    // 오토 : 개선필요 : 제네레이터 시에만 꽂히는 플래그 찾기
    var btnAuto = document.querySelector('#btnAuto');
    var autoOn = false;
    btnAuto.addEventListener('click', function () {
        autoOn = !autoOn;
        if (autoOn) {
            btnAuto.classList.add('btnOn');
        } else {
            btnAuto.classList.remove('btnOn');
        }
    });
    document.addEventListener("transitionend", function(event) {
        if (!autoOn || !event.target.classList.contains("send")) return;
        tIconClick();
    });

    // 설정
    var btnSettings = document.querySelector('#btnSettings');
    btnSettings.addEventListener('click', toggleSettings);

    // 찾아서 수정
    const replaceButton = document.querySelector('#replace-button');

    replaceButton.addEventListener('click', () => {
        const findTextInput1 = '\\b' + document.querySelector('#find-text-input1').value + '\\b';
        const replaceTextInput1 = document.querySelector('#replace-text-input1').value;
        const findTextInput2 = '\\b' + document.querySelector('#find-text-input2').value + '\\b';
        const replaceTextInput2 = document.querySelector('#replace-text-input2').value;

        var source = extractedText.innerHTML;
        var newText = source.replaceAll(new RegExp(findTextInput1, 'g'), replaceTextInput1);
        newText = newText.replaceAll(new RegExp(findTextInput2, 'g'), replaceTextInput2);
        extractedText.innerHTML = newText;
    });


    // 딥엘 api 번역
    function translateText(text, callback) {
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
                callback(""); // 빈 문자열로 콜백 호출
            }
        })
            .catch((error) => {
            console.error("Translation error:", error);
            callback(""); // 빈 문자열로 콜백 호출
        });
    }

    // 번역하기 버튼

    const button = document.createElement("button");
    button.textContent = "번역하기";
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
        dplC = 1;
        getExtractedText(textExtraction);
    });

})();
