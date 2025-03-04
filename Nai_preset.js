// ==UserScript==
// @name         NovelAI 프롬프트 프리셋 매니저
// @namespace    http://tampermonkey.net/
// @version      1.51
// @description
// @author       Claude
// @match        https://novelai.net/image*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 스타일 정의
    const style = document.createElement('style');
    style.innerHTML = `
        :root {
            --panel-background-color: white; /* 기본 배경색, CSS 변수 정의 */
        }
        .preset-button {
            border: none;
            padding: 4px 8px;
            margin: 1px; /* 버튼 간격 1px로 조정 */
            border-radius: 0px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background-color 0.3s ease;
            background-color: #f0f0f0; /* 다른 버튼과 색 통일 */
        }
        .preset-button:hover {
             background-color: #e0e0e0;
        }
        .delete-button {
            width: 20px;
            height: 20px;
            padding: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8em;
            line-height: 1;
            background-color: #f0f0f0; /* 삭제 버튼 색 통일 */
        }
        .delete-button:hover {
            background-color: #e0e0e0;
        }
        .preset-input {
            width: 100%;
            padding: 6px;
            border: 1px solid #888;
            border-radius: 0px;
        }
        .preset-textarea {
            width: 100%;
            height: 70px;
            overflow-y: auto;
            border: 1px solid #888;
            border-radius: 0px;
            padding: 6px;
            font-family: monospace;
            font-size: 0.9em;
        }
        .preset-select-div {
            margin: 5px 0;
            width: 100%;
            border: 1px solid #888;
            border-radius: 0px;
            font-size: 0.9em;
            cursor: pointer;
            position: relative;
            background-color: white;
        }
        .preset-select-div .select-header {
            padding: 6px;
        }
        .preset-select-div .select-options {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            border: 1px solid #888;
            border-top: none;
            border-radius: 0px;
            background-color: white;
            z-index: 10;
            display: none;
            max-height: 150px;
            overflow-y: auto;
        }
        .preset-select-div .select-options.show {
            display: block;
        }
        .preset-select-div .select-option {
            padding: 6px;
            cursor: pointer;
            font-size: 0.9em;
        }
        .preset-select-div .select-option:hover {
            background-color: #f0f0f0;
        }
        .dialog {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            border: 1px solid #666;
            padding: 20px;
            z-index: 10000;
            max-width: 500px;
            min-width: 300px;
            max-height: 80%;
            overflow-y: auto;
            border-radius: 0px;
            box-shadow: 5px 5px 15px rgba(0,0,0,0.5);
            font-family: sans-serif;
            background-color: var(--panel-background-color); /* CSS 변수 적용 */
        }
        .ui-panel {
            position: fixed;
            top: 0px;
            right: 0px;
            width: 300px;
            height: 100vh;
            overflow-y: auto;
            border-left: 1px solid #666;
            padding: 15px;
            display: none;
            z-index: 9998;
            font-family: sans-serif;
            box-shadow: -3px 0px 10px rgba(0,0,0,0.3);
            background-color: var(--panel-background-color); /* CSS 변수 적용 */
        }
        .toggle-button {
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 50px;
            height: 50px;
            border: 1px solid #666;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            border-radius: 10%;
            font-size: 1.2em;
            backdrop-filter: blur(5px);
            background-color: var(--panel-background-color); /* CSS 변수 적용 */
        }
        .category-tab-button {
            flex-grow: 1;
            padding: 5px;
            border-bottom: none;
            border-radius: 0px 0px 0 0;
            margin-bottom: -1px;
            font-size: 0.9em;
            background-color: #f0f0f0; /* 탭 버튼 색 통일 */
            border: 1px solid #666;
            border-bottom: none; /* 하단 테두리 제거 */
            text-decoration: none !important; /* 밑줄 제거 */
            font-weight: normal; /* 기본 굵기 */
        }
        .category-tab-button.active {
            background-color: #ffffff; /* 활성 탭 배경색 */
            font-weight: bold; /* 활성 탭 굵게 */
        }
        .category-tab-button:hover {
            background-color: #e0e0e0;
        }
        .dialog-tab-button {
            padding: 8px 15px;
            border: 1px solid #888;
            border-radius: 0px;
            cursor: pointer;
            background-color: #f0f0f0;
            font-size: 0.9em;
            margin-right: 5px;
        }
        .dialog-tab-button.active {
            background-color: #ffffff;
            font-weight: bold;
        }
        .dialog-tab-button:hover {
             background-color: #e0e0e0;
        }
        /* 온/오프 스위치 스타일 */
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
            margin-right: 6px;
        }

        .toggle-switch input[type="checkbox"] {
            display: none; /* 체크박스 숨김 */
        }

        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 20px;
        }

        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }

        input:checked + .toggle-slider {
            background-color: #2196F3; /* 활성화 색상 */
        }

        input:focus + .toggle-slider {
            box-shadow: 0 0 1px #2196F3;
        }

        input:checked + .toggle-slider:before {
            transform: translateX(20px); /* 오른쪽으로 이동 */
        }
    `;
    document.head.appendChild(style);

    // 메인 데이터 구조
    const presetData = {
        main: getLocalStorage('main_presets', []),
        UC: getLocalStorage('UC_presets', []),
        character: getLocalStorage('character_presets', []),
        fullSetPresets: getLocalStorage('fullSet_Presets', [])
    };

    // 현재 활성화된 카테고리 탭
    let activeCategoryTab = 'main';
    let activeDialogCategoryTab = 'main'; // dialog 내부 탭

    // 현재 열려있는 내용 다이얼로그
    let currentContentDialog = null;

    // 이미지 링크 기능을 위한 Mutation observer
    let imageLinkObserver = null;

    // 현재 열려있는 select options div
    let currentSelectOptions = null;

    // 로컬 스토리지에서 데이터를 가져오는 헬퍼 함수
    function getLocalStorage(key, defaultValue) {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : defaultValue;
    }

    // 로컬 스토리지에 데이터 저장
    function saveData() {
        localStorage.setItem('main_presets', JSON.stringify(presetData.main));
        localStorage.setItem('UC_presets', JSON.stringify(presetData.UC));
        localStorage.setItem('character_presets', JSON.stringify(presetData.character));
        localStorage.setItem('fullSet_Presets', JSON.stringify(presetData.fullSetPresets));
    }

    // UI 전체 갱신 함수
    function refreshUI() {
        renderPresetPanel();
        renderSlotSelectBoxes();
        createSlotButtons();
    }

    // 메인 UI 컨테이너 생성 및 추가
    const createUI = () => {
        const toggleButton = document.createElement('div');
        toggleButton.id = 'preset-toggle';
        toggleButton.textContent = 'P';
        toggleButton.classList.add('toggle-button');
        document.body.appendChild(toggleButton);

        const presetPanel = document.createElement('div');
        presetPanel.id = 'preset-panel';
        presetPanel.classList.add('ui-panel');
        document.body.appendChild(presetPanel);

        toggleButton.addEventListener('click', () => {
            if (presetPanel.style.display === 'none') {
                presetPanel.style.display = 'block';
                renderSlotSelectBoxes();
                createSlotButtons(); // 버튼 생성 함수 호출
                renderPresetPanel();
            } else {
                presetPanel.style.display = 'none';
            }
        });

        return presetPanel;
    };
