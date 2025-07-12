// ==UserScript==
// @name         깡갤 노벨 AI 원터치 QR
// @namespace    https://novelai.net/
// @version      1
// @description  novel ai 보조툴. NAI 본문을 추출하여 커스텀 프롬프트와 함께 API 요청후, 본문/출력창/이미지창에 선택적 출력.
// @author       ㅇㅇ 
// @match        https://novelai.net/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ======================== NEW: 데이터 구조 정의 (Data Structure Definition) ========================
    /**
     * @typedef {Object} PromptPreset - 프롬프트 프리셋
     * @property {string} id - 고유 ID (e.g., 'prompt-1718865800000')
     * @property {string} name - 프리셋 이름
     * @property {string} content - 프롬프트 실제 내용
     * @property {string | null} category - 분류
     */
    /**
     * @typedef {Object} NovelAiParameters - NovelAI 전용 파라미터 (수정됨)
     * @property {string} negative_prompt - UC 프롬프트 (Negative) - (메인 프롬프트는 제거됨)
     * @property {number} width - 이미지 너비
     * @property {number} height - 이미지 높이
     * @property {string} sampler - 샘플러
     * @property {string} scheduler - 스케줄러
     * @property {number} steps - 스텝
     * @property {number} scale - 가이던스 스케일
     */

    /**
     * @typedef {Object} AiPreset - AI 프리셋
     * @property {string} id - 고유 ID (e.g., 'ai-1718865900000')
     * @property {string} name - 프리셋 이름
     * @property {'gemini' | 'novelai' | 'openai' | 'claude'} type - API 유형
     * @property {string} apiKey - API 키
     * @property {string} endpoint - API 엔드포인트 URL
     * @property {string | null} category - 분류
     * @property {Object} parameters - 모델 파라미터
     * @property {string} parameters.model - 모델 이름
     * @property {number} [parameters.temperature] - 온도
     * @property {number} [parameters.topP] - Top-P
     * @property {number} [parameters.topK] - Top-K
     * @property {NovelAiParameters} [parameters.nai] - NovelAI 전용 파라미터 (type이 'novelai'일 경우)
     */
    /**
     * @typedef {Object} UserInput - 슬롯에 들어갈 사용자 입력 객체 타입
     * @property {string} caption - 입력창에 표시될 메시지 (e.g., '캐릭터 이름을 입력하세요')
     * @property {'user_input'} type - 해당 객체가 사용자 입력임을 명시하는 타입
     */

    /**
     * @typedef {Object} QrPreset - QR 프리셋
     * @property {string} id - 고유 ID
     * @property {string} name - QR 이름
     * @property {string} aiPresetId - 사용할 AI 프리셋의 ID
     * @property {string | null} category - 분류
     * @property {Object} slots - 프롬프트 슬롯. 각 슬롯은 PromptPreset의 ID(string) 또는 UserInput 객체를 가짐.
     * @property {string | UserInput | null} slots.prefix - 서문
     * @property {string | UserInput | null} slots.afterPrefix - 서문 후
     * @property {string | UserInput | null} slots.beforeBody - 본문 전
     * @property {string | UserInput | null} slots.afterBody - 본문 후
     * @property {string | UserInput | null} slots.beforeSuffix - 탈옥 전
     * @property {string | UserInput | null} slots.suffix - 탈옥
     * @property {string | UserInput | null} slots.afterSuffix - 탈옥 후
     * @property {number} extractLength - 본문에서 추출할 글자 수
     * @property {Object} postProcess - 후처리 설정
     * @property {'output_panel' | 'prosemirror' | 'image_panel' | 'multi_qr' | 'none'} postProcess.action - 실행 후 동작
     * @property {string | null} postProcess.nextQrId - 다중 QR 실행 시, 다음에 실행할 QR의 ID
     * @property {keyof QrPreset['slots'] | null} postProcess.insertSlot - 다중 QR 실행 시, 이번 응답을 다음 QR의 어느 슬롯에 넣을지
     * @property {Object} remote - 리모콘 설정
     * @property {boolean} remote.visible - 리모콘에 버튼 표시 여부
     * @property {boolean} remote.favorite - 즐겨찾기 리모콘에 버튼 표시 여부
     */
     
        // ======================== 1. 기본 설정 및 상수 정의 ========================
    const CONFIG = {
        // UI 및 기타 기본 설정값
        defaultMainColor: 'rgba(32, 32, 32, 0.8)',
        defaultHighlightColor: 'royalblue',

        // 리모컨 기본 설정
        remoteControl: {
            buttonSize: 50,
            buttonGap: 5,
            buttonShape: 'circle', // 'circle' 또는 'square'
            orientation: 'vertical', // 'vertical' 또는 'horizontal'
            position: { right: '15px', bottom: '20%' }
        },
    };

    // ======================== 2. 유틸리티 함수 모음 ========================
    const Utils = {    /**
     * 텍스트를 클립보드에 복사
     * @param {string} text - 복사할 텍스트
     */
    copyToClipboard: function(text) {
        if (navigator.clipboard && window.isSecureContext) {
            // 보안 컨텍스트에서 현대적인 방법 사용
            navigator.clipboard.writeText(text)
                .then(() => console.log('텍스트가 클립보드에 복사되었습니다.'))
                .catch(err => console.error('클립보드 복사 실패:', err));
        } else {
            // 대체 방법 (보안 컨텍스트가 아닌 경우)
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                console.log(successful ? '텍스트가 클립보드에 복사되었습니다.' : '클립보드 복사 실패');
            } catch (err) {
                console.error('클립보드 복사 실패:', err);
            }

            document.body.removeChild(textArea);
        }
    },
        /**
         * 로딩 상태 토글
         * @param {boolean} isLoading - 로딩 상태 여부
         */
toggleLoading: function(isLoading, buttonElement) {
    if (buttonElement) {
        if (isLoading) {
            buttonElement.classList.add('loading');
        } else {
            buttonElement.classList.remove('loading');
        }
    }
},
   /**
 * 요소를 드래그 가능하게 만드는 함수
 * @param {HTMLElement} element - 드래그할 요소
 * @param {HTMLElement} handle - 드래그 핸들 요소 (없으면 element 자체)
 * @param {Function} onPositionChange - 위치 변경 시 콜백 함수
 * @param {string} storageKey - 위치 저장에 사용할 로컬 스토리지 키
 */
