// ==UserScript==
// @name         깡갤 노벨 AI 원터치 번역
// @namespace    https://novelai.net/
// @version      0.1
// @description  우측 하단의 공 클릭 or ctrl+/ 로 원터치 번역 & 번역창 클릭으로 꺼짐
// @author       ㅇㅇ
// @match        https://novelai.net/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
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
    }
    #resizable-div {
      display: flex;
      cursor: pointer;
      position: absolute;
      z-index: 9999;
    }
    .Tmini {
      width: 30px;
      height: 30px;
      background: repeating-linear-gradient(-45deg, white, white 2px, RoyalBlue 2px, RoyalBlue 4px);
      border-radius: 50%;
      bottom: 20%;
      right: 15px;
    }
    .Twide {
      width: 350px;
      max-width: 95%;
      background: var(--Tmain-color);
      height: 100%;
      overflow: scroll;
      bottom: 0px;
      right: 0px;
      padding: 10px;
      transition: width 0.2s, height 0.2s;
    }
  `;

  // style 요소에 CSS 코드를 추가합니다.
  styleElement.textContent = cssCode;
  // style 요소를 문서의 head에 추가합니다.
  document.head.appendChild(styleElement);

  // 새로운 div 요소를 생성합니다.
  var resizableDiv = document.createElement('div');
  resizableDiv.id = 'resizable-div';
  resizableDiv.classList.add('Tmini');
  // 새로운 div 요소를 생성합니다.
  var extractedText = document.createElement('div');
  extractedText.id = 'extracted-text';
  // 생성한 요소들을 문서의 body에 추가합니다.
  document.body.appendChild(resizableDiv);
  resizableDiv.appendChild(extractedText);

  // 아이콘 확장 상태 인식 변수
  let isExpanded = false;

  // 아이콘 드래그 변수
  let offsetX, offsetY, isDragging = false;

  // 로컬 스토리지에서 위치 정보를 불러오고 적용합니다.
  const savedPosition = localStorage.getItem("tBallP");
  if (savedPosition) {
    const { right, bottom } = JSON.parse(savedPosition);
    resizableDiv.style.right = right + "px";
    resizableDiv.style.bottom = bottom + "px";
  }

  // 이벤트 핸들러 모음
  // 클릭 이벤트 핸들러를 추가합니다.
  resizableDiv.addEventListener('click', toggleSize);
  // 단축키 이벤트 핸들러
  document.addEventListener('keydown', handleKeyPress);

  // 아이콘 이동 관련 이벤트 핸들러 등록
  resizableDiv.addEventListener("mousedown", handleIconDragStart);
  resizableDiv.addEventListener("touchstart", handleIconTouchStart);

  document.addEventListener("mousemove", handleIconDrag);
  document.addEventListener("touchmove", handleIconTouchMove);

  document.addEventListener("mouseup", handleIconDragEnd);
  document.addEventListener("touchend", handleIconTouchEnd);

  // 클릭시 구동
  function toggleSize() {
    isExpanded = !isExpanded;

    if (isExpanded) {
      // 아이콘 이동 관련 이벤트 핸들러 제거
      resizableDiv.removeEventListener("mousedown", handleIconDragStart);
      resizableDiv.removeEventListener("touchstart", handleIconTouchStart);
      document.removeEventListener("mousemove", handleIconDrag);
      document.removeEventListener("touchmove", handleIconTouchMove);
      document.removeEventListener("mouseup", handleIconDragEnd);
      document.removeEventListener("touchend", handleIconTouchEnd);

      resizableDiv.classList.add('Twide');
      resizableDiv.classList.remove('Tmini');
      // 확장시 div 위치
      resizableDiv.style.right = 0 + "px";
      resizableDiv.style.bottom = 0 + "px";
      getExtractedText();
    } else {
      resizableDiv.classList.remove('Twide');
      resizableDiv.classList.add('Tmini');
      // 축소시 아이콘 위치 다시 불러오기
      const savedPosition = localStorage.getItem("tBallP");
      if (savedPosition) {
        const { right, bottom } = JSON.parse(savedPosition);
        resizableDiv.style.right = right + "px";
        resizableDiv.style.bottom = bottom + "px";
      }
      // 아이콘 이동 관련 이벤트 핸들러 등록
      resizableDiv.addEventListener("mousedown", handleIconDragStart);
      resizableDiv.addEventListener("touchstart", handleIconTouchStart);

      document.addEventListener("mousemove", handleIconDrag);
      document.addEventListener("touchmove", handleIconTouchMove);

      document.addEventListener("mouseup", handleIconDragEnd);
      document.addEventListener("touchend", handleIconTouchEnd);

      extractedText.innerHTML = '';
    }
  }

  function getExtractedText() {
     // 브라우저 번역 온


    // 테마 가로, 칼라값 추출
    var infobarElement = document.querySelector('.infobar');
    if (infobarElement) {
      var Tback = window.getComputedStyle(infobarElement).backgroundColor;

      // JavaScript 변수 값을 변경합니다.
      document.documentElement.style.setProperty('--Tmain-color', Tback);
    };
    // 본문 내용 추출
    var proseMirrorDiv = document.querySelector('.ProseMirror');
    var paragraphs = proseMirrorDiv.querySelectorAll('p');
    var pText = '';
    for (var i = paragraphs.length - 1; i >= 0; i--) {
      var paragraphText = paragraphs[i].textContent;
      pText = paragraphText + '<br>' + pText;

      // 분량 설정 - 750을 원하는 숫자로 바꾸시오. 설정한 숫자보다 오버해서 나올 수 있음.
      if (pText.length >= 750) {
        break;
      }
    }
    extractedText.innerHTML = pText;
  }

  // 단축키 동작
  function handleKeyPress(event) {
    if (event.ctrlKey && event.key === '/') {
      event.preventDefault();
      if (!isExpanded) {
        resizableDiv.classList.add('Twide',);
        resizableDiv.classList.remove('Tmini');

        // 확장시 div 위치
        resizableDiv.style.right = 0 + "px";
        resizableDiv.style.bottom = 0 + "px";
      }
      getExtractedText();
    }
  }

  // 아이콘 이동 함수
  function handleIconDragStart(e) {
    isDragging = true;
    // 드래그가 시작된 위치 저장
    offsetX = e.clientX - resizableDiv.getBoundingClientRect().right;
    offsetY = e.clientY - resizableDiv.getBoundingClientRect().bottom;

    // 커서 스타일 변경
    resizableDiv.style.cursor = "grabbing";
  }

  function handleIconDrag(e) {
    if (!isDragging) return;

    // 새로운 위치 계산
    const right = window.innerWidth - e.clientX - offsetX;
    const bottom = window.innerHeight - e.clientY - offsetY;

    // div를 새 위치로 이동
    resizableDiv.style.right = right + "px";
    resizableDiv.style.bottom = bottom + "px";

    // 이벤트 기본 동작 막기
    e.preventDefault();
  }

  function handleIconDragEnd() {
    isDragging = false;

    // 커서 스타일 복원
    resizableDiv.style.cursor = "grab";
    // 위치 정보를 로컬 스토리지에 저장
    const position = { right: parseFloat(resizableDiv.style.right), bottom: parseFloat(resizableDiv.style.bottom) };
    localStorage.setItem("tBallP", JSON.stringify(position));
  }

  function handleIconTouchStart(e) {
    isDragging = true;
    // 터치가 시작된 위치 저장
    const touch = e.touches[0];
    offsetX = touch.clientX - resizableDiv.getBoundingClientRect().right;
    offsetY = touch.clientY - resizableDiv.getBoundingClientRect().bottom;

    // 커서 스타일 변경
    resizableDiv.style.cursor = "grabbing";
  }

  function handleIconTouchMove(e) {
    if (!isDragging) return;

    // 터치 위치 계산
    const touch = e.touches[0];
    const right = window.innerWidth - touch.clientX - offsetX;
    const bottom = window.innerHeight - touch.clientY - offsetY;

    // div를 새 위치로 이동
    resizableDiv.style.right = right + "px";
    resizableDiv.style.bottom = bottom + "px";

    // 이벤트 기본 동작 막기
    e.preventDefault();
  }

  function handleIconTouchEnd() {
    isDragging = false;

    // 커서 스타일 복원
    resizableDiv.style.cursor = "grab";
    // 위치 정보를 로컬 스토리지에 저장
    const position = { right: parseFloat(resizableDiv.style.right), bottom: parseFloat(resizableDiv.style.bottom) };
    localStorage.setItem("tBallP", JSON.stringify(position));
  }

})();