// 오류방지를 위해 미러링된 ProseMirror 배제를 위해 / 2 필수
    function getPromptAreas() {
        const allProseMirrors = Array.from(document.querySelectorAll('.ProseMirror'));
        const visibleCount = Math.floor(allProseMirrors.length / 2);
        return allProseMirrors.slice(0, visibleCount);
    }

    function renderSlotSelectBoxes() {
        const slotContainer = document.getElementById('slot-container');
        if (!slotContainer) return;

        slotContainer.innerHTML = '';

        const promptAreas = getPromptAreas();

        promptAreas.forEach((area, index) => {
            const slotType = index === 0 ? '메인' : index === 1 ? 'UC' : `캐릭터${index-1}`;
            const category = index === 0 ? 'main' : index === 1 ? 'UC' : 'character';
            const storageKey = `selected_preset_${category}_${index}`;
            // 로컬 스토리지에서 값을 가져올 때 nullish coalescing operator (??) 대신 || 사용
            // "" (빈 문자열)의 경우에도 기본값으로 처리하기 위함
            let selectedValue = localStorage.getItem(storageKey) || '';
            let selectedTitle = '';

            const selectDiv = document.createElement('div');
            selectDiv.classList.add('preset-select-div');

            const selectHeader = document.createElement('div');
            selectHeader.classList.add('select-header');
            selectHeader.textContent = selectedTitle || `${slotType} 프리셋 선택`;
            selectDiv.appendChild(selectHeader);

            const selectOptions = document.createElement('div');
            selectOptions.classList.add('select-options');
            selectDiv.appendChild(selectOptions);

            // "비우기" 옵션 추가
            const clearOption = document.createElement('div');
            clearOption.classList.add('select-option');
            clearOption.textContent = '비우기';
            clearOption.dataset.value = '';
            clearOption.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                selectHeader.textContent = `${slotType} 프리셋 선택`;
                selectedValue = value;
                localStorage.removeItem(storageKey); // 변경: removeItem으로 변경
                applyPresetToSlot(index, ''); // 내용 비우기
                selectOptions.classList.remove('show');
                currentSelectOptions = null; // 닫을 때 currentSelectOptions 초기화
            });
            selectOptions.appendChild(clearOption);


            presetData[category].forEach(preset => {
                const option = document.createElement('div');
                option.classList.add('select-option');
                option.textContent = preset.title;
                option.dataset.value = preset.content;
                if (preset.content === selectedValue) {
                    selectedTitle = preset.title;
                    selectHeader.textContent = selectedTitle;
                }
                option.addEventListener('click', (e) => {
                    const value = e.target.dataset.value;
                    const title = e.target.textContent;
                    selectHeader.textContent = title;
                    selectedValue = value;
                    localStorage.setItem(storageKey, value);
                    applyPresetToSlot(index, value);
                    selectOptions.classList.remove('show');
                    currentSelectOptions = null; // 닫을 때 currentSelectOptions 초기화
                });
                selectOptions.appendChild(option);
            });


            selectHeader.addEventListener('click', (e) => {
                e.stopPropagation(); // 이벤트 버블링 중지
                if (currentSelectOptions && currentSelectOptions !== selectOptions) {
                    currentSelectOptions.classList.remove('show');
                }
                selectOptions.classList.toggle('show');
                currentSelectOptions = selectOptions.classList.contains('show') ? selectOptions : null;
            });

            slotContainer.appendChild(selectDiv);
        });

        // document click event listener to close select options
        document.addEventListener('click', function(event) {
            if (currentSelectOptions && !event.target.closest('.preset-select-div')) {
                currentSelectOptions.classList.remove('show');
                currentSelectOptions = null;
            }
        });
    }


    function createSlotButtons() {
        const slotButtonsContainer = document.getElementById('slot-buttons-container');
        if (!slotButtonsContainer) return;

        slotButtonsContainer.innerHTML = ''; // 컨테이너 내부 초기화

        const savePromptsButton = document.createElement('button');
        savePromptsButton.textContent = '가져오기';
        savePromptsButton.classList.add('preset-button');
        savePromptsButton.style.marginRight = '5px';
        savePromptsButton.addEventListener('click', () => saveCurrentSet('area'));
        slotButtonsContainer.appendChild(savePromptsButton);

        const saveSetButton = document.createElement('button');
        saveSetButton.textContent = '⬇️ 에서 세트 저장';
        saveSetButton.classList.add('preset-button');
        saveSetButton.style.marginRight = '5px';
        saveSetButton.addEventListener('click', () => saveCurrentSet('slot'));
        slotButtonsContainer.appendChild(saveSetButton);
    }


    function createPromptInputDialog(dialogTitle, includesetFullTitle, promptContents = [], promptCountOverride = null, setPresetTitle = '') {
        const saveDialog = document.createElement('div');
        saveDialog.classList.add('dialog');

        let dialogContent = `<h3>${dialogTitle}</h3>`;
        dialogContent += `<hr style="margin: 8px 0; border: none; border-top: 1px solid #888;">`;

        if (includesetFullTitle) {
            dialogContent += `
                <div style="margin-bottom: 12px;">
                    <label for="final-preset-title" style="display: block; margin-bottom: 3px;">프리셋 세트 제목:</label>
                    <input type="text" id="final-preset-title" placeholder="세트 이름 입력시에만 추가됨" class="preset-input" value="${setPresetTitle}">
                </div>
                <div style="text-align: right; margin-bottom: 10px;">
                    <button id="save-prompts-confirm-top" class="preset-button">저장</button>
                </div>
            `;
        }

        // 입력 창 갯수 결정: 명시된 갯수 > promptContents 길이 > 현재 프롬프트 영역 갯수 순
        const promptAreas = getPromptAreas();
        const numPromptInputs = promptCountOverride !== null ? promptCountOverride : Math.max(promptContents.length, promptAreas.length);


        for (let i = 0; i < numPromptInputs; i++) {
            const slotType = i === 0 ? '메인' : i === 1 ? 'UC' : '캐릭터';
            const category = i === 0 ? 'main' : i === 1 ? 'UC' : 'character';
            dialogContent += `
                <div style="margin-bottom: 15px;">
                    <div style="margin-bottom: 3px; font-weight: bold;">${slotType} 프롬프트 ${i > 1 ? i-1 : ''}</div>
                    <input type="text" id="preset-title-${i}" placeholder="제목 입력시 개별 프리셋에도 추가 (선택 사항)" class="preset-input" style="margin-bottom: 6px;">
                    <textarea id="preset-content-${i}" class="preset-textarea">${promptContents[i] || ''}</textarea>
                    <input type="hidden" id="preset-category-${i}" value="${category}">
                </div>
            `;
        }


        dialogContent += `
            <div style="text-align: right; margin-top: 15px;">
                <button id="save-prompts-cancel" class="preset-button">취소</button>
                ${includesetFullTitle ? '<button id="save-prompts-confirm-bottom" class="preset-button">저장</button>' : ''}
            </div>
        `;

        saveDialog.innerHTML = dialogContent;

        return saveDialog;
    }