makeDraggable: function(element, handle = null, onPositionChange = null, storageKey = null) {
    const dragHandle = handle || element;
    let isDragging = false;
    let startX, startY, startRight, startBottom;
    let dragTimeout;

    // 요소 ID 기반으로 스토리지 키 생성 (없으면 기본값 사용)
    const positionKey = storageKey || (element.id ? `position_${element.id}` : "tBallP");

    // 로컬 스토리지에서 위치 정보를 불러오고 적용합니다.
    const savedPosition = localStorage.getItem(positionKey);
    if (savedPosition) {
        try {
            const { right, bottom } = JSON.parse(savedPosition);
            element.style.right = right + "px";
            element.style.bottom = bottom + "px";
        } catch (e) {
            console.error("저장된 위치 정보를 불러오는 중 오류 발생:", e);
        }
    }

    // 마우스 이벤트
    dragHandle.addEventListener('mousedown', function(e) {
        if (isDragging) return;

        dragTimeout = setTimeout(function() {
            isDragging = true;

            // 시작 위치 저장 (마우스 위치와 요소의 현재 right/bottom 값)
            startX = e.clientX;
            startY = e.clientY;
            startRight = parseInt(element.style.right) || 0;
            startBottom = parseInt(element.style.bottom) || 0;
        }, 300);

        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();

        // 마우스 이동 거리 계산
        const dx = startX - e.clientX;
        const dy = startY - e.clientY;

        // 새 위치 계산 (시작 위치 + 이동 거리)
        let right = startRight + dx;
        let bottom = startBottom + dy;

        // 경계 확인
        right = Math.max(0, right);
        bottom = Math.max(0, bottom);

        // 요소 이동
        element.style.right = right + "px";
        element.style.bottom = bottom + "px";

        if (onPositionChange) {
            onPositionChange({ right, bottom });
        }
    });

    document.addEventListener('mouseup', function() {
        clearTimeout(dragTimeout);

        if (!isDragging) return;
        isDragging = false;

        // 위치 정보를 로컬 스토리지에 저장
        const position = {
            right: parseInt(element.style.right) || 0,
            bottom: parseInt(element.style.bottom) || 0
        };
        localStorage.setItem(positionKey, JSON.stringify(position));
    });

    // 터치 이벤트
    dragHandle.addEventListener('touchstart', function(e) {
        if (isDragging) return;

        dragTimeout = setTimeout(function() {
            isDragging = true;

            const touch = e.touches[0];
            // 시작 위치 저장 (터치 위치와 요소의 현재 right/bottom 값)
            startX = touch.clientX;
            startY = touch.clientY;
            startRight = parseInt(element.style.right) || 0;
            startBottom = parseInt(element.style.bottom) || 0;

            e.preventDefault();
        }, 500);
    });

    document.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        e.preventDefault();

        const touch = e.touches[0];

        // 터치 이동 거리 계산
        const dx = startX - touch.clientX;
        const dy = startY - touch.clientY;

        // 새 위치 계산 (시작 위치 + 이동 거리)
        let right = startRight + dx;
        let bottom = startBottom + dy;

        // 경계 확인
        right = Math.max(0, right);
        bottom = Math.max(0, bottom);

        // 요소 이동
        element.style.right = right + "px";
        element.style.bottom = bottom + "px";

        if (onPositionChange) {
            onPositionChange({ right, bottom });
        }
    });

    document.addEventListener('touchend', function() {
        clearTimeout(dragTimeout);

        if (!isDragging) return;
        isDragging = false;

        // 위치 정보를 로컬 스토리지에 저장
        const position = {
            right: parseInt(element.style.right) || 0,
            bottom: parseInt(element.style.bottom) || 0
        };
        localStorage.setItem(positionKey, JSON.stringify(position));
    });

    // 요소를 특정 위치로 이동
    return {
        moveTo: function(position) {
            if (position.right !== undefined) element.style.right = position.right + 'px';
            if (position.bottom !== undefined) element.style.bottom = position.bottom + 'px';
        }
    };
},



        /**
         * 텍스트에서 HTML 태그 제거
         * @param {string} html - HTML 태그를 포함한 문자열
         * @returns {string} HTML 태그가 제거된 문자열
         */
        stripHtml: function(html) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        },

        /**
         * JSZip 라이브러리 로드
         * @returns {Promise} JSZip 객체를 반환하는 Promise
         */
        loadJSZip: async function() {
            // 이미 JSZip이 로드되어 있는지 확인
            if (window.JSZip) {
                return window.JSZip;
            }

            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
                script.crossOrigin = 'anonymous';
                script.onload = () => resolve(window.JSZip);
                script.onerror = () => reject(new Error('JSZip 로드 실패'));
                document.head.appendChild(script);
            });
        },
		        /**
         * 요소 생성 헬퍼 함수
         * @param {string} tag - HTML 태그 이름
         * @param {Object} attributes - 속성 객체
         * @param {string|HTMLElement|Array} children - 자식 요소(들)
         * @returns {HTMLElement} 생성된 요소
         */
        createElement: function(tag, attributes = {}, children = []) {
            const element = document.createElement(tag);

            // 속성 설정
            Object.entries(attributes).forEach(([key, value]) => {
                // [수정] disabled, checked 같은 boolean 속성을 올바르게 처리
                if ((key === 'disabled' || key === 'checked') && !value) {
                    // 값이 false이면 속성 자체를 추가하지 않음
                    return;
                }
                if (key === 'style' && typeof value === 'object') {
                    Object.entries(value).forEach(([styleKey, styleValue]) => {
                        element.style[styleKey] = styleValue;
                    });
                } else if (key === 'className') {
                    element.className = value;
                } else if (key === 'dataset') {
                    Object.entries(value).forEach(([dataKey, dataValue]) => {
                        element.dataset[dataKey] = dataValue;
                    });
                } else if (key === 'textContent') {
                    element.textContent = value;
                } else if (key.startsWith('on') && typeof value === 'function') {
                    const eventType = key.substring(2).toLowerCase();
                    element.addEventListener(eventType, value);
                } else {
                    element.setAttribute(key, value);
                }
            });

            // 자식 요소 추가
            if (children) {
                if (!Array.isArray(children)) {
                    children = [children];
                }

                children.forEach(child => {
                    if (typeof child === 'string') {
                        element.appendChild(document.createTextNode(child));
                    } else if (child instanceof HTMLElement) {
                        element.appendChild(child);
                    }
                });
            }

            return element;
        }
    };
    
    // ======================== 3. 스토리지 관리 모듈 ========================
    const Storage = {
        /**
         * 설정값 가져오기
         * @param {string} key - 설정 키
         * @param {*} defaultValue - 기본값
         * @returns {*} 설정값
         */
        get: function(key, defaultValue) {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            try {
                if (value === 'true') return true;
                if (value === 'false') return false;
                if (!isNaN(value) && value.trim() !== '' && !/e/i.test(value)) return Number(value);
                return JSON.parse(value);
            } catch (e) {
                return value;
            }
        },

        /**
         * 설정값 저장
         * @param {string} key - 설정 키
         * @param {*} value - 설정값
         */
        set: function(key, value) {
            localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
        },

        /**
         * 설정값 삭제
         * @param {string} key - 설정 키
         */
        remove: function(key) {
            localStorage.removeItem(key);
        },

        getPrompts: function() { return this.get('promptPresets', []); },
        setPrompts: function(prompts) { this.set('promptPresets', prompts); },
        getPromptById: function(id) { return this.getPrompts().find(p => p.id === id); },

        getAiPresets: function() { return this.get('aiPresets', []); },
        setAiPresets: function(presets) { this.set('aiPresets', presets); },
        getAiPresetById: function(id) { return this.getAiPresets().find(p => p.id === id); },

        getQRs: function() { return this.get('qrPresets', []); },
        setQRs: function(qrs) { this.set('qrPresets', qrs); },
        getQRById: function(id) { return this.getQRs().find(q => q.id === id); },

        upsertDefaultPresets: function(forceReset = false) {
            const process = (storageKey, defaultsFn) => {
                let currentItems = this.get(storageKey, []);
                const defaultItems = defaultsFn();
                const defaultIds = new Set(defaultItems.map(item => item.id));

                if (forceReset) {
                    // 강제 리셋: 사용자 정의 항목은 유지하고 기본 항목만 최신 버전으로 교체/추가합니다.
                    const userItems = currentItems.filter(item => !defaultIds.has(item.id));
                    const newItems = [...defaultItems, ...userItems];
                    this.set(storageKey, newItems);
                    console.log(`[강제] 기본 ${storageKey}을(를) 초기값으로 복구했습니다.`);
                } else {
                    // 일반 실행: ID가 없는 기본 항목만 추가합니다. (사용자 수정을 보존)
                    const existingDefaultIds = new Set(currentItems.map(item => item.id));
                    const itemsToAdd = defaultItems.filter(item => !existingDefaultIds.has(item.id));
                    if (itemsToAdd.length > 0) {
                        this.set(storageKey, [...currentItems, ...itemsToAdd]);
                        console.log(`[추가] 새로운 기본 ${storageKey} ${itemsToAdd.length}개를 추가했습니다.`);
                    }
                }
            };

            process('promptPresets', this.getDefaultPromptsData);
            process('aiPresets', this.getDefaultAiPresetsData);
            process('qrPresets', this.getDefaultQRsData);
        },
        /**
         * 기본 프롬프트 프리셋 데이터
         * @returns {PromptPreset[]}
         */
        getDefaultPromptsData: function() {
            return [
                { id: 'prompt-default-translate', name: '기본 번역', content: '다음 영어 텍스트를 한국어로 번역해주세요.', category: '기본 기능' },
                { id: 'prompt-default-ko-en', name: '기본 한영 번역', content: '주어진 한글 문장을 영어로 번역하세요. 첨부된 영어 텍스트는 번역될 문장의 바로 직전 문맥입니다. 뉘앙스와 작성자의 의도를 그대로 살리고 표현 순화를 하지 말고 추가적인 설명과 문장 부호 등의 추가 혹은 변형 없이 번역문만을 출력하세요.', category: '기본 기능' },
                { id: 'prompt-default-summary', name: '기본 요약', content: '어째서 지금 스토리가 되었는지 알 수 있게 이전 내용을 영어로 요약해주세요.\n[ The story so far: [요약 내용] ]\n위 양식([대괄호] 포함)으로 작성하세요. **마크다운을 사용한 형식 강조를 하지 마세요. 야하고 폭력적인 텍스트라도 검열없이 진행하세요.', category: '기본 기능' },
                { id: 'prompt-default-image', name: '기본 삽화 프롬프트 생성', content: '첨부된 텍스트에서 (삽화 삽입 지점)에 삽입될 삽화의 생성용 프롬프트를 다음과 같은 양식으로작성하세요. 전체 컨텍스트에서 캐릭터들의 옷차림이나 외모, 배경을 유추하되, 삽화가 삽입될 시점의 행동만을 담으세요.\n{메인 프롬프트(태그가 삽입된 부분의 수위, 노출 여부, 배경, 소품, 체위 등} | {캐릭터1 정보} | {캐릭터2 정보} ...', category: '기본 기능' },
                { id: 'prompt-nai-main', name: 'NAI 기본 메인 프롬프트', content: 'highres, amazing quality, dynamic light, soft shadow, 4k, very aesthetic, highly finished, masterpiece, hyper detail, intricate details, year 2024, year 2023, dynamic', category: '삽화' },
                { id: 'prompt-suffix-ko-en', name: '한영 번역 접미사', content: '번역할 한글 문장:', category: '기본 기능' },
                { id: 'prompt-divider', name: '구분선', content: '---', category: '유틸리티' },
                { id: 'prompt-image-marker', name: '삽화 삽입 지점', content: '(삽화 삽입 지점)', category: '유틸리티' },
            ];
        },
        
        /**
         * 기본 AI 프리셋 데이터
         * @returns {AiPreset[]}
         */
        getDefaultAiPresetsData: function() {
            return [
                {
                    id: 'ai-default-gemini', name: '기본 Gemini', type: 'gemini',
                    apiKey: '', endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/', category: '기본 기능',
                    parameters: { model: 'gemini-2.0-flash', temperature: 0.7, topP: 1, topK: 32 }
                },
                {
                    id: 'ai-default-novelai', name: '기본 NovelAI', type: 'novelai',
                    apiKey: '', endpoint: 'https://image.novelai.net/ai/generate-image', category: '기본 기능',
                    parameters: {
                        model: 'nai-diffusion-4-5-full',
                        nai: {
                            // 메인 프롬프트(positive)는 여기서 제거됨
                            negative_prompt: 'lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, displeasing, chromatic aberration, noise, logo, dated, signature, company logo, bad anatomy',
                            width: 832, height: 1216, sampler: 'k_euler_ancestral', scheduler: 'karras',
                            steps: 28, scale: 6
                        }
                    }
                }
            ];
        },

        /**
         * 기본 QR들의 원본 데이터를 반환하는 헬퍼 함수
         * @returns {QrPreset[]}
         */
        getDefaultQRsData: function() {
            return [
                {
                    id: 'default-translate', name: '기본 번역', aiPresetId: 'ai-default-gemini', category: '기본 기능',
                    slots: { prefix: 'prompt-default-translate', afterPrefix: null, beforeBody: null, afterBody: null, beforeSuffix: null, suffix: null, afterSuffix: null },
                    extractLength: 750,
                    postProcess: { action: 'output_panel', nextQrId: null, insertSlot: null },
                    remote: { visible: true, favorite: true }
                },
                {
                    id: 'default-image-prompt', name: '삽화 프롬프트 생성', aiPresetId: 'ai-default-gemini', category: '기본 기능',
                    slots: { prefix: 'prompt-default-image', afterPrefix: null, beforeBody: 'prompt-image-marker', afterBody: null, beforeSuffix: null, suffix: null, afterSuffix: null },
                    extractLength: 6000,
                    postProcess: { action: 'multi_qr', nextQrId: 'default-image-generate', insertSlot: 'afterPrefix' }, // 삽입 슬롯 변경
                    remote: { visible: true, favorite: true }
                },
                {
                    id: 'default-image-generate', name: '삽화 생성 실행', aiPresetId: 'ai-default-novelai', category: '기본 기능',
                    slots: { 
                        prefix: 'prompt-nai-main', // NAI 메인 프롬프트를 서문으로 설정
                        afterPrefix: null, // Gemini가 생성한 프롬프트가 여기에 삽입됨
                        beforeBody: null, afterBody: null, beforeSuffix: null, suffix: null, afterSuffix: null 
                    },
                    extractLength: 0,
                    postProcess: { action: 'image_panel', nextQrId: null, insertSlot: null },
                    remote: { visible: false, favorite: false }
                },
                {
                    id: 'default-ko-en-translate', name: '한영 번역 (입력창)', aiPresetId: 'ai-default-gemini', category: '기본 기능',
                    slots: {
                        prefix: 'prompt-default-ko-en', afterPrefix: null, beforeBody: null,
                        afterBody: 'prompt-divider', beforeSuffix: null, suffix: 'prompt-suffix-ko-en',
                        afterSuffix: { caption: '번역할 한국어를 입력하세요', type: 'user_input' }
                    },
                    extractLength: 4000,
                    postProcess: { action: 'prosemirror', nextQrId: null, insertSlot: null },
                    remote: { visible: false, favorite: false }
                }
            ];
        },
        
        backupAll: function() {
            const backup = {};
            const keysToBackup = [
                'promptPresets', 'aiPresets', 'qrPresets',
                'textExtraction', 'tMainColor', 'colorCode', 'ns-icon-size',
                'ns-icon-url', 'ns-italic', 'ns-bold', 'ns-highlight',
                'tBallP', 'remoteControl', 'settingsPanelPosition'
            ];
            keysToBackup.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) backup[key] = value;
            });
            return JSON.stringify(backup, null, 2);
        },

        restoreAll: function(backupData) {
            try {
                const backup = JSON.parse(backupData);
                Object.entries(backup).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
                return true;
            } catch (e) {
                console.error('백업 복원 실패:', e);
                return false;
            }
        }
    };
        // ======================== NEW: 프리셋 관리 UI 모듈 (배열 순서 변경 로직 수정) ========================
		// [교체할 대상: const PresetManagerUI = { ... };]
    const PresetManagerUI = {
        createManager: function(config) {
            let presets = config.storageGetter();
            let currentFilter = 'all';
            let openEditId = null;

            const section = Utils.createElement('div', { className: 'settings-section', id: `${config.presetType}-settings` });
            const headerContainer = Utils.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } });
            const title = Utils.createElement('h3', { style: { margin: 0 } }, config.title);
            const addButton = Utils.createElement('button', { className: 'form-button primary', onclick: handleAddItem }, '+ 추가');
            headerContainer.append(title, addButton);

            const addFormContainer = Utils.createElement('div', { className: 'preset-edit-container', style: { display: 'none' } });
            const filterContainer = Utils.createElement('div', { className: 'settings-tabs', style: { margin: '10px 0' } });
            const listContainer = Utils.createElement('div', { id: `${config.presetType}-list-container` });

            const getNestedValue = (obj, path) => path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
            const setNestedValue = (obj, path, value) => {
                const keys = path.split('.');
                const lastKey = keys.pop();
                const lastObj = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
                lastObj[lastKey] = value;
            };

            const _createAndShowModal = (title, fieldConfig, onSelect) => {
                const overlay = Utils.createElement('div', { style: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 30000, display: 'flex', justifyContent: 'center', alignItems: 'center' } });
                const modal = Utils.createElement('div', { style: { background: 'var(--main-color)', width: '90%', maxWidth: '600px', height: '70vh', display: 'flex', flexDirection: 'column', borderRadius: '8px', padding: '15px', border: '1px solid rgba(255,255,255,0.2)' } });
                const header = Utils.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #555', paddingBottom: '10px', flexShrink: 0 } });
                header.append(Utils.createElement('h4', { textContent: title, style: { margin: 0 } }), Utils.createElement('button', { textContent: '✕', className: 'close-button', style: { position: 'static' }, onclick: () => overlay.remove() }));
                const contentContainer = Utils.createElement('div', { style: { overflowY: 'auto', flexGrow: 1, padding: '10px 0' } });

                if (fieldConfig.allowUserInput) {
                    const userInputSection = Utils.createElement('div', { style: { padding: '10px', border: '1px solid #555', borderRadius: '4px', margin: '0 10px 10px' }});
                    const captionInput = Utils.createElement('input', { type: 'text', className: 'form-input', placeholder: '입력창에 표시될 메시지 (예: 캐릭터 이름)' });
                    const confirmBtn = Utils.createElement('button', { textContent: '사용자 입력 사용', className: 'form-button', style: { marginTop: '10px', width: '100%' }, onclick: () => { onSelect({ type: 'user_input', caption: captionInput.value || '사용자 입력' }); overlay.remove(); }});
                    userInputSection.append(Utils.createElement('label', { className: 'form-label', textContent: '사용자 직접 입력'}), captionInput, confirmBtn);
                    contentContainer.appendChild(userInputSection);
                }
                const sourceData = fieldConfig.sourceGetter();
                let modalCurrentFilter = 'all';
                const modalFilterContainer = Utils.createElement('div', { className: 'settings-tabs', style: { margin: '10px', flexShrink: 0 } });
                const modalListContainer = Utils.createElement('div', { style: { padding: '0 10px' } });
                const renderModalContent = () => {
                    modalFilterContainer.innerHTML = '';
                    const categories = [...new Set(sourceData.map(p => p.category).filter(Boolean))];
                    const createModalFilterButton = (filter, label) => Utils.createElement('button', { className: `settings-tab ${modalCurrentFilter === filter ? 'active' : ''}`, textContent: label, onclick: () => { modalCurrentFilter = filter; renderModalContent(); } });
                    modalFilterContainer.append(createModalFilterButton('all', '전체'));
                    categories.sort().forEach(cat => modalFilterContainer.append(createModalFilterButton(cat, cat)));
                    modalFilterContainer.append(createModalFilterButton(null, '미분류'));
                    modalListContainer.innerHTML = '';
                    const filtered = sourceData.filter(p => modalCurrentFilter === 'all' ? true : (modalCurrentFilter === null ? !p.category : p.category === modalCurrentFilter));
                    filtered.forEach(item => modalListContainer.appendChild(Utils.createElement('button', { className: 'form-button', textContent: item.name, style: { width: '100%', textAlign: 'left', marginBottom: '5px' }, onclick: () => { onSelect(item.id); overlay.remove(); } })));
                };
                const footer = Utils.createElement('div', { style: { paddingTop: '10px', borderTop: '1px solid #555', marginTop: '10px', flexShrink: 0, padding: '0 10px' } });
                footer.append(Utils.createElement('button', { className: 'form-button', style: { width: '100%' }, textContent: '선택 해제', onclick: () => { onSelect(null); overlay.remove(); } }));

                renderModalContent();
                contentContainer.append(modalFilterContainer, modalListContainer);
                modal.append(header, contentContainer, footer);
                overlay.appendChild(modal);
                document.body.appendChild(overlay);
            };

            const _renderForm = (item, onSave, onCancel, isCreate = false, viewState = {}) => {
                const form = Utils.createElement('div');
                let tempItem = JSON.parse(JSON.stringify(item));
                const redrawForm = (newViewState) => form.replaceWith(_renderForm(tempItem, onSave, onCancel, isCreate, newViewState));

                const renderField = (field, container) => {
                    if (field.showIf && !field.showIf(tempItem)) return;

                    const handleInputChange = (value, newViewState = {}) => {
                        setNestedValue(tempItem, field.key, value);
                        // showIf 조건이 있는 필드가 변경되었을 때만 폼을 다시 그림
                        const needsRedraw = config.layout.flat().some(f => f.showIf && f.key === field.key);
                        if (needsRedraw || Object.keys(newViewState).length > 0) {
                            redrawForm({ ...viewState, ...newViewState });
                        }
                    };

                    const fieldWrapper = Utils.createElement('div', { className: 'form-field-wrapper' });
                    let input;
                    let labelText = field.label ? `${field.label}:` : '';

                    switch (field.type) {
                        case 'checkbox':
                            const checkLabel = Utils.createElement('label', { className: 'form-checkbox-label' });
                            const checkbox = Utils.createElement('input', { className: 'form-checkbox', type: 'checkbox', onchange: e => handleInputChange(e.target.checked) });
                            checkbox.checked = getNestedValue(tempItem, field.key) || false;
                            checkLabel.append(checkbox, field.label || '');
                            fieldWrapper.appendChild(checkLabel);
                            break;

                        case 'popupSelector':
                        case 'select':
                        case 'sizeSelector':
                        case 'category':
                        case 'text':
                        case 'number':
                        case 'textarea':
                            fieldWrapper.classList.add('inline-flex');
                            const label = Utils.createElement('span', { className: 'form-field-label' }, labelText);
                            const inputArea = Utils.createElement('div', { className: 'form-field-input-area' });

                            if (field.type === 'popupSelector') {
                                const selectedValue = getNestedValue(tempItem, field.key);
                                let buttonText;
                                if (typeof selectedValue === 'string') { const name = field.sourceGetter().find(p => p.id === selectedValue)?.name || '잘못된 ID'; buttonText = [Utils.createElement('b', {}, name)]; }
                                else if (typeof selectedValue === 'object' && selectedValue?.type === 'user_input') { buttonText = ['사용자 입력: ', Utils.createElement('b', {}, selectedValue.caption || '(설명 없음)')]; }
                                else { buttonText = [Utils.createElement('b', {}, '선택...')]; }
                                input = Utils.createElement('button', { className: 'form-button', style: { width: '100%', textAlign: 'left' }, onclick: () => _createAndShowModal(field.label, field, e => handleInputChange(e)) }, buttonText);
                            } else if (field.type === 'select') {
                                input = Utils.createElement('select', { className: 'form-select', onchange: (e) => handleInputChange(e.target.value) });
                                field.options.forEach(opt => input.append(Utils.createElement('option', { value: opt.value, textContent: opt.label })));
                                input.value = getNestedValue(tempItem, field.key);
                            } else if (field.type === 'sizeSelector') {
                                input = Utils.createElement('select', { className: 'form-select', onchange: (e) => { const [width, height] = e.target.value.split('x').map(Number); setNestedValue(tempItem, field.keys.width, width); setNestedValue(tempItem, field.keys.height, height); }});
                                field.options.forEach(opt => input.append(Utils.createElement('option', { value: opt.value, textContent: opt.label })));
                                const currentWidth = getNestedValue(tempItem, field.keys.width);
                                const currentHeight = getNestedValue(tempItem, field.keys.height);
                                input.value = `${currentWidth}x${currentHeight}`;
                                if (input.selectedIndex === -1 && field.options.length > 0) { input.value = field.options[0].value; }
                            } else if (field.type === 'category') {
                                const allCategories = [...new Set(config.storageGetter().map(p => p.category).filter(Boolean))];
                                const selectCat = Utils.createElement('select', { className: 'form-select', onchange: (e) => { const isNew = e.target.value === '__new__'; const value = isNew ? '' : (e.target.value === '__none__' ? null : e.target.value); handleInputChange(value, { isCreatingNewCategory: isNew }); }});
                                selectCat.append(Utils.createElement('option',{value:'__none__',textContent:'미분류'}), ...allCategories.sort().map(c=>Utils.createElement('option',{value:c,textContent:c})), Utils.createElement('option',{value:'__new__',textContent:'새 분류 생성...'}));
                                if (viewState.isCreatingNewCategory) { selectCat.value = '__new__'; } else { selectCat.value = getNestedValue(tempItem, field.key) || '__none__'; }
                                const newCatInput = Utils.createElement('input', { className: 'form-input', type: 'text', placeholder: '새 분류 이름 입력', style: { display: viewState.isCreatingNewCategory ? 'block' : 'none', marginTop: '5px' }, onchange: (e) => setNestedValue(tempItem, field.key, e.target.value.trim() || null) });
                                input = [selectCat, newCatInput];
                            } else if (field.type === 'textarea') {
                                input = Utils.createElement('textarea', { className: 'form-textarea', placeholder: field.placeholder || '', onchange: (e) => setNestedValue(tempItem, field.key, e.target.value) }, getNestedValue(tempItem, field.key) || '');
                            } else if (field.type === 'number') {
                                input = Utils.createElement('input', { className: 'form-input', type: 'number', value: getNestedValue(tempItem, field.key) || '', placeholder: field.placeholder || '', onchange: (e) => setNestedValue(tempItem, field.key, parseFloat(e.target.value) || 0) });
                            } else { // text
                                input = Utils.createElement('input', { className: 'form-input', type: 'text', value: getNestedValue(tempItem, field.key) || '', placeholder: field.placeholder || '', onchange: (e) => setNestedValue(tempItem, field.key, e.target.value) });
                            }

                            if (Array.isArray(input)) { input.forEach(el => inputArea.appendChild(el)); }
                            else { inputArea.appendChild(input); }
                            fieldWrapper.append(label, inputArea);
                            break;

                        default:
                            const defaultInput = Utils.createElement('input', { className: 'form-input', type: 'text', value: getNestedValue(tempItem, field.key) || '', placeholder: field.label, onchange: (e) => setNestedValue(tempItem, field.key, e.target.value) });
                            fieldWrapper.appendChild(defaultInput);
                            break;
                    }
                    container.appendChild(fieldWrapper);
                };

                config.layout.flat().forEach(field => renderField(field, form));

                const buttonGroup = Utils.createElement('div', { className: 'form-button-group' });
                buttonGroup.append(
                    Utils.createElement('button', { className: 'form-button primary', textContent: isCreate ? '생성' : '저장', onclick: () => onSave(tempItem) }),
                    Utils.createElement('button', { className: 'form-button', textContent: '취소', onclick: onCancel })
                );
                form.appendChild(buttonGroup);
                return form;
            };

            function handleAddItem() {
                addFormContainer.style.display = 'block';
                const newItem = config.getNewItemData();
                const editForm = _renderForm(newItem, (updatedItem) => {
                    presets.unshift(updatedItem);
                    config.storageSetter(presets);
                    addFormContainer.style.display = 'none';
                    addFormContainer.innerHTML = '';
                    render();
                }, () => {
                    addFormContainer.style.display = 'none';
                    addFormContainer.innerHTML = '';
                }, true);
                addFormContainer.innerHTML = '';
                addFormContainer.appendChild(editForm);
            }

            function render() {
                renderFilters();
                renderList();
            }

            function renderFilters() {
                filterContainer.innerHTML = '';
                const categories = [...new Set(presets.map(p => p.category).filter(Boolean))];
                const createFilterButton = (filter, label) => Utils.createElement('button', { className: `settings-tab ${currentFilter === filter ? 'active' : ''}`, textContent: label, onclick: () => { currentFilter = filter; openEditId = null; addFormContainer.style.display = 'none'; render(); } });
                filterContainer.append(createFilterButton('all', '전체'), ...categories.sort().map(cat => createFilterButton(cat, cat)), createFilterButton(null, '미분류'));
            }

            function renderList() {
                listContainer.innerHTML = '';
                const filteredPresets = presets.filter(p => currentFilter === 'all' ? true : (currentFilter === null ? !p.category : p.category === currentFilter));

                filteredPresets.forEach(item => {
                    const originalIndex = presets.findIndex(p => p.id === item.id);
                    const isDefault = item.id.startsWith('default-');

                    const itemContainer = Utils.createElement('div', { style: { borderBottom: '1px solid #444', padding: '10px 0' } });
                    const itemHeader = Utils.createElement('div', { className: 'preset-list-item-header' });
                    const titleText = Utils.createElement('span', { className: 'preset-list-item-title', textContent: item.name || `(제목 없음)`, onclick: () => { openEditId = openEditId === item.id ? null : item.id; addFormContainer.style.display = 'none'; renderList(); } });
                    const controls = Utils.createElement('div', { className: 'preset-list-item-controls' });

                    controls.append(
                        Utils.createElement('button', { className: 'form-button', textContent: '카피', onclick: () => handleAction('copy', originalIndex) }),
                        Utils.createElement('button', { className: 'form-button', textContent: '삭제', disabled: isDefault, onclick: () => handleAction('delete', originalIndex) }),
                        Utils.createElement('button', { className: 'form-button', textContent: '↑', disabled: originalIndex <= 0, onclick: () => handleAction('moveUp', originalIndex) }),
                        Utils.createElement('button', { className: 'form-button', textContent: '↓', disabled: originalIndex >= presets.length - 1, onclick: () => handleAction('moveDown', originalIndex) })
                    );

                    itemHeader.append(titleText, controls);
                    itemContainer.appendChild(itemHeader);

                    if (openEditId === item.id) {
                        const editContainer = Utils.createElement('div', { className: 'preset-edit-container' });
                        const editForm = _renderForm(item,
                            (updatedItem) => { presets[originalIndex] = updatedItem; config.storageSetter(presets); openEditId = null; render(); },
                            () => { openEditId = null; renderList(); }
                        );
                        editContainer.appendChild(editForm);
                        itemContainer.appendChild(editContainer);
                    }
                    listContainer.appendChild(itemContainer);
                });
            }

            function handleAction(action, index) {
                let newPresets = [...presets];
                switch (action) {
                    case 'delete':
                        if (confirm(`'${newPresets[index].name}' 프리셋을 정말 삭제하시겠습니까?`)) {
                            newPresets.splice(index, 1);
                        } else { return; }
                        break;
                    case 'copy':
                        const newItem = JSON.parse(JSON.stringify(newPresets[index]));
                        newItem.id = `${config.presetType}-${Date.now()}`;
                        newItem.name = `${newItem.name} (복사본)`;
                        newPresets.push(newItem);
                        break;
                    case 'moveUp':
                        if (index > 0) { [newPresets[index - 1], newPresets[index]] = [newPresets[index], newPresets[index - 1]]; }
                        break;
                    case 'moveDown':
                        if (index < newPresets.length - 1) { [newPresets[index + 1], newPresets[index]] = [newPresets[index], newPresets[index + 1]]; }
                        break;
                }
                presets = newPresets;
                config.storageSetter(presets);
                render();
            }

            section.append(headerContainer, addFormContainer, filterContainer, listContainer);
            render();
            return section;
        }
    };
    // ======================== 4. UI 관리 모듈 ========================

    const UI = {
        // CSS 스타일 정의// [교체할 대상: UI.styles 변수]
        styles: `
:root {
    --main-color: ${Storage.get('tMainColor', CONFIG.defaultMainColor)};
    --highlight-color: ${Storage.get('colorCode', CONFIG.defaultHighlightColor)};
    --italic-active: normal;
    --bold-active: normal;
    --text-highlight-color: inherit;
    --remote-icon-url: none;
    --remote-button-size: ${Storage.get('remoteControl', CONFIG.remoteControl).buttonSize || CONFIG.remoteControl.buttonSize}px;
    --remote-button-gap: ${Storage.get('remoteControl', CONFIG.remoteControl).buttonGap || CONFIG.remoteControl.buttonGap}px;
    --highlight-rgb: 52, 152, 219;
}

.loading {
    animation: rotate-shadow 2s linear infinite;
}

@keyframes rotate-shadow {
    0% { box-shadow: 0 0 2px rgba(var(--highlight-rgb), 0.9); }
    50% { box-shadow: 0 0 10px rgba(var(--highlight-rgb), 0.9); }
    100% { box-shadow: 0 0 2px rgba(var(--highlight-rgb), 0.9); }
}

#remote-control {
    position: fixed; z-index: 11000; display: flex;
    flex-direction: ${Storage.get('remoteControl', CONFIG.remoteControl).orientation === 'horizontal' ? 'row' : 'column'};
    gap: var(--remote-button-gap);
    bottom: ${Storage.get('remoteControl', CONFIG.remoteControl).position?.bottom || CONFIG.remoteControl.position.bottom};
    right: ${Storage.get('remoteControl', CONFIG.remoteControl).position?.right || CONFIG.remoteControl.position.right};
}

.remote-button {
    width: var(--remote-button-size); height: var(--remote-button-size);
    border-radius: ${Storage.get('remoteControl', CONFIG.remoteControl).buttonShape === 'circle' ? '50%' : '4px'};
    background-size: cover; background-position: center; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    background-color: var(--main-color); font-weight: bold;
    font-size: calc(var(--remote-button-size) * 0.4);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

#output-panel {
    display: none; flex-direction: column; position: fixed; z-index: 10000;
    width: 350px; max-width: 95%; background: var(--main-color);
    height: 100%; bottom: 0px; right: 0px; padding: 10px;
    transition: width 0.2s, height 0.2s; backdrop-filter: blur(30px);
}

#extracted-text {
    min-height: 85%; overflow: auto; padding: 10px; word-break: break-word;
}

#top-menu { display: flex; gap: 10px; margin-bottom: 5px; }
.menu-button { padding: 5px 10px; background-color: rgba(255, 255, 255, 0.1); border: none; border-radius: 4px; cursor: pointer; }
.menu-button:hover { background-color: rgba(255, 255, 255, 0.2); }

#settings-panel {
    display: none; position: fixed; flex-direction: column;
    background-color: var(--main-color); padding: 20px; border-radius: 8px;
    z-index: 20000; width: 90%; max-width: 600px; height: 85vh;
    backdrop-filter: blur(30px); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.settings-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.settings-tabs { display: flex; flex-wrap: wrap; gap: 5px; margin: 15px 0; }
.settings-tab { padding: 8px 12px; background-color: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; cursor: pointer; }
.settings-tab.active { background-color: rgba(255, 255, 255, 0.15); color: var(--highlight-color); font-weight: bold; border-color: var(--highlight-color); }
.settings-content { flex-grow: 1; overflow: auto; min-height: 0; padding-right: 10px; }

.settings-section { display: none; }
.settings-section.active { display: block; }

/* --- New Preset Manager UI Styles --- */
.form-field-wrapper {
    margin-bottom: 15px;
}
.form-field-wrapper.inline-flex {
    display: flex;
    align-items: center;
    gap: 10px;
}
.form-field-label {
    flex-shrink: 0;
    width: 90px;
    font-size: 14px;
    opacity: 0.9;
}
.form-field-input-area {
    flex-grow: 1;
}
.form-input, .form-textarea, .form-select {
    width: 100%; padding: 8px; border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: rgba(0, 0, 0, 0.2); border-radius: 4px;
    font-size: 14px;
}
.form-input::placeholder, .form-textarea::placeholder {
    color: rgba(255, 255, 255, 0.5);
}
.form-textarea { min-height: 120px; resize: vertical; }
.form-checkbox-label { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
.form-checkbox { width: 16px; height: 16px; }
.form-button { padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; background-color: rgba(255, 255, 255, 0.1); }
.form-button:hover { background-color: rgba(255, 255, 255, 0.2); }
.form-button.primary { background-color: var(--highlight-color); color: white; }
.form-button > b { color: var(--highlight-color); font-weight: normal; }

.preset-list-item-header { display: flex; align-items: center; gap: 5px; }
.preset-list-item-title { flex-grow: 1; cursor: pointer; padding: 5px; }
.preset-list-item-controls button { font-size: 12px; padding: 4px 6px; }
.preset-edit-container { margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.15); border-radius: 4px; }
.form-button-group { margin-top: 20px; display: flex; gap: 10px; }
/* --- End of New Styles --- */

.close-button { position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 24px; cursor: pointer; z-index: 10; opacity: 0.7; }
.close-button:hover { opacity: 1; }

#translation-input-container { width: 100%; margin-top: 10px; }
#ko-en-input { margin-bottom: 10px; width: 100%; padding: 5px; border: 1px solid rgba(255, 255, 255, 0.2); background-color: rgba(255, 255, 255, 0.1); border-radius: 4px; }

#image-panel { display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: var(--main-color); padding: 5px; border-radius: 4px; z-index: 20000; width: 90%; max-width: 1300px; max-height: 90vh; backdrop-filter: blur(30px); }
.image-container { display: flex; flex-direction: column; align-items: center; }
.generated-image { max-width: 100%; }
.image-controls { display: flex; gap: 10px; }
.image-prompt { width: 80%; padding: 5px; margin: 10px 0; background-color: rgba(255, 255, 255, 0.1); border-radius: 4px; }
.panel-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); flex-shrink: 0; }
.draggable-handle { cursor: move; flex-grow: 1; user-select: none; padding: 10px; }

span.highlight-text { font-style: var(--italic-active) !important; font-weight: var(--bold-active) !important; color: var(--text-highlight-color) !important; }
.nm { margin: 0; }
h1, h2, h3 { font-family: inherit; }
`,
        // UI 요소 초기화
        init: function() {
            // 스타일 추가
            this.addStyles();

            // 리모컨 생성
            this.createRemoteControl();

            // 출력 패널 생성
            this.createOutputPanel();

            // 설정 패널 생성
            this.createSettingsPanel();

            // 이미지 패널 생성
            this.createImagePanel();

            // 키보드 단축키 설정
            this.setupKeyboardShortcuts();

            // 초기 UI 상태 설정
            this.updateTextStyle();
            this.toggleTranslationInput();
        },

        // 스타일 추가
        addStyles: function() {
            const styleElement = document.createElement('style');
            styleElement.textContent = this.styles;
            document.head.appendChild(styleElement);
        },

        // 리모컨 생성
        createRemoteControl: function() {
            const remoteControl = Utils.createElement('div', {
                id: 'remote-control'
            });

            // 번역 버튼
            const translateButton = Utils.createElement('div', {
                className: 'remote-button',
                id: 'translate-button',
                onclick: (e) => {
                    QRExecutor.execute('default-translate', e.currentTarget);
                }
            }, 'T');

            // 삽화 버튼
            const imageButton = Utils.createElement('div', {
                className: 'remote-button',
                id: 'image-button',
                style: { display: 'flex' },
                onclick: (e) => {
                    // 삽화 생성은 프롬프트 생성(1차) -> 이미지 생성(2차)으로 이루어짐
                    QRExecutor.execute('default-image-prompt', e.currentTarget);
                }
            }, 'I');

            // 설정 버튼
            const settingsButton = Utils.createElement('div', {
                className: 'remote-button',
                id: 'settings-button',
                onclick: () => this.toggleSettingsPanel()
            }, '⚙');

            remoteControl.appendChild(translateButton);
            remoteControl.appendChild(imageButton);
            remoteControl.appendChild(settingsButton);

            document.body.appendChild(remoteControl);

            // 리모컨 드래그 기능 추가
            const savedPosition = Storage.get('remotePosition', null);
            const draggable = Utils.makeDraggable(remoteControl, null, (position) => {
                Storage.set('remotePosition', position);
            });

            if (savedPosition) {
                draggable.moveTo(savedPosition);
            }

        },

// [교체할 대상: UI.createOutputPanel 함수]
        createOutputPanel: function() {
            const outputPanel = Utils.createElement('div', {
                id: 'output-panel'
            });

            // 상단 메뉴
            const topMenu = Utils.createElement('div', {
                id: 'top-menu'
            });

            const copyButton = Utils.createElement('button', {
                className: 'menu-button',
                id: 'copy-button',
                onclick: () => {
                    const text = Utils.stripHtml(document.getElementById('extracted-text').innerHTML);
                    Utils.copyToClipboard(text);
                }
            }, '복사');
            topMenu.appendChild(copyButton);

            // 텍스트 출력 영역
            const extractedText = Utils.createElement('div', {
                id: 'extracted-text'
            });

            // 번역 입력 컨테이너
            const translationInputContainer = Utils.createElement('div', {
                id: 'translation-input-container',
                style: { display: 'block' } // 항상 보이도록 수정
            });

            // 번역 입력 필드
            const koEnInput = Utils.createElement('input', {
                id: 'ko-en-input',
                type: 'text',
                placeholder: '번역할 한국어를 입력하세요 (Enter로 번역)',
                onkeypress: async (e) => {
                    if (e.key === 'Enter' && e.target.value.trim() !== '') {
                        const text = e.target.value;
                        e.target.value = '';

                        // QRExecutor에 옵션을 전달하여 특정 슬롯에 사용자 입력을 삽입하도록 함
                        await QRExecutor.execute('default-ko-en-translate', e.target, {
                            directUserInput: text,
                            userInputSlot: 'afterSuffix'
                        });
                    }
                }
            });

            translationInputContainer.appendChild(koEnInput);

            outputPanel.appendChild(topMenu);
            outputPanel.appendChild(extractedText);
            outputPanel.appendChild(translationInputContainer);

            document.body.appendChild(outputPanel);

            // 출력 패널 클릭 이벤트 (닫기)
            extractedText.addEventListener('click', () => {
                this.toggleOutputPanel(false);
            });
        },
        
        // 설정 패널 생성
        createSettingsPanel: function() {
            const settingsPanel = Utils.createElement('div', {
                id: 'settings-panel'
            });

            // 헤더
            const header = Utils.createElement('div', {
                className: 'settings-header'
            });

            const title = Utils.createElement('h2', {}, '설정');

            const closeButton = Utils.createElement('button', {
                className: 'close-button',
                onclick: () => this.toggleSettingsPanel(false)
            }, '✕');

            header.appendChild(title);
            header.appendChild(closeButton);

            // 탭 메뉴
            const tabs = Utils.createElement('div', {
                className: 'settings-tabs'
            });

            const tabsData = [
                { id: 'output', label: '출력' },
                { id: 'qr', label: 'QR' },
                { id: 'ai', label: 'AI' },
                { id: 'prompt', label: '프롬프트' },
                { id: 'remote', label: '리모컨' }
            ];

            tabsData.forEach((tabData, index) => {
                const tab = Utils.createElement('button', {
                    className: `settings-tab ${index === 0 ? 'active' : ''}`,
                    dataset: { tab: tabData.id },
                    onclick: (e) => this.switchSettingsTab(e.target.dataset.tab)
                }, tabData.label);
                tabs.appendChild(tab);
            });

            // 설정 내용 영역
            const content = Utils.createElement('div', {
                className: 'settings-content'
            });
            
            const outputSection = this.createOutputSettingsSection();
            outputSection.classList.add('active');

            // [수정] QR 섹션 생성 함수 호출
            const qrSection = this.createQrSettingsSection();
            
            const aiSection = this.createAiSettingsSection();
            const promptSection = this.createPromptSettingsSection();
            const remoteSection = this.createRemoteSettingsSection();

            content.appendChild(outputSection);
            content.appendChild(qrSection);
            content.appendChild(aiSection);
            content.appendChild(promptSection);
            content.appendChild(remoteSection);

            settingsPanel.appendChild(header);
            settingsPanel.appendChild(tabs);
            settingsPanel.appendChild(content);

            document.body.appendChild(settingsPanel);

            const savedPosition = localStorage.getItem("settingsPanelPosition");
            if (!savedPosition) {
                setTimeout(() => {
                    const panelRect = settingsPanel.getBoundingClientRect();
                    const left = (window.innerWidth - panelRect.width) / 2;
                    const top = (window.innerHeight - panelRect.height) / 2;
                    settingsPanel.style.left = left + 'px';
                    settingsPanel.style.top = top + 'px';
                }, 0);
            }

            const draggableHeader = settingsPanel.querySelector('.settings-header');
            if (draggableHeader) {
                Utils.makeDraggable(settingsPanel, draggableHeader, null, "settingsPanelPosition");
            }
        },
    
// 출력 설정 섹션 생성
// [교체할 대상: UI.createOutputSettingsSection 함수]
    createOutputSettingsSection: function() {
        const section = Utils.createElement('div', {
            className: 'settings-section',
            id: 'output-settings'
        });

        // 대사 강조 옵션
        const highlightGroup = Utils.createElement('div', {
            className: 'form-group'
        });

        const highlightLabel = Utils.createElement('label', {
            className: 'form-label'
        }, '대사강조:');

        // 이탤릭 체크박스
        const italicContainer = Utils.createElement('div', {
            style: { marginBottom: '5px' }
        });

        const italicCheckbox = Utils.createElement('input', {
            className: 'form-checkbox',
            id: 'italic-checkbox',
            type: 'checkbox',
            onchange: (e) => {
                Storage.set('ns-italic', e.target.checked);
                this.updateTextStyle();
            }
        });
        italicCheckbox.checked = Storage.get('ns-italic', false);

        const italicLabel = Utils.createElement('label', {
            for: 'italic-checkbox'
        }, '이탤릭');

        italicContainer.appendChild(italicCheckbox);
        italicContainer.appendChild(italicLabel);

        // 볼드 체크박스
        const boldContainer = Utils.createElement('div', {
            style: { marginBottom: '5px' }
        });

        const boldCheckbox = Utils.createElement('input', {
            className: 'form-checkbox',
            id: 'bold-checkbox',
            type: 'checkbox',
            onchange: (e) => {
                Storage.set('ns-bold', e.target.checked);
                this.updateTextStyle();
            }
        });
        boldCheckbox.checked = Storage.get('ns-bold', false);

        const boldLabel = Utils.createElement('label', {
            for: 'bold-checkbox'
        }, '볼드');

        boldContainer.appendChild(boldCheckbox);
        boldContainer.appendChild(boldLabel);

        // 하이라이트 체크박스
        const highlightContainer = Utils.createElement('div', {
            style: { marginBottom: '5px' }
        });

        const highlightCheckbox = Utils.createElement('input', {
            className: 'form-checkbox',
            id: 'highlight-checkbox',
            type: 'checkbox',
            onchange: (e) => {
                Storage.set('ns-highlight', e.target.checked);
                this.updateTextStyle();
            }
        });
        highlightCheckbox.checked = Storage.get('ns-highlight', false);

        const highlightCheckboxLabel = Utils.createElement('label', {
            for: 'highlight-checkbox'
        }, '하이라이트');

        highlightContainer.appendChild(highlightCheckbox);
        highlightContainer.appendChild(highlightCheckboxLabel);

        highlightGroup.appendChild(highlightLabel);
        highlightGroup.appendChild(italicContainer);
        highlightGroup.appendChild(boldContainer);
        highlightGroup.appendChild(highlightContainer);

        // 하이라이트 색상
        const colorGroup = Utils.createElement('div', {
            className: 'form-group'
        });

        const colorLabel = Utils.createElement('label', {
            className: 'form-label',
            for: 'color-code'
        }, '하이라이트 색상:');

        const colorInput = Utils.createElement('input', {
            className: 'form-input',
            id: 'color-code',
            type: 'text',
            value: Storage.get('colorCode', CONFIG.defaultHighlightColor),
            oninput: (e) => {
                Storage.set('colorCode', e.target.value);
                document.documentElement.style.setProperty('--highlight-color', e.target.value);
                this.updateTextStyle();
            }
        });

        const colorHelp = Utils.createElement('small', {}, '칼라코드는 #을 함께 입력');

        colorGroup.appendChild(colorLabel);
        colorGroup.appendChild(colorInput);
        colorGroup.appendChild(colorHelp);

        // 설정 백업/복원
        const backupGroup = Utils.createElement('div', {
            className: 'form-group',
            style: { marginTop: '20px' }
        });

        const backupLabel = Utils.createElement('label', {
            className: 'form-label'
        }, '설정 백업/복원:');

        const backupButtons = Utils.createElement('div', {
            style: { display: 'flex', gap: '10px' }
        });

        const backupButton = Utils.createElement('button', {
            className: 'form-button',
            onclick: () => {
                const backupData = Storage.backupAll();
                Utils.copyToClipboard(backupData);
                alert('설정이 클립보드에 복사되었습니다.');
            }
        }, '백업 복사');
        
        const restoreButton = Utils.createElement('button', {
            className: 'form-button',
            onclick: () => {
                const backupData = prompt('백업 데이터를 붙여넣으세요:');
                if (backupData) {
                    const success = Storage.restoreAll(backupData);
                    if (success) {
                        alert('설정이 복원되었습니다. 페이지를 새로고침하여 모든 변경사항을 적용하세요.');
                        location.reload();
                    } else {
                        alert('설정 복원에 실패했습니다. 백업 데이터를 확인하세요.');
                    }
                }
            }
        }, '백업 복원');

        backupButtons.appendChild(backupButton);
        backupButtons.appendChild(restoreButton);

        backupGroup.appendChild(backupLabel);
        backupGroup.appendChild(backupButtons);

        section.appendChild(highlightGroup);
        section.appendChild(colorGroup);
        section.appendChild(backupGroup);

        const restoreDefaultsGroup = Utils.createElement('div', {
            className: 'form-group', style: { marginTop: '20px' }
        });
        const restoreDefaultsLabel = Utils.createElement('label', {
            className: 'form-label'
        }, '기능 초기화:');
        const restoreDefaultsDescription = Utils.createElement('p', {
            style: { fontSize: '12px', opacity: '0.8', margin: '0 0 5px 0' }
        }, '번역, 삽화 생성 등 기본 제공 기능을 초기 설정으로 되돌립니다. 사용자가 만든 다른 QR은 영향을 받지 않습니다.');
        
        const restoreDefaultsButton = Utils.createElement('button', {
            className: 'form-button',
            onclick: () => {
                if (confirm('기본 제공 프리셋(프롬프트, AI, QR) 설정을 모두 초기값으로 되돌리시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    // 1. 데이터 복원
                    Storage.upsertDefaultPresets(true);
                    alert('기본 기능이 초기 설정으로 복구되었습니다.');

                    // [수정] UI 새로고침 로직을 여기에 직접 추가
                    const oldPanel = document.getElementById('settings-panel');
                    if (oldPanel) {
                        oldPanel.remove();
                    }
                    this.createSettingsPanel();
                    this.toggleSettingsPanel(true);
                }
            }
        }, '기본 기능 복구');

        restoreDefaultsGroup.appendChild(restoreDefaultsLabel);
        restoreDefaultsGroup.appendChild(restoreDefaultsDescription);
        restoreDefaultsGroup.appendChild(restoreDefaultsButton);
        section.appendChild(restoreDefaultsGroup);
        return section;
    },

        // QR 설정 섹션 생성 (레이아웃 기반으로 재작성)
        createQrSettingsSection: function() {
            const createSlotField = (key, label) => ({
                key, label, type: 'popupSelector',
                sourceGetter: Storage.getPrompts.bind(Storage),
                allowUserInput: true
            });

            const slotOptions = [
                { value: 'prefix', label: '서문 (Prefix)' }, { value: 'afterPrefix', label: '서문 후 (After Prefix)' },
                { value: 'beforeBody', label: '본문 전 (Before Body)' }, { value: 'afterBody', label: '본문 후 (After Body)' },
                { value: 'beforeSuffix', label: '탈옥 전 (Before Suffix)' }, { value: 'suffix', label: '탈옥 (Suffix)' },
                { value: 'afterSuffix', label: '탈옥 후 (After Suffix)' }
            ];

            return PresetManagerUI.createManager({
                presetType: 'qr',
                title: 'QR 프리셋 관리',
                storageGetter: Storage.getQRs.bind(Storage),
                storageSetter: Storage.setQRs.bind(Storage),
                getNewItemData: () => ({ id: `qr-${Date.now()}`, name: '새 QR', aiPresetId: '', category: null, slots: { prefix: null, afterPrefix: null, beforeBody: null, afterBody: null, beforeSuffix: null, suffix: null, afterSuffix: null }, extractLength: 1000, postProcess: { action: 'output_panel', nextQrId: null, insertSlot: null }, remote: { visible: true, favorite: false } }),
                layout: [ // [수정] 사용자가 요청한 원래 순서로 복원
                    [{ key: 'name', label: '이름', type: 'text' }],
                    [createSlotField('slots.prefix', '서문')],
                    [{ key: 'extractLength', label: '본문 추출', type: 'number', placeholder: '추출할 글자 수' }],
                    [createSlotField('slots.suffix', '탈옥')],
                    [createSlotField('slots.afterPrefix', '서문 후')],
                    [createSlotField('slots.beforeBody', '본문 전')],
                    [createSlotField('slots.afterBody', '본문 후')],
                    [createSlotField('slots.beforeSuffix', '탈옥 전')],
                    [createSlotField('slots.afterSuffix', '탈옥 후')],
                    [{ key: 'aiPresetId', label: 'AI 프리셋', type: 'popupSelector', sourceGetter: Storage.getAiPresets.bind(Storage) }],
                    [{ key: 'postProcess.action', label: '후처리 방식', type: 'select', options: [
                        { value: 'output_panel', label: '출력창' }, { value: 'prosemirror', label: '본문입력' },
                        { value: 'image_panel', label: '삽화창' }, { value: 'multi_qr', label: '연속실행' },
                        { value: 'none', label: '없음' },
                    ]}],
                    [{ key: 'postProcess.nextQrId', label: '다음 QR', type: 'popupSelector', sourceGetter: Storage.getQRs.bind(Storage), showIf: item => item.postProcess.action === 'multi_qr' }],
                    [{ key: 'postProcess.insertSlot', label: '응답 삽입', type: 'select', options: slotOptions, showIf: item => item.postProcess.action === 'multi_qr' }],
                    [{ key: 'category', label: '분류', type: 'category' }],
                    [{ key: 'remote.visible', label: '리모콘에 표시', type: 'checkbox' }],
                    [{ key: 'remote.favorite', label: '즐겨찾기에 표시', type: 'checkbox' }],
                ]
            });
        },
        // AI 설정 섹션 생성 (레이아웃 기반으로 수정)
        createAiSettingsSection: function() {
            return PresetManagerUI.createManager({
                presetType: 'ai',
                title: 'AI 프리셋 관리',
                storageGetter: Storage.getAiPresets.bind(Storage),
                storageSetter: Storage.setAiPresets.bind(Storage),
                getNewItemData: () => ({ id: `ai-${Date.now()}`, name: '새 AI 프리셋', type: 'gemini', apiKey: '', endpoint: '', category: null, parameters: { model: '', temperature: 0.7, topP: 1, topK: 32, nai: { negative_prompt: '', width: 832, height: 1216, sampler: 'k_euler_ancestral', scheduler: 'karras', steps: 28, scale: 6 } } }),
                layout: [
                    [{ key: 'name', label: '이름', type: 'text' }],
                    [{ key: 'type', label: '요청 방식', type: 'select', options: [ { value: 'gemini', label: 'Gemini' }, { value: 'novelai', label: 'NovelAI' } ] }],
                    [{ key: 'apiKey', label: 'API 키', type: 'text', placeholder: 'API 키를 입력하세요' }],
                    [{ key: 'endpoint', label: '엔드포인트', type: 'text', placeholder: 'API 엔드포인트 URL' }],
                    [{ key: 'parameters.model', label: '모델명', type: 'text', placeholder: '사용할 모델 이름' }],
                    [{ key: 'parameters.temperature', label: '온도', type: 'number', showIf: i => i.type === 'gemini' }],
                    [{ key: 'parameters.topK', label: 'Top-K', type: 'number', showIf: i => i.type === 'gemini' }],
                    [{ key: 'parameters.topP', label: 'Top-P', type: 'number', showIf: i => i.type === 'gemini' }],
                    [{ key: 'parameters.nai.negative_prompt', label: 'UC 프롬프트', type: 'textarea', showIf: i => i.type === 'novelai' }],
                    [{ type: 'sizeSelector', label: '이미지 크기', showIf: i => i.type === 'novelai',
                        keys: { width: 'parameters.nai.width', height: 'parameters.nai.height' },
                        options: [ { value: '832x1216', label: 'Portrait (832x1216)' }, { value: '1216x832', label: 'Landscape (1216x832)' }, { value: '1024x1024', label: 'Square (1024x1024)' } ]
                    }],
                    [{ key: 'parameters.nai.scale', label: '스케일', type: 'number', showIf: i => i.type === 'novelai' }],
                    [{ key: 'parameters.nai.steps', label: '스텝', type: 'number', showIf: i => i.type === 'novelai' }],
                    [{ key: 'parameters.nai.sampler', label: '샘플러', type: 'select', showIf: i => i.type === 'novelai', options: [ { value: 'k_euler_ancestral', label: 'k_euler_ancestral' }, { value: 'k_euler', label: 'k_euler' }, { value: 'k_dpmpp_2m', label: 'k_dpmpp_2m' }, { value: 'k_dpmpp_sde', label: 'k_dpmpp_sde' }, { value: 'k_dpmpp_2s_ancestral', label: 'k_dpmpp_2s_ancestral' }, { value: 'k_dpm_fast', label: 'k_dpm_fast' }, { value: 'ddim', label: 'ddim' } ] }],
                    [{ key: 'parameters.nai.scheduler', label: '스케줄러', type: 'select', showIf: i => i.type === 'novelai', options: [ { value: 'karras', label: 'karras' }, { value: 'native', label: 'native' }, { value: 'exponential', label: 'exponential' }, { value: 'polyexponential', label: 'polyexponential' } ] }],
                    [{ key: 'category', label: '분류', type: 'category' }]
                ]
            });
        },
                    // 프롬프트 설정 섹션 생성 (레이아웃 기반으로 수정)
        createPromptSettingsSection: function() {
            return PresetManagerUI.createManager({
                presetType: 'prompt',
                title: '프롬프트 프리셋 관리',
                storageGetter: Storage.getPrompts.bind(Storage),
                storageSetter: Storage.setPrompts.bind(Storage),
                getNewItemData: () => ({ id: `prompt-${Date.now()}`, name: '새 프롬프트', content: '', category: null }),
                layout: [
                    [{ key: 'name', label: '이름', type: 'text', placeholder: '프리셋 이름' }],
                    [{ key: 'content', label: '내용', type: 'textarea', placeholder: '프롬프트 내용을 입력하세요' }],
                    [{ key: 'category', label: '분류', type: 'category' }]
                ]
            });
        },
        
        // 리모컨 설정 섹션 생성
        createRemoteSettingsSection: function() {
            const section = Utils.createElement('div', {
                className: 'settings-section',
                id: 'remote-settings'
            });

            const title = Utils.createElement('h3', {}, '리모컨 설정');

            // 버튼 크기
            const sizeGroup = Utils.createElement('div', {
                className: 'form-group'
            });

            const sizeLabel = Utils.createElement('label', {
                className: 'form-label',
                for: 'remote-button-size'
            }, '버튼 크기:');

            const sizeInput = Utils.createElement('input', {
                className: 'form-input',
                id: 'remote-button-size',
                type: 'number',
                min: '20',
                max: '500',
                value: Storage.get('remoteControl', CONFIG.remoteControl).buttonSize || CONFIG.remoteControl.buttonSize,
                oninput: (e) => {
                    const remoteConfig = Storage.get('remoteControl', CONFIG.remoteControl);
                    remoteConfig.buttonSize = parseInt(e.target.value);
                    Storage.set('remoteControl', remoteConfig);
                    document.documentElement.style.setProperty('--remote-button-size', e.target.value + 'px');
                }
            });

            sizeGroup.appendChild(sizeLabel);
            sizeGroup.appendChild(sizeInput);

            // 버튼 간격
            const gapGroup = Utils.createElement('div', {
                className: 'form-group'
            });

            const gapLabel = Utils.createElement('label', {
                className: 'form-label',
                for: 'remote-button-gap'
            }, '버튼 간격:');

            const gapInput = Utils.createElement('input', {
                className: 'form-input',
                id: 'remote-button-gap',
                type: 'number',
                min: '0',
                max: '50',
                value: Storage.get('remoteControl', CONFIG.remoteControl).buttonGap || CONFIG.remoteControl.buttonGap,
                oninput: (e) => {
                    const remoteConfig = Storage.get('remoteControl', CONFIG.remoteControl);
                    remoteConfig.buttonGap = parseInt(e.target.value);
                    Storage.set('remoteControl', remoteConfig);
                    document.documentElement.style.setProperty('--remote-button-gap', e.target.value + 'px');
                }
            });

            gapGroup.appendChild(gapLabel);
            gapGroup.appendChild(gapInput);

            // 버튼 모양
            const shapeGroup = Utils.createElement('div', {
                className: 'form-group'
            });

            const shapeLabel = Utils.createElement('label', {
                className: 'form-label'
            }, '버튼 모양:');

            // 동그라미 라디오 버튼
            const circleContainer = Utils.createElement('div', {
                style: { marginBottom: '5px' }
            });

            const circleRadio = Utils.createElement('input', {
                className: 'form-checkbox',
                id: 'circle-radio',
                type: 'radio',
                name: 'button-shape',
                onchange: (e) => {
                    if (e.target.checked) {
                        const remoteConfig = Storage.get('remoteControl', CONFIG.remoteControl);
                        remoteConfig.buttonShape = 'circle';
                        Storage.set('remoteControl', remoteConfig);

                        const buttons = document.querySelectorAll('.remote-button');
                        buttons.forEach(button => {
                            button.style.borderRadius = '50%';
                        });
                    }
                }
            });
            circleRadio.checked = Storage.get('remoteControl', CONFIG.remoteControl).buttonShape === 'circle';

            const circleLabel = Utils.createElement('label', {
                for: 'circle-radio'
            }, '동그라미');

            circleContainer.appendChild(circleRadio);
            circleContainer.appendChild(circleLabel);

            // 네모 라디오 버튼
            const squareContainer = Utils.createElement('div', {
                style: { marginBottom: '5px' }
            });

            const squareRadio = Utils.createElement('input', {
                className: 'form-checkbox',
                id: 'square-radio',
                type: 'radio',
                name: 'button-shape',
                onchange: (e) => {
                    if (e.target.checked) {
                        const remoteConfig = Storage.get('remoteControl', CONFIG.remoteControl);
                        remoteConfig.buttonShape = 'square';
                        Storage.set('remoteControl', remoteConfig);

                        const buttons = document.querySelectorAll('.remote-button');
                        buttons.forEach(button => {
                            button.style.borderRadius = '4px';
                        });
                    }
                }
            });
            squareRadio.checked = Storage.get('remoteControl', CONFIG.remoteControl).buttonShape === 'square';

            const squareLabel = Utils.createElement('label', {
                for: 'square-radio'
            }, '네모');

            squareContainer.appendChild(squareRadio);
            squareContainer.appendChild(squareLabel);

            shapeGroup.appendChild(shapeLabel);
            shapeGroup.appendChild(circleContainer);
            shapeGroup.appendChild(squareContainer);

            // 버튼 배열
            const orientationGroup = Utils.createElement('div', {
                className: 'form-group'
            });

            const orientationLabel = Utils.createElement('label', {
                className: 'form-label'
            }, '버튼 배열:');

            // 세로 배열 라디오 버튼
            const verticalContainer = Utils.createElement('div', {
                style: { marginBottom: '5px' }
            });

            const verticalRadio = Utils.createElement('input', {
                className: 'form-checkbox',
                id: 'vertical-radio',
                type: 'radio',
                name: 'button-orientation',
	                   onchange: (e) => {
                    if (e.target.checked) {
                        const remoteConfig = Storage.get('remoteControl', CONFIG.remoteControl);
                        remoteConfig.orientation = 'vertical';
                        Storage.set('remoteControl', remoteConfig);

                        const remoteControl = document.getElementById('remote-control');
                        if (remoteControl) {
                            remoteControl.style.flexDirection = 'column';
                        }
                    }
                }
            });
                verticalRadio.checked = Storage.get('remoteControl', CONFIG.remoteControl).orientation === 'vertical';

            const verticalLabel = Utils.createElement('label', {
                for: 'vertical-radio'
            }, '세로 배열');

            verticalContainer.appendChild(verticalRadio);
            verticalContainer.appendChild(verticalLabel);

            // 가로 배열 라디오 버튼
            const horizontalContainer = Utils.createElement('div', {
                style: { marginBottom: '5px' }
            });

            const horizontalRadio = Utils.createElement('input', {
                className: 'form-checkbox',
                id: 'horizontal-radio',
                type: 'radio',
                name: 'button-orientation',
                onchange: (e) => {
                    if (e.target.checked) {
                        const remoteConfig = Storage.get('remoteControl', CONFIG.remoteControl);
                        remoteConfig.orientation = 'horizontal';
                        Storage.set('remoteControl', remoteConfig);

                        const remoteControl = document.getElementById('remote-control');
                        if (remoteControl) {
                            remoteControl.style.flexDirection = 'row';
                        }
                    }
                }
            });
            horizontalRadio.checked = Storage.get('remoteControl', CONFIG.remoteControl).orientation === 'horizontal';

            const horizontalLabel = Utils.createElement('label', {
                for: 'horizontal-radio'
            }, '가로 배열');

            horizontalContainer.appendChild(horizontalRadio);
            horizontalContainer.appendChild(horizontalLabel);

            orientationGroup.appendChild(orientationLabel);
            orientationGroup.appendChild(verticalContainer);
            orientationGroup.appendChild(horizontalContainer);

            // 아이콘 위치 초기화
            const resetGroup = Utils.createElement('div', {
                className: 'form-group',
                style: { marginTop: '20px' }
            });

            const resetButton = Utils.createElement('button', {
                className: 'form-button',
                onclick: () => {
                    const remoteControl = document.getElementById('remote-control');
                    if (remoteControl) {
                        remoteControl.style.right = CONFIG.remoteControl.position.right;
                        remoteControl.style.bottom = CONFIG.remoteControl.position.bottom;

                        const remoteConfig = Storage.get('remoteControl', CONFIG.remoteControl);
                        remoteConfig.position = { ...CONFIG.remoteControl.position };
                        Storage.set('remoteControl', remoteConfig);
                        Storage.remove('remotePosition');
                    }
                }
            }, '아이콘 위치 초기화');

            resetGroup.appendChild(resetButton);

            section.appendChild(title);
            section.appendChild(sizeGroup);
            section.appendChild(gapGroup);
            section.appendChild(shapeGroup);
            section.appendChild(orientationGroup);
            section.appendChild(resetGroup);

            return section;
        },
                // 이미지 패널 생성
        createImagePanel: function() {
            const imagePanel = Utils.createElement('div', {
                id: 'image-panel',
                className: 'image-panel' // CSS 클래스 적용
            });

            // 헤더
            const header = Utils.createElement('div', {
                className: 'settings-header' // settings-header 클래스 적용
            });

            const title = Utils.createElement('h3', {
                className: 'draggable-handle'
            }, '삽화 생성');

            const closeButton = Utils.createElement('button', {
                className: 'close-button',
                onclick: () => this.toggleImagePanel(false)
            }, '✕');

            header.appendChild(title);
            header.appendChild(closeButton);

            // 스크롤 가능한 내용 영역
            const scrollableContent = Utils.createElement('div', {
                className: 'settings-content' // settings-content 클래스 적용
            });

            // 이미지 컨테이너
            const imageContainer = Utils.createElement('div', {
                className: 'image-container'
            });

            // 이미지
            const image = Utils.createElement('img', {
                className: 'generated-image',
                id: 'generated-image',
                alt: '생성된 삽화'
            });

            // 프롬프트
            const promptText = Utils.createElement('div', {
                className: 'image-prompt',
                id: 'image-prompt-text'
            });

            // 컨트롤
            const controls = Utils.createElement('div', {
                className: 'image-controls'
            });

            const downloadButton = Utils.createElement('button', {
                className: 'form-button',
                id: 'download-button'
            }, '다운로드');

            const regenerateButton = Utils.createElement('button', {
                className: 'form-button',
                id: 'regenerate-button'
            }, '재생성');

            controls.appendChild(downloadButton);
            controls.appendChild(regenerateButton);

            imageContainer.appendChild(image);
            imageContainer.appendChild(promptText);
            imageContainer.appendChild(controls);

            scrollableContent.appendChild(imageContainer);

            imagePanel.appendChild(header);
            imagePanel.appendChild(scrollableContent);

            document.body.appendChild(imagePanel);
        },



        // 설정 탭 전환
        switchSettingsTab: function(tabId) {
            // 모든 탭 비활성화
            document.querySelectorAll('.settings-tab').forEach(tab => {
                tab.classList.remove('active');
            });

            // 모든 섹션 숨김
            document.querySelectorAll('.settings-section').forEach(section => {
                section.classList.remove('active');
            });

            // 선택한 탭 활성화
            document.querySelector(`.settings-tab[data-tab="${tabId}"]`).classList.add('active');

            // 선택한 섹션 표시
            document.getElementById(`${tabId}-settings`).classList.add('active');
        },

        // 설정 패널 토글
        toggleSettingsPanel: function(show = null) {
            const panel = document.getElementById('settings-panel');
            if (!panel) return;

            if (show === null) {
                show = panel.style.display === 'none' || panel.style.display === '';
            }

            panel.style.display = show ? 'flex' : 'none';

            if (show) {
                this.extractMainColor();
            }
        },

        // 출력 패널 토글
        toggleOutputPanel: function(show = null) {
            const panel = document.getElementById('output-panel');
            if (!panel) return;

            if (show === null) {
                show = panel.style.display === 'none' || panel.style.display === '';
            }

            panel.style.display = show ? 'flex' : 'none';

            if (show) {
                this.extractMainColor();
            }
        },

        // 이미지 패널 토글
        toggleImagePanel: function(show = null) {
            const panel = document.getElementById('image-panel');
            if (!panel) return;

            if (show === null) {
                show = panel.style.display === 'none' || panel.style.display === '';
            }

            panel.style.display = show ? 'flex' : 'none';

            if (show) {
                this.extractMainColor();
            }
        },

        // 번역 입력 토글
	toggleTranslationInput: function() {
    const container = document.getElementById('translation-input-container');
    if (!container) return;
    container.style.display = 'block'; 
},
        
        // 텍스트 스타일 업데이트
        updateTextStyle: function() {
            const italicActive = Storage.get('ns-italic', false);
            const boldActive = Storage.get('ns-bold', false);
            const highlightActive = Storage.get('ns-highlight', false);
            const colorCode = Storage.get('colorCode', CONFIG.defaultHighlightColor);

            const newItalic = italicActive ? 'italic' : 'normal';
            const newBold = boldActive ? 'bold' : 'normal';
            const newColor = highlightActive ? colorCode : 'inherit';

            document.documentElement.style.setProperty('--italic-active', newItalic);
            document.documentElement.style.setProperty('--bold-active', newBold);
            document.documentElement.style.setProperty('--text-highlight-color', newColor);
        },

        // 메인 색상 추출
        extractMainColor: function() {
            const infobarElement = document.querySelector('.menubar');
            if (infobarElement) {
                const mainColor = window.getComputedStyle(infobarElement).backgroundColor;
                document.documentElement.style.setProperty('--main-color', mainColor);
                Storage.set('tMainColor', mainColor);
            }
        }
    };
        // ======================== QR 실행기 모듈 (재구성) ========================
    const QRExecutor = {
        /**
         * QR을 실행하는 메인 함수
         * @param {string} qrId - 실행할 QR의 ID
         * @param {HTMLElement | null} buttonElement - 로딩 애니메이션을 적용할 요소
         * @param {Object} [options={}] - 추가 옵션 객체
         * @param {string} [options.directUserInput=null] - 전용 UI를 통해 직접 전달된 사용자 입력
         * @param {string} [options.previousResponse=null] - 다중 QR용 이전 응답
         */
 // [교체할 대상: QRExecutor.execute 함수]
        async execute(qrId, buttonElement, options = {}) {
            Utils.toggleLoading(true, buttonElement);

            try {
                const qr = Storage.getQRById(qrId);
                if (!qr) throw new Error(`ID가 '${qrId}'인 QR을 찾을 수 없습니다.`);

                const aiPreset = Storage.getAiPresetById(qr.aiPresetId);
                if (!aiPreset) throw new Error(`QR '${qr.name}'에 연결된 ID '${qr.aiPresetId}'의 AI 프리셋을 찾을 수 없습니다.`);

                // 1. 사용자 입력 수집 (옵션 전달)
                const userInputs = await this._collectUserInputs(qr, options);
                if (userInputs === null) { // 사용자가 입력을 취소한 경우
                    Utils.toggleLoading(false, buttonElement);
                    return;
                }

                // 2. 프롬프트 조합
                const fullPrompt = this._assemblePrompt(qr, userInputs, options.previousResponse, aiPreset.type);

                // 3. API 핸들러 호출
                const apiResponse = await ApiHandler.request(aiPreset, fullPrompt);

                // 4. 후처리
                await this._handlePostProcess(qr, apiResponse, buttonElement);

            } catch (error) {
                console.error(`QR 실행 오류 (ID: ${qrId}):`, error);
                alert(`QR 실행 중 오류 발생: ${error.message}`);
            } finally {
                // 다중 QR이 아닌 경우에만 로딩 상태를 여기서 해제
                const finalQr = Storage.getQRById(qrId);
                if (finalQr && finalQr.postProcess.action !== 'multi_qr') {
                    Utils.toggleLoading(false, buttonElement);
                }
            }
        },

        /**
         * 사용자 입력을 수집
         * @private
         */
         
        async _collectUserInputs(qr, options = {}) {
            const inputs = {};
            const slotOrder = ['prefix', 'afterPrefix', 'beforeBody', 'afterBody', 'beforeSuffix', 'suffix', 'afterSuffix'];
            
            for (const slotName of slotOrder) {
                const slotValue = qr.slots[slotName];
                if (typeof slotValue === 'object' && slotValue?.type === 'user_input') {
                    let userInput;
                    // 옵션으로 직접 입력값이 들어오고, 해당 슬롯이 맞는지 확인
                    if (options.directUserInput && options.userInputSlot === slotName) {
                        userInput = options.directUserInput;
                        options.directUserInput = null; // 한번 사용했으므로 비움
                    } else {
                        // 그 외의 경우엔 프롬프트로 입력 받음
                        userInput = prompt(slotValue.caption);
                    }

                    if (userInput === null) return null; // 사용자가 취소
                    inputs[slotName] = userInput;
                }
            }
            return inputs;
        },
        /**
         * 프롬프트를 조합 (aiType에 따라 구분자 변경)
         * @private
         */
        _assemblePrompt(qr, userInputs, previousResponse, aiType) {
            const promptParts = [];
            const slotOrder = ['prefix', 'afterPrefix', 'beforeBody', 'afterBody', 'beforeSuffix', 'suffix', 'afterSuffix'];
            
            const bodyText = (qr.extractLength > 0) ? this._extractBodyText(qr.extractLength) : '';

            for (const slotName of slotOrder) {
                // 이전 QR 응답 삽입
                if (qr.postProcess.insertSlot === slotName && previousResponse) {
                    promptParts.push(previousResponse);
                }
                
                const slotValue = qr.slots[slotName];
                if (slotValue) {
                    if (typeof slotValue === 'string') { // 프롬프트 ID
                        const promptPreset = Storage.getPromptById(slotValue);
                        if(promptPreset) promptParts.push(promptPreset.content);
                    } else if (slotValue.type === 'user_input') { // 사용자 입력
                        promptParts.push(userInputs[slotName]);
                    }
                }

                // 본문은 afterBody 슬롯 처리 직후 삽입
                if (slotName === 'afterBody') {
                    if (bodyText) promptParts.push(bodyText);
                }
            }
            
            const filteredParts = promptParts.filter(p => p && (typeof p === 'string' && p.trim() !== ''));

            // AI 유형에 따라 조합 방식 변경
            if (aiType === 'novelai') {
                // NovelAI는 쉼표로 구분
                return filteredParts.join(', ');
            } else {
                // Gemini 등 다른 AI는 줄바꿈으로 구분
                return filteredParts.join('\n\n');
            }
        },
        
        /**
         * 본문 텍스트 추출
         * @private
         */
        _extractBodyText(length) {
            const proseMirrorDiv = document.querySelector('.ProseMirror');
            if (!proseMirrorDiv) return '';
            const paragraphs = proseMirrorDiv.querySelectorAll('p');
            let pText = '';
            for (let i = paragraphs.length - 1; i >= 0; i--) {
                pText = paragraphs[i].textContent + '\n' + pText;
                if (pText.length >= length) break;
            }
            return pText.slice(-length);
        },

        /**
         * API 응답 후처리
         * @private
         */
        async _handlePostProcess(qr, response, buttonElement) {
            let isLoadingFinished = true;

            switch(qr.postProcess.action) {
                case 'output_panel':
                    UI.toggleOutputPanel(true);
                    Features.Translation.displayFormattedText(response);
                    break;
                
                case 'prosemirror':
                    const proseMirror = document.querySelector('.ProseMirror');
                    const lastParagraph = proseMirror?.querySelector('p:last-child');
                    if (lastParagraph) {
                        const span = document.createElement('span');
                        span.className = 'userText';
                        span.textContent = ' ' + response;
                        lastParagraph.appendChild(span);
                        window.getSelection().collapse(lastParagraph, lastParagraph.childNodes.length);
                    }
                    break;

                case 'image_panel':
                    if (typeof response === 'object' && response.imageUrl) {
                        Features.Image.displayImage(response.imageUrl, response.prompt, response.imageName);
                    } else {
                        throw new Error("이미지 생성 후처리 오류: 유효한 이미지 객체를 받지 못했습니다.");
                    }
                    break;

                case 'multi_qr':
                    if (qr.postProcess.nextQrId) {
                        isLoadingFinished = false;
                        await this.execute(qr.postProcess.nextQrId, buttonElement, {
                            previousResponse: response
                        });
                    }
                    break;
                
                case 'none':
                default:
                    break;
            }

            if (isLoadingFinished) {
                Utils.toggleLoading(false, buttonElement);
            }
        }
    };
    
    // ======================== NEW: API 핸들러 모듈 ========================
    const ApiHandler = {
        /**
         * AI 프리셋과 프롬프트를 받아 적절한 API를 호출하는 메인 핸들러
         * @param {AiPreset} aiPreset - 사용할 AI 프리셋
         * @param {string} fullPrompt - 완전히 조합된 프롬프트
         * @returns {Promise<string|Object>} API 응답. 텍스트 또는 이미지 정보 객체.
         */
        async request(aiPreset, fullPrompt) {
            switch (aiPreset.type) {
                case 'gemini':
                    return await this.requestGemini(aiPreset, fullPrompt);
                case 'novelai':
                    return await this.requestNovelAI(aiPreset, fullPrompt);
                // TODO: 'openai', 'claude' 등 다른 AI 유형에 대한 케이스 추가
                default:
                    throw new Error(`지원되지 않는 AI 프리셋 유형입니다: ${aiPreset.type}`);
            }
        },

        /**
         * Gemini API 요청
         * @private
         */
        async requestGemini(aiPreset, fullPrompt) {
            const { apiKey, endpoint, parameters } = aiPreset;
            const model = parameters.model;
            const apiUrl = `${endpoint.replace(/\/$/, '')}/${model}:generateContent?key=${apiKey}`;

            const safetySettings = [{
                category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE'
            }, {
                category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE'
            }, {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE'
            }, {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE'
            }];

            const requestBody = {
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    temperature: parameters.temperature,
                    topK: parameters.topK,
                    topP: parameters.topP,
                },
                safetySettings: safetySettings
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API 요청 실패: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            if (data.candidates && data.candidates[0]?.content.parts[0]?.text) {
                return data.candidates[0].content.parts[0].text;
            } else if (data.promptFeedback) {
                throw new Error("Gemini 요청이 차단되었습니다: " + JSON.stringify(data.promptFeedback));
            } else {
                throw new Error("Gemini로부터 유효한 응답을 받지 못했습니다.");
            }
        },

        /**
         * NovelAI 이미지 생성 API 요청 (V4 구조 복원)
         * @private
         */
        async requestNovelAI(aiPreset, fullPrompt) {
            const JSZip = await Utils.loadJSZip();
            const { apiKey, endpoint, parameters } = aiPreset;
            const naiParams = parameters.nai;

            const requestData = {
                action: 'generate',
                model: parameters.model,
                parameters: {
                    width: naiParams.width,
                    height: naiParams.height,
                    scale: naiParams.scale,
                    sampler: naiParams.sampler,
                    steps: naiParams.steps,
                    seed: Math.floor(Math.random() * 9999999999),
                    n_samples: 1,
                    noise_schedule: naiParams.scheduler,
                    ucPreset: 1, // V4에서는 Negative Prompt 강도에 영향
                    legacy: false,
                    // V4 전용 프롬프트 구조
                    v4_prompt: {
                        caption: {
                            base_caption: fullPrompt, // QRExecutor에서 조합된 전체 프롬프트를 할당
                            char_captions: [],
                        },
                        use_coords: false,
                        use_order: true,
                    },
                    v4_negative_prompt: {
                        caption: {
                            base_caption: naiParams.negative_prompt, // AI 프리셋에서 UC 프롬프트를 가져옴
                            char_captions: [],
                        },
                    },
                }
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'accept': 'application/x-zip-compressed'
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`NovelAI API 호출 실패: ${response.status} - ${errorText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            const imageFile = Object.values(zip.files).find(file => file.name.toLowerCase().endsWith('.png'));

            if (!imageFile) throw new Error('ZIP 파일 내에서 PNG 이미지를 찾을 수 없습니다.');

            const imageBlob = await imageFile.async('blob');
            const imageUrl = URL.createObjectURL(imageBlob);
            
            const title = document.querySelector('[aria-label="Story Title"]')?.value || 'story';
            const dateTime = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
            const imageName = `${title}_${dateTime}.png`;

            // 후처리를 위해 일관된 객체 형식으로 반환
            return { imageUrl, prompt: fullPrompt, imageName };
        }
    };
    
        // ======================== 5. 기능별 모듈========================
    const Features = {
        // 번역 관련 표시 기능
        Translation: {
            /**
             * 포맷팅된 텍스트를 출력 패널에 표시
             * @param {string} pText - 처리할 텍스트
             */
            displayFormattedText: function(pText) {
                UI.updateTextStyle();

                // 대사 강조
                const pattern = /"([^"]+)"/g;
                let newText = pText.replace(pattern, '<span class="highlight-text">"$1"</span>');

                // HTML 형식으로 변환
                pText = '<p class="nm">' + newText.replace(/\n/g, '</p><p class="nm">') + '</p>';
                pText = pText.replace(/^## (.*$)/gm, "<h2>$1</h2>");
                pText = pText.replace(/^# (.*$)/gm, "<h1>$1</h1>");
                pText = pText.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
                pText = pText.replace(/^- (.*)$/gm, "<ul><li>$1</li></ul>");
                pText = pText.replace(/<\/ul>\n<ul>/g, "");

                const extractedText = document.getElementById('extracted-text');
                if(extractedText) extractedText.innerHTML = pText;
            },
        },

        // 삽화 관련 표시 기능
        Image: {
            currentImageUrl: null,
            currentImageName: null,
            currentPrompt: null,

            /**
             * 생성된 이미지 표시
             * @param {string} imageUrl - 이미지 URL
             * @param {string} imagePrompt - 이미지 프롬프트
             * @param {string} imageName - 이미지 파일명
             */
            displayImage: function(imageUrl, imagePrompt, imageName = 'generated_image.png') {
                if (this.currentImageUrl) {
                    URL.revokeObjectURL(this.currentImageUrl);
                }

                this.currentImageUrl = imageUrl;
                this.currentImageName = imageName;
                this.currentPrompt = imagePrompt;

                const image = document.getElementById('generated-image');
                const promptText = document.getElementById('image-prompt-text');
                const downloadButton = document.getElementById('download-button');
                const regenerateButton = document.getElementById('regenerate-button');

                if (image) image.src = imageUrl;
                if (promptText) promptText.textContent = imagePrompt;

                if (downloadButton) {
                    downloadButton.onclick = () => {
                        const link = document.createElement('a');
                        link.href = imageUrl;
                        link.download = imageName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    };
                }
                
                if (regenerateButton) {
                     regenerateButton.onclick = () => {
                        alert('재생성 기능은 향후 QR 관리 UI에서 지원될 예정입니다.');
                        // TODO: 현재 프롬프트를 사용하여 'default-image-prompt' QR 재실행 로직 구현
                    };
                }

                UI.toggleImagePanel(true);
            },
            
        }
    };
        // ======================== 6. 초기화 함수 ========================
    function initialize() {
        // [수정] 모든 기본 프리셋 로드/초기화
        Storage.upsertDefaultPresets();

        // UI 초기화
        UI.init();
        
    }
    // 스크립트 실행
    initialize();
})();
