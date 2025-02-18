// ==UserScript==
// @name        깡갤 노벨 AI 그림 생성 프리셋
// @namespace   Violentmonkey Scripts
// @match       https://novelai.net/image
// @grant       none
// @version     1.1
// @author      -
// ==/UserScript==
(function() {
    'use strict';

    let presetsStorage = JSON.parse(localStorage.getItem('proseMirrorPresets')) || [];
    let activePresets = JSON.parse(localStorage.getItem('proseMirrorActivePresets')) || [];

    const observer = new MutationObserver(handleDOMChanges);
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('load', () => {
        updateProseMirrorInstances();
        localStorageBackup();
    });

    function handleDOMChanges(mutations) {
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length) {
                updateProseMirrorInstances();
            }
        });
    }

    function updateProseMirrorInstances() {
        const allDivs = getAllProseMirrorInstances();
        const validDivs = allDivs.slice(0, Math.ceil(allDivs.length / 2));

        while (presetsStorage.length < validDivs.length) presetsStorage.push(new Array(6).fill(''));
        while (activePresets.length < validDivs.length) activePresets.push(0);

        validDivs.forEach((div, idx) => {
            if (!div.dataset.enhanced) {
                enhanceProseMirror(div, idx);
                div.dataset.enhanced = 'true';
            }
        });

        localStorageBackup();
    }

    function enhanceProseMirror(targetDiv, index) {
        const controlPanel = createControlPanel(index);
        targetDiv.parentNode.insertBefore(controlPanel, targetDiv.nextSibling);

        const contentObserver = new MutationObserver(() =>
            updatePresetContent(targetDiv, index)
        );
        contentObserver.observe(targetDiv, {
            childList: true,
            subtree: true,
            characterData: true
        });

        loadInitialPreset(targetDiv, index);
    }

    function createControlPanel(index) {

        const panel = document.createElement('div');
        panel.className = 'preset-controls';
        panel.style.cssText = `
            padding: 8px; margin-top: 10px;
            display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px;
        `;

        for (let i = 0; i < 6; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.style.cssText = getButtonStyle(index, i);
            btn.onclick = () => handlePresetClick(index, i);
            panel.appendChild(btn);
        }

        return panel;
    }

    function handlePresetClick(divIndex, presetIndex) {
        const targetDiv = getAllProseMirrorInstances()[divIndex];
        activePresets[divIndex] = presetIndex;
        targetDiv.textContent = presetsStorage[divIndex][presetIndex];
        updateButtonStyles(divIndex);
        localStorageBackup();
    }

    function updatePresetContent(targetDiv, divIndex) {
        const presetIndex = activePresets[divIndex];
        if (presetIndex !== undefined) {
            presetsStorage[divIndex][presetIndex] = targetDiv.textContent;
            localStorageBackup();
        }
    }

    function loadInitialPreset(targetDiv, divIndex) {
        const presetIndex = activePresets[divIndex];
        if (presetIndex !== undefined) {
            targetDiv.textContent = presetsStorage[divIndex][presetIndex];
        }
        updateButtonStyles(divIndex);
    }

    function updateButtonStyles(index) {
        const controlPanel = document.querySelectorAll('.preset-controls')[index];
        if (controlPanel) {
            controlPanel.childNodes.forEach((btn, i) => {
                btn.style.cssText = getButtonStyle(index, i);
            });
        }
    }
function getButtonStyle(index, presetIndex) {
    // 기본 폰트 색상 가져오기
    const bodyColor = getComputedStyle(document.body).color;
const button = document.querySelector(".button"); // 첫 번째 .button 요소 선택
const buttonBg = button ? getComputedStyle(button).backgroundColor : "transparent";

    return `
        padding: 6px; border: none; cursor: pointer;
        background: ${activePresets[index] === presetIndex ? bodyColor : 'inherit'};
        color: ${activePresets[index] === presetIndex ? buttonBg : 'inherit'};
        border-radius: 4px; transition: background 0.2s;
    `;
}


    function getAllProseMirrorInstances() {
        return [...new Set(document.querySelectorAll('div.ProseMirror'))];
    }

    function localStorageBackup() {
        localStorage.setItem('proseMirrorPresets', JSON.stringify(presetsStorage));
        localStorage.setItem('proseMirrorActivePresets', JSON.stringify(activePresets));
    }
})();