function saveCurrentSet(inputType) {
    if (currentContentDialog) {
        document.body.removeChild(currentContentDialog);
        currentContentDialog = null;
    }

    let initialPromptContents = [];
    if (inputType === 'slot') {
        const slotContainer = document.getElementById('slot-container');
        if (!slotContainer) return;
        const selectBoxes = Array.from(slotContainer.querySelectorAll('.preset-select-div .select-header'));
        const promptAreas = getPromptAreas(); // getPromptAreas() 호출

        initialPromptContents = selectBoxes.map((selectBox, index) => { // index 추가
            // 변경된 부분: promptAreas에서 해당 index의 요소의 textContent 사용
            return promptAreas[index] ? promptAreas[index].textContent : '';
        });
    } else if (inputType === 'area') {
        const promptAreas = getPromptAreas();
        initialPromptContents = promptAreas.map(area => area.textContent);
    }



        const saveDialog = createPromptInputDialog('프리셋 세트 저장', true, initialPromptContents);
        document.body.appendChild(saveDialog);
        currentContentDialog = saveDialog;

        const saveAction = () => {
            const setFullPresetTitle = document.getElementById('final-preset-title').value;
            const finalPrompts = [];
            let hasSetTitle = false;
            let hasIndividualTitle = false;

            if (setFullPresetTitle.trim() !== '') {
                hasSetTitle = true;
            }

            const promptAreas = getPromptAreas();
            for (let i = 0; i < promptAreas.length; i++) {
                const titleInput = document.getElementById(`preset-title-${i}`);
                const title = titleInput.value.trim();
                const category = document.getElementById(`preset-category-${i}`).value;
                const contentArea = document.getElementById(`preset-content-${i}`);
                const content = contentArea.value.trim();

                if (title !== '' && content !== '') {
                    if (category === 'main') {
                        presetData.main.push({title: title, content: content});
                    } else if (category === 'UC') {
                        presetData.UC.push({title: title, content: content});
                    } else if (category === 'character') {
                        presetData.character.push({title: title, content: content});
                    }
                    hasIndividualTitle = true;
                }
                finalPrompts.push(content);
            }


            if (hasSetTitle) { // 세트 제목이 있는 경우에만 저장
                presetData.fullSetPresets.push({
                    title: setFullPresetTitle,
                    prompts: finalPrompts
                });
            }

            if (hasSetTitle || hasIndividualTitle) {
                saveData();
                refreshUI(); // UI 전체 갱신
                showCategoryPresets(activeCategoryTab); // 수정: 현재 활성 탭 유지
            }

            document.body.removeChild(saveDialog);
            currentContentDialog = null;
        };


        document.getElementById('save-prompts-cancel').addEventListener('click', () => {
            document.body.removeChild(saveDialog);
            currentContentDialog = null;
        });
        document.getElementById('save-prompts-confirm-top').addEventListener('click', saveAction);
        document.getElementById('save-prompts-confirm-bottom').addEventListener('click', saveAction);

    }

    function getSlotTypeByIndex(index) {
        return index === 0 ? '메인' : index === 1 ? 'UC' : `캐릭터${index - 1}`;
    }


    function applyPresetToSlot(slotIndex, content) {
        if (!content === undefined) return;

        const promptAreas = getPromptAreas();
        if (slotIndex >= promptAreas.length) return;

        const targetArea = promptAreas[slotIndex];

        while (targetArea.firstChild) {
            targetArea.removeChild(targetArea.firstChild);
        }

        if (content) {
            const textNode = document.createTextNode(content);
            targetArea.appendChild(textNode);
        }


        const inputEvent = new Event('input', { bubbles: true });
        targetArea.dispatchEvent(inputEvent);
    }

    function applysetFullPreset(presetIndex) {
        const preset = presetData.fullSetPresets[presetIndex];
        const promptAreas = getPromptAreas();

        for (let i = 0; i < Math.min(promptAreas.length, preset.prompts.length); i++) {
            if (preset.prompts[i]) {
                while (promptAreas[i].firstChild) {
                    promptAreas[i].removeChild(promptAreas[i].firstChild);
                }

                const textNode = document.createTextNode(preset.prompts[i]);
                promptAreas[i].appendChild(textNode);

                const inputEvent = new Event('input', { bubbles: true });
                promptAreas[i].dispatchEvent(inputEvent);
            } else {
                while (promptAreas[i].firstChild) {
                    promptAreas[i].removeChild(promptAreas[i].firstChild);
                }
                const inputEvent = new Event('input', { bubbles: true });
                promptAreas[i].dispatchEvent(inputEvent);
            }
        }

        for (let i = preset.prompts.length; i < promptAreas.length; i++) {
            while (promptAreas[i].firstChild) {
                promptAreas[i].removeChild(promptAreas[i].firstChild);
            }

            const inputEvent = new Event('input', { bubbles: true });
            promptAreas[i].dispatchEvent(inputEvent);
        }
    }

    // 프리셋 삭제 (수정됨: 삭제 시 수정 창 닫기 기능 추가)
    function deletePreset(type, index) {
        if (confirm('정말로 삭제하시겠습니까?')) {
            const deletedPreset = presetData[type][index]; // 삭제될 프리셋 정보 저장
            presetData[type].splice(index, 1);
            saveData();

            // 삭제된 프리셋과 연결된 슬롯 정보 초기화
            const promptAreas = getPromptAreas();
            promptAreas.forEach((_, slotIndex) => {
                const category = slotIndex === 0 ? 'main' : slotIndex === 1 ? 'UC' : 'character';
                const storageKey = `selected_preset_${category}_${slotIndex}`;
                const selectedValue = localStorage.getItem(storageKey);
                if (selectedValue === deletedPreset.content) { // 슬롯이 삭제된 프리셋을 사용하고 있었다면
                    localStorage.removeItem(storageKey); // 슬롯의 선택 정보 초기화
                }
            });


            if (type === 'fullSetPresets') {
                if (currentContentDialog) { // 수정 창이 열려 있다면
                    document.body.removeChild(currentContentDialog); // 수정 창 닫기
                    currentContentDialog = null; // currentContentDialog 변수 초기화
                }
                refreshUI();
            } else {
                showCategoryPresets(activeCategoryTab);
                refreshUI();
            }
        }
    }

    function setupImageLinkFeature(enabled) {
        const mainPromptArea = getPromptAreas()[0];
        if (!mainPromptArea) return;

        const mainPromptText = mainPromptArea.textContent.trim();
        const images = document.querySelectorAll('img[alt]');

        images.forEach(img => {
            if (img.alt && mainPromptText.includes(img.alt.substring(0, 20))) {
                img.style.cursor = enabled ? 'pointer' : 'auto';
                img.onclick = enabled ? (e) => {
                    e.preventDefault();
                    window.open(img.src, '_blank');
                } : null;
            } else {
                img.style.cursor = 'auto';
                img.onclick = null;
            }
        });

        if (enabled) {
            if (!imageLinkObserver) {
                imageLinkObserver = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.addedNodes.length) {
                            makeImagesClickable();
                        }
                    });
                });
                imageLinkObserver.observe(document.body, { childList: true, subtree: true });
            }
        } else {
            if (imageLinkObserver) {
                imageLinkObserver.disconnect();
                imageLinkObserver = null;
            }
        }
    }

    function makeImagesClickable() {
        const mainPromptArea = getPromptAreas()[0];
        if (!mainPromptArea) return;

        const mainPromptText = mainPromptArea.textContent.trim();
        const images = document.querySelectorAll('img[alt]');

        images.forEach(img => {
            if (img.alt && mainPromptText.includes(img.alt.substring(0, 20))) {
                img.style.cursor = 'pointer';
                img.onclick = (e) => {
                    e.preventDefault();
                    window.open(img.src, '_blank');
                };
            }
        });
    }


    function renderPresetPanel() {
        const panel = document.getElementById('preset-panel');
        if (!panel) return;

        panel.innerHTML = '';

        // 이미지 링크 설정 컨테이너 수정: 체크박스 -> div 스위치
        const imageLinkContainer = document.createElement('div');
        imageLinkContainer.style.cssText = 'margin-bottom: 10px; display: flex; align-items: center;';

        // 토글 스위치 input (체크박스)
        const imageLinkCheckbox = document.createElement('input');
        imageLinkCheckbox.type = 'checkbox';
        imageLinkCheckbox.id = 'image-link-feature';
        imageLinkCheckbox.checked = getLocalStorage('image_link_enabled', false);

        // 토글 스위치 슬라이더 (div)
        const imageLinkSlider = document.createElement('span');
        imageLinkSlider.classList.add('toggle-slider');

        // 토글 스위치 label (div) - 체크박스 + 슬라이더 래핑
        const imageLinkSwitch = document.createElement('label');
        imageLinkSwitch.classList.add('toggle-switch');
        imageLinkSwitch.appendChild(imageLinkCheckbox);
        imageLinkSwitch.appendChild(imageLinkSlider);

        // 텍스트 라벨
        const imageLinkLabel = document.createElement('label');
        imageLinkLabel.htmlFor = 'image-link-feature';
        imageLinkLabel.textContent = '이미지 클릭시 새탭에서 열기';

        imageLinkContainer.appendChild(imageLinkSwitch); // 스위치 추가
        imageLinkContainer.appendChild(imageLinkLabel); // 텍스트 라벨 추가
        panel.appendChild(imageLinkContainer);

        // 이벤트 리스너 수정: 체크박스 change -> 스위치 label 클릭
        imageLinkSwitch.addEventListener('click', () => {
            imageLinkCheckbox.checked = !imageLinkCheckbox.checked; // 체크박스 상태 토글
            setupImageLinkFeature(imageLinkCheckbox.checked);
            localStorage.setItem('image_link_enabled', imageLinkCheckbox.checked);
        });


        // 버튼 컨테이너 추가
        const slotButtonsContainer = document.createElement('div');
        slotButtonsContainer.id = 'slot-buttons-container';
        slotButtonsContainer.style.cssText = 'margin-bottom: 10px;';
        panel.appendChild(slotButtonsContainer);
        createSlotButtons(); // 버튼 생성 함수 호출


        const slotContainer = document.createElement('div');
        slotContainer.id = 'slot-container';
        slotContainer.style.cssText = 'margin-bottom: 20px; border-bottom: 1px solid #666; padding-bottom: 10px;';
        panel.appendChild(slotContainer);

        renderSlotSelectBoxes();


        const fullSetPresetsContainer = document.createElement('div');
        fullSetPresetsContainer.style.cssText = 'margin-bottom: 10px; border-bottom: 1px solid #666; padding-bottom: 10px;';
const fullSetPresetsTitle = document.createElement('div');
fullSetPresetsTitle.textContent = '프리셋 세트';
fullSetPresetsTitle.style.cssText = 'font-weight: bold; margin-bottom: 10px; font-size: 1.1em;';
fullSetPresetsContainer.appendChild(fullSetPresetsTitle);
const fullSetPresetsGrid = document.createElement('div');
fullSetPresetsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 2px;';
let timer;
let isLongPress = false;
presetData.fullSetPresets.forEach((preset, index) => {
    const presetContainer = document.createElement('div');
    presetContainer.style.cssText = 'display: flex; align-items: center; margin-bottom: 1px;';
    const presetButton = document.createElement('button');
    presetButton.textContent = preset.title;
    presetButton.classList.add('preset-button');
    presetButton.style.cssText += 'flex-grow: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; padding: 6px; font-size: 0.9em;';
    
    // 클릭 이벤트
    presetButton.addEventListener('click', () => {
        if (isLongPress) {
            isLongPress = false;
            return;
        }
        applysetFullPreset(index);
    });
    
    // 마우스 이벤트 (PC)
    presetButton.addEventListener('mousedown', () => {
        isLongPress = false;
        timer = setTimeout(() => {
            isLongPress = true;
            showPresetContent(preset, index, true);
        }, 500);
    });
    presetButton.addEventListener('mouseup', () => {
        clearTimeout(timer);
    });
    presetButton.addEventListener('mouseleave', () => {
        clearTimeout(timer);
    });
    
    // 터치 이벤트 (모바일)
    presetButton.addEventListener('touchstart', (e) => {
        isLongPress = false;
        timer = setTimeout(() => {
            isLongPress = true;
            showPresetContent(preset, index, true);
        }, 500);
        // 기본 컨텍스트 메뉴 방지
        e.preventDefault();
    });
    presetButton.addEventListener('touchend', () => {
        if (!isLongPress) {
            clearTimeout(timer);
        }
    });
    presetButton.addEventListener('touchcancel', () => {
        clearTimeout(timer);
        isLongPress = false;
    });
    presetButton.addEventListener('touchmove', (e) => {
        // 터치 움직임이 있으면 롱프레스 취소
        clearTimeout(timer);
        isLongPress = false;
    });
    
    presetContainer.appendChild(presetButton);
    fullSetPresetsGrid.appendChild(presetContainer);
});

        fullSetPresetsContainer.appendChild(fullSetPresetsGrid);
        panel.appendChild(fullSetPresetsContainer);

        const addPresetButton = document.createElement('button');
        addPresetButton.textContent = '새 프롬프트 추가';
        addPresetButton.classList.add('preset-button');
        addPresetButton.style.cssText += 'margin-bottom: 10px; width: 100%; padding: 8px; font-size: 0.9em;';
        addPresetButton.addEventListener('click', showAddPresetDialog);
        panel.appendChild(addPresetButton);

        const tabsContainer = document.createElement('div');
        tabsContainer.style.cssText = 'display: flex; margin-bottom: 15px; border-bottom: 1px solid #666;';

        ['main', 'UC', 'character'].forEach(category => {
            const tab = document.createElement('button');
            tab.textContent = category === 'main' ? '메인' : category === 'UC' ? 'UC' : '캐릭터';
            tab.classList.add('preset-button', 'category-tab-button'); // category-tab-button 클래스 추가
            if (category === activeCategoryTab) {
                tab.classList.add('active'); // 활성 탭 스타일 적용
            }
            tab.dataset.category = category;
            tab.addEventListener('click', (e) => {
                activeCategoryTab = e.target.dataset.category;
                updateActiveTabHighlight(tabsContainer, activeCategoryTab); // 탭 하이라이트 업데이트
                showCategoryPresets(activeCategoryTab);
            });
            tabsContainer.appendChild(tab);
        });

        panel.appendChild(tabsContainer);

        const categoryPresetsContainer = document.createElement('div');
        categoryPresetsContainer.id = 'category-presets-container';
        // categoryPresetsContainer.style.cssText = 'max-height: 200px; overflow-y: auto;'; // 스크롤 제거
        panel.appendChild(categoryPresetsContainer);

        showCategoryPresets(activeCategoryTab);

        setupImageLinkFeature(imageLinkCheckbox.checked);
    }

    // 탭 하이라이트 업데이트 함수
    function updateActiveTabHighlight(tabsContainer, activeCategory) {
        tabsContainer.querySelectorAll('.category-tab-button').forEach(tab => {
            if (tab.dataset.category === activeCategory) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }


    function showCategoryPresets(category) {
        const container = document.getElementById('category-presets-container');
        if (!container) return;

        container.innerHTML = '';
        activeCategoryTab = category;

        const tabsContainer = document.querySelector('#preset-panel > div:nth-child(9)');
        if (tabsContainer) {
            updateActiveTabHighlight(tabsContainer, activeCategoryTab);
        }


        presetData[category].forEach((preset, index) => {
            const presetContainer = document.createElement('div');
            presetContainer.style.cssText = 'display: flex; align-items: center; margin-bottom: 6px;';

            const presetTitle = document.createElement('div');
            presetTitle.textContent = preset.title;
            presetTitle.style.cssText = 'flex-grow: 1; cursor: pointer; padding: 6px; border-radius: 0px; overflow: hidden; text-overflow: ellipsis; font-size: 0.9em;';
            presetTitle.addEventListener('click', () => {
                editPreset(category, index);
            });

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'X';
            deleteButton.classList.add('preset-button', 'delete-button');
            deleteButton.style.marginLeft = '5px';
            deleteButton.addEventListener('click', () => {
                deletePreset(category, index);
            });

            presetContainer.appendChild(presetTitle);
            presetContainer.appendChild(deleteButton);
            container.appendChild(presetContainer);
        });
    }

    function showAddPresetDialog() {
        if (currentContentDialog) {
            document.body.removeChild(currentContentDialog);
            currentContentDialog = null;
        }
        const dialog = document.createElement('div');
        dialog.classList.add('dialog');
        dialog.innerHTML = `
            <h3>새 프롬프트 추가</h3>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #888;">
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 3px;">카테고리:</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="dialog-tab-button ${activeDialogCategoryTab === 'main' ? 'active' : ''}" data-category="main">메인</button>
                    <button class="dialog-tab-button ${activeDialogCategoryTab === 'UC' ? 'active' : ''}" data-category="UC">UC</button>
                    <button class="dialog-tab-button ${activeDialogCategoryTab === 'character' ? 'active' : ''}" data-category="character">캐릭터</button>
                </div>
            </div>
            <div style="margin-bottom: 12px;">
                <label for="new-preset-title" style="display: block; margin-bottom: 3px;">제목:</label>
                <input type="text" id="new-preset-title" class="preset-input">
            </div>
            <div style="margin-bottom: 15px;">
                <label for="new-preset-content" style="display: block; margin-bottom: 3px;">내용:</label>
                <textarea id="new-preset-content" class="preset-textarea"></textarea>
            </div>
            <div style="text-align: right; margin-top: 15px;">
                <button id="add-preset-cancel" class="preset-button">취소</button>
                <button id="add-preset-confirm" class="preset-button">저장</button>
            </div>
        `;

        document.body.appendChild(dialog);
        currentContentDialog = dialog;

        // dialog 탭 버튼 이벤트
        dialog.querySelectorAll('.dialog-tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                activeDialogCategoryTab = e.target.dataset.category;
                dialog.querySelectorAll('.dialog-tab-button').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            });
        });


        document.getElementById('add-preset-cancel').addEventListener('click', () => {
            document.body.removeChild(dialog);
            currentContentDialog = null;
        });

        document.getElementById('add-preset-confirm').addEventListener('click', () => {
            const category = activeDialogCategoryTab;
            const title = document.getElementById('new-preset-title').value;
            const content = document.getElementById('new-preset-content').value;

            if (!title || !content) return;

            presetData[category].push({
                title: title,
                content: content
            });

            saveData();
            document.body.removeChild(dialog);
            currentContentDialog = null;
            showCategoryPresets(category); // 해당 카테고리 프리셋 목록 갱신
            refreshUI(); // UI 전체 갱신
        });
    }

    function editPreset(category, index) {
        if (currentContentDialog) {
            document.body.removeChild(currentContentDialog);
            currentContentDialog = null;
        }
        const preset = presetData[category][index];

        const dialog = document.createElement('div');
        dialog.classList.add('dialog');

        dialog.innerHTML = `
            <h3>프리셋 수정</h3>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #888;">
            <div style="margin-bottom: 12px;">
                <label for="edit-preset-title" style="display: block; margin-bottom: 3px;">제목:</label>
                <input type="text" id="edit-preset-title" class="preset-input" value="${preset.title}">
            </div>
            <div style="margin-bottom: 15px;">
                <label for="edit-preset-content" style="display: block; margin-bottom: 3px;">내용:</label>
                <textarea id="edit-preset-content" class="preset-textarea">${preset.content}</textarea>
            </div>
            <div style="text-align: right; margin-top: 15px;">
                <button id="edit-preset-cancel" class="preset-button">취소</button>
                <button id="edit-preset-confirm" class="preset-button">저장</button>
            </div>
        `;

        document.body.appendChild(dialog);
        currentContentDialog = dialog;


        document.getElementById('edit-preset-cancel').addEventListener('click', () => {
            document.body.removeChild(dialog);
            currentContentDialog = null;
        });

        document.getElementById('edit-preset-confirm').addEventListener('click', () => {
            const title = document.getElementById('edit-preset-title').value;
            const content = document.getElementById('edit-preset-content').value;

            if (!title || !content) return;

            presetData[category][index] = {
                title: title,
                content: content
            };

            saveData();
            document.body.removeChild(dialog);
            currentContentDialog = null;
            showCategoryPresets(category); // 해당 카테고리 프리셋 목록 갱신
            refreshUI(); // UI 전체 갱신
        });
    }

    function showPresetContent(preset, setFullPresetIndex = -1, editMode = false) {
        if (currentContentDialog) {
            document.body.removeChild(currentContentDialog);
            currentContentDialog = null;
        }

        const dialogTitle = editMode ? '프리셋 세트 수정' : preset.title;
        const includesetFullTitle = editMode;
        const promptAreasForDialog = editMode ? preset.prompts : [];
        // 수정 시에는 저장된 프리셋 갯수를 기준으로 입력창 생성
        const promptCountOverride = editMode ? preset.prompts.length : null;
        const dialog = createPromptInputDialog(dialogTitle, includesetFullTitle, promptAreasForDialog, promptCountOverride, editMode ? preset.title : '');

        if (!editMode) {
            const titleInputLabel = dialog.querySelector('label[for="final-preset-title"]');
            const titleInput = dialog.querySelector('#final-preset-title');
            if (titleInputLabel) titleInputLabel.style.display = 'none';
            if (titleInput) titleInput.style.display = 'none';

            const confirmTopButton = dialog.querySelector('#save-prompts-confirm-top');
            if (confirmTopButton) confirmTopButton.style.display = 'none';

            const cancelButton = dialog.querySelector('#save-prompts-cancel');
            cancelButton.textContent = '닫기';
        } else { // 수정 모드일 때 '세트 삭제' 버튼 추가
            const confirmButtonTop = dialog.querySelector('#save-prompts-confirm-top');
            const cancelButton = dialog.querySelector('#save-prompts-cancel');
            const buttonArea = confirmButtonTop.parentNode;

            const deleteSetButton = document.createElement('button');
            deleteSetButton.id = 'delete-set-button';
            deleteSetButton.textContent = '세트 삭제';
            deleteSetButton.classList.add('preset-button');
            deleteSetButton.style.marginRight = '5px'; // 저장 버튼과의 간격 조정
            buttonArea.insertBefore(deleteSetButton, confirmButtonTop); // '저장' 버튼 앞에 삽입

            deleteSetButton.addEventListener('click', () => {
                deletePreset('fullSetPresets', setFullPresetIndex); // setFullPresetIndex를 사용하여 삭제
            });
        }


        document.body.appendChild(dialog);
        currentContentDialog = dialog;


        const saveAction = () => {
            const newTitle = document.getElementById('final-preset-title').value;
            const newPrompts = [];
            let hasIndividualTitle = false; // 개별 프리셋 제목 유무 확인 변수 (수정)

            for (let i = 0; i < preset.prompts.length; i++) { // 저장된 프리셋 갯수만큼 순회
                const titleInput = document.getElementById(`preset-title-${i}`); // 제목 input 요소 가져오기 (수정)
                const title = titleInput.value.trim(); // 제목 값 가져오기 (수정)
                const content = document.getElementById(`preset-content-${i}`).value;
                 const category = document.getElementById(`preset-category-${i}`).value; // category 값 가져오기 (수정)


                if (title !== '' && content !== '') { // 개별 제목이 있을 때만 개별 프리셋 저장 (수정)
                    if (category === 'main') {
                        presetData.main.push({title: title, content: content});
                    } else if (category === 'UC') {
                        presetData.UC.push({title: title, content: content});
                    } else if (category === 'character') {
                        presetData.character.push({title: title, content: content});
                    }
                    hasIndividualTitle = true; // 개별 제목이 하나라도 있으면 true로 설정 (수정)
                }
                newPrompts.push(content);
            }

            presetData.fullSetPresets[setFullPresetIndex] = {
                title: newTitle || preset.title,
                prompts: newPrompts
            };
            saveData();
            refreshUI(); // UI 전체 갱신
            showCategoryPresets(activeCategoryTab); // 수정: 현재 탭 유지
            document.body.removeChild(dialog); // 수정 완료 후 다이얼로그 닫기
            currentContentDialog = null; // currentContentDialog 변수 초기화
        };


        const confirmButtonBottom = dialog.querySelector('#save-prompts-confirm-bottom');
        if (confirmButtonBottom) {
            confirmButtonBottom.addEventListener('click', saveAction);
        }
        const confirmButtonTop = dialog.querySelector('#save-prompts-confirm-top');
         if (confirmButtonTop) {
            confirmButtonTop.addEventListener('click', saveAction);
        }


        const cancelButton = dialog.querySelector('#save-prompts-cancel');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                document.body.removeChild(dialog);
                currentContentDialog = null;
            });
        }

    }


    function init() {
        const panel = createUI();

        // 버튼 컨테이너 초기 생성 및 추가
        const slotButtonsContainer = document.createElement('div');
        slotButtonsContainer.id = 'slot-buttons-container';
        panel.insertBefore(slotButtonsContainer, panel.firstChild); // slot-container 앞에 버튼 컨테이너 삽입
        createSlotButtons(); // 버튼 생성

        renderPresetPanel();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length || mutation.removedNodes.length) {
                    for (let i = 0; i < mutation.addedNodes.length; i++) {
                        const node = mutation.addedNodes[i];
                        if (node.classList && node.classList.contains('ProseMirror')) {
                            renderSlotSelectBoxes();
                            return;
                        }
                    }

                    for (let i = 0; i < mutation.removedNodes.length; i++) {
                        const node = mutation.removedNodes[i];
                        if (node.classList && node.classList.contains('ProseMirror')) {
                            renderSlotSelectBoxes();
                            return;
                        }
                    }
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // DOMContentLoaded 이벤트 리스너 등록
    window.addEventListener('DOMContentLoaded', () => {
        init();
    });

})();
