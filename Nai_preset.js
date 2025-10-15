// ==UserScript==
// @name         NovelAI 프롬프트 프리셋 매니저 v2.0.4
// @namespace    http://tampermonkey.net/
// @version      2.0.4
// @description  NovelAI의 프롬프트 관리를 위한 섹션 기반 UI, 프롬프트 부분 교체, 롱프레스 수정 등 고급 기능을 제공합니다.
// @author       Claude (Based on original), Gemini (Refactoring)
// @match        https://novelai.net/image*
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    // =================================================================================
    // 스타일 정의
    // =================================================================================
    const style = document.createElement('style');
    style.innerHTML = `
        /* ★★★ QR 스크립트처럼 :root에서 tMainColor를 참조하도록 수정 ★★★ */
        :root {
            --panel-background-color: ${localStorage.getItem('tMainColor') || 'white'};
        }
        /* ★★★ 모든 background-color 속성 제거 및 CSS 변수 적용 ★★★ */
        .p-manager-button { border: none; padding: 4px 8px; margin: 1px; border-radius: 0px; cursor: pointer; font-size: 0.9em; transition: background-color 0.3s ease; }
        /* .p-manager-button:hover 스타일은 상속받은 스타일을 따르므로 제거하거나 투명도 조절로 변경 가능. 일단 제거. */
        .p-manager-input, .p-manager-textarea { width: 100%; box-sizing: border-box; padding: 6px; border: 1px solid #888; border-radius: 0px; background: transparent; }
        .p-manager-dialog, .p-manager-ui-panel, .p-manager-toggle-button {
            background-color: var(--panel-background-color);
        }
        .p-manager-button { color: var(--highlight-color, royalblue); }
        .p-manager-dialog { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); border: 1px solid #666; padding: 20px; z-index: 10000; max-width: 500px; min-width: 350px; max-height: 80%; overflow-y: auto; border-radius: 0px; box-shadow: 5px 5px 15px rgba(0,0,0,0.5); font-family: sans-serif; }
        .p-manager-dialog-section { margin-bottom: 15px; }
        .p-manager-dialog-label { display: block; margin-bottom: 3px; font-weight: bold; }
        .p-manager-ui-panel { position: fixed; top: 0px; right: 0px; width: 300px; height: 100vh; overflow-y: auto; border-left: 1px solid #666; padding: 15px; display: none; z-index: 9998; font-family: sans-serif; box-shadow: -3px 0px 10px rgba(0,0,0,0.3); box-sizing: border-box; }
        .p-manager-toggle-button { position: fixed; bottom: 10px; right: 10px; width: 50px; height: 50px; border: 1px solid #666; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 9999; border-radius: 10%; font-size: 1.2em; backdrop-filter: blur(5px); }
        .p-manager-section { border-bottom: 1px solid #ccc; margin-bottom: 15px; padding-bottom: 10px; }
        .p-manager-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .p-manager-section-title { font-weight: bold; font-size: 1.1em; }
        .p-manager-preset-grid { display: flex; flex-wrap: wrap; gap: 4px; }
        .p-manager-preset-button { flex-grow: 0; white-space: nowrap; text-align: left; padding: 6px; font-size: 0.9em; }
        .p-manager-toggle-switch { position: relative; display: inline-block; width: 40px; height: 20px; margin-right: 6px; }
        .p-manager-toggle-switch input[type="checkbox"] { display: none; }
        .p-manager-toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
        .p-manager-toggle-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .p-manager-toggle-slider { background-color: var(--highlight-color, royalblue); }
        input:checked + .p-manager-toggle-slider:before { transform: translateX(20px); }
        #image-mirror-panel { position: fixed; top: 0; right: 0; width: 1300px; height: 100vh; background: rgba(0, 0, 0, 0.85); z-index: 9999; overflow-y: auto; overflow-x: hidden; box-shadow: -2px 0 10px rgba(0, 0, 0, 0.5); transition: transform 0.3s ease; }
        #image-mirror-panel.hidden { transform: translateX(1000px); }
        #image-mirror-panel img { display: block; max-width: 100%; height: auto; cursor: pointer; }
    `;
    document.head.appendChild(style);

    // =================================================================================
    // 데이터 구조 및 관리
    // =================================================================================
    const getLocalStorage = (key, defaultValue) => {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : defaultValue;
    };

    const presetData = {
        settings: getLocalStorage('p_manager_settings', {
            delimiter: '|| | ||',
            autoSave: true,
            largeView: false
        }),
        fullSet: getLocalStorage('p_manager_fullSet_presets', []),
        artist: getLocalStorage('p_manager_artist_presets', []),
        quality: getLocalStorage('p_manager_quality_presets', []),
        main: getLocalStorage('p_manager_main_presets', []),
        UC: getLocalStorage('p_manager_UC_presets', []),
        character: getLocalStorage('p_manager_character_presets', [])
    };

    const saveData = () => {
        Object.keys(presetData).forEach(key => {
            if (key !== 'settings') {
                localStorage.setItem(`p_manager_${key}_presets`, JSON.stringify(presetData[key]));
            }
        });
        localStorage.setItem('p_manager_settings', JSON.stringify(presetData.settings));
    };

    // =================================================================================
    // ★★★ 2. 여기에 색상 추출 함수 추가 ★★★
    // =================================================================================
    const extractAndApplyThemeColor = () => {
        const colorSourceElement = document.querySelector('body:nth-child(2) > div:nth-child(2) > div:nth-child(2) > div:nth-child(3) > div:nth-child(3) > div:nth-child(1) > div:nth-child(1)');
        if (colorSourceElement) {
            const mainColor = window.getComputedStyle(colorSourceElement).backgroundColor;
            if (mainColor) {
                document.documentElement.style.setProperty('--panel-background-color', mainColor);
                // QR 스크립트와 호환을 위해 tMainColor에 저장
                localStorage.setItem('tMainColor', mainColor);
            }
        }
    };
    // =================================================================================
    // DOM 및 NovelAI 인터페이스 제어
    // =================================================================================
    const getPromptAreas = () => {
        const allProseMirrors = Array.from(document.querySelectorAll('.ProseMirror'));
        const visibleCount = Math.floor(allProseMirrors.length / 2);
        return allProseMirrors.slice(0, visibleCount);
    };

    const getPromptAreaContent = (index) => {
        const areas = getPromptAreas();
        return areas[index] ? areas[index].textContent : '';
    };

    const setPromptAreaContent = (index, content) => {
        const areas = getPromptAreas();
        if (!areas[index]) return;
        const targetArea = areas[index];

        while (targetArea.firstChild) {
            targetArea.removeChild(targetArea.firstChild);
        }

        if (content) {
            targetArea.appendChild(document.createTextNode(content));
        }

        targetArea.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    };

    // =================================================================================
    // 핵심 로직: 프리셋 적용
    // =================================================================================
    const applyPreset = (category, content) => {
        if (presetData.settings.autoSave) {
            let oldContent = '';
            let targetCategory = category.startsWith('character') ? 'character' : category;
            const charIndex = category.startsWith('character') ? parseInt(category.replace('character', ''), 10) : -1;

            if (charIndex !== -1) {
                oldContent = getPromptAreaContent(2 + charIndex).trim();
            } else if (['artist', 'quality', 'main'].includes(category)) {
                const parts = getPromptAreaContent(0).split(presetData.settings.delimiter);
                const partIndex = ['artist', 'quality', 'main'].indexOf(category);
                oldContent = (parts[partIndex] || '').trim();
            } else if (category === 'UC') {
                oldContent = getPromptAreaContent(1).trim();
            }

            if (oldContent && !presetData[targetCategory].some(p => p.content === oldContent)) {
                // --- 제목 생성 로직 시작 ---
                let titleBase = oldContent.trim();

                // 1. 가장 앞에 오는 boy, girl, other 단어 (및 뒤따르는 공백/쉼표) 제거 (대소문자 무시)
                titleBase = titleBase.replace(/^(boy|girl|other)\b\s*,*\s*/i, '');

                // 2. 그 외, 가장 앞에 남은 쉼표나 공백이 있다면 모두 제거
                titleBase = titleBase.replace(/^[, ]+/, '');

                // 3. 앞에서부터 10글자만 남김
                let finalTitle = titleBase.substring(0, 10);

                // 4. 모든 처리 후 제목이 비어있다면, 시간으로 된 기본 제목 사용
                if (!finalTitle) {
                    finalTitle = `AutoSave ${new Date().toLocaleTimeString()}`;
                }
                // --- 제목 생성 로직 끝 ---

                presetData[targetCategory].push({
                    title: finalTitle,
                    content: oldContent
                });
                saveData();
            }
        }

        if (category.startsWith('character')) {
            const charIndex = parseInt(category.replace('character', ''), 10);
            setPromptAreaContent(2 + charIndex, content);
        } else if (category === 'UC') {
            setPromptAreaContent(1, content);
        } else {
            const mainContent = getPromptAreaContent(0);
            let parts = mainContent.split(presetData.settings.delimiter);
            while (parts.length < 3) parts.push('');
            const partIndex = ['artist', 'quality', 'main'].indexOf(category);
            parts[partIndex] = content;
            setPromptAreaContent(0, parts.join(presetData.settings.delimiter));
        }
        renderPanel();
    };

    const applyFullSet = (preset) => {
        if (!preset || !preset.prompts) return;
        const mainPrompt = [preset.prompts.artist || '', preset.prompts.quality || '', preset.prompts.main || ''].join(presetData.settings.delimiter);
        setPromptAreaContent(0, mainPrompt);
        setPromptAreaContent(1, preset.prompts.UC || '');
        (preset.prompts.character || []).forEach((charPrompt, i) => {
            setPromptAreaContent(i + 2, charPrompt);
        });
    };

    // =================================================================================
    // ★★★ 1. 여기에 새로운 유틸리티 함수 추가 ★★★
    // =================================================================================
    const Utils = {
        copyToClipboard: (text) => {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('클립보드에 복사되었습니다.');
        },
        downloadFile: (content, fileName, mimeType) => {
            const blob = new Blob([content], {
                type: mimeType
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };
    // =================================================================================
    // ★★★ 2. 여기에 백업/복원 로직 추가 ★★★
    // =================================================================================
    const backupRestore = {
        STORAGE_KEYS: [
            'p_manager_settings',
            'p_manager_fullSet_presets',
            'p_manager_artist_presets',
            'p_manager_quality_presets',
            'p_manager_main_presets',
            'p_manager_UC_presets',
            'p_manager_character_presets'
        ],

        backup: function() {
            const backupData = {};
            this.STORAGE_KEYS.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    backupData[key] = value;
                }
            });
            return JSON.stringify(backupData, null, 2);
        },

        restore: function(jsonString) {
            try {
                const dataToRestore = JSON.parse(jsonString);
                let restoredKeyCount = 0;
                this.STORAGE_KEYS.forEach(key => {
                    if (dataToRestore[key] !== undefined) {
                        localStorage.setItem(key, dataToRestore[key]);
                        restoredKeyCount++;
                    }
                });
                if (restoredKeyCount === 0) {
                    alert('복원할 유효한 설정 데이터를 찾지 못했습니다. 파일이 올바른지 확인하세요.');
                    return;
                }
                alert(`설정을 복원했습니다. 모든 변경사항을 적용하려면 페이지를 새로고침하세요.`);
                location.reload(); // 즉시 새로고침하여 변경사항 적용
            } catch (e) {
                console.error('설정 복원 실패:', e);
                alert('설정 복원에 실패했습니다. JSON 형식이 올바르지 않거나 파일이 손상되었습니다.');
            }
        }
    };

    // =================================================================================
    // UI 렌더링
    // =================================================================================
    let currentDialog = null;

    const closeDialog = () => {
        if (currentDialog) {
            document.body.removeChild(currentDialog);
            currentDialog = null;
        }
    };

    const createDialog = (title, content, buttons) => {
        closeDialog();
        const dialog = document.createElement('div');
        dialog.className = 'p-manager-dialog';
        let html = `<h3>${title}</h3><hr style="margin: 8px 0; border: none; border-top: 1px solid #888;">`;
        html += content;
        html += `<div style="text-align: right; margin-top: 15px;">`;
        buttons.forEach(btn => {
            const style = btn.type === 'delete' ? 'background-color: #f8d7da; margin-right: auto;' : 'margin-left: 5px;';
            html += `<button id="${btn.id}" class="p-manager-button" style="${style}">${btn.text}</button>`;
        });
        html += `</div>`;
        dialog.innerHTML = html;
        document.body.appendChild(dialog);
        currentDialog = dialog;

        buttons.forEach(btn => {
            document.getElementById(btn.id).addEventListener('click', btn.onClick);
        });
    };

    const showEditDialog = (category, index) => {
        const preset = presetData[category][index];
        createDialog('프리셋 수정',
            `<div class="p-manager-dialog-section">
                <label class="p-manager-dialog-label">제목:</label>
                <input type="text" id="edit-preset-title" class="p-manager-input" value="${preset.title}">
            </div>
            <div class="p-manager-dialog-section">
                <label class="p-manager-dialog-label">내용:</label>
                <textarea id="edit-preset-content" class="p-manager-textarea">${preset.content}</textarea>
            </div>`,
            [{
                id: 'edit-preset-delete',
                text: '삭제',
                type: 'delete',
                onClick: () => {
                    if (confirm('정말로 삭제하시겠습니까?')) {
                        presetData[category].splice(index, 1);
                        saveData();
                        renderPanel();
                        closeDialog();
                    }
                }
            }, {
                id: 'edit-preset-cancel',
                text: '취소',
                onClick: closeDialog
            }, {
                id: 'edit-preset-confirm',
                text: '저장',
                onClick: () => {
                    const newTitle = document.getElementById('edit-preset-title').value.trim();
                    const newContent = document.getElementById('edit-preset-content').value;
                    if (!newTitle) return;
                    presetData[category][index] = {
                        title: newTitle,
                        content: newContent
                    };
                    saveData();
                    renderPanel();
                    closeDialog();
                }
            }]
        );
    };

    const showAddDialog = (category, defaultContent = '') => {
        createDialog('새 프리셋 추가',
            `<div class="p-manager-dialog-section">
                <label class="p-manager-dialog-label">제목:</label>
                <input type="text" id="add-preset-title" class="p-manager-input">
            </div>
            <div class="p-manager-dialog-section">
                <label class="p-manager-dialog-label">내용:</label>
                <textarea id="add-preset-content" class="p-manager-textarea">${defaultContent}</textarea>
            </div>`,
            [{
                id: 'add-preset-cancel',
                text: '취소',
                onClick: closeDialog
            }, {
                id: 'add-preset-confirm',
                text: '저장',
                onClick: () => {
                    const title = document.getElementById('add-preset-title').value.trim();
                    const content = document.getElementById('add-preset-content').value;
                    if (!title) return;
                    let targetCategory = category.startsWith('character') ? 'character' : category;
                    presetData[targetCategory].push({
                        title,
                        content
                    });
                    saveData();
                    renderPanel();
                    closeDialog();
                }
            }]
        );
    };

    const showSettingsDialog = () => {
        const dialogContent = `
            <div class="p-manager-dialog-section">
                <label class="p-manager-dialog-label">메인 프롬프트 구분자:</label>
                <input type="text" id="settings-delimiter" class="p-manager-input" value="${presetData.settings.delimiter}">
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <label class="p-manager-toggle-switch">
                    <input type="checkbox" id="settings-auto-save" ${presetData.settings.autoSave ? 'checked' : ''}>
                    <span class="p-manager-toggle-slider"></span>
                </label>
                <label for="settings-auto-save">프리셋 전환 시 기존 프롬프트 자동 저장</label>
            </div>

            <hr style="margin: 20px 0; border-color: rgba(0,0,0,0.1);">

            <div class="p-manager-dialog-section">
                <h4 style="margin-top:0; margin-bottom: 10px;">데이터 관리</h4>
                <div style="display: flex; gap: 10px;">
                    <button id="export-settings-btn" class="p-manager-button">설정 내보내기</button>
                    <button id="import-settings-btn" class="p-manager-button">설정 가져오기</button>
                </div>
            </div>
        `;

        createDialog('설정', dialogContent, [{
            id: 'settings-cancel',
            text: '닫기', // '취소' -> '닫기'로 변경
            onClick: closeDialog
        }, {
            id: 'settings-confirm',
            text: '저장',
            onClick: () => {
                presetData.settings.delimiter = document.getElementById('settings-delimiter').value;
                presetData.settings.autoSave = document.getElementById('settings-auto-save').checked;
                saveData();
                closeDialog();
            }
        }]);

        // --- 내보내기/가져오기 버튼에 이벤트 리스너 추가 ---
        document.getElementById('export-settings-btn').addEventListener('click', () => {
            const backupJson = backupRestore.backup();
            const exportDialogContent = `
                <p style="font-size: 0.9em; margin-top:0;">아래 텍스트를 복사하거나 파일로 다운로드하여 설정을 백업하세요.</p>
                <textarea readonly class="p-manager-textarea" style="height: 200px;">${backupJson}</textarea>
            `;
            createDialog('설정 내보내기', exportDialogContent, [{
                    id: 'export-close',
                    text: '닫기',
                    onClick: closeDialog
                },
                {
                    id: 'export-copy',
                    text: '클립보드에 복사',
                    onClick: () => Utils.copyToClipboard(backupJson)
                },
                {
                    id: 'export-download',
                    text: '파일로 다운로드',
                    onClick: () => Utils.downloadFile(backupJson, `preset_manager_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
                }
            ]);
        });

        document.getElementById('import-settings-btn').addEventListener('click', () => {
            const importDialogContent = `
                <p style="font-size: 0.9em; margin-top:0;">백업한 JSON 텍스트를 아래에 붙여넣으세요.<br><b>주의: 현재 설정은 덮어쓰여집니다.</b></p>
                <textarea id="import-json-area" class="p-manager-textarea" style="height: 200px;" placeholder="여기에 백업 데이터를 붙여넣으세요..."></textarea>
            `;
            createDialog('설정 가져오기', importDialogContent, [{
                    id: 'import-cancel',
                    text: '취소',
                    onClick: closeDialog
                },
                {
                    id: 'import-restore',
                    text: '복원하기',
                    onClick: () => {
                        const jsonString = document.getElementById('import-json-area').value;
                        if (jsonString.trim()) {
                            if (confirm('현재 설정을 덮어쓰고 복원하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                                backupRestore.restore(jsonString);
                            }
                        } else {
                            alert('붙여넣은 데이터가 없습니다.');
                        }
                    }
                }
            ]);
        });
    };

    const showSaveCurrentDialog = () => {
        const mainParts = getPromptAreaContent(0).split(presetData.settings.delimiter);
        while (mainParts.length < 3) mainParts.push('');
        const characterAreas = getPromptAreas().slice(2);
        let dialogContent = `
            <div class="p-manager-dialog-section">
                <label class="p-manager-dialog-label">프리셋 세트 제목 (입력 시 세트로 저장):</label>
                <input type="text" id="save-set-title" class="p-manager-input" placeholder="세트 이름">
            </div><hr>
            <p style="font-size:0.9em; margin-top:-5px; margin-bottom:10px;">각 항목에 제목을 입력하면 개별 프리셋으로도 저장됩니다.</p>`;
        const fields = [{
                key: 'artist',
                title: '작가',
                content: mainParts[0]
            },
            {
                key: 'quality',
                title: '퀄리티 태그',
                content: mainParts[1]
            },
            {
                key: 'main',
                title: '메인 프롬프트',
                content: mainParts[2]
            },
            {
                key: 'UC',
                title: 'UC 프롬프트',
                content: getPromptAreaContent(1)
            }
        ];
        characterAreas.forEach((_, i) => {
            fields.push({
                key: `character${i}`,
                title: `캐릭터 ${i+1}`,
                content: getPromptAreaContent(i + 2)
            });
        });
        fields.forEach(field => {
            dialogContent += `
                <div class="p-manager-dialog-section">
                    <label class="p-manager-dialog-label">${field.title}</label>
                    <input type="text" id="save-title-${field.key}" class="p-manager-input" placeholder="개별 프리셋 제목 (선택)" style="margin-bottom: 4px;">
                    <textarea id="save-content-${field.key}" class="p-manager-textarea" style="height: 60px;">${field.content}</textarea>
                </div>`;
        });
        createDialog('현재 프롬프트 저장', dialogContent, [{
            id: 'save-all-cancel',
            text: '취소',
            onClick: closeDialog
        }, {
            id: 'save-all-confirm',
            text: '저장',
            onClick: () => {
                const fullSetTitle = document.getElementById('save-set-title').value.trim();
                const savedPrompts = {};
                fields.forEach(field => {
                    const title = document.getElementById(`save-title-${field.key}`).value.trim();
                    const content = document.getElementById(`save-content-${field.key}`).value;
                    const isCharField = field.key.startsWith('character');
                    let targetCategory = isCharField ? 'character' : field.key;
                    if (isCharField) {
                        const charIndex = parseInt(field.key.replace('character', ''), 10);
                        if (!savedPrompts.character) savedPrompts.character = [];
                        savedPrompts.character[charIndex] = content;
                    } else {
                        savedPrompts[field.key] = content;
                    }
                    if (title && content) {
                        presetData[targetCategory].push({
                            title,
                            content
                        });
                    }
                });
                if (fullSetTitle) {
                    presetData.fullSet.push({
                        title: fullSetTitle,
                        prompts: savedPrompts
                    });
                }
                saveData();
                renderPanel();
                closeDialog();
            }
        }]);
    };

    const showEditSetDialog = (index) => {
        const set = presetData.fullSet[index];
        const characterPrompts = set.prompts.character || [];
        let dialogContent = `
            <div class="p-manager-dialog-section">
                <label class="p-manager-dialog-label">프리셋 세트 제목:</label>
                <input type="text" id="edit-set-title" class="p-manager-input" value="${set.title}">
            </div><hr>`;
        const fields = [{
                key: 'artist',
                title: '작가',
                content: set.prompts.artist || ''
            },
            {
                key: 'quality',
                title: '퀄리티 태그',
                content: set.prompts.quality || ''
            },
            {
                key: 'main',
                title: '메인 프롬프트',
                content: set.prompts.main || ''
            },
            {
                key: 'UC',
                title: 'UC 프롬프트',
                content: set.prompts.UC || ''
            }
        ];
        characterPrompts.forEach((prompt, i) => {
            fields.push({
                key: `character${i}`,
                title: `캐릭터 ${i+1}`,
                content: prompt
            });
        });
        fields.forEach(field => {
            dialogContent += `
                <div class="p-manager-dialog-section">
                    <label class="p-manager-dialog-label">${field.title}</label>
                    <textarea id="edit-set-content-${field.key}" class="p-manager-textarea" style="height: 60px;">${field.content}</textarea>
                </div>`;
        });
        createDialog('프리셋 세트 수정', dialogContent, [{
            id: 'delete-set-btn',
            text: '세트 삭제',
            type: 'delete',
            onClick: () => {
                if (confirm(`'${set.title}' 세트를 정말로 삭제하시겠습니까?`)) {
                    presetData.fullSet.splice(index, 1);
                    saveData();
                    renderPanel();
                    closeDialog();
                }
            }
        }, {
            id: 'edit-set-cancel',
            text: '취소',
            onClick: closeDialog
        }, {
            id: 'edit-set-confirm',
            text: '저장',
            onClick: () => {
                const newTitle = document.getElementById('edit-set-title').value.trim();
                if (!newTitle) return;
                const newPrompts = {};
                fields.forEach(field => {
                    const content = document.getElementById(`edit-set-content-${field.key}`).value;
                    if (field.key.startsWith('character')) {
                        const charIndex = parseInt(field.key.replace('character', ''), 10);
                        if (!newPrompts.character) newPrompts.character = [];
                        newPrompts.character[charIndex] = content;
                    } else {
                        newPrompts[field.key] = content;
                    }
                });
                presetData.fullSet[index] = {
                    title: newTitle,
                    prompts: newPrompts
                };
                saveData();
                renderPanel();
                closeDialog();
            }
        }]);
    };

    const renderPresetButtons = (container, category) => {
        container.innerHTML = '';
        const isCharField = category.startsWith('character');
        const presets = isCharField ? presetData.character : presetData[category];
        if (!presets) return;

        presets.forEach((preset, index) => {
            const button = document.createElement('button');
            button.textContent = preset.title;
            button.className = 'p-manager-button p-manager-preset-button';
            let timer;
            let isLongPress = false;
            const startPress = (e) => {
                e.preventDefault();
                isLongPress = false;
                timer = setTimeout(() => {
                    isLongPress = true;
                    if (category === 'fullSet') {
                        showEditSetDialog(index);
                    } else {
                        showEditDialog(isCharField ? 'character' : category, index);
                    }
                }, 500);
            };
            const endPress = () => {
                clearTimeout(timer);
                if (!isLongPress) {
                    if (category === 'fullSet') {
                        applyFullSet(preset);
                    } else {
                        applyPreset(category, preset.content);
                    }
                }
            };
            button.addEventListener('mousedown', startPress);
            button.addEventListener('mouseup', endPress);
            button.addEventListener('mouseleave', () => clearTimeout(timer));
            button.addEventListener('touchstart', startPress);
            button.addEventListener('touchend', endPress);
            container.appendChild(button);
        });
    };

    const renderPanel = () => {
        const panel = document.getElementById('p-manager-panel');
        if (!panel) return;
        panel.innerHTML = '';

        const controlContainer = document.createElement('div');
        controlContainer.style.cssText = 'display: flex; gap: 5px; margin-bottom: 15px; border-bottom: 1px solid #ccc; padding-bottom: 10px;';
        const largeViewSwitchContainer = document.createElement('div');
        largeViewSwitchContainer.style.cssText = 'display: flex; align-items: center; flex-grow: 1;';
        largeViewSwitchContainer.innerHTML = `
            <label class="p-manager-toggle-switch">
                <input type="checkbox" id="large-view-toggle" ${presetData.settings.largeView ? 'checked' : ''}>
                <span class="p-manager-toggle-slider"></span>
            </label>
            <label for="large-view-toggle">크게 보기</label>`;
        const settingsButton = document.createElement('button');
        settingsButton.textContent = '설정';
        settingsButton.className = 'p-manager-button';
        settingsButton.addEventListener('click', showSettingsDialog);
        const saveCurrentButton = document.createElement('button');
        saveCurrentButton.textContent = '가져오기';
        saveCurrentButton.className = 'p-manager-button';
        saveCurrentButton.addEventListener('click', showSaveCurrentDialog);
        controlContainer.appendChild(largeViewSwitchContainer);
        controlContainer.appendChild(settingsButton);
        controlContainer.appendChild(saveCurrentButton);
        panel.appendChild(controlContainer);
        document.getElementById('large-view-toggle').addEventListener('change', (e) => {
            presetData.settings.largeView = e.target.checked;
            toggleImageMonitoring(e.target.checked);
            saveData();
        });

        const sections = [{
            key: 'fullSet',
            title: '프리셋 세트'
        }, {
            key: 'artist',
            title: '작가'
        }, {
            key: 'quality',
            title: '퀄리티 태그'
        }, {
            key: 'main',
            title: '메인 프롬프트'
        }, {
            key: 'UC',
            title: 'UC 프롬프트'
        }];
        getPromptAreas().slice(2).forEach((_, i) => {
            sections.push({
                key: `character${i}`,
                title: `캐릭터 ${i+1}`
            });
        });
        sections.forEach(sectionInfo => {
            const section = document.createElement('div');
            section.className = 'p-manager-section';
            const header = document.createElement('div');
            header.className = 'p-manager-section-header';
            const title = document.createElement('div');
            title.textContent = sectionInfo.title;
            title.className = 'p-manager-section-title';
            const addButton = document.createElement('button');
            addButton.textContent = '+ 추가';
            addButton.className = 'p-manager-button';
            if (sectionInfo.key !== 'fullSet') {
                addButton.addEventListener('click', () => showAddDialog(sectionInfo.key));
            } else {
                addButton.style.display = 'none';
            }
            header.appendChild(title);
            header.appendChild(addButton);
            const grid = document.createElement('div');
            grid.className = 'p-manager-preset-grid';
            section.appendChild(header);
            section.appendChild(grid);
            panel.appendChild(section);
            renderPresetButtons(grid, sectionInfo.key);
        });
    };

    // =================================================================================
    // ★★★ 이미지 크게 보기 기능 (원본 방식으로 완전 복원) ★★★
    // =================================================================================
    let imageObserver = null;
    let lastBlobUrl = null;
    let mirrorPanel = null;

    const createMirrorPanel = () => {
        if (mirrorPanel) return mirrorPanel;
        mirrorPanel = document.createElement('div');
        mirrorPanel.id = 'image-mirror-panel';
        mirrorPanel.className = 'hidden';
        document.body.appendChild(mirrorPanel);
        return mirrorPanel;
    };

    const displayImage = (imageUrl) => {
        if (lastBlobUrl === imageUrl) return;
        lastBlobUrl = imageUrl;
        const panel = createMirrorPanel();
        panel.innerHTML = '';
        panel.className = '';
        const img = document.createElement('img');
        img.src = imageUrl;
        img.onclick = () => {
            panel.className = 'hidden';
        };
        panel.appendChild(img);
    };

    function toggleImageMonitoring(enabled) {
        if (enabled) {
            if (imageObserver) return;
            imageObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    const checkNode = (node) => {
                        if (node.nodeName === 'IMG' && node.src && node.src.startsWith('blob:')) {
                            displayImage(node.src);
                        }
                        if (node.querySelectorAll) {
                            node.querySelectorAll('img[src^="blob:"]').forEach(img => displayImage(img.src));
                        }
                    };
                    if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                        checkNode(mutation.target);
                    }
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach(checkNode);
                    }
                });
            });
            imageObserver.observe(document.body, {
                attributes: true,
                attributeFilter: ['src'],
                childList: true,
                subtree: true
            });
        } else {
            if (imageObserver) {
                imageObserver.disconnect();
                imageObserver = null;
            }
            const panel = document.getElementById('image-mirror-panel');
            if (panel) {
                panel.className = 'hidden';
            }
            lastBlobUrl = null;
        }
    }

    // =================================================================================
    // 초기화
    // =================================================================================
    let isInitialized = false;
    const init = () => {
        if (isInitialized) return;
        const panel = document.createElement('div');
        panel.id = 'p-manager-panel';
        panel.className = 'p-manager-ui-panel';
        document.body.appendChild(panel);

        const toggleButton = document.createElement('div');
        toggleButton.textContent = 'P';
        toggleButton.className = 'p-manager-toggle-button';
        document.body.appendChild(toggleButton);

        // ★★★ 3. P 버튼 클릭 이벤트 수정 ★★★
        toggleButton.addEventListener('click', () => {
            if (panel.style.display === 'none' || panel.style.display === '') {
                // 패널을 열 때마다 색상 추출 및 적용
                extractAndApplyThemeColor();
                panel.style.display = 'block';
                renderPanel();
            } else {
                panel.style.display = 'none';
            }
        });

        toggleImageMonitoring(presetData.settings.largeView);
        isInitialized = true;
        console.log("NovelAI Preset Manager Initialized.");
    };

    const observer = new MutationObserver((mutations, obs) => {
        if (document.querySelector('.ProseMirror')) {
            init();
            obs.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
