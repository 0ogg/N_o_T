// ==UserScript==
// @name         깡갤 노벨 AI 원터치 번역
// @namespace    https://novelai.net/
// @version      2.0
// @description  novel ai 보조툴 (번역용 추출 + css 커스텀 프리셋)
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
}

#t-mini {
  display: flex;
  cursor: pointer;
  position: absolute;
  z-index: 9999;
  width: 30px;
  height: 30px;
  background: repeating-linear-gradient(-45deg, white, white 2px, RoyalBlue 2px, RoyalBlue 4px);
  border-radius: 50%;
  bottom: 20%;
  right: 15px;
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
  min-width: 240px;
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
  backdrop-filter: blur(50px);
}

#ns-color-code {
  color: var(--Thighlight-color) !important;
}

#ns-translation-method {
  background-color: var(--Tmain-color) !important;
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
}


`;
    //  <div class = "stockContainer"><button id="cssDel" class="setBtn">삭제</button><button id="cssSave" class="setBtn">저장</button><button id="cssExit" class="setBtn">창닫기</button></div>
    // style 요소에 CSS 코드를 추가합니다.
    styleElement.textContent = cssCode;
    // style 요소를 문서의 head에 추가합니다.
    document.head.appendChild(styleElement);


    // 로컬 스토리지에서 설정 값을 로드합니다.
    var textExtraction = localStorage.getItem('textExtraction') || '750';
    var italicActive = JSON.parse(localStorage.getItem('ns-italic')) || false;
    var boldActive = JSON.parse(localStorage.getItem('ns-bold')) || false;
    var highlightActive = JSON.parse(localStorage.getItem('ns-highlight')) || false;
    var colorCode = localStorage.getItem('colorCode') || 'ffffff';
    var tMainColor = localStorage.getItem('tMainColor');


    // 스킨 세팅
    document.documentElement.style.setProperty('--Tmain-color', tMainColor);
    document.documentElement.style.setProperty('--Thighlight-color', '#' + colorCode);


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
    function getExtractedText(length) {
        // 본문 내용 추출
        var proseMirrorDiv = document.querySelector('.ProseMirror');
        var paragraphs = proseMirrorDiv.querySelectorAll('p');
        var pText = '';
        for (var i = paragraphs.length - 1; i >= 0; i--) {
            var paragraphText = paragraphs[i].textContent;
            pText = paragraphText + '<br>' + pText;
            if (pText.length >= length) {
                break;
            }
        }

        // 하이라이트 처리
        updateTextStyle();
        var pattern = /"([^"]+)"/g;
        var newText = pText.replace(pattern, '<span class="hT">"$1"</span>');
        pText = newText;

        extractedText.innerHTML = pText;
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
            offsetX = e.clientX - tMini.getBoundingClientRect().right;
            offsetY = e.clientY - tMini.getBoundingClientRect().bottom;


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
            offsetX = touch.clientX - tMini.getBoundingClientRect().right;
            offsetY = touch.clientY - tMini.getBoundingClientRect().bottom;
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





    // 설정창
    var nsSettingsDiv = document.createElement('div');
    nsSettingsDiv.id = 'ns-settings-div';

    // 설정창의 내용을 구성합니다.
    nsSettingsDiv.innerHTML = `
    <h2>설정</h2>
    <label for="ns-text-extraction">텍스트 추출분량:</label>
    <input type="number" class="ns-input" id="ns-text-extraction" value="${textExtraction}"><br><br>
    <label for="ns-color-code">대사강조: </label>
    <div class="ns-setting-option-container">
      <label for="ns-italic">이탤릭 </label><input type="checkbox" class="ns-check" id="ns-italic" ${italicActive ? 'checked' : ''}>
      <label for="ns-bold">   볼드 </label><input type="checkbox" class="ns-check" id="ns-bold" ${boldActive ? 'checked' : ''}>
      <label for="ns-highlight">   하이라이트 </label><input type="checkbox" class="ns-check" id="ns-highlight" ${highlightActive ? 'checked' : ''}>
    </div>
    <label for="ns-color-code">하이라이트 색상: #</label>
    <input type="text" class="ns-input" id="ns-color-code" value="${colorCode}"><br><br>
    <label>Css 스토리지</label>
    <button id="cssPlus" class="setBtn">+ 추가</button>
    <div id="cssList"></div>
  `;
    // 생성한 설정창을 문서의 body에 추가합니다.
    document.body.appendChild(nsSettingsDiv);

    // css 스토리지
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
        <h2>CSS 스크립트</h2>
        <input type = "text" id = "cssNinput" class = "cssInputStyle" value = "${cssStock[num].name}">
        <textarea id="cssSinput" class = "cssInputStyle" rows="15" cols="50">${cssStock[num].css}</textarea>
        <small>주의: 스크립트에서 지정하지 않은 폰트/배경색은 테마 설정에서 변경해야 함.</small>
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
            stockSet(num)
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
        storedIndex = index;
        localStorage.setItem('selectedCssIndex', index);
        var stockStyleSheet = document.createElement('style');
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


    // 설정 오픈 버튼을 생성합니다.
    var nsSettingsButton = document.createElement('div');
    nsSettingsButton.id = 'ns-settings-button';

    // 설정 오픈 버튼을 문서의 body에 추가합니다.
    document.body.appendChild(nsSettingsButton);

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
    nsSettingsButton.addEventListener('click', toggleSettings);

    // 색추출 함수
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
        document.documentElement.style.setProperty('--Thighlight-color', '#' + colorCode);
    }

    // 설정 값 변경 시 로컬 스토리지에 저장
    document.getElementById('ns-text-extraction').addEventListener('input', function () {
        localStorage.setItem('textExtraction', this.value);
        textExtraction = localStorage.getItem('textExtraction');
    });

    document.getElementById('ns-color-code').addEventListener('input', function () {
        localStorage.setItem('colorCode', this.value);
        colorCode = localStorage.getItem('colorCode');
        document.documentElement.style.setProperty('--Thighlight-color', '#' + colorCode);
        updateTextStyle();
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
    function updateTextStyle() {

        italicActive = JSON.parse(localStorage.getItem('ns-italic'));
        boldActive = JSON.parse(localStorage.getItem('ns-bold'));
        highlightActive = JSON.parse(localStorage.getItem('ns-highlight'));
        const newItalic = italicActive ? 'italic' : 'normal';
        const newBold = boldActive ? 'bold' : 'normal';
        const newColor = highlightActive ? '#' + colorCode : 'inherit';

        document.documentElement.style.setProperty('--italic-active', newItalic);
        document.documentElement.style.setProperty('--bold-active', newBold);
        document.documentElement.style.setProperty('--highlight-color', newColor);
    }

    // 롱번역, 복사
    var longCopy = document.createElement('div');
    longCopy.id = 'ns-longCopy';
    longCopy.innerHTML = `
    <div id="btnLong" class="longCopyBtn">장문</div><div id="btnCopy" class="longCopyBtn">복사</div><div id="btnAuto" class="longCopyBtn">자동</div>
  `;
    tWide.appendChild(longCopy);
    tWide.appendChild(extractedText);
    var btnLong = document.querySelector('#btnLong');
    var btnCopy = document.querySelector('#btnCopy');
    var btnAuto = document.querySelector('#btnAuto');
    btnLong.addEventListener('click', function () {
        getExtractedText(10000);
    });
    btnCopy.addEventListener('click', function () {
        var tempInput = document.createElement('textarea');
        tempInput.value = extractedText.textContent;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
    });


    // 오토 : 개선필요 : 제네레이터 시에만 꽂히는 플래그 찾기
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




})();

