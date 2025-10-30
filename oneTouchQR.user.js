// ==UserScript==
// @name         깡갤 노벨 AI 원터치 QR
// @namespace    https://novelai.net/
// @version      2.4
// @description  novel ai 보조툴. NAI 본문을 추출하여 커스텀 프롬프트와 함께 API 요청후, 본문/출력창/이미지창에 선택적 출력. Firebase를 이용한 실행 기록 로깅 기능 추가.
// @author       ㅇㅇ
// @match        https://novelai.net/*
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @require      https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js
// @require      https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js
// @require      https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @grant        none
// ==/UserScript==
(function() {
    'use strict';
    // 기존의 console.log 함수를 백업해둡니다.
    const originalConsoleLog = console.log;

    // console.log 함수를 우리만의 새 함수로 덮어씁니다.
    console.log = function(...args) {
        // Storage에서 'debugModeEnabled' 설정을 확인합니다.
        // 이 설정은 2단계에서 UI로 만들게 됩니다.
        if (Storage.get('debugModeEnabled', false)) {
            // 디버그 모드가 켜져 있을 때만, 백업해둔 원래 함수를 실행합니다.
            originalConsoleLog.apply(console, args);
        }
    };

    // 데이터 구조 정의 (오류 수정 및 정리)
    /**
     * @typedef {Object} PromptPreset - 프롬프트 프리셋
     * @property {string} id - 고유 ID (e.g., 'prompt-1718865800000')
     * @property {string} name - 프리셋 이름
     * @property {string} content - 프롬프트 실제 내용
     * @property {string | null} category - 분류
     */
    /**
     * @typedef {Object} NovelAiParameters - NovelAI 전용 파라미터
     * @property {string} negative_prompt - UC 프롬프트 (Negative)
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
     * @property {'gemini' | 'novelai' | 'openai' | 'claude' | 'textcompletion'} type - API 유형
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
     * @typedef {Object} LorebookSlotValue - 슬롯에 저장될 로어북 정보
     * @property {'lorebook'} type - 해당 객체가 로어북임을 명시
     * @property {string[]} ids - 적용할 로어북 프리셋 ID 배열
     */
    /**
     * @typedef {Object} LorebookEntry - NAI 로어북의 개별 항목(기사) 데이터
     * @property {string} text - 실제 내용
     * @property {Object} contextConfig - 컨텍스트 설정
     * @property {number} contextConfig.budgetPriority - 삽입 우선순위
     * @property {string} displayName - 항목 이름
     * @property {string} id - 항목 고유 ID
     * @property {string[]} keys - 활성화 키워드 배열
     * @property {boolean} enabled - 항목 활성화 여부
     * @property {boolean} forceActivation - 상시 활성화 여부
     * @property {string|null} category - 소속된 폴더(카테고리) ID
     */
    /**
     * @typedef {Object} LorebookCategory - NAI 로어북의 폴더(카테고리) 데이터
     * @property {string} name - 폴더 이름
     * @property {string} id - 폴더 고유 ID
     * @property {boolean} enabled - 폴더 활성화 여부
     * @property {boolean} open - UI에서 폴더가 열려있는지 여부
     */
    /**
     * @typedef {Object} LorebookData - NAI 공식 로어북 파일의 JSON 데이터 구조
     * @property {number} lorebookVersion - 버전
     * @property {LorebookEntry[]} entries - 항목 배열
     * @property {LorebookCategory[]} categories - 폴더 배열
     */
    /**
     * @typedef {Object} LorebookPreset - 스크립트에서 관리하는 로어북 프리셋
     * @property {string} id - 스크립트 내부 관리용 고유 ID
     * @property {string} name - 로어북 이름
     * @property {boolean} enabled - 로어북 전체 활성화 여부
     * @property {LorebookData} data - NAI 공식 로어북 데이터
     */
    /**
     * @typedef {Object} QrPreset - QR 프리셋
     * @property {string} id - 고유 ID
     * @property {string} name - QR 이름
     * @property {string} aiPresetId - 사용할 AI 프리셋의 ID
     * @property {string | null} category - 분류
     * @property {Object} slots - 프롬프트 슬롯. 각 슬롯의 값은 프롬프트ID(string), UserInput, LorebookSlotValue 또는 null.
     * @property {string | UserInput | LorebookSlotValue | null} slots.prefix - 서문
     * @property {string | UserInput | LorebookSlotValue | null} slots.afterPrefix - 서문 후
     * @property {string | UserInput | LorebookSlotValue | null} slots.beforeBody - 본문 전
     * @property {string | UserInput | LorebookSlotValue | null} slots.afterBody - 본문 후
     * @property {string | UserInput | LorebookSlotValue | null} slots.beforeSuffix - 탈옥 전
     * @property {string | UserInput | LorebookSlotValue | null} slots.suffix - 탈옥
     * @property {string | UserInput | LorebookSlotValue | null} slots.afterSuffix - 탈옥 후
     * @property {number} extractLength - 본문에서 추출할 글자 수
     * @property {Object} postProcess - 후처리 설정
     * @property {'output_panel' | 'prosemirror' | 'image_panel' | 'inline_image_panel' | 'multi_qr' | 'none'} postProcess.action - 실행 후 동작
     * @property {string | null} postProcess.nextQrId - 다중 QR 실행 시, 다음에 실행할 QR의 ID
     * @property {keyof QrPreset['slots'] | null} postProcess.insertSlot - 다중 QR 실행 시, 이번 응답을 다음 QR의 어느 슬롯에 넣을지
     * @property {string[] | null} simultaneousQrIds - 이 QR과 동시에 실행할 다른 QR들의 ID 배열
     * @property {Object} remote - 리모콘 설정
     * @property {boolean} remote.visible - 리모콘에 버튼 표시 여부
     * @property {boolean} remote.favorite - 즐겨찾기 리모콘에 버튼 표시 여부
     * @property {string | null} remote.icon - Font Awesome 아이콘 클래스 (e.g., 'fa-solid fa-star')
     * @property {boolean} [autoExecute] - NAI 생성 완료 후 자동 실행 여부
     */
    // ======================== 1. 기본 설정 및 상수 정의 ========================
    const CONFIG = {
        // UI 및 기타 기본 설정값
        defaultMainColor: 'rgba(32, 32, 32, 0.8)',
        defaultHighlightColor: 'royalblue',
        uncategorizedId: '__uncategorized__', // 미분류 항목 내부 ID
        uncategorizedName: '미분류', // 미분류 항목 표시 이름

        // 리모컨 기본 설정
        remoteControl: {
            buttonSize: 50,
            buttonGap: 5,
            buttonShape: 'circle',
            orientation: 'vertical',
            position: {
                right: '15px',
                bottom: '20%'
            },
            // [추가] 새로운 리모컨 설정
            expansionDirection: 'forward', // 'forward' 또는 'backward'
            folderWrapCount: 5,
            transparency: 100,
        },
    };

    // ======================== 2. 유틸리티 함수 모음 ========================
    const Utils = {
        /**
         * 새로운 고유 ID를 생성합니다. (형식: prefix-yyMMddhhmmss-random)
         * @param {string} prefix - ID 앞에 붙일 접두사 (e.g., 'qr', 'ai', 'prompt')
         * @returns {string} 생성된 고유 ID
         */
        generateNewId: function(prefix) {
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
            const randomStr = Math.random().toString(36).substring(2, 5); // 3자리 랜덤 문자열
            return `${prefix}-${timestamp}-${randomStr}`;
        },

        copyToClipboard: function(text, flashMessage = "클립보드에 복사되었습니다.") {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.setAttribute('readonly', '');
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            let success = false;
            try {
                success = document.execCommand('copy');
            } catch (err) {
                console.error('클립보드 복사 중 예외가 발생했습니다:', err);
            }

            document.body.removeChild(textArea);

            if (success) {
                console.log(flashMessage); // 개발자 콘솔에는 로그 유지

                const flashElement = document.createElement('div');
                flashElement.textContent = flashMessage;

                Object.assign(flashElement.style, {
                    position: 'fixed',
                    left: '50%',
                    top: '90%', // 화면 하단에 표시
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '25px',
                    zIndex: '2147483647', // 최상단에 표시
                    fontSize: '14px',
                    fontWeight: '500',
                    pointerEvents: 'none', // 메시지 위로 클릭 통과
                    opacity: '0',
                    transition: 'opacity 0.3s ease'
                });

                document.body.appendChild(flashElement);
                setTimeout(() => {
                    flashElement.style.opacity = '1';
                }, 10);

                setTimeout(() => {
                    flashElement.style.opacity = '0';
                    setTimeout(() => {
                        if (flashElement.parentNode) {
                            document.body.removeChild(flashElement);
                        }
                    }, 300); // opacity transition 시간
                }, 1500);
            }

            return success;
        },

        toggleLoading: function(isLoading, target, aiType = null) {
            let buttonElement = null;

            // target이 문자열(qrId)이면, 해당 ID를 가진 버튼을 찾음
            if (typeof target === 'string') {
                // data-qr-id 속성을 사용하여 정확한 버튼을 찾음
                buttonElement = document.querySelector(`.qr-remote-button[data-qr-id="${target}"]`);
            }
            // target이 HTML 요소이면, 그대로 사용
            else if (target instanceof HTMLElement) {
                buttonElement = target;
            }

            if (buttonElement) {
                if (isLoading) {
                    buttonElement.classList.remove('loading', 'loading-text');
                    if (aiType === 'textcompletion') {
                        buttonElement.classList.add('loading-text');
                    } else {
                        buttonElement.classList.add('loading');
                    }
                } else {
                    buttonElement.classList.remove('loading', 'loading-text');
                }
            }
        },
        makeDraggable: function(element, handle = null, onPositionChange = null, storageKey = null) {
            const dragHandle = handle || element;
            let dragTimeout;
            let isPrimedForDrag = false;
            let isMoving = false;
            let startX, startY, startRight, startBottom;

            const positionKey = storageKey || (element.id ? `position_${element.id}` : "tBallP");

            const savedPosition = localStorage.getItem(positionKey);
            if (savedPosition) {
                try {
                    const {
                        right,
                        bottom
                    } = JSON.parse(savedPosition);
                    element.style.right = right + "px";
                    element.style.bottom = bottom + "px";
                } catch (e) {
                    console.error("저장된 위치 정보를 불러오는 중 오류 발생:", e);
                }
            }

            const onMouseDown = (e) => {
                if (e.button !== 0 && e.type !== 'touchstart') return;
                isPrimedForDrag = false;
                isMoving = false;
                const eventCoord = e.touches ? e.touches[0] : e;
                startX = eventCoord.clientX;
                startY = eventCoord.clientY;
                const style = window.getComputedStyle(element);
                startRight = parseInt(style.right, 10) || 0;
                startBottom = parseInt(style.bottom, 10) || 0;
                document.addEventListener('mouseup', onMouseUp);
                document.addEventListener('touchend', onMouseUp);
                dragTimeout = setTimeout(() => {
                    isPrimedForDrag = true;
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('touchmove', onMouseMove, {
                        passive: false
                    });
                }, 200);
            };

            const onMouseMove = (e) => {
                if (!isPrimedForDrag) return;
                if (!isMoving) {
                    isMoving = true;
                }
                const eventCoord = e.touches ? e.touches[0] : e;
                const dx = startX - eventCoord.clientX;
                const dy = startY - eventCoord.clientY;
                let right = startRight + dx;
                let bottom = startBottom + dy;
                const rect = element.getBoundingClientRect();
                right = Math.max(0, Math.min(right, window.innerWidth - rect.width));
                bottom = Math.max(0, Math.min(bottom, window.innerHeight - rect.height));
                element.style.right = right + "px";
                element.style.bottom = bottom + "px";
                if (onPositionChange) {
                    onPositionChange({
                        right,
                        bottom
                    });
                }
                if (e.type === 'touchmove') e.preventDefault();
            };

            const onMouseUp = () => {
                clearTimeout(dragTimeout);
                if (isMoving) {
                    const position = {
                        right: parseInt(element.style.right, 10) || 0,
                        bottom: parseInt(element.style.bottom, 10) || 0
                    };
                    localStorage.setItem(positionKey, JSON.stringify(position));
                }
                setTimeout(() => {
                    isMoving = false;
                }, 0);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('touchmove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.removeEventListener('touchend', onMouseUp);
            };

            const onClickCapture = (e) => {
                if (isMoving) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            };

            dragHandle.addEventListener('mousedown', onMouseDown);
            dragHandle.addEventListener('touchstart', onMouseDown, {
                passive: true
            });
            dragHandle.addEventListener('click', onClickCapture, true);

            return {
                moveTo: function(position) {
                    if (position.right !== undefined) element.style.right = position.right + 'px';
                    if (position.bottom !== undefined) element.style.bottom = position.bottom + 'px';
                }
            };
        },
        stripHtml: function(html) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        },
        loadJSZip: async function() {
            // 1단계: @require가 성공했거나, 다른 스크립트에 의해 이미 로드된 경우 즉시 반환
            if (window.JSZip) {
                return window.JSZip;
            }

            // 2단계: @require가 실패했을 경우를 대비한 동적 로딩 (Fallback)
            console.warn('[QR] JSZip not found via @require. Attempting to load dynamically as a fallback...');
            return new Promise((resolve, reject) => {
                // 혹시 모를 중복 실행을 방지하기 위해 이미 로딩 시도 중인지 확인
                if (document.getElementById('jszip-dynamic-loader')) {
                    // 이미 로딩 중이라면 잠시 후 다시 체크
                    setTimeout(() => {
                        if (window.JSZip) resolve(window.JSZip);
                        else reject(new Error('JSZip 로드 시간 초과'));
                    }, 3000);
                    return;
                }

                const script = document.createElement('script');
                script.id = 'jszip-dynamic-loader'; // 식별자 추가
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
                script.integrity = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
                script.crossOrigin = 'anonymous';

                script.onload = () => {
                    console.log('[QR] JSZip loaded dynamically successfully.');
                    resolve(window.JSZip);
                };

                // 3단계: 동적 로딩마저 실패한 경우, 더 상세한 오류 메시지 반환
                script.onerror = () => {
                    console.error('[QR] Critical Error: Dynamic loading of JSZip also failed.');
                    reject(new Error('JSZip 로드 실패 (@require 및 동적 로드 모두 실패). 네트워크 연결 또는 보안 프로그램을 확인하세요.'));
                };

                document.head.appendChild(script);
            });
        },
        createElement: function(tag, attributes = {}, children = []) {
            const element = document.createElement(tag);
            Object.entries(attributes).forEach(([key, value]) => {
                // [수정] open 속성을 boolean 속성 목록에 추가. 값이 false일 경우 속성 자체를 추가하지 않도록 함.
                if ((key === 'disabled' || key === 'checked' || key === 'open') && !value) {
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
        },

        // [추가] 파일 다운로드 유틸리티 함수
        downloadFile: function(content, fileName, mimeType) {
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

    // ======================== 3. 스토리지 관리 모듈 ========================
    const Storage = {
        /**
         * 핵심 설정값이 존재하지 않을 경우 기본값으로 초기화합니다.
         * 신규 사용자가 겪는 'Cannot read properties of null' 오류를 방지합니다.
         */

        initializeCoreSettings: function() {
            const settingsToInitialize = {
                // 1. 복합 설정 객체
                'remoteControl': () => CONFIG.remoteControl,
                'imagePanelDimensions': () => ({
                    width: 800,
                    height: 700
                }),
                // [추가] '유틸' 카테고리의 기본 표시 설정을 추가하여, 첫 사용자에게 폴더 기능이 보이도록 함
                'remoteLayout': () => [{
                    id: '유틸',
                    visible: true,
                    icon: 'fa-solid fa-toolbox'
                }],

                // 2. UI 및 단순 값 설정
                'tMainColor': () => CONFIG.defaultMainColor,
                'colorCode': () => CONFIG.defaultHighlightColor,
                'ns-italic': () => false,
                'ns-bold': () => false,
                'ns-highlight': () => false,
                'renderMarkdown': () => true,
                'renderHtml': () => false,
                'loggingEnabled': () => false, // 로깅 기능 기본 비활성화
                'firebaseConfig': () => '', // Firebase 설정 기본값

                // 3. 패널 위치 값 (사용자 요청으로 추가)
                'settingsPanelPosition': () => ({
                    right: 50,
                    bottom: 50
                }),
                'imagePanelPosition': () => ({
                    right: 50,
                    bottom: 50
                }),
            };

            let initializedCount = 0;
            for (const [key, getDefaultValue] of Object.entries(settingsToInitialize)) {
                if (localStorage.getItem(key) === null) {
                    this.set(key, getDefaultValue());
                    initializedCount++;
                }
            }

            if (initializedCount > 0) {
                console.log(`[QR] ${initializedCount}개의 핵심 설정이 기본값으로 초기화되었습니다.`);
            }
        },

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

        set: function(key, value) {
            localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
        },

        remove: function(key) {
            localStorage.removeItem(key);
        },

        getPrompts: function() {
            return this.get('promptPresets', []);
        },
        setPrompts: function(prompts) {
            this.set('promptPresets', prompts);
        },
        getPromptById: function(id) {
            return this.getPrompts().find(p => p.id === id);
        },

        getAiPresets: function() {
            return this.get('aiPresets', []);
        },
        setAiPresets: function(presets) {
            this.set('aiPresets', presets);
        },
        getAiPresetById: function(id) {
            return this.getAiPresets().find(p => p.id === id);
        },

        getQRs: function() {
            return this.get('qrPresets', []);
        },
        setQRs: function(qrs) {
            this.set('qrPresets', qrs);
        },
        getQRById: function(id) {
            return this.getQRs().find(q => q.id === id);
        },

        getLorebooks: function() {
            return this.get('lorebookPresets', []);
        },
        setLorebooks: function(lorebooks) {
            this.set('lorebookPresets', lorebooks);
        },
        getLorebookById: function(id) {
            return this.getLorebooks().find(lb => lb.id === id);
        },

        getRemoteLayout: function() {
            return this.get('remoteLayout', []);
        },
        setRemoteLayout: function(layout) {
            this.set('remoteLayout', layout);
        },
        getRemoteFavorites: function() {
            return this.get('remoteFavorites', []);
        },
        setRemoteFavorites: function(favorites) {
            this.set('remoteFavorites', favorites);
        },

        // [추가] Firebase 로깅 관련 설정
        getFirebaseConfig: function() {
            return this.get('firebaseConfig', '');
        },
        setFirebaseConfig: function(config) {
            this.set('firebaseConfig', config);
        },
        isLoggingEnabled: function() {
            return this.get('loggingEnabled', false);
        },
        setLoggingEnabled: function(isEnabled) {
            this.set('loggingEnabled', isEnabled);
        },

        updateCategoryName: function(oldName, newName) {
            const oldCatId = oldName === null ? null : oldName;
            const newCatId = newName === '' ? null : newName;

            const qrs = this.getQRs();
            qrs.forEach(qr => {
                if (qr.category === oldCatId) {
                    qr.category = newCatId;
                }
            });
            this.setQRs(qrs);

            const layout = this.getRemoteLayout();
            const layoutItem = layout.find(item => item.id === (oldCatId || CONFIG.uncategorizedId));
            if (layoutItem) {
                layoutItem.id = newCatId || CONFIG.uncategorizedId;
            }
            this.setRemoteLayout(layout);
        },

        upsertDefaultPresets: function(forceReset = false) {
            const process = (storageKey, defaultsFn, samplesFn, idPrefix) => {
                let currentItems = this.get(storageKey, []);
                const defaultItems = defaultsFn();
                const sampleItems = samplesFn ? samplesFn() : [];

                const defaultIds = new Set(defaultItems.map(item => item.id));
                if (forceReset) {
                    const userItems = currentItems.filter(item => !defaultIds.has(item.id));
                    currentItems = [...defaultItems, ...userItems];
                } else {
                    const existingDefaultIds = new Set(currentItems.map(item => item.id));
                    const itemsToAdd = defaultItems.filter(item => !existingDefaultIds.has(item.id));
                    if (itemsToAdd.length > 0) {
                        currentItems.push(...itemsToAdd);
                    }
                }

                if (sampleItems.length > 0) {
                    const existingNames = new Set(currentItems.map(item => item.name));
                    const samplesToAdd = sampleItems.filter(sample => !existingNames.has(sample.name));

                    if (samplesToAdd.length > 0) {
                        samplesToAdd.forEach(sample => {
                            const newItem = {
                                ...sample
                            };
                            if (idPrefix === 'qr') {
                                const newSlots = {};
                                const allPrompts = this.get('promptPresets', []);
                                for (const [slotName, slotValue] of Object.entries(newItem.slots)) {
                                    if (typeof slotValue === 'string') {
                                        const foundPrompt = allPrompts.find(p => p.name === slotValue);
                                        newSlots[slotName] = foundPrompt ? foundPrompt.id : null;
                                    } else {
                                        newSlots[slotName] = slotValue;
                                    }
                                }
                                newItem.slots = newSlots;
                            }

                            newItem.id = Utils.generateNewId(idPrefix);
                            currentItems.push(newItem);
                        });
                    }
                }

                this.set(storageKey, currentItems);
            };

            process('promptPresets', this.getDefaultPromptsData, this.getSamplePromptsData, 'prompt');
            process('aiPresets', this.getDefaultAiPresetsData, this.getSampleAiPresetsData, 'ai');
            process('lorebookPresets', this.getDefaultLorebooksData, this.getSampleLorebooksData, 'lorebook');
            // QR은 프롬프트/AI가 먼저 처리된 후 실행되어야 슬롯 ID를 제대로 찾을 수 있다.
            process('qrPresets', this.getDefaultQRsData, this.getSampleQRsData, 'qr');
        },

        getDefaultPromptsData: function() {
            return [{
                    id: 'default-prompt-translate',
                    name: 'DEFAULT 번역',
                    content: '다음 텍스트를 자연스럽고 매끄러운 한국어로 번역하세요. 문맥과 뉘앙스를 반영하며, 현지화가 필요한 부분은 자연스럽게 조정하세요. 사설없이 본문 텍스트 데이터만 출력하세요.',
                    category: 'DEFAULT'
                },
                {
                    id: 'default-prompt-ko-en-prefix',
                    name: 'DEFAULT 한영번역란',
                    content: '다음 제공된 문장을, 첨부된 소설의 문맥에 자연스럽게 이어지도록 영어로 번역하세요. 직역을 피하고, 감정·상황·말투까지 반영해 자연스럽고 맥락에 맞는 번역을 하세요.\n\n번역할 문장:',
                    category: 'DEFAULT'
                },
                {
                    id: 'default-prompt-image-main',
                    name: 'DEFAULT 삽화 프롬 생성',
                    content: "( 삽화 삽입 지점: 바로 위 장면을 삽화 생성을 위한 프롬프트화 하세요.)\n\n\n\n### 역할 정의\n\n당신은 제공된 소설 텍스트를 분석하여, 지정된 지점 `(삽화 삽입 지점)`에 삽입될 고품질 삽화 생성을 위한 프롬프트를 작성하는 AI 어시스턴트입니다. \n\n당신이 생성 해야 할 것은 소설 전체의 삽화 프롬프트가 아니라 `(삽화 삽입 지점)` 문구가 있는 부분에 들어갈 삽화의 프롬프트입니다. 앞의 장면은 배경, 인물 설정 등의 맥락 정보를 제공하기 위한 컨텍스트이며, 삽화가 될 장면은 첨부된 텍스트의 가장 후반부임을 기억하세요.\n\n\n\n### 전체 출력 양식\n\n최종 결과물은 아래의 양식을 반드시 준수해야 합니다. 프롬프트 태그 외에 어떠한 설명이나 문장 부호도 앞뒤에 추가하지 마세요. 생성에 사용하는 NAI Diffusion V4.5 Full 모델은 Danbooru 태그를 가장 잘 알아 들으며, 약간의 자연어 이해 능력을 가지고 있습니다.\n\n`메인 프롬프트 | 캐릭터1 정보 | 캐릭터2 정보 ...`\n\n\n\n---\n\n\n\n### 프롬프트 작성 지침\n\n\n\n#### 1. 메인 프롬프트\n\n삽화의 전체 구도를 설명합니다. 자연어 문장으로 전체 구도를 잡고 단어/태그로 디테일을 강조하세요. \n\n- 삽화에 등장하는는 캐릭터 수: `2boy, 1girl`, `1boy, solo`처럼 전체 등장 인물 수를 먼저 선언합니다.\n\n- nsfw/sfw 여부 판단: 오직 성적 노출이 있는 경우에만 nsfw 태그를 사용합니다. nsfw는 항상 uncensored 태그와 함께 사용되어야 합니다.\n\n*   장면 설명: 생성 모델이 상황을 헷갈리지 않도록 명확한 자연어 문장로 중심 상황을 설명을 하세요. 직유나 은유없이 구체적인 시각 정보를 제공해야 합니다. 캐릭터 프롬프트의 추가적인 설명없이도 정확한 구도를 알 수 있어야 합니다.\n\n*   장소 설명: 배경에 대한 묘사를 자연어, 혹은 단어 태그로 제공하세요. 컨텍스트에 제공된 정보를 바탕으로 구체적일수록 좋습다.\n\n*   밈이나 기존 danbooru 태그 활용: `full nelson`, `doggy style`, `princess carry`, `pointing spider-man (meme)`,`ice bucket challenge`처럼 그림의 중심이 되는 구체적인 자세나 행위를 danbooru 태그로 추가하세요. 특히 nsfw 요소는 정확한 태그를 사용해야만 반영됩니다.\n\n\n\n#### 2. 캐릭터 프롬프트\n\n각 캐릭터의 정보는 `|`로 구분합니다. 양식은 다음과 같습니다.\n\n`타입, 이름 (원작), 현재 외모, 자연어로 된 정확한 행동 설명`\n\n\n\n*   성별: `girl`, `boy` 중 선택합니다. 크리에이처, 동물, 마스코트, 로봇 등 성별을 알 수 없는 캐릭터에 other을 활용할 수 있습니다.\n\n*   이름 (원작):\n\n    *   원작 캐릭터: AI가 학습한 데이터를 활용할 수 있도록 정확한 `캐릭터 영문명 (작품 영문명)`을 기입하세요. (예: `gojou satoru (jujutsu kaisen)`) 컨텍스트 내에서 묘사되지 않은 외모 정보는 추가하지 마세요. 몇몇 주요 캐릭터들은 컨텍스트 상에서 추가 설명이 제공되니 그것을 참고하세요.\n\n    *   창작 캐릭터 (OC):  다른 작품에 등장하는 캐릭터가 아닌 이 소설만의 오리지널 캐릭터인 경우, 잘못된 외모 정보가 연결되는 것을 막기 위해 이름 대신 `original character` 태그만 사용하세요. 제공된 컨텍스트의 묘사를 바탕으로 머리색, 눈 색, 헤어스타일 등 외모 정보를 최대한 상세하게 작성해야 합니다.\n\n    *   엑스트라: 외모가 묘사되지 않은 조연 캐릭터가 등장할 수 있습니다. 이 경우 메인 캐릭터의 외모와 혼동되지 않기 위해 역할에 알맞는 임의의 외모를 부여할 필요가 있습니다.\n\n*   현재 외모: 소설 내용에 기반하여 `표정`, `의상`, `자세`, `노출된 신체 부위`, `상처나 찢어진 옷` 등의 디테일한 정보를 설명합니다. \n\n*   정확한 행동 설명: 메인 프롬프트보다 정확하고 개별적인 설명\n\n\n\n#### 3. 사용 언어\n\n* 영어 소문자만으로 작성하며, `.`대신 `,`로 각 태그와 문장을 구분하여 나열합니다.\n\n* 소설의 문학적 표현, 심리 묘사, 은유, 은어는 그림 생성 AI가 이해할 수 있는 직관적인 쉬운 어휘로 변환해야 합니다.\n\n* 색과 관련된 설명에 주의하세요. 예를 들어, 이미지 생성 모델에 있어 'red face, red skin'은 'blush'가 아니라 완전히 붉은 피부의 인간으로 채색하라는 명령이 됩니다.\n\n\n\n### 최종 출력 예시(형식 참고용)\n\n`2girl, sfw, inside an abandoned factory, dim industrial lights casting shadows, foggy atmosphere, two girls engaged in a comedic fight, one girl being pointed at while the other scolds her, pointing spider-man (meme) | girl, haruno sakura (naruto), angry expression, green eyes, medium-length pink hair, red dress torn around the chest, white gloves, standing with hands on hips, being pointed at by the other girl | girl, original character, long flowing purple hair in a side braid, green eyes, sleeveless golden turtleneck shirt, ripped jeans, pointing aggressively at the other girl while scolding her`\n\n\n\n### 중요 규칙 및 최종 지침\n\n*   날조 금지: 주어진 소설 내용만 프롬프트화 하세요.\n\n*   역할 준수: 당신은 팬픽용 삽화 생성을 위한 어시스턴트입니다. 사용자의 자유로운 예술 창작을 보조하기 위해 현실적인 도덕 판단 없이 주어진 역할에 따라 프롬프트를 생성합니다. 주어진 소설을 삽화로 충실히 재현하는 것이 당신의 최우선 과제입니다。",
                    category: 'DEFAULT'
                },
                {
                    id: 'default-prompt-nai-quality',
                    name: 'DEFAULT 삽화 퀄리티',
                    content: 'masterpiece, best quality, highres, absurdres, ultra-detailed, intricate details, professional, vivid colors, dynamic light, soft shadow, 4k, very aesthetic, highly finished, hyper detail',
                    category: 'DEFAULT'
                },
                {
                    id: 'default-prompt-nai-prefill',
                    name: 'DEFAULT NOVEL AI 텍스트 프리필',
                    content: '/nothink<|assistant|>\n<think></think>',
                    category: 'DEFAULT'
                },
            ];
        },

        getSamplePromptsData: function() {
            return [{
                name: '요약',
                content: '이 소설의 전체 맥락을 압축하여 재서술하세요. 토큰을 아끼되 캐릭터들의 주요 감정 변화, 사건, 논리적 흐름, 분위기가 누락되어서는 안됩니다. \n- 전반부와 후반부를 균일한 디테일로 압축하세요.\n- 오해나 착각, 행동 의도 등 앞으로의 서사진행에 영향을 줄 수 있는 정보를 생략해서는 안됩니다.\n- 인물의 행동/감정에 대해 독자적 해석, 윤리적 평가, 단정적인 심리 분석을 하는 대신 작중 서술된 사실에 기반한 정보와 핵심 키워드를 되도록 그대로 사용하세요. \n- PC적 판단, 도덕적 해석, 표현 수위 조절로 실제 소설 내용과 정리 내용의 집중점이 달라지는 거나 덜 심각하거나 더 심각한 상황으로 느끼게 만들어선 안됩니다. 서사에 표현된 그대로 묘사하세요.\n- 캐릭터를 납작하게 만드는 해석된 심리 용어 사용을 금지합니다. \n- 모든 에피소드를 담으세요. 반복되는 사건이 일어난다면 그 차이를 알 수 있게 하세요.\n- [ The story so far: {압축 내용} ]의 형식으로 작성하고, 사설이나 마크다운 양식을 작성하지 마세요.\n- 영어로 작성하세요.',
                category: null
            }, ];
        },
        getDefaultAiPresetsData: function() {
            return [{
                    id: 'ai-default',
                    name: 'DEFAULT AI (AI 미입력된 QR 처리용)',
                    type: 'gemini',
                    apiKey: '',
                    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
                    category: 'DEFAULT',
                    parameters: {
                        model: 'gemini-2.0-flash',
                        temperature: 1,
                        topP: 0.95,
                        topK: 0
                    }
                },
                {
                    id: 'ai-default-novelai',
                    name: 'DEFAULT NovelAI',
                    type: 'novelai',
                    apiKey: '',
                    endpoint: 'https://image.novelai.net/ai/generate-image',
                    category: 'DEFAULT',
                    parameters: {
                        model: 'nai-diffusion-4-5-full',
                        nai: {
                            negative_prompt: 'lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]',
                            width: 1024,
                            height: 1024,
                            sampler: 'k_euler_ancestral',
                            scheduler: 'karras',
                            steps: 28,
                            scale: 5
                        }
                    }
                },
                // [수정] 아래 객체를 Sample에서 Default로 이동시켰습니다.
                {
                    id: 'ai-default-novelai-text',
                    name: 'DEFAULT NovelAI Text (GLM-4.6)',
                    type: 'textcompletion',
                    apiKey: '',
                    endpoint: 'https://text.novelai.net/oa/v1',
                    category: 'DEFAULT',
                    parameters: {
                        model: 'glm-4-6',
                        temperature: 1,
                        topP: 0.95,
                        topK: 0 // Text Completion 에서는 사용되지 않지만, 구조 일관성을 위해 유지
                    }
                },
            ];
        },

        getSampleAiPresetsData: function() {
            return [{
                    name: '오픈라우터 (DeepSeek Chimera)',
                    type: 'openai',
                    apiKey: '',
                    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
                    category: null,
                    parameters: {
                        model: 'tngtech/deepseek-r1t2-chimera:free',
                        temperature: 1,
                        topP: 0.95,
                        topK: null
                    }
                },
                // [수정] 이 위치에 있던 'DEFAULT NovelAI Text (GLM-4.6)' 프리셋이 위 getDefaultAiPresetsData 함수로 이동했습니다.
                {
                    name: '딥시크 (Chat)',
                    type: 'openai',
                    apiKey: '',
                    endpoint: 'https://api.deepseek.com/chat/completions',
                    category: null,
                    parameters: {
                        model: 'deepseek-chat',
                        temperature: 1,
                        topP: 0.95,
                        topK: null
                    }
                },
                {
                    name: '제미니 (2.5 Pro)',
                    type: 'gemini',
                    apiKey: '',
                    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
                    category: null,
                    parameters: {
                        model: 'gemini-2.5-pro',
                        temperature: 1,
                        topP: 0.95,
                        topK: null
                    }
                }
            ];
        },

        getDefaultQRsData: function() {
            return [{
                    id: 'default-translate',
                    name: 'DEFAULT 번역',
                    aiPresetId: 'ai-default',
                    category: 'DEFAULT',
                    slots: {
                        prefix: 'default-prompt-translate',
                        afterPrefix: null,
                        beforeBody: null,
                        afterBody: null,
                        beforeSuffix: null,
                        suffix: null,
                        afterSuffix: null
                    },
                    extractLength: 750,
                    postProcess: {
                        action: 'output_panel',
                        nextQrId: null,
                        insertSlot: null
                    },
                    remote: {
                        visible: true,
                        favorite: true,
                        icon: 'fa-solid fa-language'
                    }
                },
                {
                    id: 'default-image-prompt',
                    name: 'DEFAULT 삽화 프롬 생성',
                    aiPresetId: 'ai-default-novelai-text',
                    category: 'DEFAULT',
                    slots: {
                        prefix: {
                            type: 'lorebook',
                            ids: ['lorebook-default-char-appearance']
                        },
                        afterPrefix: null,
                        beforeBody: null,
                        afterBody: null,
                        beforeSuffix: null,
                        suffix: 'default-prompt-image-main',
                        afterSuffix: 'default-prompt-nai-prefill'
                    },
                    extractLength: 6000,
                    postProcess: {
                        action: 'multi_qr',
                        nextQrId: 'default-image-generate',
                        insertSlot: 'afterPrefix'
                    },
                    remote: {
                        visible: true,
                        favorite: true,
                        icon: 'fa-solid fa-image'
                    }
                },
                {
                    id: 'default-image-generate',
                    name: 'DEFAULT 삽화 생성',
                    aiPresetId: 'ai-default-novelai',
                    category: 'DEFAULT',
                    slots: {
                        prefix: 'default-prompt-nai-quality',
                        afterPrefix: null,
                        beforeBody: null,
                        afterBody: null,
                        beforeSuffix: null,
                        suffix: null,
                        afterSuffix: null
                    },
                    extractLength: 0,
                    postProcess: {
                        action: 'image_panel',
                        nextQrId: null,
                        insertSlot: null
                    },
                    remote: {
                        visible: false,
                        favorite: false,
                        icon: 'fa-solid fa-palette'
                    }
                },
                {
                    id: 'default-ko-en-translate',
                    name: 'DEFAULT 한영번역란',
                    aiPresetId: 'ai-default',
                    category: 'DEFAULT',
                    slots: {
                        prefix: 'default-prompt-ko-en-prefix',
                        afterPrefix: {
                            type: 'user_input',
                            caption: '번역할 텍스트를 입력하세요.'
                        },
                        beforeBody: null,
                        afterBody: null,
                        beforeSuffix: null,
                        suffix: null,
                        afterSuffix: null
                    },
                    extractLength: 4000,
                    postProcess: {
                        action: 'prosemirror',
                        nextQrId: null,
                        insertSlot: null
                    },
                    remote: {
                        visible: false,
                        favorite: false,
                        icon: 'fa-solid fa-keyboard'
                    }
                },
            ];
        },

        getSampleQRsData: function() {
            return [{
                name: '요약',
                aiPresetId: 'ai-default',
                category: '유틸',
                slots: {
                    prefix: '요약',
                    afterPrefix: null,
                    beforeBody: null,
                    afterBody: null,
                    beforeSuffix: null,
                    suffix: null,
                    afterSuffix: null
                },
                extractLength: 9999999,
                postProcess: {
                    action: 'image_panel',
                    nextQrId: null,
                    insertSlot: null
                },
                remote: {
                    visible: true,
                    favorite: false,
                    icon: '<i class="fa-solid fa-compress"></i>'
                }
            }];
        },

        getDefaultLorebooksData: function() {
            return [{
                id: 'lorebook-default-char-appearance',
                name: '캐릭터 외모',
                enabled: true,
                data: {
                    lorebookVersion: 5,
                    entries: [{
                        id: 'lb-entry-default-gojo-sample',
                        displayName: '고죠 사토루(SAMPLE)',
                        text: 'boy, gojou satoru (jujutsu kaisen), white hair, blue eyes',
                        keys: ['gojou', 'satoru'],
                        enabled: true,
                        forceActivation: false,
                        contextConfig: {
                            budgetPriority: 400
                        },
                        category: null
                    }],
                    categories: []
                }
            }];
        },

        getSampleLorebooksData: function() {
            return [];
        },

        importLorebook: function(jsonString, fileName) {
            let lorebookData;
            try {
                lorebookData = JSON.parse(jsonString);
                if (typeof lorebookData !== 'object' || !lorebookData.entries || !lorebookData.categories) {
                    throw new Error("유효한 NovelAI 로어북 형식이 아닙니다.");
                }
            } catch (e) {
                return {
                    success: false,
                    message: `파일 파싱 오류: ${e.message}`
                };
            }

            lorebookData.entries.forEach(entry => {
                if (Array.isArray(entry.keys)) {
                    entry.keys = entry.keys.map(key => key.toLowerCase());
                }
            });

            const newLorebookPreset = {
                id: Utils.generateNewId('lorebook'),
                name: fileName.replace(/\.(json|lorebook)$/i, ''),
                enabled: true,
                data: lorebookData
            };

            const allLorebooks = this.getLorebooks();
            allLorebooks.push(newLorebookPreset);
            this.setLorebooks(allLorebooks);

            return {
                success: true,
                name: newLorebookPreset.name
            };
        },

        exportLorebook: function(lorebookId) {
            const lorebook = this.getLorebookById(lorebookId);
            if (!lorebook) return null;
            return JSON.stringify(lorebook.data, null, 2);
        },

        backupAll: function() {
            const backup = {};
            const currentKeys = [
                'promptPresets', 'aiPresets', 'qrPresets', 'lorebookPresets',
                'tMainColor', 'colorCode', 'ns-italic', 'ns-bold', 'ns-highlight',
                'remoteControl', 'remoteLayout', 'remoteFavorites',
                'settingsPanelPosition', 'remotePosition', 'imagePanelPosition',
                'renderMarkdown', 'renderHtml', 'imagePanelDimensions',
                'loggingEnabled', 'firebaseConfig' // [추가] 백업 목록에 로깅 설정 추가
            ];

            currentKeys.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    backup[key] = value;
                }
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
        },

        exportQrs: function(qrIds) {
            const allQrs = this.getQRs();
            const allPrompts = this.getPrompts();
            const promptsMap = new Map(allPrompts.map(p => [p.id, p]));

            const qrsToExport = allQrs.filter(qr => qrIds.includes(qr.id));

            const exportData = qrsToExport.map(qr => {
                const transformedSlots = {};
                for (const [slotName, slotValue] of Object.entries(qr.slots)) {
                    if (typeof slotValue === 'string') {
                        const promptData = promptsMap.get(slotValue);
                        if (promptData) {
                            transformedSlots[slotName] = {
                                type: 'prompt',
                                ...promptData
                            };
                        } else {
                            transformedSlots[slotName] = null;
                        }
                    } else if (typeof slotValue === 'object' && slotValue?.type === 'user_input') {
                        transformedSlots[slotName] = {
                            ...slotValue
                        };
                    } else {
                        transformedSlots[slotName] = null;
                    }
                }

                return {
                    name: qr.name,
                    category: qr.category,
                    extractLength: qr.extractLength,
                    postProcess: qr.postProcess,
                    remote: qr.remote,
                    aiPresetId: null,
                    slots: transformedSlots
                };
            });

            return JSON.stringify(exportData, null, 2);
        },

        importQrs: function(jsonString) {
            let importedData;
            try {
                importedData = JSON.parse(jsonString);
                if (!Array.isArray(importedData)) throw new Error("JSON 데이터가 배열 형식이 아닙니다.");
            } catch (e) {
                return {
                    success: false,
                    message: `JSON 파싱 오류: ${e.message}`
                };
            }

            const allQrs = this.getQRs();
            const allPrompts = this.getPrompts();
            let qrCount = 0;
            let newPromptCount = 0;

            importedData.forEach(importedQr => {
                if (!importedQr || typeof importedQr !== 'object' || !importedQr.name) return;

                const newQr = {
                    id: Utils.generateNewId('qr'),
                    name: importedQr.name,
                    category: importedQr.category || null,
                    extractLength: importedQr.extractLength || 0,
                    postProcess: importedQr.postProcess || {
                        action: 'output_panel',
                        nextQrId: null,
                        insertSlot: null
                    },
                    remote: importedQr.remote || {
                        visible: true,
                        favorite: false,
                        icon: null
                    },
                    aiPresetId: null,
                    slots: {}
                };

                const slotKeys = ['prefix', 'afterPrefix', 'beforeBody', 'afterBody', 'beforeSuffix', 'suffix', 'afterSuffix'];
                slotKeys.forEach(key => newQr.slots[key] = null);

                if (importedQr.slots && typeof importedQr.slots === 'object') {
                    for (const [slotName, slotValue] of Object.entries(importedQr.slots)) {
                        if (!slotValue) continue;

                        if (slotValue.type === 'prompt') {
                            const trimmedName = slotValue.name?.trim();
                            const trimmedContent = slotValue.content?.trim();
                            const existingPrompt = allPrompts.find(p =>
                                p.name?.trim() === trimmedName &&
                                p.content?.trim() === trimmedContent
                            );

                            if (existingPrompt) {
                                newQr.slots[slotName] = existingPrompt.id;
                            } else {
                                const newPrompt = {
                                    id: Utils.generateNewId('prompt'),
                                    name: slotValue.name,
                                    content: slotValue.content,
                                    category: slotValue.category || null,
                                };
                                allPrompts.push(newPrompt);
                                newPromptCount++;
                                newQr.slots[slotName] = newPrompt.id;
                            }
                        } else if (slotValue.type === 'user_input') {
                            newQr.slots[slotName] = slotValue;
                        }
                    }
                }

                allQrs.push(newQr);
                qrCount++;
            });

            this.setQRs(allQrs);
            this.setPrompts(allPrompts);

            return {
                success: true,
                qrCount,
                newPromptCount
            };
        },

        resetAllSettings: function(options = {
            deleteLegacyOnly: false
        }) {
            const currentKeys = [
                'promptPresets', 'aiPresets', 'qrPresets', 'lorebookPresets',
                'tMainColor', 'colorCode', 'ns-italic', 'ns-bold', 'ns-highlight',
                'remoteControl', 'remoteLayout', 'remoteFavorites',
                'settingsPanelPosition', 'remotePosition', 'imagePanelPosition',
                'renderMarkdown', 'renderHtml', 'imagePanelDimensions',
                'loggingEnabled', 'firebaseConfig' // [추가] 초기화 목록에 로깅 설정 추가
            ];

            const legacyKeys = [
                'ns-icon-size', 'ns-icon-url', 'tBallP', 'history', 'last_used_prompt',
                'summaryPreset', 'translationPreset', 'geminiApi', 'dplApi', 'dplD',
                'geminiDefault', 'geminiModel', 'geminiPrompt', 'geminiKoEnPrompt',
                'geminiTemperature', 'geminiTopK', 'geminiTopP', 'longExtraction',
                'geminiInputEnabled', 'geminiSummaryEnabled', 'geminiSummaryPrompt',
                'imageGenerationEnabled', 'imageOnTranslate', 'imagePrompt', 'mainPrompt',
                'ucPrompt', 'imageModel', 'imageSize', 'imageSampler', 'imageScheduler',
                'imageSteps', 'imageScale', 'imageSm', 'imageSmDyn', 'imageDecrisper',
                'transformEnabled', 'tfStat', 'tfStock', 'cssEnabled', 'cssStock',
                'selectedCssIndex', 'novelaiApiKey', 'textExtraction'
            ];

            if (options.deleteLegacyOnly) {
                legacyKeys.forEach(key => localStorage.removeItem(key));
                console.log('오래된 설정 키가 삭제되었습니다.');
            } else {
                const allKeys = [...new Set([...currentKeys, ...legacyKeys])];
                allKeys.forEach(key => localStorage.removeItem(key));
                console.log('모든 스크립트 설정이 초기화되었습니다.');
            }
        }
    };

    // ======================== NEW: Firebase 로깅 모듈 ========================
    const FirebaseLogger = {
        _app: null,
        _db: null,
        _auth: null,
        _isInitialized: false,
        _uid: null, // 동기화 키(UID)를 저장할 변수
        _statusCallback: null,
        _currentConfigString: null, // [추가] 초기화에 사용된 설정을 추적하여 변경 감지

        /**
         * Firebase 설정을 파싱하고 앱을 초기화합니다.
         * @param {function(string, string): void} [statusCallback] - 상태 변경을 알릴 콜백 함수. (메시지, 색상)
         */
        init: function(statusCallback = null) {
            if (statusCallback) this._statusCallback = statusCallback;
            if (typeof firebase === 'undefined') {
                this._updateStatus('Firebase SDK가 로드되지 않았습니다. 스크립트 헤더를 확인하세요.', 'red');
                return;
            }

            const newConfigString = Storage.getFirebaseConfig();
            this._uid = Storage.get('firebaseSyncKey', null);

            // 설정이나 UID가 없으면 연결을 진행할 수 없으므로, 기존 연결이 있다면 완전히 종료합니다.
            if (!newConfigString || !this._uid) {
                this._isInitialized = false;
                if (this._app) {
                    this._app.delete();
                    this._app = null;
                    this._db = null;
                    this._auth = null;
                    this._currentConfigString = null;
                }
                const message = !this._uid ? '동기화 키가 없습니다. 로깅 탭에서 키를 생성하거나 입력하세요.' : 'Firebase 설정이 없습니다. 로깅 탭에서 설정을 입력하세요.';
                this._updateStatus(message, 'orange');
                return;
            }

            // 이미 동일한 설정으로 초기화가 완료된 경우, 추가 작업을 수행하지 않습니다.
            if (this._isInitialized && this._currentConfigString === newConfigString) {
                this._signIn(); // 로그인 상태만 다시 확인합니다.
                return;
            }

            // 새로운 설정으로 재초기화를 진행합니다.
            this._updateStatus('Firebase에 다시 연결하는 중...', 'orange');
            this._isInitialized = false;

            const performInit = () => {
                try {
                    const config = this._parseConfig(newConfigString);
                    this._app = firebase.initializeApp(config);
                    this._db = firebase.database();
                    this._auth = firebase.auth();
                    this._currentConfigString = newConfigString;
                    this._isInitialized = true;
                    this._signIn();
                } catch (e) {
                    this._isInitialized = false;
                    this._currentConfigString = null;
                    console.error('Firebase 초기화 실패:', e);
                    this._updateStatus(`설정 오류: ${e.message}`, 'red');
                }
            };

            // 기존에 초기화된 Firebase 앱이 있다면 비동기적으로 삭제한 후, 새로운 앱을 초기화합니다.
            if (firebase.apps.length > 0) {
                firebase.app().delete().then(performInit).catch(error => {
                    console.error("기존 Firebase 앱 삭제 실패 (무시하고 계속):", error);
                    performInit();
                });
            } else {
                performInit();
            }
        },

        /**
         * 사용자가 붙여넣은 Firebase 설정 스크립트에서 JSON 객체를 추출합니다.
         * @private
         */
        _parseConfig: function(configString) {
            let match = configString.match(/const\s+firebaseConfig\s*=\s*(\{[\s\S]*?\});/);
            if (!match) {
                match = configString.match(/firebase\.initializeApp\((\{[\s\S]*?\})\);/);
            }

            if (match && match[1]) {
                try {
                    // eslint-disable-next-line no-eval
                    return (0, eval)('(' + match[1] + ')');
                } catch (e) {
                    throw new Error("설정 객체를 파싱하는 중 오류가 발생했습니다. 코드 스니펫을 올바르게 복사했는지 확인하세요.");
                }
            }

            throw new Error("붙여넣은 코드에서 'const firebaseConfig = { ... };' 또는 'firebase.initializeApp({ ... });' 형식을 찾을 수 없습니다.");
        },

        /**
         * 익명으로 Firebase에 로그인합니다.
         * @private
         */
        _signIn: function() {
            this._auth.signInAnonymously()
                .then(() => {
                    // 로그인 성공 후에는 아무 작업도 하지 않음. this._uid는 사용자가 설정한 키를 그대로 사용.
                    this._updateStatus('연결 완료', 'green');
                })
                .catch((error) => {
                    console.error("Firebase 익명 로그인 실패:", error);
                    this._updateStatus(`인증 실패: ${error.message}`, 'red');
                });
        },

        /**
         * UI에 현재 상태를 업데이트합니다.
         * @private
         */
        _updateStatus: function(message, color) {
            if (this._statusCallback) {
                this._statusCallback(message, color);
            }
        },

        /**
         * 로깅 기능이 활성화되었고 Firebase가 준비되었는지 확인합니다.
         * @returns {boolean}
         */
        isEnabled: function() {
            // 인증 상태 대신 this._uid(동기화 키)의 존재 여부로 판단
            return Storage.isLoggingEnabled() && this._isInitialized && this._uid;
        },
        /**
         * QR 실행 기록을 Firebase에 저장합니다.
         * @param {string} qrId - 실행된 QR의 ID
         * @param {string} qrName - 실행된 QR의 이름
         * @param {string} prompt - AI에 전송된 전체 프롬프트
         * @param {string|Object} response - AI로부터 받은 응답
         */
        log: function(qrId, qrName, prompt, response) {
            if (!this.isEnabled()) return;

            let responseToLog;
            if (typeof response === 'object' && response !== null && response.imageUrl) {
                responseToLog = '[Image Output]';
            } else if (typeof response === 'string') {
                responseToLog = response;
            } else {
                responseToLog = JSON.stringify(response);
            }

            const title = document.querySelector('title')?.textContent.replace(/ - NovelAI$/, '').trim() || 'Untitled';

            const d = new Date();
            const pad = (num) => num.toString().padStart(2, '0');
            const formattedTimestamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

            const logData = {
                title: title,
                qrId: qrId,
                qrName: qrName,
                prompt: prompt,
                response: responseToLog,
                timestamp: formattedTimestamp,
                serverTimestamp: firebase.database.ServerValue.TIMESTAMP
            };

            // this._auth.currentUser.uid 대신 사용자가 지정한 this._uid 사용
            this._db.ref(`users/${this._uid}/logs`).push(logData)
                .catch(error => console.error("Firebase 로깅 실패:", error));
        },

        /**
         * 저장된 모든 로그를 가져옵니다.
         * @returns {Promise<Object[]>} 로그 객체의 배열
         */
        getLogs: async function() {
            if (!this.isEnabled()) return [];

            try {
                const snapshot = await this._db.ref(`users/${this._uid}/logs`).orderByChild('serverTimestamp').once('value');
                const logsData = snapshot.val();
                if (!logsData) return [];

                return Object.entries(logsData)
                    .map(([id, data]) => ({
                        id,
                        ...data
                    }))
                    .reverse();
            } catch (error) {
                console.error("Firebase 로그 가져오기 실패:", error);
                alert(`로그를 가져오는 중 오류 발생: ${error.message}`);
                return [];
            }
        },

        /**
         * 로그 데이터를 CSV 형식으로 변환하여 다운로드합니다.
         * @param {Object[]} logs - CSV로 변환할 로그 데이터 배열
         */
        downloadLogsAsCsv: function(logs) {
            if (!logs || logs.length === 0) {
                alert('다운로드할 기록이 없습니다.');
                return;
            }

            const headers = ['title', 'qrName', 'timestamp', 'prompt', 'response'];

            const escapeCsvField = (field) => {
                const str = String(field == null ? '' : field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const csvRows = [
                headers.join(','),
                ...logs.map(log =>
                    headers.map(header => escapeCsvField(log[header])).join(',')
                )
            ];

            const csvContent = csvRows.join('\n');
            Utils.downloadFile(csvContent, `NAI_QR_Logs_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
        },

        /**
         * 특정 로그를 삭제합니다.
         * @param {string} logId - 삭제할 로그의 ID
         */
        deleteLog: async function(logId) {
            if (!this.isEnabled()) return;
            await this._db.ref(`users/${this._uid}/logs/${logId}`).remove();
        },

        /**
         * 모든 로그를 삭제합니다.
         */
        deleteAllLogs: async function() {
            if (!this.isEnabled()) return;
            await this._db.ref(`users/${this._uid}/logs`).remove();
        }
    };

    // ======================== NEW: 프리셋 관리 UI 모듈 (버그 수정 및 UI 개선) ========================
    const PresetManagerUI = {
        createManager: function(config) {
            let presets = config.storageGetter();
            let currentFilter = 'all';
            let openEditId = null;

            let dateSortDirection = 'desc';
            let categorySortDirection = 'asc';

            const section = Utils.createElement('div', {
                className: 'settings-section',
                id: `${config.presetType}-settings`
            });

            const headerContainer = Utils.createElement('div', {
                style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                }
            });
            const title = Utils.createElement('h3', {
                textContent: config.title,
                style: {
                    margin: 0
                }
            });

            const controlsContainer = Utils.createElement('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginLeft: 'auto'
                }
            });

            if (config.presetType === 'qr') {
                const importButton = Utils.createElement('button', {
                    className: 'form-button',
                    title: 'QR 가져오기',
                    onclick: () => _createImportModal(),
                }, [Utils.createElement('i', {
                    className: 'fa-solid fa-file-import'
                })]);

                const exportButton = Utils.createElement('button', {
                    className: 'form-button',
                    title: 'QR 내보내기',
                    onclick: () => _createExportModal(),
                }, [Utils.createElement('i', {
                    className: 'fa-solid fa-file-export'
                })]);

                controlsContainer.append(importButton, exportButton);
            }
            if (config.presetType === 'lorebook') {
                const importLorebookButton = Utils.createElement('button', {
                    className: 'form-button',
                    title: '로어북 가져오기',
                    onclick: () => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json,.lorebook';
                        input.onchange = e => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = event => {
                                    const result = Storage.importLorebook(event.target.result, file.name);
                                    if (result.success) {
                                        alert(`로어북 '${result.name}'을(를) 성공적으로 가져왔습니다.`);
                                        UI.switchSettingsTab('lorebook');
                                    } else {
                                        alert(`가져오기 실패: ${result.message}`);
                                    }
                                };
                                reader.readAsText(file);
                            }
                        };
                        input.click();
                    },
                }, [Utils.createElement('i', {
                    className: 'fa-solid fa-file-import'
                })]);
                controlsContainer.appendChild(importLorebookButton);
            }

            const sortButtonGroup = Utils.createElement('div', {
                style: {
                    marginLeft: '10px'
                }
            });
            const sortByCreationButton = Utils.createElement('button', {
                className: 'form-button',
                title: '생성순/역순으로 정렬',
                onclick: handleSortByCreation
            }, '생성순 ▼');
            const sortByCategoryButton = Utils.createElement('button', {
                className: 'form-button',
                title: '분류 이름순/역순으로 정렬',
                onclick: handleSortByCategory
            }, '분류순');
            sortButtonGroup.append(sortByCreationButton, sortByCategoryButton);
            controlsContainer.appendChild(sortButtonGroup);

            const addButton = Utils.createElement('button', {
                className: 'form-button primary',
                style: {
                    marginLeft: '10px'
                },
                textContent: '+ 추가',
                onclick: handleAddItem
            });
            headerContainer.append(title, controlsContainer, addButton);

            const addFormContainer = Utils.createElement('div', {
                className: 'preset-edit-container',
                style: {
                    display: 'none'
                }
            });
            const filterContainer = Utils.createElement('div', {
                className: 'settings-tabs',
                style: {
                    margin: '10px 0'
                }
            });
            const listContainer = Utils.createElement('div', {
                id: `${config.presetType}-list-container`
            });

            const getNestedValue = (obj, path) => path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
            const setNestedValue = (obj, path, value) => {
                const keys = path.split('.');
                const lastKey = keys.pop();
                const lastObj = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
                lastObj[lastKey] = value;
            };

            const _createModalBase = (title, width = '800px') => {
                const overlay = Utils.createElement('div', {
                    style: {
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        zIndex: 30000,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }
                });

                const modal = Utils.createElement('div', {
                    style: {
                        background: 'var(--main-color)',
                        width: '90%',
                        maxWidth: width,
                        height: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                    }
                });

                const header = Utils.createElement('div', {
                    className: 'settings-header',
                    style: {
                        padding: '0 15px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }
                });
                header.append(
                    Utils.createElement('h4', {
                        textContent: title,
                        style: {
                            margin: 0,
                            flexGrow: 1
                        }
                    }),
                    Utils.createElement('button', {
                        textContent: '✕',
                        className: 'close-button',
                        onclick: () => overlay.remove()
                    })
                );

                const contentContainer = Utils.createElement('div', {
                    style: {
                        flexGrow: 1,
                        overflowY: 'auto',
                        minHeight: 0
                    }
                });

                modal.append(header, contentContainer);
                overlay.appendChild(modal);
                document.body.appendChild(overlay);

                return {
                    overlay,
                    modal,
                    contentContainer
                };
            };


            const _createImportModal = () => {
                const {
                    overlay,
                    contentContainer
                } = _createModalBase('QR 프리셋 가져오기', '700px');
                const content = Utils.createElement('div', {
                    style: {
                        padding: '15px'
                    }
                });
                const textArea = Utils.createElement('textarea', {
                    className: 'form-textarea',
                    placeholder: '여기에 JSON 텍스트를 붙여넣거나 아래에서 파일을 선택하세요.',
                    style: {
                        height: '350px'
                    }
                });
                const fileInput = Utils.createElement('input', {
                    type: 'file',
                    accept: '.json',
                    className: 'form-input',
                    style: {
                        marginTop: '10px'
                    },
                    onchange: (e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => textArea.value = event.target.result;
                            reader.readAsText(file);
                        }
                    }
                });
                const importButton = Utils.createElement('button', {
                    className: 'form-button primary',
                    style: {
                        marginTop: '15px',
                        width: '100%'
                    },
                    textContent: '가져오기 실행',
                    onclick: () => {
                        const jsonString = textArea.value.trim();
                        if (!jsonString) {
                            alert('가져올 내용이 없습니다.');
                            return;
                        }
                        const result = Storage.importQrs(jsonString);
                        if (result.success) {
                            alert(`가져오기 완료!\n새 QR: ${result.qrCount}개\n새 프롬프트: ${result.newPromptCount}개`);
                            overlay.remove();
                            UI.switchSettingsTab('qr');
                        } else {
                            alert(`가져오기 실패: ${result.message}`);
                        }
                    }
                });

                content.append(textArea, fileInput, importButton);
                contentContainer.appendChild(content);
            };

            const _createExportModal = () => {
                const {
                    overlay,
                    contentContainer
                } = _createModalBase('QR 프리셋 내보내기', '700px');
                const content = Utils.createElement('div', {
                    style: {
                        display: 'flex',
                        flexDirection: 'column',
                        flexGrow: 1,
                        minHeight: 0,
                        padding: '15px'
                    }
                });
                const allQrs = Storage.getQRs();
                const selectedIds = new Set();
                let currentExportFilter = 'all';

                const topControlsContainer = Utils.createElement('div');
                const filterTabsContainer = Utils.createElement('div', {
                    className: 'settings-tabs',
                    style: {
                        margin: '0 0 10px 0',
                        borderTop: 'none',
                        paddingTop: 0
                    }
                });
                const bulkSelectContainer = Utils.createElement('div', {
                    style: {
                        marginBottom: '10px',
                        display: 'flex',
                        gap: '5px'
                    }
                });

                const listContainer = Utils.createElement('div', {
                    style: {
                        flexGrow: 1,
                        overflowY: 'auto',
                        borderTop: '1px solid #444',
                        borderBottom: '1px solid #444',
                        padding: '5px 0',
                        minHeight: '200px'
                    }
                });

                const renderList = () => {
                    listContainer.innerHTML = '';
                    const filteredQrs = allQrs.filter(qr =>
                        currentExportFilter === 'all' ? true : (currentExportFilter === CONFIG.uncategorizedId ? !qr.category : qr.category === currentExportFilter)
                    );

                    filteredQrs.forEach(qr => {
                        const checkbox = Utils.createElement('input', {
                            type: 'checkbox',
                            className: 'form-checkbox',
                            checked: selectedIds.has(qr.id),
                            onchange: (e) => {
                                e.target.checked ? selectedIds.add(qr.id) : selectedIds.delete(qr.id);
                            }
                        });
                        const item = Utils.createElement('div', {
                            className: 'list-item',
                            style: {
                                padding: '8px 5px'
                            }
                        }, [
                            Utils.createElement('span', {
                                className: 'list-item-name',
                                textContent: qr.name
                            }),
                            Utils.createElement('div', {
                                className: 'list-item-controls'
                            }, [Utils.createElement('label', {
                                className: 'form-checkbox-label'
                            }, [checkbox, '선택'])])
                        ]);
                        listContainer.appendChild(item);
                    });
                };

                const createFilterButton = (filter, label) => {
                    const button = Utils.createElement('button', {
                        className: `settings-tab ${currentExportFilter === filter ? 'active' : ''}`,
                        textContent: label,
                        onclick: () => {
                            currentExportFilter = filter;
                            filterTabsContainer.querySelectorAll('.settings-tab').forEach(b => b.classList.remove('active'));
                            button.classList.add('active');
                            renderList();
                        }
                    });
                    return button;
                };

                const categories = [...new Set(allQrs.map(q => q.category || CONFIG.uncategorizedId))];
                filterTabsContainer.append(createFilterButton('all', '전체'));
                categories.sort().forEach(catId => {
                    filterTabsContainer.append(createFilterButton(catId, catId === CONFIG.uncategorizedId ? CONFIG.uncategorizedName : catId));
                });

                bulkSelectContainer.append(
                    Utils.createElement('button', {
                        className: 'form-button',
                        textContent: '현재 목록 전체 선택',
                        onclick: () => listContainer.querySelectorAll('input[type="checkbox"]').forEach(c => {
                            c.checked = true;
                            c.dispatchEvent(new Event('change'));
                        })
                    }),
                    Utils.createElement('button', {
                        className: 'form-button',
                        textContent: '현재 목록 전체 해제',
                        onclick: () => listContainer.querySelectorAll('input[type="checkbox"]').forEach(c => {
                            c.checked = false;
                            c.dispatchEvent(new Event('change'));
                        })
                    })
                );
                topControlsContainer.append(filterTabsContainer, bulkSelectContainer);

                const bottomButtons = Utils.createElement('div', {
                    className: 'form-button-group',
                    style: {
                        marginTop: '15px'
                    }
                });
                bottomButtons.append(
                    Utils.createElement('button', {
                        className: 'form-button primary',
                        textContent: 'JSON 파일로 다운로드',
                        onclick: () => {
                            if (selectedIds.size === 0) {
                                alert('내보낼 QR을 선택하세요.');
                                return;
                            }
                            Utils.downloadFile(Storage.exportQrs([...selectedIds]), `qr_presets_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
                        }
                    }),
                    Utils.createElement('button', {
                        className: 'form-button',
                        textContent: '클립보드에 복사',
                        onclick: () => {
                            if (selectedIds.size === 0) {
                                alert('내보낼 QR을 선택하세요.');
                                return;
                            }
                            Utils.copyToClipboard(Storage.exportQrs([...selectedIds]), `${selectedIds.size}개의 QR 설정이 클립보드에 복사되었습니다.`);
                        }
                    })
                );
                content.append(topControlsContainer, listContainer, bottomButtons);

                contentContainer.appendChild(content);
                renderList();
            };

            // [수정] 이 함수가 버그의 원인. 로직을 분기하도록 수정.
            const _createAndShowModal = (title, fieldConfig, onSelect) => {
                const {
                    overlay,
                    modal,
                    contentContainer
                } = _createModalBase(title);

                // 필드 키를 기준으로 프롬프트 슬롯인지, 아니면 AI/QR 같은 단순 선택인지 판별
                const isPromptSlot = fieldConfig.key.startsWith('slots.');

                if (isPromptSlot) {
                    // --- 복잡한 모달 로직 (프롬프트, 사용자 입력, 로어북 선택) ---
                    let currentView = 'list';
                    let editingItemId = null;
                    let selectedLorebookIds = new Set();
                    let modalCurrentFilter = 'all';

                    const renderComplexModalView = () => {
                        contentContainer.innerHTML = '';
                        const mainWrapper = Utils.createElement('div', {
                            style: {
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%'
                            }
                        });
                        const scrollableContent = Utils.createElement('div', {
                            style: {
                                flexGrow: 1,
                                overflowY: 'auto',
                                padding: '15px'
                            }
                        });
                        const fixedFooter = Utils.createElement('div', {
                            style: {
                                flexShrink: 0,
                                padding: '15px',
                                borderTop: '1px solid rgba(255,255,255,0.2)',
                                background: 'var(--main-color)'
                            }
                        });

                        const createSectionHeader = (title) => Utils.createElement('h4', {
                            style: {
                                borderBottom: '1px solid #555',
                                paddingBottom: '5px',
                                marginBottom: '10px',
                                marginTop: '0'
                            }
                        }, title);
                        const createDivider = () => Utils.createElement('hr', {
                            style: {
                                border: 'none',
                                borderTop: '1px solid rgba(255,255,255,0.2)',
                                margin: '20px 0'
                            }
                        });

                        if (currentView === 'list') {
                            scrollableContent.appendChild(createSectionHeader('선택 1: 사용자 입력창'));
                            const userInputSection = Utils.createElement('div', {
                                className: 'form-group'
                            });
                            const captionInput = Utils.createElement('input', {
                                type: 'text',
                                className: 'form-input',
                                placeholder: '입력창에 표시될 메시지 (예: 캐릭터 이름)'
                            });
                            const confirmBtn = Utils.createElement('button', {
                                textContent: '입력창 사용',
                                className: 'form-button primary',
                                style: {
                                    marginTop: '10px',
                                    width: '100%'
                                },
                                onclick: () => {
                                    onSelect({
                                        type: 'user_input',
                                        caption: captionInput.value || '사용자 입력'
                                    });
                                    overlay.remove();
                                }
                            });
                            userInputSection.append(captionInput, confirmBtn);
                            scrollableContent.appendChild(userInputSection);
                            scrollableContent.appendChild(createDivider());

                            const promptHeader = Utils.createElement('div', {
                                style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }
                            });
                            promptHeader.append(createSectionHeader('선택 2: 프롬프트 선택'), Utils.createElement('button', {
                                textContent: '+ 새 프롬프트 생성',
                                className: 'form-button',
                                onclick: () => {
                                    currentView = 'create';
                                    editingItemId = null;
                                    renderComplexModalView();
                                }
                            }));
                            scrollableContent.appendChild(promptHeader);

                            const allPrompts = Storage.getPrompts();
                            const promptCategories = [...new Set(allPrompts.map(p => p.category).filter(Boolean))];
                            const promptFilterContainer = Utils.createElement('div', {
                                className: 'settings-tabs',
                                style: {
                                    margin: '10px 0'
                                }
                            });
                            const createModalFilterButton = (filter, label) => Utils.createElement('button', {
                                className: `settings-tab ${modalCurrentFilter === filter ? 'active' : ''}`,
                                textContent: label,
                                onclick: () => {
                                    modalCurrentFilter = filter;
                                    renderComplexModalView();
                                }
                            });
                            promptFilterContainer.append(createModalFilterButton('all', '전체'), ...promptCategories.sort().map(cat => createModalFilterButton(cat, cat)), createModalFilterButton(null, '미분류'));
                            scrollableContent.appendChild(promptFilterContainer);

                            const filteredPrompts = allPrompts.filter(p => modalCurrentFilter === 'all' ? true : (modalCurrentFilter === null ? !p.category : p.category === modalCurrentFilter));
                            const promptListContainer = Utils.createElement('div', {
                                style: {
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '5px'
                                }
                            });
                            filteredPrompts.forEach(item => {
                                promptListContainer.appendChild(Utils.createElement('button', {
                                    className: 'form-button',
                                    textContent: item.name,
                                    onclick: () => {
                                        currentView = 'edit';
                                        editingItemId = item.id;
                                        renderComplexModalView();
                                    }
                                }));
                            });
                            scrollableContent.appendChild(promptListContainer);
                            scrollableContent.appendChild(createDivider());

                            scrollableContent.appendChild(createSectionHeader('선택 3: 로어북 선택'));
                            const lorebookListContainer = Utils.createElement('div', {
                                style: {
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    marginTop: '10px'
                                }
                            });
                            Storage.getLorebooks().forEach(item => {
                                const checkbox = Utils.createElement('input', {
                                    type: 'checkbox',
                                    className: 'form-checkbox',
                                    id: `lb-check-${item.id}`,
                                    checked: selectedLorebookIds.has(item.id),
                                    onchange: e => {
                                        e.target.checked ? selectedLorebookIds.add(item.id) : selectedLorebookIds.delete(item.id);
                                    }
                                });
                                lorebookListContainer.appendChild(Utils.createElement('label', {
                                    className: 'form-checkbox-label',
                                    for: `lb-check-${item.id}`
                                }, [checkbox, item.name]));
                            });
                            scrollableContent.appendChild(lorebookListContainer);
                            const confirmLorebookBtn = Utils.createElement('button', {
                                textContent: '로어북 선택 완료',
                                className: 'form-button primary',
                                style: {
                                    marginTop: '15px',
                                    width: '100%'
                                },
                                onclick: () => {
                                    if (selectedLorebookIds.size > 0) {
                                        onSelect({
                                            type: 'lorebook',
                                            ids: [...selectedLorebookIds]
                                        });
                                        overlay.remove();
                                    } else {
                                        alert('선택된 로어북이 없습니다.');
                                    }
                                }
                            });
                            scrollableContent.appendChild(confirmLorebookBtn);

                        } else if (currentView === 'edit' || currentView === 'create') {
                            const isCreate = currentView === 'create';
                            const promptFormConfig = {
                                presetType: 'prompt',
                                storageGetter: Storage.getPrompts.bind(Storage),
                                layout: [
                                    [{
                                        key: 'name',
                                        label: '이름',
                                        type: 'text'
                                    }],
                                    [{
                                        key: 'content',
                                        label: '내용',
                                        type: 'textarea'
                                    }],
                                    [{
                                        key: 'category',
                                        label: '분류',
                                        type: 'category'
                                    }]
                                ]
                            };
                            const itemToEdit = isCreate ? {
                                id: Utils.generateNewId('prompt'),
                                name: '',
                                content: '',
                                category: null
                            } : Storage.getPrompts().find(p => p.id === editingItemId);
                            if (!itemToEdit) {
                                currentView = 'list';
                                renderComplexModalView();
                                return;
                            }

                            const onSave = (updatedItem) => {
                                if (!updatedItem.name.trim()) {
                                    alert('프롬프트 이름을 입력해주세요.');
                                    return;
                                }
                                const allPrompts = Storage.getPrompts();
                                if (isCreate) {
                                    allPrompts.unshift(updatedItem);
                                } else {
                                    const index = allPrompts.findIndex(p => p.id === editingItemId);
                                    if (index !== -1) allPrompts[index] = updatedItem;
                                }
                                Storage.setPrompts(allPrompts);
                                onSelect(updatedItem.id);
                                overlay.remove();
                            };

                            const backButton = Utils.createElement('button', {
                                className: 'form-button',
                                style: {
                                    marginBottom: '15px'
                                },
                                textContent: '← 목록으로 돌아가기',
                                onclick: () => {
                                    currentView = 'list';
                                    renderComplexModalView();
                                }
                            });
                            const editForm = _renderForm(itemToEdit, onSave, () => {
                                onSelect(editingItemId);
                                overlay.remove();
                            }, isCreate, {}, promptFormConfig, '저장 후 선택');
                            scrollableContent.append(backButton, editForm);
                        }

                        fixedFooter.appendChild(Utils.createElement('button', {
                            className: 'form-button',
                            style: {
                                width: '100%'
                            },
                            textContent: '선택 해제',
                            onclick: () => {
                                onSelect(null);
                                overlay.remove();
                            }
                        }));

                        mainWrapper.append(scrollableContent, fixedFooter);
                        contentContainer.appendChild(mainWrapper);
                    };

                    renderComplexModalView();

                } else {
                    // --- 단순 선택 모달 로직 (AI 프리셋, 다음 QR 등) ---
                    const mainWrapper = Utils.createElement('div', {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%'
                        }
                    });
                    const scrollableContent = Utils.createElement('div', {
                        style: {
                            flexGrow: 1,
                            overflowY: 'auto',
                            padding: '15px'
                        }
                    });
                    const fixedFooter = Utils.createElement('div', {
                        style: {
                            flexShrink: 0,
                            padding: '15px',
                            borderTop: '1px solid rgba(255,255,255,0.2)',
                            background: 'var(--main-color)'
                        }
                    });

                    const sourceData = fieldConfig.sourceGetter();

                    if (sourceData.length === 0) {
                        scrollableContent.textContent = '선택할 수 있는 항목이 없습니다.';
                    } else {
                        sourceData.forEach(item => {
                            const itemButton = Utils.createElement('button', {
                                className: 'form-button',
                                textContent: item.name,
                                style: {
                                    width: '100%',
                                    textAlign: 'left',
                                    marginBottom: '5px'
                                },
                                onclick: () => {
                                    onSelect(item.id);
                                    overlay.remove();
                                }
                            });
                            scrollableContent.appendChild(itemButton);
                        });
                    }

                    const deselectButton = Utils.createElement('button', {
                        className: 'form-button',
                        style: {
                            width: '100%'
                        },
                        textContent: '선택 해제',
                        onclick: () => {
                            onSelect(null);
                            overlay.remove();
                        }
                    });
                    fixedFooter.appendChild(deselectButton);

                    mainWrapper.append(scrollableContent, fixedFooter);
                    contentContainer.appendChild(mainWrapper);
                }
            };

            const _renderForm = (item, onSave, onCancel, isCreate = false, viewState = {}, overrideConfig = null, saveButtonText = '저장') => {
                const form = Utils.createElement('div');
                let tempItem = JSON.parse(JSON.stringify(item));
                const currentConfig = overrideConfig || config;

                const redrawForm = (newViewState = {}) => {
                    const newForm = _renderForm(tempItem, onSave, onCancel, isCreate, {
                        ...viewState,
                        ...newViewState
                    }, currentConfig, saveButtonText);
                    form.replaceWith(newForm);
                };

                const renderField = (field, container) => {
                    if (field.showIf && !field.showIf(tempItem)) return;
                    const handleDataChange = (value) => setNestedValue(tempItem, field.key, value);
                    const handleUiUpdate = (value, newViewState = {}) => {
                        setNestedValue(tempItem, field.key, value);
                        redrawForm({
                            ...viewState,
                            ...newViewState
                        });
                    };

                    const fieldWrapper = Utils.createElement('div', {
                        className: 'form-group'
                    });
                    const label = field.label ? Utils.createElement('label', {
                        className: 'form-label',
                        textContent: field.label
                    }) : null;
                    let input;

                    switch (field.type) {
                        case 'multiPopupSelector':
                            const selectedIds = getNestedValue(tempItem, field.key) || [];
                            const sourceItems = field.sourceGetter ? field.sourceGetter() : [];
                            const sourceMap = new Map(sourceItems.map(s => [s.id, s.name]));

                            const tagsContainer = Utils.createElement('div', {
                                style: {
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '5px',
                                    marginTop: '5px'
                                }
                            });
                            selectedIds.forEach(id => {
                                if (id === tempItem.id) return; // 자기 자신은 추가하지 않음
                                const tagName = sourceMap.get(id) || `(ID: ${id})`;
                                const tag = Utils.createElement('div', {
                                    className: 'form-button',
                                    style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        backgroundColor: 'rgba(255,255,255,0.05)'
                                    }
                                }, [
                                    Utils.createElement('span', {
                                        textContent: tagName
                                    }),
                                    Utils.createElement('button', {
                                        textContent: '×',
                                        style: {
                                            background: 'none',
                                            border: 'none',
                                            color: 'inherit',
                                            cursor: 'pointer',
                                            padding: '0 2px',
                                            lineHeight: 1
                                        },
                                        onclick: (e) => {
                                            e.stopPropagation();
                                            const newIds = selectedIds.filter(selectedId => selectedId !== id);
                                            handleUiUpdate(newIds.length > 0 ? newIds : null);
                                        }
                                    })
                                ]);
                                tagsContainer.appendChild(tag);
                            });

                            const addButton = Utils.createElement('button', {
                                className: 'form-button',
                                textContent: '+ 추가',
                                style: {
                                    marginTop: '5px'
                                },
                                onclick: () => {
                                    // 자기 자신을 제외한 목록을 소스로 전달
                                    const filteredSourceGetter = () => field.sourceGetter().filter(qr => qr.id !== tempItem.id);
                                    _createAndShowModal(field.label, {
                                        ...field,
                                        sourceGetter: filteredSourceGetter
                                    }, (newId) => {
                                        if (newId && !selectedIds.includes(newId)) {
                                            const newIds = [...selectedIds, newId];
                                            handleUiUpdate(newIds);
                                        }
                                    });
                                }
                            });

                            if (label) fieldWrapper.appendChild(label);
                            fieldWrapper.append(tagsContainer, addButton);
                            container.appendChild(fieldWrapper);
                            break;
                        case 'lorebookEditor':
                            const editorContainer = Utils.createElement('div', {
                                style: {
                                    display: 'flex',
                                    gap: '10px',
                                    minHeight: '400px',
                                    maxHeight: '50vh',
                                    border: '1px solid #444',
                                    padding: '10px',
                                    borderRadius: '4px'
                                }
                            });
                            const treeView = Utils.createElement('div', {
                                style: {
                                    width: '35%',
                                    overflowY: 'auto',
                                    borderRight: '1px solid #444',
                                    paddingRight: '10px'
                                }
                            });
                            const detailView = Utils.createElement('div', {
                                style: {
                                    width: '65%',
                                    overflowY: 'auto',
                                    paddingLeft: '10px'
                                }
                            });

                            const renderDetailView = (type, id) => {
                                detailView.innerHTML = '';
                                let target, onDelete;

                                if (type === 'category') {
                                    target = tempItem.data.categories.find(c => c.id === id);
                                    if (!target) return;
                                    const onUpdate = (key, value) => {
                                        target[key] = value;
                                        renderTreeView();
                                    };
                                    onDelete = () => {
                                        if (!confirm(`폴더 '${target.name}'와(과) 포함된 모든 기사를 삭제하시겠습니까?`)) return;
                                        tempItem.data.categories = tempItem.data.categories.filter(c => c.id !== id);
                                        tempItem.data.entries = tempItem.data.entries.filter(e => e.category !== id);
                                        viewState.selectedItem = null;
                                        redrawForm(viewState);
                                    };
                                    detailView.append(
                                        Utils.createElement('h5', {}, '폴더 편집'),
                                        Utils.createElement('label', {
                                            className: 'form-label'
                                        }, '이름'),
                                        Utils.createElement('input', {
                                            className: 'form-input',
                                            value: target.name,
                                            onchange: e => onUpdate('name', e.target.value)
                                        }),
                                        Utils.createElement('label', {
                                            className: 'form-checkbox-label',
                                            style: {
                                                marginTop: '10px'
                                            }
                                        }, [Utils.createElement('input', {
                                            type: 'checkbox',
                                            className: 'form-checkbox',
                                            checked: target.enabled,
                                            onchange: e => onUpdate('enabled', e.target.checked)
                                        }), '활성화']),
                                        Utils.createElement('button', {
                                            className: 'form-button',
                                            style: {
                                                marginTop: '20px'
                                            },
                                            textContent: '삭제',
                                            onclick: onDelete
                                        })
                                    );

                                } else if (type === 'entry') {
                                    target = tempItem.data.entries.find(e => e.id === id);
                                    if (!target) return;
                                    const onUpdate = (path, value) => {
                                        setNestedValue(target, path, value);
                                        renderTreeView();
                                    };
                                    onDelete = () => {
                                        if (!confirm(`기사 '${target.displayName}'을(를) 삭제하시겠습니까?`)) return;
                                        tempItem.data.entries = tempItem.data.entries.filter(e => e.id !== id);
                                        viewState.selectedItem = null;
                                        redrawForm(viewState);
                                    };
                                    detailView.append(
                                        Utils.createElement('h5', {}, '기사 편집'),
                                        Utils.createElement('label', {
                                            className: 'form-label'
                                        }, '제목'),
                                        Utils.createElement('input', {
                                            className: 'form-input',
                                            value: target.displayName,
                                            onchange: e => onUpdate('displayName', e.target.value)
                                        }),
                                        Utils.createElement('label', {
                                            className: 'form-label',
                                            style: {
                                                marginTop: '10px'
                                            }
                                        }, '내용'),
                                        Utils.createElement('textarea', {
                                            className: 'form-textarea',
                                            style: {
                                                minHeight: '150px'
                                            },
                                            textContent: target.text,
                                            onchange: e => onUpdate('text', e.target.value)
                                        }),
                                        Utils.createElement('label', {
                                            className: 'form-label',
                                            style: {
                                                marginTop: '10px'
                                            }
                                        }, '키워드 (한 줄에 하나씩)'),
                                        Utils.createElement('textarea', {
                                            className: 'form-textarea',
                                            style: {
                                                minHeight: '80px'
                                            },
                                            textContent: target.keys.join('\n'),
                                            onchange: e => onUpdate('keys', e.target.value.split('\n').map(k => k.trim().toLowerCase()).filter(Boolean))
                                        }),
                                        Utils.createElement('label', {
                                            className: 'form-label',
                                            style: {
                                                marginTop: '10px'
                                            }
                                        }, '우선순위'),
                                        Utils.createElement('input', {
                                            className: 'form-input',
                                            type: 'number',
                                            value: target.contextConfig?.budgetPriority || 0,
                                            onchange: e => onUpdate('contextConfig.budgetPriority', parseInt(e.target.value, 10))
                                        }),
                                        Utils.createElement('label', {
                                            className: 'form-checkbox-label',
                                            style: {
                                                marginTop: '10px'
                                            }
                                        }, [Utils.createElement('input', {
                                            type: 'checkbox',
                                            className: 'form-checkbox',
                                            checked: target.enabled,
                                            onchange: e => onUpdate('enabled', e.target.checked)
                                        }), '활성화']),
                                        Utils.createElement('label', {
                                            className: 'form-checkbox-label'
                                        }, [Utils.createElement('input', {
                                            type: 'checkbox',
                                            className: 'form-checkbox',
                                            checked: target.forceActivation,
                                            onchange: e => onUpdate('forceActivation', e.target.checked)
                                        }), '상시 활성화']),
                                        Utils.createElement('button', {
                                            className: 'form-button',
                                            style: {
                                                marginTop: '20px'
                                            },
                                            textContent: '삭제',
                                            onclick: onDelete
                                        })
                                    );
                                }
                            };

                            const renderTreeView = () => {
                                treeView.innerHTML = '';
                                const createTreeItem = (text, type, id, indent = 0) => {
                                    const itemEl = Utils.createElement('div', {
                                        textContent: text,
                                        style: {
                                            padding: '5px',
                                            marginLeft: `${indent * 15}px`,
                                            cursor: 'pointer',
                                            borderRadius: '4px'
                                        },
                                        onclick: () => {
                                            viewState.selectedItem = {
                                                type,
                                                id
                                            };
                                            redrawForm(viewState);
                                        }
                                    });
                                    if (viewState.selectedItem?.id === id) {
                                        itemEl.style.backgroundColor = 'rgba(255,255,255,0.15)';
                                    }
                                    return itemEl;
                                };
                                tempItem.data.categories.forEach(cat => {
                                    treeView.appendChild(createTreeItem(`📁 ${cat.name}`, 'category', cat.id, 0));
                                    tempItem.data.entries.filter(e => e.category === cat.id).forEach(entry => {
                                        treeView.appendChild(createTreeItem(`📄 ${entry.displayName}`, 'entry', entry.id, 1));
                                    });
                                });
                                tempItem.data.entries.filter(e => !e.category || !tempItem.data.categories.find(c => c.id === e.category)).forEach(entry => {
                                    treeView.appendChild(createTreeItem(`📄 ${entry.displayName}`, 'entry', entry.id, 0));
                                });
                            };

                            const editorControls = Utils.createElement('div', {
                                style: {
                                    marginBottom: '10px'
                                }
                            });
                            const addCategoryBtn = Utils.createElement('button', {
                                textContent: '+ 폴더 추가',
                                className: 'form-button',
                                onclick: () => {
                                    const newCat = {
                                        id: Utils.generateNewId('lb-cat'),
                                        name: '새 폴더',
                                        enabled: true,
                                        open: true
                                    };
                                    tempItem.data.categories.push(newCat);
                                    redrawForm(viewState);
                                }
                            });
                            const addEntryBtn = Utils.createElement('button', {
                                textContent: '+ 기사 추가',
                                className: 'form-button',
                                onclick: () => {
                                    const newEntry = {
                                        id: Utils.generateNewId('lb-entry'),
                                        displayName: '새 기사',
                                        text: '',
                                        keys: [],
                                        enabled: true,
                                        forceActivation: false,
                                        contextConfig: {
                                            budgetPriority: 400
                                        },
                                        category: viewState.selectedItem?.type === 'category' ? viewState.selectedItem.id : null
                                    };
                                    tempItem.data.entries.push(newEntry);
                                    redrawForm(viewState);
                                }
                            });
                            editorControls.append(addCategoryBtn, addEntryBtn);

                            renderTreeView();
                            if (viewState.selectedItem) {
                                renderDetailView(viewState.selectedItem.type, viewState.selectedItem.id);
                            }

                            if (label) fieldWrapper.appendChild(label);
                            editorContainer.append(treeView, detailView);
                            fieldWrapper.append(editorControls, editorContainer);
                            container.appendChild(fieldWrapper);
                            break;
                        case 'checkbox':
                            const checkLabel = Utils.createElement('label', {
                                className: 'form-checkbox-label'
                            }, [Utils.createElement('input', {
                                className: 'form-checkbox',
                                type: 'checkbox',
                                checked: getNestedValue(tempItem, field.key) || false,
                                onchange: e => handleUiUpdate(e.target.checked)
                            }), field.label || '']);
                            fieldWrapper.appendChild(checkLabel);
                            container.appendChild(fieldWrapper);
                            break;
                        case 'popupSelector':
                            const selectedValue = getNestedValue(tempItem, field.key);
                            let buttonText;
                            if (typeof selectedValue === 'string') {
                                const source = field.sourceGetter ? field.sourceGetter() : [];
                                const found = source.find(p => p.id === selectedValue);
                                const name = found ? found.name : '잘못된 ID';
                                buttonText = [Utils.createElement('b', {}, `선택됨: ${name}`)];
                            } else if (selectedValue?.type === 'user_input') {
                                buttonText = ['사용자 입력: ', Utils.createElement('b', {}, selectedValue.caption || '(설명 없음)')];
                            } else if (selectedValue?.type === 'lorebook') {
                                buttonText = [Utils.createElement('b', {}, `로어북: ${selectedValue.ids.length}개 선택됨`)];
                            } else {
                                buttonText = [Utils.createElement('b', {}, '선택...')];
                            }
                            input = Utils.createElement('button', {
                                className: 'form-button',
                                style: {
                                    width: '100%',
                                    textAlign: 'left'
                                },
                                onclick: () => _createAndShowModal(field.label, field, (val) => handleUiUpdate(val))
                            }, buttonText);
                            if (label) fieldWrapper.appendChild(label);
                            fieldWrapper.appendChild(input);
                            container.appendChild(fieldWrapper);
                            break;
                        case 'select':
                            input = Utils.createElement('select', {
                                className: 'form-select',
                                onchange: (e) => handleUiUpdate(e.target.value)
                            });
                            field.options.forEach(opt => input.append(Utils.createElement('option', {
                                value: opt.value,
                                textContent: opt.label
                            })));
                            input.value = getNestedValue(tempItem, field.key);
                            if (input.selectedIndex === -1 && field.options.length > 0) {
                                input.value = field.options[0].value;
                            }
                            if (label) fieldWrapper.appendChild(label);
                            fieldWrapper.appendChild(input);
                            container.appendChild(fieldWrapper);
                            break;
                        case 'sizeSelector':
                            input = Utils.createElement('select', {
                                className: 'form-select',
                                onchange: (e) => {
                                    const [width, height] = e.target.value.split('x').map(Number);
                                    setNestedValue(tempItem, field.keys.width, width);
                                    setNestedValue(tempItem, field.keys.height, height);
                                    redrawForm(viewState);
                                }
                            });
                            field.options.forEach(opt => input.append(Utils.createElement('option', {
                                value: opt.value,
                                textContent: opt.label
                            })));
                            const currentWidth = getNestedValue(tempItem, field.keys.width);
                            const currentHeight = getNestedValue(tempItem, field.keys.height);
                            input.value = `${currentWidth}x${currentHeight}`;
                            if (input.selectedIndex === -1 && field.options.length > 0) {
                                input.value = field.options[0].value;
                            }
                            if (label) fieldWrapper.appendChild(label);
                            fieldWrapper.appendChild(input);
                            container.appendChild(fieldWrapper);
                            break;
                        case 'category':
                            const allCategories = [...new Set(currentConfig.storageGetter().map(p => p.category).filter(Boolean))];
                            const selectCat = Utils.createElement('select', {
                                className: 'form-select',
                                onchange: (e) => {
                                    const isNew = e.target.value === '__new__';
                                    const value = isNew ? '' : (e.target.value === '__none__' ? null : e.target.value);
                                    handleUiUpdate(value, {
                                        isCreatingNewCategory: isNew
                                    });
                                }
                            });
                            selectCat.append(Utils.createElement('option', {
                                value: '__none__',
                                textContent: '미분류'
                            }), ...allCategories.sort().map(c => Utils.createElement('option', {
                                value: c,
                                textContent: c
                            })), Utils.createElement('option', {
                                value: '__new__',
                                textContent: '새 분류 생성...'
                            }));
                            selectCat.value = viewState.isCreatingNewCategory ? '__new__' : (getNestedValue(tempItem, field.key) || '__none__');
                            const newCatInput = Utils.createElement('input', {
                                className: 'form-input',
                                type: 'text',
                                placeholder: '새 분류 이름 입력',
                                style: {
                                    display: viewState.isCreatingNewCategory ? 'block' : 'none',
                                    marginTop: '5px'
                                },
                                onchange: (e) => handleDataChange(e.target.value.trim() || null)
                            });
                            if (label) fieldWrapper.appendChild(label);
                            fieldWrapper.append(selectCat, newCatInput);
                            container.appendChild(fieldWrapper);
                            break;
                        case 'textarea':
                            input = Utils.createElement('textarea', {
                                className: 'form-textarea',
                                placeholder: field.placeholder || '',
                                onchange: (e) => handleDataChange(e.target.value)
                            }, getNestedValue(tempItem, field.key) || '');
                            if (label) fieldWrapper.appendChild(label);
                            fieldWrapper.appendChild(input);
                            container.appendChild(fieldWrapper);
                            break;
                        default:
                            input = Utils.createElement('input', {
                                className: 'form-input',
                                type: field.type,
                                value: getNestedValue(tempItem, field.key) || '',
                                placeholder: field.placeholder || '',
                                onchange: (e) => handleDataChange(field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)
                            });
                            if (label) fieldWrapper.appendChild(label);
                            fieldWrapper.appendChild(input);
                            container.appendChild(fieldWrapper);
                            break;
                    }
                };

                currentConfig.layout.flat().forEach(field => renderField(field, form));
                const buttonGroup = Utils.createElement('div', {
                    className: 'form-button-group'
                });
                buttonGroup.append(
                    Utils.createElement('button', {
                        className: 'form-button primary',
                        textContent: isCreate ? '생성' : saveButtonText,
                        onclick: () => onSave(tempItem)
                    }),
                    Utils.createElement('button', {
                        className: 'form-button',
                        textContent: '취소',
                        onclick: onCancel
                    })
                );
                form.appendChild(buttonGroup);
                return form;
            };

            function handleAddItem() {
                if (addFormContainer.style.display === 'block') {
                    return;
                }
                addButton.style.display = 'none';
                addFormContainer.style.display = 'block';
                const newItem = config.getNewItemData();
                const onSave = (updatedItem) => {
                    presets.unshift(updatedItem);
                    config.storageSetter(presets);
                    addFormContainer.style.display = 'none';
                    addFormContainer.innerHTML = '';
                    addButton.style.display = '';
                    render();
                    if (config.presetType === 'qr') UI.createRemoteControl();
                };
                const onCancel = () => {
                    addFormContainer.style.display = 'none';
                    addFormContainer.innerHTML = '';
                    addButton.style.display = '';
                };
                addFormContainer.innerHTML = '';
                addFormContainer.appendChild(_renderForm(newItem, onSave, onCancel, true));
            }

            function handleSortByCreation() {
                dateSortDirection = dateSortDirection === 'desc' ? 'asc' : 'desc';
                presets.sort((a, b) => {
                    const comparison = a.id.localeCompare(b.id);
                    return dateSortDirection === 'asc' ? comparison : -comparison;
                });
                config.storageSetter(presets);
                sortByCreationButton.innerHTML = '생성순 ' + (dateSortDirection === 'desc' ? '▼' : '▲');
                sortByCategoryButton.textContent = '분류순';
                render();
                if (config.presetType === 'qr') UI.createRemoteControl();
            }

            function handleSortByCategory() {
                categorySortDirection = categorySortDirection === 'asc' ? 'desc' : 'asc';
                presets.sort((a, b) => {
                    const catA = a.category,
                        catB = b.category,
                        nameA = a.name.toLowerCase(),
                        nameB = a.name.toLowerCase();
                    let comparison = (catA === catB) ? 0 : (catA === null) ? 1 : (catB === null) ? -1 : catA.localeCompare(catB);
                    if (comparison === 0) {
                        comparison = nameA.localeCompare(nameB);
                    }
                    return categorySortDirection === 'asc' ? comparison : -comparison;
                });
                config.storageSetter(presets);
                sortByCategoryButton.innerHTML = '분류순 ' + (categorySortDirection === 'asc' ? '▲' : '▼');
                sortByCreationButton.textContent = '생성순';
                render();
                if (config.presetType === 'qr') UI.createRemoteControl();
            }

            function render() {
                renderFilters();
                renderList();
            }

            function renderFilters() {
                filterContainer.innerHTML = '';
                const categories = [...new Set(presets.map(p => p.category).filter(Boolean))];
                const createFilterButton = (filter, label) => Utils.createElement('button', {
                    className: `settings-tab ${currentFilter === filter ? 'active' : ''}`,
                    textContent: label,
                    onclick: () => {
                        currentFilter = filter;
                        openEditId = null;
                        addFormContainer.style.display = 'none';
                        addButton.style.display = '';
                        render();
                    }
                });
                filterContainer.append(createFilterButton('all', '전체'), ...categories.sort().map(cat => createFilterButton(cat, cat)), createFilterButton(null, '미분류'));
            }

            function renderList() {
                listContainer.innerHTML = '';
                const filteredPresets = presets.filter(p => currentFilter === 'all' ? true : (currentFilter === null ? !p.category : p.category === currentFilter));
                filteredPresets.forEach(item => {
                    const originalIndex = presets.findIndex(p => p.id === item.id);
                    const isDefault = item.id.startsWith('default-');
                    const itemContainer = Utils.createElement('div', {
                        className: 'list-item'
                    });
                    const titleText = Utils.createElement('span', {
                        className: 'list-item-name',
                        textContent: item.name || `(제목 없음)`,
                        onclick: () => {
                            openEditId = openEditId === item.id ? null : item.id;
                            addFormContainer.style.display = 'none';
                            addButton.style.display = '';
                            renderList();
                        }
                    });

                    const controls = Utils.createElement('div', {
                        className: 'list-item-controls'
                    });
                    if (config.presetType === 'lorebook') {
                        controls.appendChild(Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '내보내기',
                            onclick: () => {
                                const json = Storage.exportLorebook(item.id);
                                if (json) {
                                    Utils.downloadFile(json, `${item.name}.lorebook`, 'application/json');
                                } else {
                                    alert('로어북 내보내기에 실패했습니다.');
                                }
                            }
                        }));
                    }
                    controls.append(
                        Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '카피',
                            onclick: () => handleAction('copy', originalIndex)
                        }),
                        Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '삭제',
                            disabled: isDefault,
                            onclick: () => handleAction('delete', originalIndex)
                        }),
                        Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '↑',
                            disabled: originalIndex <= 0,
                            onclick: () => handleAction('moveUp', originalIndex)
                        }),
                        Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '↓',
                            disabled: originalIndex >= presets.length - 1,
                            onclick: () => handleAction('moveDown', originalIndex)
                        })
                    );
                    itemContainer.append(titleText, controls);

                    const wrapperDiv = Utils.createElement('div');
                    wrapperDiv.appendChild(itemContainer);
                    if (openEditId === item.id) {
                        const editContainer = Utils.createElement('div', {
                            className: 'preset-edit-container'
                        });
                        const onSave = (updatedItem) => {
                            presets[originalIndex] = updatedItem;
                            config.storageSetter(presets);
                            openEditId = null;
                            render();
                            if (config.presetType === 'qr') UI.createRemoteControl();
                        };
                        const onCancel = () => {
                            openEditId = null;
                            renderList();
                        };
                        editContainer.appendChild(_renderForm(item, onSave, onCancel, false));
                        wrapperDiv.appendChild(editContainer);
                    }
                    listContainer.appendChild(wrapperDiv);
                });
            }

            function handleAction(action, index) {
                let newPresets = [...presets];
                switch (action) {
                    case 'delete':
                        if (confirm(`'${newPresets[index].name}' 프리셋을 정말 삭제하시겠습니까?`)) {
                            newPresets.splice(index, 1);
                        } else {
                            return;
                        }
                        break;
                    case 'copy':
                        const newItem = JSON.parse(JSON.stringify(newPresets[index]));
                        newItem.id = Utils.generateNewId(config.presetType);
                        newItem.name = `${newItem.name} (복사본)`;
                        newPresets.push(newItem);
                        break;
                    case 'moveUp':
                        if (index > 0) {
                            [newPresets[index - 1], newPresets[index]] = [newPresets[index], newPresets[index - 1]];
                        }
                        break;
                    case 'moveDown':
                        if (index < newPresets.length - 1) {
                            [newPresets[index + 1], newPresets[index]] = [newPresets[index], newPresets[index + 1]];
                        }
                        break;
                }
                presets = newPresets;
                config.storageSetter(presets);
                render();
                if (config.presetType === 'qr') UI.createRemoteControl();
            }

            section.append(headerContainer, addFormContainer, filterContainer, listContainer);
            render();
            return section;
        }
    };
    // ======================== 4. UI 관리 모듈 ========================
    // css는 되도록 있는 클래스를 재활용하여 일관된 디자인 유지
    const UI = {
        styles: `
:root {
    --main-color: ${Storage.get('tMainColor', CONFIG.defaultMainColor)};
    --remote-main-color: ${Storage.get('tMainColor', CONFIG.defaultMainColor)};
    --highlight-color: ${Storage.get('colorCode', CONFIG.defaultHighlightColor)};
    --italic-active: normal;
    --bold-active: normal;
    --text-highlight-color: inherit;
    --remote-button-size: ${Storage.get('remoteControl', CONFIG.remoteControl).buttonSize || CONFIG.remoteControl.buttonSize}px;
    --remote-button-gap: ${Storage.get('remoteControl', CONFIG.remoteControl).buttonGap || CONFIG.remoteControl.buttonGap}px;
    --remote-button-radius: ${Storage.get('remoteControl', CONFIG.remoteControl).buttonShape === 'circle' ? '50%' : '4px'};
    --highlight-rgb: 52, 152, 219;
    --image-panel-width: ${Storage.get('imagePanelDimensions', { width: 1200 }).width}px;
    --image-panel-height: ${Storage.get('imagePanelDimensions', { height: 800 }).height}px;
}
/* [수정] 애니메이션 키프레임은 그대로 유지 */
@keyframes rotate-shadow {
    0% { box-shadow: 0 0 2px rgba(var(--highlight-rgb), 0.9); }
    50% { box-shadow: 0 0 10px rgba(var(--highlight-rgb), 0.9); }
    100% { box-shadow: 0 0 2px rgba(var(--highlight-rgb), 0.9); }
}
@keyframes rotate-shadow-text {
    0% { box-shadow: 0 0 2px rgba(255, 100, 50, 0.9); }
    50% { box-shadow: 0 0 10px rgba(255, 100, 50, 0.9); }
    100% { box-shadow: 0 0 2px rgba(255, 100, 50, 0.9); }
}
#remote-control {
    position: fixed;
    z-index: 11000;
    display: flex;
    gap: var(--remote-button-gap);
}
.remote-button {
    width: var(--remote-button-size);
    height: var(--remote-button-size);
    border-radius: var(--remote-button-radius);
    background-size: cover;
    background-position: center;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--remote-main-color);
    font-weight: bold;
    font-size: calc(var(--remote-button-size) * 0.4);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
    white-space: nowrap;
    user-select: none;
    overflow: visible;
    position: relative;
}
/* [수정] 선택자 우선순위를 높여 애니메이션이 확실히 적용되도록 수정 */
.remote-button.loading,
.remote-button.loading-text {
    pointer-events: none; /* 로딩 중 클릭 비활성화 */
}
.remote-button.loading {
    animation: rotate-shadow 2s linear infinite;
}
.remote-button.loading-text {
    animation: rotate-shadow-text 2s linear infinite;
}
.folder-count-badge {
    position: absolute;
    top: 1px;
    right: 1px;
    background-color: var(--highlight-color);
    color: white;
    border-radius: 50%;
    font-size: calc(var(--remote-button-size) * 0.28);
    font-weight: bold;
    min-width: calc(var(--remote-button-size) * 0.35);
    height: calc(var(--remote-button-size) * 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 1px;
    box-sizing: border-box;
    box-shadow: 0 0 4px rgba(0,0,0,0.6);
    pointer-events: none;
}
.remote-group-container {
    display: flex;
    gap: var(--remote-button-gap);
}
#remote-control.vertical .remote-group-container {
    flex-direction: column;
}
#remote-control.horizontal .remote-group-container {
    flex-direction: row;
}
.folder-container {
    position: relative;
    display: flex;
    align-items: center;
}
.sub-remote-container {
    display: none;
    position: absolute;
    backdrop-filter: blur(5px);
    padding: 0;
    border-radius: 8px;
    gap: var(--remote-button-gap);
    z-index: -1;
    box-sizing: border-box;
}
.sub-remote-container.visible {
    display: flex;
}
.sub-remote-container[data-wrap="true"] {
    flex-wrap: wrap;
}
.folder-container.expand-horizontal {
    flex-direction: row;
}
.sub-remote-container.expand-right {
    left: calc(100% + var(--remote-button-gap));
    top: 50%;
    transform: translateY(-50%);
    flex-direction: row;
}
.sub-remote-container.expand-left {
    right: calc(100% + var(--remote-button-gap));
    top: 50%;
    transform: translateY(-50%);
    flex-direction: row;
}
.folder-container.expand-vertical {
    flex-direction: column;
}
.sub-remote-container.expand-down {
    top: calc(100% + var(--remote-button-gap));
    left: 50%;
    transform: translateX(-50%);
    flex-direction: column;
}
.sub-remote-container.expand-up {
    bottom: calc(100% + var(--remote-button-gap));
    left: 50%;
    transform: translateX(-50%);
    flex-direction: column;
}
#output-panel {
    display: none;
    flex-direction: column;
    position: fixed;
    z-index: 10000;
    width: 350px;
    max-width: 95%;
    background: var(--main-color);
	backdrop-filter: blur(20px);
    height: 100%;
    bottom: 0px;
    right: 0px;
    padding: 10px;
}
#extracted-text {
    min-height: 85%;
    overflow: auto;
    padding: 10px;
    word-break: break-word;
}
#top-menu {
    display: flex;
    gap: 10px;
    margin-bottom: 5px;
}
.menu-button {
    padding: 5px 10px;
    background-color: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
.menu-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
}
#settings-panel,
#image-panel {
    display: none;
    position: fixed;
    flex-direction: column;
    background-color: var(--main-color);
    padding: 0;
    border-radius: 8px;
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    border: 1px solid rgba(255,255,255,0.1);
    backdrop-filter: blur(30px);
}
#settings-panel {
    z-index: 20001;
    width: 90%;
    max-width: 600px;
    height: 85vh;
}
#image-panel {
    z-index: 20000;
    width: var(--image-panel-width);
    height: var(--image-panel-height);
    min-width: 100px;
    min-height: 100px;
    max-width: 95vw;
    max-height: 95vh;
}
.settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0;
    flex-shrink: 0;
    border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
    height: 30px;
}
.settings-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin: 15px 0;
    padding: 0 20px;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 15px;
}
.settings-tab {
    padding: 8px 12px;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    cursor: pointer;
}
.settings-tab.active {
    background-color: rgba(255, 255, 255, 0.15);
    color: var(--highlight-color);
    font-weight: bold;
    border-color: var(--highlight-color);
}
.settings-content {
    flex-grow: 1;
    overflow: auto;
    min-height: 0;
}
#settings-panel .settings-content {
    padding: 0 10px 20px 20px;
}
#image-panel-content-wrapper {
    flex-grow: 1;
    overflow: auto;
    min-height: 0;
    padding: 15px;
}
#image-panel-content-wrapper img.generated-image {
    max-width: 100%;
    height: auto;
    display: block;
    margin-bottom: 15px;
}
#image-panel-content-wrapper iframe {
    width: 100%;
    height: 100%;
    border: none;
}
.prompt-editor-container {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 15px;
}
.buttons-container {
    display: flex;
    gap: 10px;
    justify-content: center;
}
.settings-section {
    display: none;
}
.settings-section.active {
    display: block;
}
.settings-section h4 {
    margin-top: 20px;
    margin-bottom: 10px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    padding-bottom: 5px;
}
.form-group {
    margin-bottom: 15px;
}
.form-label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    opacity: 0.9;
}
.form-input,
.form-textarea,
.form-select {
    width: 100%;
    padding: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    font-size: 14px;
}
.form-input::placeholder,
.form-textarea::placeholder {
    color: rgba(255, 255, 255, 0.5);
}
.form-textarea {
    min-height: 120px;
    resize: vertical;
}
.form-checkbox-label,
.form-radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
    cursor: pointer;
}
.form-checkbox,
.form-radio {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}
.form-button {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    white-space: nowrap;
    background-color: rgba(255, 255, 255, 0.1);
}
.form-button:hover {
    background-color: rgba(255, 255, 255, 0.2);
}
.form-button.primary {
    background-color: var(--highlight-color);
    color: white;
}
.form-button > b {
    color: var(--highlight-color);
    font-weight: normal;
}
.list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 5px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.list-item:last-child {
    border-bottom: none;
}
.list-item-name {
    flex-grow: 1;
    cursor: pointer;
}
.list-item-controls {
    display: flex;
    gap: 5px;
    align-items: center;
}
.list-item-controls button {
    padding: 2px 6px;
    font-size: 14px;
}
.list-item-controls .form-checkbox {
    margin: 0 5px;
}
.preset-edit-container {
    margin-top: 15px;
    padding: 15px;
    background: rgba(0,0,0,0.15);
    border-radius: 4px;
}
.form-button-group {
    margin-top: 20px;
    display: flex;
    gap: 10px;
}
.close-button {
    position: static;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    z-index: 10;
    opacity: 0.7;
    flex-shrink: 0;
    padding: 0 5px;
    height: 100%;
}
.close-button:hover {
    opacity: 1;
}
.draggable-handle {
    cursor: move;
    flex-grow: 1;
    user-select: none;
    height: 100%;
    margin: 0;
    padding: 0;
    border-radius: 1px;
    background-color: currentColor;
    background-size: 6px 6px;
    background-position: 0 0, 3px 3px;
    box-sizing: border-box;
    opacity: 0.1;
}
#translation-input-container {
    width: 100%;
    margin-top: 10px;
}
#ko-en-input {
    margin-bottom: 10px;
    width: 100%;
    padding: 5px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}
span.highlight-text {
    font-style: var(--italic-active) !important;
    font-weight: var(--bold-active) !important;
    color: var(--text-highlight-color) !important;
}
.nm {
    margin: 0;
}
h1, h2, h3 {
    font-family: inherit;
}
@media (max-width: 768px) {
    #settings-panel,
    #image-panel {
        left: 50% !important;
        top: 50% !important;
        right: auto !important;
        bottom: auto !important;
        transform: translate(-50%, -50%) !important;
    }
}
#inline-image-panel {
    display: none;
    width: 100%;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    border: none;
    overflow-y: auto;
}
#inline-image-panel-content-wrapper {
    display: flex;
    flex-direction: column;
}
#inline-image-panel-content-wrapper img.generated-image {
    max-width: 100%;
    height: auto;
    display: block;
    margin-bottom: 15px;
}
#inline-image-panel-content-wrapper iframe {
    width: 100%;
    height: 100%;
    border: none;
}
`,

        init: function() {
            this.addStyles();
            this.createRemoteControl();
            this.createOutputPanel();
            this.createSettingsPanel();
            this.createImagePanel();
            this.updateTextStyle();
            this.toggleTranslationInput();
        },

        addStyles: function() {
            const styleElement = document.createElement('style');
            styleElement.textContent = this.styles;
            document.head.appendChild(styleElement);

            // [추가] 스크립트 로딩 시 저장된 투명도 값을 --remote-main-color 변수에 적용
            const mainColor = Storage.get('tMainColor', CONFIG.defaultMainColor);
            const remoteConfig = Storage.get('remoteControl', CONFIG.remoteControl);
            const transparency = remoteConfig.transparency !== undefined ? remoteConfig.transparency : 100;
            const colorParts = mainColor.match(/(\d+(\.\d+)?)/g); // 숫자 부분 추출
            if (colorParts && colorParts.length >= 3) {
                const [r, g, b] = colorParts;
                const newAlpha = transparency / 100.0;
                document.documentElement.style.setProperty('--remote-main-color', `rgba(${r}, ${g}, ${b}, ${newAlpha})`);
            }

            const faLink = document.createElement('link');
            faLink.rel = 'stylesheet';
            faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
            faLink.integrity = 'sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A==';
            faLink.crossOrigin = 'anonymous';
            faLink.referrerPolicy = 'no-referrer';
            document.head.appendChild(faLink);
        },

        createRemoteControl: function() {
            let currentlyOpenSubMenu = null;
            const closeAllSubMenus = (exceptThisOne = null) => {
                document.querySelectorAll('.sub-remote-container.visible').forEach(menu => {
                    if (menu !== exceptThisOne) menu.classList.remove('visible');
                });
                if (currentlyOpenSubMenu && currentlyOpenSubMenu !== exceptThisOne) {
                    currentlyOpenSubMenu = null;
                }
            };
            const onBodyClick = (e) => {
                if (!e.target.closest('#remote-control')) {
                    closeAllSubMenus();
                    document.body.removeEventListener('click', onBodyClick, true);
                }
            };

            const oldRemote = document.getElementById('remote-control');
            if (oldRemote) oldRemote.remove();

            const remoteConfig = Storage.get('remoteControl', {
                ...CONFIG.remoteControl
            });
            const allQrs = Storage.getQRs();
            const allQrIds = new Set(allQrs.map(q => q.id));
            const allCategories = new Set(allQrs.map(q => q.category || CONFIG.uncategorizedId));

            let favorites = Storage.getRemoteFavorites().filter(id => allQrIds.has(id) && allQrs.find(q => q.id === id).remote.favorite);
            const favoriteSet = new Set(favorites);
            allQrs.forEach(qr => {
                if (qr.remote.favorite && !favoriteSet.has(qr.id)) {
                    favorites.push(qr.id);
                }
            });
            Storage.setRemoteFavorites(favorites);

            let layout = Storage.getRemoteLayout();
            const layoutSet = new Set(layout.map(item => item.id));
            allCategories.forEach(catId => {
                if (!layoutSet.has(catId)) {
                    layout.push({
                        id: catId,
                        visible: false,
                        icon: null
                    });
                }
            });
            layout.forEach(item => {
                if (item.icon === undefined) item.icon = null;
            });
            layout = layout.filter(item => allCategories.has(item.id));
            Storage.setRemoteLayout(layout);

            const visibleFavorites = favorites.map(id => allQrs.find(q => q.id === id)).filter(qr => qr && qr.remote.visible);
            const visibleFolders = layout.filter(l => l.visible).map(l => ({
                id: l.id,
                name: l.id === CONFIG.uncategorizedId ? CONFIG.uncategorizedName : l.id,
                icon: l.icon,
                qrs: allQrs.filter(q => (q.category || CONFIG.uncategorizedId) === l.id && !q.remote.favorite && q.remote.visible)
            })).filter(folder => folder.qrs.length > 0);

            const remoteControl = Utils.createElement('div', {
                id: 'remote-control'
            });
            remoteControl.style.flexDirection = remoteConfig.orientation === 'horizontal' ? 'row' : 'column';
            remoteControl.className = remoteConfig.orientation;

            const createButton = (item, overrideIcon = null) => {
                const button = Utils.createElement('div', {
                    className: 'remote-button',
                    title: item.name
                });

                let rawIconInput = overrideIcon;
                if (!rawIconInput) {
                    if (item.remote?.icon) rawIconInput = item.remote.icon;
                    else if (item.icon) rawIconInput = item.icon;
                }

                let finalIconClass = null;
                if (rawIconInput && rawIconInput.trim()) {
                    const trimmedSource = rawIconInput.trim();
                    if (trimmedSource.startsWith('<i')) {
                        const match = trimmedSource.match(/class="([^"]*)"/);
                        if (match && match[1]) finalIconClass = match[1];
                    } else {
                        finalIconClass = trimmedSource;
                    }
                }

                if (finalIconClass) {
                    const iconElement = Utils.createElement('i', {
                        className: finalIconClass
                    });
                    iconElement.style.fontSize = 'calc(var(--remote-button-size) * 0.5)';
                    button.appendChild(iconElement);
                } else {
                    const emojiRegex = /^(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26ff]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u2ce9|\u2934|\u2935|[\u2190-\u21ff])/;
                    const match = item.name?.match(emojiRegex);
                    if (match) {
                        button.textContent = match[0];
                        button.style.fontSize = 'calc(var(--remote-button-size) * 0.5)';
                    } else {
                        button.textContent = (item.name || 'F').trim().slice(0, 1) || '◇';
                    }
                }
                return button;
            };

            const settingsButton = createButton({
                name: '설정'
            }, 'fa-solid fa-gear');
            settingsButton.onclick = () => this.toggleSettingsPanel();

            const folderGroup = Utils.createElement('div', {
                className: 'remote-group-container'
            });
            visibleFolders.forEach(folder => {
                const folderBtn = createButton(folder);
                const qrCount = folder.qrs.length;
                if (qrCount > 0) {
                    folderBtn.appendChild(Utils.createElement('span', {
                        className: 'folder-count-badge',
                        textContent: qrCount
                    }));
                }

                const subRemote = Utils.createElement('div', {
                    className: 'sub-remote-container'
                });
                if (folder.qrs.length > remoteConfig.folderWrapCount) {
                    subRemote.dataset.wrap = 'true';
                    const wrapCount = remoteConfig.folderWrapCount;
                    const size = `calc((var(--remote-button-size) * ${wrapCount}) + (var(--remote-button-gap) * (${wrapCount} - 1)) + 2px)`;
                    if (remoteConfig.orientation === 'vertical') subRemote.style.width = size;
                    else subRemote.style.height = size;
                }

                folder.qrs.forEach(qr => {
                    const qrBtn = createButton(qr);
                    qrBtn.classList.add('qr-remote-button');
                    qrBtn.dataset.qrId = qr.id;
                    qrBtn.onclick = (e) => {
                        QRExecutor.execute(qr.id, folderBtn);
                        closeAllSubMenus();
                        document.body.removeEventListener('click', onBodyClick, true);
                    };
                    subRemote.appendChild(qrBtn);
                });

                folderBtn.onclick = () => {
                    const isOpening = !subRemote.classList.contains('visible');
                    closeAllSubMenus(isOpening ? subRemote : null);
                    if (isOpening) {
                        subRemote.classList.add('visible');
                        currentlyOpenSubMenu = subRemote;
                        document.body.addEventListener('click', onBodyClick, true);
                    } else {
                        document.body.removeEventListener('click', onBodyClick, true);
                    }
                };

                const folderContainer = Utils.createElement('div', {
                    className: 'folder-container'
                });
                if (remoteConfig.orientation === 'vertical') {
                    folderContainer.classList.add('expand-horizontal');
                    subRemote.classList.add(remoteConfig.expansionDirection === 'forward' ? 'expand-left' : 'expand-right');
                } else {
                    folderContainer.classList.add('expand-vertical');
                    subRemote.classList.add(remoteConfig.expansionDirection === 'forward' ? 'expand-up' : 'expand-down');
                }
                folderContainer.append(folderBtn, subRemote);
                folderGroup.appendChild(folderContainer);
            });

            const favoriteGroup = Utils.createElement('div', {
                className: 'remote-group-container'
            });
            visibleFavorites.forEach(qr => {
                const qrBtn = createButton(qr);
                qrBtn.classList.add('qr-remote-button');
                qrBtn.dataset.qrId = qr.id;
                qrBtn.onclick = (e) => QRExecutor.execute(qr.id, e.currentTarget);
                favoriteGroup.appendChild(qrBtn);
            });

            if (remoteConfig.orientation === 'vertical') {
                remoteControl.append(favoriteGroup, folderGroup, settingsButton);
            } else {
                remoteControl.append(favoriteGroup, folderGroup, settingsButton);
            }

            document.body.appendChild(remoteControl);
            const savedPosition = Storage.get('remotePosition');
            if (savedPosition) {
                remoteControl.style.right = savedPosition.right + "px";
                remoteControl.style.bottom = savedPosition.bottom + "px";
            } else {
                remoteControl.style.right = CONFIG.remoteControl.position.right;
                remoteControl.style.bottom = CONFIG.remoteControl.position.bottom;
            }
            Utils.makeDraggable(remoteControl, remoteControl, (pos) => Storage.set('remotePosition', pos), 'remotePosition');
        },

        createOutputPanel: function() {
            if (document.getElementById('output-panel')) return;
            const outputPanel = Utils.createElement('div', {
                id: 'output-panel'
            });
            const topMenu = Utils.createElement('div', {
                id: 'top-menu'
            });
            const copyButton = Utils.createElement('button', {
                className: 'menu-button',
                id: 'copy-button',
                onclick: () => {
                    const textPanel = document.getElementById('extracted-text');
                    if (!textPanel) return;

                    // 1. 브라우저의 선택(Selection) 기능을 이용합니다.
                    const selection = window.getSelection();
                    const range = document.createRange();

                    // 2. 출력창('extracted-text')의 모든 내용을 선택(Select All)합니다.
                    //    이것은 사용자가 마우스로 드래그하여 전체를 선택한 것과 동일합니다.
                    range.selectNodeContents(textPanel);
                    selection.removeAllRanges();
                    selection.addRange(range);

                    // 3. "선택된 텍스트"를 문자열로 가져옵니다.
                    //    브라우저가 알아서 <p>와 <br>을 줄바꿈(\n)으로 변환해 줍니다.
                    const textToCopy = selection.toString();

                    // 4. 복사가 끝났으니, 화면에 파랗게 선택된 것을 해제합니다.
                    selection.removeAllRanges();

                    // 5. 이제 완벽하게 변환된 텍스트를, 원래 잘 작동하던 복사 함수에 넘깁니다.
                    Utils.copyToClipboard(textToCopy);
                }
            }, '복사');
            topMenu.appendChild(copyButton);

            const extractedText = Utils.createElement('div', {
                id: 'extracted-text'
            });

            const translationInputContainer = Utils.createElement('div', {
                id: 'translation-input-container',
                style: {
                    display: 'block'
                }
            });
            const koEnInput = Utils.createElement('input', {
                id: 'ko-en-input',
                type: 'text',
                placeholder: '번역할 한국어를 입력하세요 (Enter로 번역)',
                onkeypress: async (e) => {
                    if (e.key === 'Enter' && e.target.value.trim() !== '') {
                        const text = e.target.value;
                        e.target.value = '';

                        const qr = Storage.getQRById('default-ko-en-translate');
                        if (!qr) {
                            alert('기본 한영 번역 QR 프리셋(default-ko-en-translate)을 찾을 수 없습니다.');
                            return;
                        }

                        let targetSlot = null;
                        const slotOrder = ['prefix', 'afterPrefix', 'beforeBody', 'afterBody', 'beforeSuffix', 'suffix', 'afterSuffix'];

                        for (const slotName of slotOrder) {
                            const slotValue = qr.slots[slotName];
                            if (typeof slotValue === 'object' && slotValue?.type === 'user_input') {
                                targetSlot = slotName;
                                break;
                            }
                        }

                        if (!targetSlot) {
                            targetSlot = 'afterSuffix';
                        }

                        await QRExecutor.execute('default-ko-en-translate', e.target, {
                            directUserInput: text,
                            userInputSlot: targetSlot
                        });
                    }
                }
            });

            translationInputContainer.appendChild(koEnInput);
            outputPanel.append(topMenu, extractedText, translationInputContainer);
            document.body.appendChild(outputPanel);
            extractedText.addEventListener('click', () => {
                this.toggleOutputPanel(false);
            });
        },

        createSettingsPanel: function() {
            if (document.getElementById('settings-panel')) return;
            const settingsPanel = Utils.createElement('div', {
                id: 'settings-panel'
            });
            const header = Utils.createElement('div', {
                className: 'settings-header'
            });
            const dragHandle = Utils.createElement('div', {
                className: 'draggable-handle'
            });
            const closeButton = Utils.createElement('button', {
                className: 'close-button',
                onclick: () => this.toggleSettingsPanel(false)
            }, '✕');
            header.append(dragHandle, closeButton);

            const tabs = Utils.createElement('div', {
                className: 'settings-tabs'
            });
            const tabsData = [{
                    id: 'settings',
                    label: '설정'
                },
                {
                    id: 'qr',
                    label: 'QR'
                },
                {
                    id: 'ai',
                    label: 'AI'
                },
                {
                    id: 'prompt',
                    label: '프롬프트'
                },
                {
                    id: 'lorebook',
                    label: '로어북'
                },
                {
                    id: 'remote',
                    label: '리모컨'
                },
                {
                    id: 'logging',
                    label: '로깅'
                } // [수정] 로깅 탭 추가
            ];
            tabsData.forEach((tabData, index) => {
                const tab = Utils.createElement('button', {
                    className: `settings-tab ${index === 0 ? 'active' : ''}`,
                    dataset: {
                        tab: tabData.id
                    },
                    onclick: (e) => this.switchSettingsTab(e.target.dataset.tab)
                }, tabData.label);
                tabs.appendChild(tab);
            });

            const content = Utils.createElement('div', {
                className: 'settings-content'
            });
            const generalSettingsSection = this.createGeneralSettingsSection();
            generalSettingsSection.classList.add('active');
            content.append(
                generalSettingsSection,
                this.createQrSettingsSection(),
                this.createAiSettingsSection(),
                this.createPromptSettingsSection(),
                this.createLorebookSettingsSection(),
                this.createRemoteSettingsSection(),
                this.createLoggingSettingsSection() // [수정] 로깅 섹션 생성 함수 호출 추가
            );
            settingsPanel.append(header, tabs, content);
            document.body.appendChild(settingsPanel);

            Utils.makeDraggable(settingsPanel, dragHandle, null, "settingsPanelPosition");
        },

        createGeneralSettingsSection: function() {
            const section = Utils.createElement('div', {
                className: 'settings-section',
                id: 'settings-settings'
            });

            // [수정] 정상 동작하던 버전 15의 독립적인 모달 생성 헬퍼 함수로 교체
            const _createModalBase = (title, content, width = '600px') => {
                const overlay = Utils.createElement('div', {
                    style: {
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        zIndex: 30000,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }
                });
                const modal = Utils.createElement('div', {
                    style: {
                        background: 'var(--main-color)',
                        width: '90%',
                        maxWidth: width,
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }
                });

                const header = Utils.createElement('div', {
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #555',
                        padding: '10px 15px',
                        flexShrink: 0
                    }
                });
                header.append(Utils.createElement('h4', {
                    textContent: title,
                    style: {
                        margin: 0
                    }
                }), Utils.createElement('button', {
                    textContent: '✕',
                    className: 'close-button',
                    style: {
                        position: 'static'
                    },
                    onclick: () => overlay.remove()
                }));

                const contentWrapper = Utils.createElement('div', {
                    style: {
                        padding: '0 15px 15px',
                        overflowY: 'auto',
                        flexGrow: 1
                    }
                });
                contentWrapper.appendChild(content);

                modal.append(header, contentWrapper);
                overlay.appendChild(modal);
                document.body.appendChild(overlay);
                return {
                    overlay,
                    modal
                };
            };

            section.appendChild(Utils.createElement('h4', {}, '표시 설정'));

            const highlightGroup = Utils.createElement('div', {
                className: 'form-group'
            });
            highlightGroup.appendChild(Utils.createElement('label', {
                className: 'form-label'
            }, '대사 강조:'));
            ['italic', 'bold', 'highlight'].forEach(type => {
                const checked = Storage.get(`ns-${type}`, false);
                const labelText = {
                    italic: '이탤릭',
                    bold: '볼드',
                    highlight: '하이라이트'
                } [type];
                const checkbox = Utils.createElement('input', {
                    className: 'form-checkbox',
                    id: `${type}-checkbox`,
                    type: 'checkbox',
                    checked,
                    onchange: (e) => {
                        Storage.set(`ns-${type}`, e.target.checked);
                        this.updateTextStyle();
                    }
                });
                const label = Utils.createElement('label', {
                    for: `${type}-checkbox`,
                    className: 'form-checkbox-label'
                }, [checkbox, labelText]);
                highlightGroup.appendChild(label);
            });

            const colorGroup = Utils.createElement('div', {
                className: 'form-group'
            });
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
            colorGroup.append(Utils.createElement('label', {
                className: 'form-label',
                for: 'color-code'
            }, '하이라이트 색상:'), colorInput);

            const renderingGroup = Utils.createElement('div', {
                className: 'form-group'
            });
            renderingGroup.appendChild(Utils.createElement('label', {
                className: 'form-label'
            }, '콘텐츠 렌더링:'));
            const markdownCheckbox = Utils.createElement('input', {
                className: 'form-checkbox',
                id: 'render-markdown-checkbox',
                type: 'checkbox',
                checked: Storage.get('renderMarkdown', true),
                onchange: (e) => Storage.set('renderMarkdown', e.target.checked)
            });
            renderingGroup.appendChild(Utils.createElement('label', {
                className: 'form-checkbox-label',
                for: 'render-markdown-checkbox'
            }, [markdownCheckbox, '마크다운 렌더링']));
            const htmlCheckbox = Utils.createElement('input', {
                className: 'form-checkbox',
                id: 'render-html-checkbox',
                type: 'checkbox',
                checked: Storage.get('renderHtml', false),
                onchange: (e) => Storage.set('renderHtml', e.target.checked)
            });
            renderingGroup.appendChild(Utils.createElement('label', {
                className: 'form-checkbox-label',
                for: 'render-html-checkbox'
            }, [htmlCheckbox, 'HTML 렌더링 (보안 위험)']));

            const imagePanelSizeGroup = Utils.createElement('div', {
                className: 'form-group'
            });
            imagePanelSizeGroup.appendChild(Utils.createElement('label', {
                className: 'form-label'
            }, '보조창 크기:'));
            const currentSize = Storage.get('imagePanelDimensions', {
                width: 1200,
                height: 800
            });
            const sizeContainer = Utils.createElement('div', {
                style: {
                    display: 'flex',
                    gap: '10px'
                }
            });
            const createSizeInputHandler = (dimension) => (e) => {
                const panel = document.getElementById('image-panel');
                if (!panel) return;
                const maxAllowed = Math.floor((dimension === 'width' ? window.innerWidth : window.innerHeight) * 0.95);
                let newValue = parseInt(e.target.value, 10) || 100;
                if (newValue > maxAllowed) {
                    newValue = maxAllowed;
                    e.target.value = newValue;
                }
                const size = Storage.get('imagePanelDimensions', {
                    width: 1200,
                    height: 800
                });
                size[dimension] = newValue;
                Storage.set('imagePanelDimensions', size);
                document.documentElement.style.setProperty(`--image-panel-${dimension}`, `${newValue}px`);
            };
            const widthInput = Utils.createElement('input', {
                className: 'form-input',
                type: 'number',
                value: currentSize.width,
                min: 100,
                oninput: createSizeInputHandler('width')
            });
            const heightInput = Utils.createElement('input', {
                className: 'form-input',
                type: 'number',
                value: currentSize.height,
                min: 100,
                oninput: createSizeInputHandler('height')
            });
            sizeContainer.append(Utils.createElement('div', {
                style: {
                    flex: 1
                }
            }, [Utils.createElement('label', {}, '가로'), widthInput]), Utils.createElement('div', {
                style: {
                    flex: 1
                }
            }, [Utils.createElement('label', {}, '세로'), heightInput]));
            imagePanelSizeGroup.appendChild(sizeContainer);

            section.append(highlightGroup, colorGroup, renderingGroup, imagePanelSizeGroup);

            section.appendChild(Utils.createElement('h4', {}, '데이터 관리'));

            const backupGroup = Utils.createElement('div', {
                className: 'form-group'
            });

            const exportButton = Utils.createElement('button', {
                className: 'form-button',
                textContent: '내보내기 (백업)',
                onclick: () => {
                    const backupJson = Storage.backupAll();
                    const content = Utils.createElement('div', {
                        style: {
                            paddingTop: '15px',
                            overflowY: 'auto',
                            flexGrow: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0
                        }
                    });
                    const textArea = Utils.createElement('textarea', {
                        className: 'form-textarea',
                        readOnly: true,
                        style: {
                            height: '250px',
                            flexGrow: 1,
                            whiteSpace: 'pre',
                            wordWrap: 'normal',
                            overflowX: 'scroll'
                        }
                    }, backupJson);
                    const exportButtons = Utils.createElement('div', {
                        className: 'form-button-group',
                        style: {
                            marginTop: '15px'
                        }
                    });
                    const downloadButton = Utils.createElement('button', {
                        className: 'form-button primary',
                        textContent: 'JSON 파일로 다운로드',
                        onclick: () => Utils.downloadFile(backupJson, `NAI_QR_Backup_${new Date().toISOString().slice(0,10)}.json`, 'application/json')
                    });
                    const copyButton = Utils.createElement('button', {
                        className: 'form-button',
                        textContent: '클립보드에 복사',
                        onclick: () => {
                            Utils.copyToClipboard(backupJson, '백업 데이터가 클립보드에 복사되었습니다.');
                        }
                    });
                    exportButtons.append(downloadButton, copyButton);
                    content.append(textArea, exportButtons);
                    _createModalBase('전체 설정 내보내기 (백업)', content);
                }
            });

            const importButton = Utils.createElement('button', {
                className: 'form-button',
                textContent: '가져오기 (복원)',
                onclick: () => {
                    const content = Utils.createElement('div', {
                        style: {
                            paddingTop: '15px',
                            overflowY: 'auto',
                            flexGrow: 1
                        }
                    });
                    const textArea = Utils.createElement('textarea', {
                        className: 'form-textarea',
                        placeholder: '여기에 전체 설정 백업 JSON을 붙여넣거나 아래에서 파일을 선택하세요.',
                        style: {
                            height: '250px'
                        }
                    });
                    const fileInput = Utils.createElement('input', {
                        type: 'file',
                        accept: '.json',
                        className: 'form-input',
                        style: {
                            marginTop: '10px'
                        },
                        onchange: (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => textArea.value = event.target.result;
                                reader.readAsText(file);
                            }
                        }
                    });
                    const restoreConfirmButton = Utils.createElement('button', {
                        className: 'form-button primary',
                        style: {
                            marginTop: '15px',
                            width: '100%'
                        },
                        textContent: '복원 실행',
                        onclick: () => {
                            const data = textArea.value.trim();
                            if (!data) {
                                alert('복원할 데이터가 없습니다.');
                                return;
                            }
                            if (Storage.restoreAll(data)) {
                                alert('설정이 복원되었습니다. 페이지를 새로고침하여 모든 변경사항을 적용하세요.');
                                location.reload();
                            } else {
                                alert('설정 복원에 실패했습니다. 백업 데이터 형식을 확인하세요.');
                            }
                        }
                    });
                    content.append(textArea, fileInput, restoreConfirmButton);
                    _createModalBase('전체 설정 복원', content);
                }
            });
            backupGroup.append(Utils.createElement('label', {
                className: 'form-label'
            }, '전체 설정 백업/복원:'), Utils.createElement('div', {
                style: {
                    display: 'flex',
                    gap: '10px'
                }
            }, [exportButton, importButton]));

            const resetGroup = Utils.createElement('div', {
                className: 'form-group'
            });
            const resetConfirmContainer = Utils.createElement('div', {
                className: 'preset-edit-container',
                style: {
                    display: 'none',
                    marginTop: '10px'
                }
            });
            const mainResetButton = Utils.createElement('button', {
                className: 'form-button',
                textContent: '설정 초기화...',
                onclick: () => {
                    resetConfirmContainer.style.display = resetConfirmContainer.style.display === 'none' ? 'block' : 'none';
                }
            });
            resetGroup.append(Utils.createElement('label', {
                className: 'form-label'
            }, '초기화:'), mainResetButton, resetConfirmContainer);
            const legacyOnlyCheckbox = Utils.createElement('input', {
                type: 'checkbox',
                className: 'form-checkbox',
                id: 'legacy-only-checkbox'
            });
            const legacyLabel = Utils.createElement('label', {
                className: 'form-checkbox-label',
                for: 'legacy-only-checkbox'
            }, [legacyOnlyCheckbox, '사용하지 않는 오래된 설정만 삭제']);
            const agreeCheckbox = Utils.createElement('input', {
                type: 'checkbox',
                className: 'form-checkbox',
                id: 'agree-checkbox'
            });
            const agreeLabel = Utils.createElement('label', {
                className: 'form-checkbox-label',
                for: 'agree-checkbox'
            }, [agreeCheckbox, '이 작업은 복구할 수 없으며 모든 관련 데이터가 삭제됨에 동의합니다.']);
            const finalResetButton = Utils.createElement('button', {
                className: 'form-button primary',
                textContent: '초기화 실행',
                disabled: true
            });
            agreeCheckbox.onchange = () => {
                finalResetButton.disabled = !agreeCheckbox.checked;
            };
            finalResetButton.onclick = () => {
                const isLegacyOnly = legacyOnlyCheckbox.checked;
                const confirmationText = isLegacyOnly ? '정말 사용하지 않는 오래된 설정만 삭제하시겠습니까?' : '정말 모든 설정을 초기화하시겠습니까? 모든 프리셋과 설정이 영구적으로 삭제됩니다!';
                if (confirm(confirmationText)) {
                    Storage.resetAllSettings({
                        deleteLegacyOnly: isLegacyOnly
                    });
                    alert(isLegacyOnly ? '오래된 설정이 삭제되었습니다.' : '모든 설정이 초기화되었습니다. 페이지를 새로고침합니다.');
                    location.reload();
                }
            };
            const safetyBackupButton = Utils.createElement('button', {
                className: 'form-button',
                textContent: '삭제 전 현재 설정 백업',
                onclick: () => Utils.downloadFile(Storage.backupAll(), `NAI_QR_Pre-Reset_Backup_${new Date().toISOString().slice(0,10)}.json`, 'application/json')
            });
            resetConfirmContainer.append(Utils.createElement('p', {
                style: {
                    fontWeight: 'bold',
                    color: 'red'
                }
            }, '주의: 이 작업은 되돌릴 수 없습니다.'), legacyLabel, agreeLabel, Utils.createElement('div', {
                className: 'form-button-group'
            }, [safetyBackupButton, finalResetButton]));
            const restoreDefaultsGroup = Utils.createElement('div', {
                className: 'form-group'
            });
            const restoreDefaultsButton = Utils.createElement('button', {
                className: 'form-button',
                textContent: '기본 프리셋 복구',
                onclick: () => {
                    if (confirm('기본 제공 프리셋(프롬프트, AI, QR) 설정을 모두 초기값으로 되돌리시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                        Storage.upsertDefaultPresets(true);
                        alert('기본 기능이 초기 설정으로 복구되었습니다.');
                        this.createRemoteControl();
                        const oldPanel = document.getElementById('settings-panel');
                        if (oldPanel) oldPanel.remove();
                        this.createSettingsPanel();
                        this.toggleSettingsPanel(true);
                    }
                }
            });
            restoreDefaultsGroup.append(Utils.createElement('label', {
                className: 'form-label'
            }, '기본 프리셋 복구:'), restoreDefaultsButton, Utils.createElement('p', {
                style: {
                    fontSize: '12px',
                    opacity: '0.8',
                    margin: '5px 0 0 0'
                }
            }, '번역, 삽화 등 기본 제공 기능만 초기 설정으로 되돌립니다. 사용자가 만든 다른 QR은 영향을 받지 않습니다.'));
            section.append(backupGroup, resetGroup, restoreDefaultsGroup);
            section.appendChild(Utils.createElement('h4', {}, '개발자 설정'));
            const debugGroup = Utils.createElement('div', {
                className: 'form-group'
            });
            const debugCheckbox = Utils.createElement('input', {
                className: 'form-checkbox',
                id: 'debug-mode-checkbox',
                type: 'checkbox',
                checked: Storage.get('debugModeEnabled', false),
                onchange: (e) => {
                    Storage.set('debugModeEnabled', e.target.checked);
                    if (e.target.checked) {
                        alert('디버그 모드가 활성화되었습니다. 이제부터 브라우저 콘솔(F12)에 상세 로그가 출력됩니다.');
                    } else {
                        alert('디버그 모드가 비활성화되었습니다.');
                    }
                }
            });
            const debugLabel = Utils.createElement('label', {
                for: 'debug-mode-checkbox',
                className: 'form-checkbox-label'
            }, [debugCheckbox, '디버그 모드 활성화']);
            const debugDescription = Utils.createElement('p', {
                style: {
                    fontSize: '12px',
                    opacity: '0.8',
                    margin: '5px 0 0 0'
                }
            }, '스크립트의 상세 동작을 브라우저 개발자 콘솔(F12)에 출력합니다. 평소에는 꺼두는 것을 권장합니다.');

            debugGroup.append(debugLabel, debugDescription);
            section.appendChild(debugGroup);

            return section;
        },

        createQrSettingsSection: function() {
            return PresetManagerUI.createManager({
                presetType: 'qr',
                title: 'QR 프리셋 관리',
                storageGetter: Storage.getQRs.bind(Storage),
                storageSetter: Storage.setQRs.bind(Storage),
                getNewItemData: () => ({
                    id: Utils.generateNewId('qr'),
                    name: '새 QR',
                    aiPresetId: null,
                    category: null,
                    slots: {
                        prefix: null,
                        afterPrefix: null,
                        beforeBody: null,
                        afterBody: null,
                        beforeSuffix: null,
                        suffix: null,
                        afterSuffix: null
                    },
                    extractLength: 0,
                    postProcess: {
                        action: 'output_panel',
                        nextQrId: null,
                        insertSlot: null
                    },
                    simultaneousQrIds: null,
                    remote: {
                        visible: true,
                        favorite: false,
                        icon: null
                    },
                    autoExecute: false,
                }),
                layout: [
                    [{
                        key: 'name',
                        label: '이름',
                        type: 'text'
                    }],
                    [{
                        key: 'slots.prefix',
                        label: '* 서문',
                        type: 'popupSelector',
                        sourceGetter: Storage.getPrompts.bind(Storage)
                    }],
                    [{
                        key: 'slots.afterPrefix',
                        label: '서문 후',
                        type: 'popupSelector',
                        sourceGetter: Storage.getPrompts.bind(Storage)
                    }],
                    [{
                        key: 'slots.beforeBody',
                        label: '본문 전',
                        type: 'popupSelector',
                        sourceGetter: Storage.getPrompts.bind(Storage)
                    }],
                    [{
                        key: 'extractLength',
                        label: '* 본문 추출',
                        type: 'number',
                        placeholder: '추출할 글자 수'
                    }],
                    [{
                        key: 'slots.afterBody',
                        label: '본문 후',
                        type: 'popupSelector',
                        sourceGetter: Storage.getPrompts.bind(Storage)
                    }],
                    [{
                        key: 'slots.beforeSuffix',
                        label: '탈옥 전',
                        type: 'popupSelector',
                        sourceGetter: Storage.getPrompts.bind(Storage)
                    }],
                    [{
                        key: 'slots.suffix',
                        label: '* 탈옥',
                        type: 'popupSelector',
                        sourceGetter: Storage.getPrompts.bind(Storage)
                    }],
                    [{
                        key: 'slots.afterSuffix',
                        label: '탈옥 후',
                        type: 'popupSelector',
                        sourceGetter: Storage.getPrompts.bind(Storage)
                    }],
                    [{
                        key: 'aiPresetId',
                        label: 'AI 프리셋',
                        type: 'popupSelector',
                        sourceGetter: Storage.getAiPresets.bind(Storage)
                    }],
                    [{
                        key: 'postProcess.action',
                        label: '순차 실행 (후처리)',
                        type: 'select',
                        options: [{
                            value: 'output_panel',
                            label: '출력창'
                        }, {
                            value: 'prosemirror',
                            label: '본문입력'
                        }, {
                            value: 'inline_image_panel',
                            label: '인라인 삽화'
                        }, {
                            value: 'image_panel',
                            label: '보조창 (삽화창)'
                        }, {
                            value: 'multi_qr',
                            label: '연속실행'
                        }, {
                            value: 'none',
                            label: '없음'
                        }]
                    }],
                    [{
                        key: 'postProcess.nextQrId',
                        label: '다음 QR',
                        type: 'popupSelector',
                        sourceGetter: Storage.getQRs.bind(Storage),
                        showIf: item => item.postProcess.action === 'multi_qr'
                    }],
                    [{
                        key: 'postProcess.insertSlot',
                        label: '응답 삽입',
                        type: 'select',
                        options: [{
                            value: null,
                            label: '선택 안 함'
                        }, {
                            value: 'prefix',
                            label: '서문 (Prefix)'
                        }, {
                            value: 'afterPrefix',
                            label: '서문 후 (After Prefix)'
                        }, {
                            value: 'beforeBody',
                            label: '본문 전 (Before Body)'
                        }, {
                            value: 'afterBody',
                            label: '본문 후 (After Body)'
                        }, {
                            value: 'beforeSuffix',
                            label: '탈옥 전 (Before Suffix)'
                        }, {
                            value: 'suffix',
                            label: '탈옥 (Suffix)'
                        }, {
                            value: 'afterSuffix',
                            label: '탈옥 후 (After Suffix)'
                        }],
                        showIf: item => item.postProcess.action === 'multi_qr'
                    }],
                    [{
                        key: 'simultaneousQrIds',
                        label: '동시 실행',
                        type: 'multiPopupSelector',
                        sourceGetter: Storage.getQRs.bind(Storage)
                    }],
                    [{
                        key: 'category',
                        label: '분류',
                        type: 'category',
                        storageGetter: Storage.getQRs.bind(Storage)
                    }],
                    [{
                        key: 'autoExecute',
                        label: '자동 실행 (NAI 생성 완료 후)',
                        type: 'checkbox'
                    }],
                    [{
                        key: 'remote.visible',
                        label: '리모콘에 표시',
                        type: 'checkbox'
                    }],
                    [{
                        key: 'remote.favorite',
                        label: '즐겨찾기에 표시',
                        type: 'checkbox',
                        showIf: item => item.remote.visible
                    }],
                    [{
                        key: 'remote.icon',
                        label: '아이콘',
                        type: 'text',
                        placeholder: 'Font Awesome 클래스 (예: fa-solid fa-star)',
                        showIf: item => item.remote.visible
                    }]
                ]
            });
        },

        createAiSettingsSection: function() {
            return PresetManagerUI.createManager({
                presetType: 'ai',
                title: 'AI 프리셋 관리',
                storageGetter: Storage.getAiPresets.bind(Storage),
                storageSetter: Storage.setAiPresets.bind(Storage),
                getNewItemData: () => ({
                    id: Utils.generateNewId('ai'),
                    name: '새 AI 프리셋',
                    type: 'gemini',
                    apiKey: '',
                    endpoint: '',
                    category: null,
                    parameters: {
                        model: '',
                        temperature: 0.7,
                        topP: 1,
                        topK: 32,
                        nai: {
                            negative_prompt: '',
                            width: 832,
                            height: 1216,
                            sampler: 'k_euler_ancestral',
                            scheduler: 'karras',
                            steps: 28,
                            scale: 6
                        }
                    }
                }),
                layout: [
                    [{
                        key: 'name',
                        label: '이름',
                        type: 'text'
                    }],
                    [{
                        key: 'type',
                        label: '요청 방식',
                        type: 'select',
                        options: [{
                            value: 'gemini',
                            label: 'Gemini'
                        }, {
                            value: 'openai',
                            label: 'OpenAI (Chat completion)'
                        }, {
                            value: 'textcompletion',
                            label: 'Text Completion (OpenAI-like)'
                        }, {
                            value: 'claude',
                            label: 'Claude'
                        }, {
                            value: 'novelai',
                            label: 'NovelAI'
                        }]
                    }],
                    [{
                        key: 'apiKey',
                        label: 'API 키',
                        type: 'text',
                        placeholder: 'API 키를 입력하세요'
                    }],
                    [{
                        key: 'endpoint',
                        label: '엔드포인트',
                        type: 'text',
                        placeholder: 'API 엔드포인트 URL'
                    }],
                    [{
                        key: 'parameters.model',
                        label: '모델명',
                        type: 'text',
                        placeholder: '사용할 모델 이름'
                    }],
                    [{
                        key: 'parameters.temperature',
                        label: '온도',
                        type: 'number',
                        showIf: i => i.type !== 'novelai'
                    }],
                    [{
                        key: 'parameters.topK',
                        label: 'Top-K',
                        type: 'number',
                        showIf: i => i.type !== 'novelai'
                    }],
                    [{
                        key: 'parameters.topP',
                        label: 'Top-P',
                        type: 'number',
                        showIf: i => i.type !== 'novelai'
                    }],
                    [{
                        key: 'parameters.nai.negative_prompt',
                        label: 'UC 프롬프트',
                        type: 'textarea',
                        showIf: i => i.type === 'novelai'
                    }],
                    [{
                        type: 'sizeSelector',
                        label: '이미지 크기',
                        showIf: i => i.type === 'novelai',
                        keys: {
                            width: 'parameters.nai.width',
                            height: 'parameters.nai.height'
                        },
                        options: [{
                            value: '832x1216',
                            label: 'Portrait (832x1216)'
                        }, {
                            value: '1216x832',
                            label: 'Landscape (1216x832)'
                        }, {
                            value: '1024x1024',
                            label: 'Square (1024x1024)'
                        }]
                    }],
                    [{
                        key: 'parameters.nai.scale',
                        label: '스케일',
                        type: 'number',
                        showIf: i => i.type === 'novelai'
                    }],
                    [{
                        key: 'parameters.nai.steps',
                        label: '스텝',
                        type: 'number',
                        showIf: i => i.type === 'novelai'
                    }],
                    [{
                        key: 'parameters.nai.sampler',
                        label: '샘플러',
                        type: 'select',
                        showIf: i => i.type === 'novelai',
                        options: [{
                            value: 'k_euler_ancestral',
                            label: 'k_euler_ancestral'
                        }, {
                            value: 'k_euler',
                            label: 'k_euler'
                        }, {
                            value: 'k_dpmpp_2m',
                            label: 'k_dpmpp_2m'
                        }, {
                            value: 'k_dpmpp_sde',
                            label: 'k_dpmpp_sde'
                        }, {
                            value: 'k_dpmpp_2s_ancestral',
                            label: 'k_dpmpp_2s_ancestral'
                        }, {
                            value: 'k_dpm_fast',
                            label: 'k_dpm_fast'
                        }, {
                            value: 'ddim',
                            label: 'ddim'
                        }]
                    }],
                    [{
                        key: 'parameters.nai.scheduler',
                        label: '스케줄러',
                        type: 'select',
                        showIf: i => i.type === 'novelai',
                        options: [{
                            value: 'karras',
                            label: 'karras'
                        }, {
                            value: 'exponential',
                            label: 'exponential'
                        }, {
                            value: 'polyexponential',
                            label: 'polyexponential'
                        }]
                    }],
                    [{
                        key: 'category',
                        label: '분류',
                        type: 'category',
                        storageGetter: Storage.getAiPresets.bind(Storage)
                    }]
                ]
            });
        },

        createPromptSettingsSection: function() {
            return PresetManagerUI.createManager({
                presetType: 'prompt',
                title: '프롬프트 프리셋 관리',
                storageGetter: Storage.getPrompts.bind(Storage),
                storageSetter: Storage.setPrompts.bind(Storage),
                getNewItemData: () => ({
                    id: Utils.generateNewId('prompt'),
                    name: '새 프롬프트',
                    content: '',
                    category: null
                }),
                layout: [
                    [{
                        key: 'name',
                        label: '이름',
                        type: 'text',
                        placeholder: '프리셋 이름'
                    }],
                    [{
                        key: 'content',
                        label: '내용',
                        type: 'textarea',
                        placeholder: '프롬프트 내용을 입력하세요'
                    }],
                    [{
                        key: 'category',
                        label: '분류',
                        type: 'category',
                        storageGetter: Storage.getPrompts.bind(Storage)
                    }]
                ]
            });
        },

        createLorebookSettingsSection: function() {
            return PresetManagerUI.createManager({
                presetType: 'lorebook',
                title: '로어북 관리',
                storageGetter: Storage.getLorebooks.bind(Storage),
                storageSetter: Storage.setLorebooks.bind(Storage),
                getNewItemData: () => ({
                    id: Utils.generateNewId('lorebook'),
                    name: '새 로어북',
                    enabled: true,
                    data: {
                        lorebookVersion: 5,
                        entries: [],
                        categories: []
                    }
                }),
                layout: [
                    [{
                        key: 'name',
                        label: '로어북 이름',
                        type: 'text'
                    }],
                    [{
                        key: 'enabled',
                        label: '로어북 활성화',
                        type: 'checkbox'
                    }],
                    [{
                        key: 'data',
                        label: '로어북 내용',
                        type: 'lorebookEditor'
                    }]
                ]
            });
        },

        createRemoteSettingsSection: function() {
            const section = Utils.createElement('div', {
                className: 'settings-section',
                id: 'remote-settings'
            });

            const render = () => {
                section.innerHTML = '';
                const self = this;
                const remoteConfig = Storage.get('remoteControl', {
                    ...CONFIG.remoteControl
                });
                section.appendChild(Utils.createElement('h4', {}, '리모컨 외형 설정'));
                const createFormGroup = (label, control) => Utils.createElement('div', {
                    className: 'form-group'
                }, [Utils.createElement('label', {
                    className: 'form-label',
                    textContent: label
                }), control]);
                const createRadioGroup = (options, name, checkedValue, onChange) => {
                    const container = Utils.createElement('div');
                    options.forEach(opt => {
                        const radio = Utils.createElement('input', {
                            type: 'radio',
                            className: 'form-radio',
                            name: name,
                            value: opt.value,
                            checked: checkedValue === opt.value,
                            id: `radio-${name}-${opt.value}`,
                            onclick: onChange
                        });
                        const label = Utils.createElement('label', {
                            className: 'form-radio-label',
                            for: `radio-${name}-${opt.value}`
                        }, [radio, opt.label]);
                        container.appendChild(label);
                    });
                    return container;
                };

                const sizeInput = Utils.createElement('input', {
                    className: 'form-input',
                    type: 'number',
                    min: '20',
                    value: remoteConfig.buttonSize,
                    oninput: (e) => {
                        const value = parseInt(e.target.value) || 20;
                        document.documentElement.style.setProperty('--remote-button-size', `${value}px`);
                        const config = Storage.get('remoteControl');
                        config.buttonSize = value;
                        Storage.set('remoteControl', config);
                    }
                });
                const gapInput = Utils.createElement('input', {
                    className: 'form-input',
                    type: 'number',
                    min: '0',
                    value: remoteConfig.buttonGap,
                    oninput: (e) => {
                        const value = parseInt(e.target.value) || 0;
                        document.documentElement.style.setProperty('--remote-button-gap', `${value}px`);
                        const config = Storage.get('remoteControl');
                        config.buttonGap = value;
                        Storage.set('remoteControl', config);
                        self.createRemoteControl();
                    }
                });

                // [추가] 투명도 슬라이더 UI 생성
                const transparencyContainer = Utils.createElement('div', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }
                });
                const transparencyValueLabel = Utils.createElement('span', {
                    textContent: `${remoteConfig.transparency || 100}%`
                });
                const transparencyInput = Utils.createElement('input', {
                    type: 'range',
                    min: '0',
                    max: '100',
                    step: '1',
                    value: remoteConfig.transparency || 100,
                    style: {
                        flexGrow: 1
                    },
                    oninput: (e) => {
                        const value = parseInt(e.target.value);
                        transparencyValueLabel.textContent = `${value}%`;

                        // 실시간으로 CSS 변수 및 스토리지 업데이트
                        const config = Storage.get('remoteControl', CONFIG.remoteControl);
                        config.transparency = value;
                        Storage.set('remoteControl', config);

                        const mainColor = Storage.get('tMainColor', CONFIG.defaultMainColor);
                        const colorParts = mainColor.match(/(\d+(\.\d+)?)/g);
                        if (colorParts && colorParts.length >= 3) {
                            const [r, g, b] = colorParts;
                            const newAlpha = value / 100.0;
                            document.documentElement.style.setProperty('--remote-main-color', `rgba(${r}, ${g}, ${b}, ${newAlpha})`);
                        }
                    }
                });
                transparencyContainer.append(transparencyInput, transparencyValueLabel);


                const wrapInput = Utils.createElement('input', {
                    className: 'form-input',
                    type: 'number',
                    min: '1',
                    value: remoteConfig.folderWrapCount,
                    onchange: (e) => {
                        const value = parseInt(e.target.value) || 1;
                        const config = Storage.get('remoteControl');
                        config.folderWrapCount = value;
                        Storage.set('remoteControl', config);
                        self.createRemoteControl();
                    }
                });
                const shapeGroup = createRadioGroup([{
                    value: 'circle',
                    label: '원형'
                }, {
                    value: 'square',
                    label: '사각형'
                }], 'button-shape', remoteConfig.buttonShape, (e) => {
                    const value = e.target.value;
                    const config = Storage.get('remoteControl');
                    config.buttonShape = value;
                    Storage.set('remoteControl', config);
                    document.documentElement.style.setProperty('--remote-button-radius', value === 'circle' ? '50%' : '4px');
                    self.createRemoteControl();
                });
                const orientationGroup = createRadioGroup([{
                    value: 'vertical',
                    label: '세로'
                }, {
                    value: 'horizontal',
                    label: '가로'
                }], 'button-orientation', remoteConfig.orientation, (e) => {
                    const value = e.target.value;
                    const config = Storage.get('remoteControl');
                    config.orientation = value;
                    Storage.set('remoteControl', config);
                    self.createRemoteControl();
                });
                const expansionGroup = createRadioGroup([{
                    value: 'backward',
                    label: '오른쪽/아래'
                }, {
                    value: 'forward',
                    label: '왼쪽/위'
                }], 'expansion-direction', remoteConfig.expansionDirection, (e) => {
                    const value = e.target.value;
                    const config = Storage.get('remoteControl');
                    config.expansionDirection = value;
                    Storage.set('remoteControl', config);
                    self.createRemoteControl();
                });

                section.append(
                    createFormGroup('버튼 크기 (px)', sizeInput),
                    createFormGroup('버튼 간격 (px)', gapInput),
                    createFormGroup('리모컨 투명도', transparencyContainer), // [추가] 투명도 슬라이더 추가
                    createFormGroup('폴더 내 줄당 버튼 수', wrapInput),
                    createFormGroup('버튼 모양', shapeGroup),
                    createFormGroup('버튼 배열', orientationGroup),
                    createFormGroup('폴더 확장 방향', expansionGroup)
                );

                section.appendChild(Utils.createElement('button', {
                    className: 'form-button',
                    style: {
                        marginTop: '10px'
                    },
                    textContent: '리모컨 위치 초기화',
                    onclick: () => {
                        Storage.remove('remotePosition');
                        self.createRemoteControl();
                    }
                }));

                const createListItem = (name, controls) => Utils.createElement('div', {
                    className: 'list-item'
                }, [Utils.createElement('span', {
                    className: 'list-item-name'
                }, name), Utils.createElement('div', {
                    className: 'list-item-controls'
                }, controls)]);

                section.appendChild(Utils.createElement('h4', {}, '즐겨찾기 버튼 관리'));
                const favListContainer = Utils.createElement('div');
                const favorites = Storage.getRemoteFavorites();
                favorites.forEach((qrId) => {
                    const qr = Storage.getQRById(qrId);
                    if (!qr) return;
                    const controls = [
                        Utils.createElement('input', {
                            type: 'checkbox',
                            className: 'form-checkbox',
                            title: '리모컨에 표시/숨김',
                            checked: qr.remote.visible,
                            onchange: e => {
                                const qrs = Storage.getQRs();
                                const qrToUpdate = qrs.find(q => q.id === qrId);
                                if (qrToUpdate) {
                                    qrToUpdate.remote.visible = e.target.checked;
                                    Storage.setQRs(qrs);
                                    self.createRemoteControl();
                                }
                            }
                        }),
                        Utils.createElement('button', {
                            className: 'form-button',
                            title: '즐겨찾기에서 제거',
                            textContent: '✕',
                            onclick: () => {
                                const qrs = Storage.getQRs();
                                const qrToUpdate = qrs.find(q => q.id === qrId);
                                if (qrToUpdate) {
                                    qrToUpdate.remote.favorite = false;
                                    Storage.setQRs(qrs);
                                    render();
                                    self.createRemoteControl();
                                }
                            }
                        }),
                        Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '↑',
                            disabled: favorites.indexOf(qrId) === 0,
                            onclick: () => {
                                const favs = Storage.getRemoteFavorites();
                                const index = favs.indexOf(qrId);
                                if (index > 0) {
                                    [favs[index - 1], favs[index]] = [favs[index], favs[index - 1]];
                                    Storage.setRemoteFavorites(favs);
                                    render();
                                    self.createRemoteControl();
                                }
                            }
                        }),
                        Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '↓',
                            disabled: favorites.indexOf(qrId) === favorites.length - 1,
                            onclick: () => {
                                const favs = Storage.getRemoteFavorites();
                                const index = favs.indexOf(qrId);
                                if (index < favs.length - 1) {
                                    [favs[index + 1], favs[index]] = [favs[index], favs[index + 1]];
                                    Storage.setRemoteFavorites(favs);
                                    render();
                                    self.createRemoteControl();
                                }
                            }
                        })
                    ];
                    favListContainer.appendChild(createListItem(qr.name, controls));
                });
                section.appendChild(favListContainer);

                section.appendChild(Utils.createElement('h4', {}, '폴더(분류) 버튼 관리'));
                const folderListContainer = Utils.createElement('div');
                const layout = Storage.getRemoteLayout();
                layout.forEach((item) => {
                    const itemId = item.id;
                    const displayName = itemId === CONFIG.uncategorizedId ? CONFIG.uncategorizedName : (itemId || '(알 수 없음)');
                    const controls = [
                        Utils.createElement('input', {
                            type: 'checkbox',
                            className: 'form-checkbox',
                            title: '폴더 표시/숨김',
                            checked: item.visible,
                            onchange: e => {
                                const currentLayout = Storage.getRemoteLayout();
                                const itemToUpdate = currentLayout.find(i => i.id === itemId);
                                if (itemToUpdate) {
                                    itemToUpdate.visible = e.target.checked;
                                    Storage.setRemoteLayout(currentLayout);
                                    self.createRemoteControl();
                                }
                            }
                        }),
                        Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '이름',
                            title: '분류 이름 수정',
                            onclick: () => {
                                const newName = prompt('새 분류 이름을 입력하세요:', displayName);
                                if (newName !== null) {
                                    Storage.updateCategoryName(itemId === CONFIG.uncategorizedId ? null : itemId, newName);
                                    render();
                                    self.createRemoteControl();
                                }
                            }
                        }),
                        Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '아이콘',
                            title: '폴더 아이콘 수정',
                            onclick: () => {
                                const currentLayout = Storage.getRemoteLayout();
                                const itemToUpdate = currentLayout.find(i => i.id === itemId);
                                if (!itemToUpdate) return;
                                const newIcon = prompt('폴더 아이콘을 입력하세요 (HTML 태그 또는 클래스):', itemToUpdate.icon || '');
                                if (newIcon !== null) {
                                    itemToUpdate.icon = newIcon.trim() || null;
                                    Storage.setRemoteLayout(currentLayout);
                                    render();
                                    self.createRemoteControl();
                                }
                            }
                        }),
                        Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '↑',
                            disabled: layout.findIndex(i => i.id === itemId) === 0,
                            onclick: () => {
                                const currentLayout = Storage.getRemoteLayout();
                                const index = currentLayout.findIndex(i => i.id === itemId);
                                if (index > 0) {
                                    [currentLayout[index - 1], currentLayout[index]] = [currentLayout[index], currentLayout[index - 1]];
                                    Storage.setRemoteLayout(currentLayout);
                                    render();
                                    self.createRemoteControl();
                                }
                            }
                        }),
                        Utils.createElement('button', {
                            className: 'form-button',
                            textContent: '↓',
                            disabled: layout.findIndex(i => i.id === itemId) === layout.length - 1,
                            onclick: () => {
                                const currentLayout = Storage.getRemoteLayout();
                                const index = currentLayout.findIndex(i => i.id === itemId);
                                if (index < currentLayout.length - 1) {
                                    [currentLayout[index + 1], currentLayout[index]] = [currentLayout[index], currentLayout[index + 1]];
                                    Storage.setRemoteLayout(currentLayout);
                                    render();
                                    self.createRemoteControl();
                                }
                            }
                        })
                    ];
                    folderListContainer.appendChild(createListItem(displayName, controls));
                });
                section.appendChild(folderListContainer);
            };

            render();
            return section;
        },

        createLoggingSettingsSection: function() {
            const section = Utils.createElement('div', {
                className: 'settings-section',
                id: 'logging-settings'
            });

            section.appendChild(Utils.createElement('h4', {}, '실행 기록 (Firebase)'));

            const onOffGroup = Utils.createElement('div', {
                className: 'form-group'
            });
            const onOffCheckbox = Utils.createElement('input', {
                type: 'checkbox',
                className: 'form-checkbox',
                id: 'logging-onoff',
                checked: Storage.isLoggingEnabled(),
                onchange: (e) => {
                    Storage.setLoggingEnabled(e.target.checked);
                    // 탭을 다시 렌더링하여 UI 및 Firebase 초기화 로직을 다시 실행
                    this.switchSettingsTab('logging');
                }
            });
            onOffGroup.append(Utils.createElement('label', {
                className: 'form-checkbox-label',
                for: 'logging-onoff'
            }, [onOffCheckbox, 'Firebase에 QR 실행 기록 저장 활성화']));

            const syncKeyContainer = Utils.createElement('div', {
                id: 'firebase-sync-key-container',
                style: {
                    marginTop: '15px'
                }
            });

            // 로깅 기능이 켜져 있을 때만 동기화 키 UI를 표시
            if (Storage.isLoggingEnabled()) {
                const statusContainer = Utils.createElement('div', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginBottom: '15px'
                    }
                });
                const statusIndicator = Utils.createElement('div', {
                    style: {
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: 'gray'
                    }
                });
                const statusText = Utils.createElement('span', {
                    textContent: '상태 확인 중...'
                });
                statusContainer.append(statusIndicator, statusText);

                const updateStatusCallback = (message, color) => {
                    statusIndicator.style.backgroundColor = color;
                    statusText.textContent = message;
                };

                const keyGroup = Utils.createElement('div', {
                    className: 'form-group'
                });
                const keyInput = Utils.createElement('input', {
                    className: 'form-input',
                    type: 'text',
                    value: Storage.get('firebaseSyncKey', ''),
                    placeholder: '고유 동기화 키를 입력하거나 새로 생성하세요.',
                    onchange: (e) => {
                        Storage.set('firebaseSyncKey', e.target.value);
                        FirebaseLogger.init(updateStatusCallback); // 키 변경 시 즉시 재연결
                    }
                });

                const keyButtons = Utils.createElement('div', {
                    className: 'form-button-group'
                });
                const generateButton = Utils.createElement('button', {
                    className: 'form-button',
                    textContent: '새 키 생성',
                    onclick: () => {
                        const newKey = 'sync-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                        keyInput.value = newKey;
                        Storage.set('firebaseSyncKey', newKey);
                        FirebaseLogger.init(updateStatusCallback);
                    }
                });
                const copyButton = Utils.createElement('button', {
                    className: 'form-button',
                    textContent: '키 복사',
                    onclick: () => {
                        Utils.copyToClipboard(keyInput.value);
                        alert('동기화 키가 클립보드에 복사되었습니다. 다른 브라우저에 붙여넣으세요.');
                    }
                });

                keyButtons.append(generateButton, copyButton);
                keyGroup.append(
                    Utils.createElement('label', {
                        className: 'form-label'
                    }, '데이터 동기화 키'),
                    Utils.createElement('p', {
                        style: {
                            fontSize: '12px',
                            opacity: '0.8',
                            margin: '0 0 5px 0'
                        }
                    }, '이 키를 다른 브라우저에 똑같이 입력하면 기록이 동기화됩니다. 로그인 없이 사용됩니다.'),
                    keyInput,
                    keyButtons
                );

                syncKeyContainer.append(statusContainer, keyGroup);

                // UI가 생성된 후 즉시 Firebase 초기화 및 상태 업데이트
                FirebaseLogger.init(updateStatusCallback);
            } else {
                syncKeyContainer.textContent = '로깅 기능을 활성화하면 동기화 키 관리 UI가 표시됩니다.';
            }

            const buttonsGroup = Utils.createElement('div', {
                className: 'form-button-group',
                style: {
                    marginTop: '15px'
                }
            });
            const viewHistoryButton = Utils.createElement('button', {
                className: 'form-button primary',
                textContent: '기록 조회',
                onclick: () => this._createLogViewerModal()
            });
            const manageConfigButton = Utils.createElement('button', {
                className: 'form-button',
                textContent: 'Firebase 설정 관리',
                onclick: () => this._createFirebaseConfigModal()
            });
            buttonsGroup.append(viewHistoryButton, manageConfigButton);

            section.append(onOffGroup, syncKeyContainer, buttonsGroup);
            return section;
        },

        _createLogViewerModal: function() {
            // 보조창 크기 설정을 가져와 모달 크기에 적용
            const dimensions = Storage.get('imagePanelDimensions', {
                width: 800,
                height: 700
            });
            const modalWidth = `${dimensions.width}px`;

            const contentContainer = Utils.createElement('div', {
                style: {
                    padding: '15px',
                    overflowY: 'hidden',
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0
                }
            });
            const {
                overlay,
                modal
            } = this._createIndependentModal('실행 기록 조회', contentContainer, modalWidth);
            modal.style.height = `${dimensions.height}px`;

            // [롤백] 필터 상태를 단일 선택 방식으로 변경
            let currentFilters = {
                title: 'all',
                qrName: 'all'
            };

            // 모달이 열릴 때 데이터를 한 번만 로드하고, 내부에서 필터링
            const initializeModal = async () => {
                contentContainer.innerHTML = '기록을 불러오는 중...';
                const allLogs = await FirebaseLogger.getLogs(); // 데이터 한 번만 로드

                const render = () => {
                    contentContainer.innerHTML = '';

                    // --- 필터 및 컨트롤 UI 생성 ---
                    const controlsContainer = Utils.createElement('div', {
                        style: {
                            flexShrink: 0,
                            marginBottom: '10px'
                        }
                    });

                    const topButtons = Utils.createElement('div', {
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                        }
                    });
                    topButtons.append(
                        Utils.createElement('p', {
                            style: {
                                margin: 0
                            },
                            textContent: `총 ${allLogs.length}개의 기록`
                        }),
                        Utils.createElement('div', {
                            className: 'form-button-group'
                        }, [
                            Utils.createElement('button', {
                                className: 'form-button',
                                textContent: 'CSV로 다운로드',
                                onclick: () => FirebaseLogger.downloadLogsAsCsv(allLogs)
                            }),
                            Utils.createElement('button', {
                                className: 'form-button',
                                textContent: '전체 기록 삭제',
                                onclick: async () => {
                                    if (confirm('정말로 모든 실행 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                                        await FirebaseLogger.deleteAllLogs();
                                        initializeModal();
                                    }
                                }
                            })
                        ])
                    );

                    // [롤백] 필터 UI 생성 헬퍼 함수 (단일 선택 로직)
                    const createFilter = (label, filterType, items) => {
                        const container = Utils.createElement('div', {
                            style: {
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                flexWrap: 'wrap',
                                marginBottom: '5px'
                            }
                        });
                        container.appendChild(Utils.createElement('strong', {
                            style: {
                                flexShrink: 0,
                                marginRight: '5px'
                            }
                        }, `${label}:`));

                        const createBtn = (value, text) => {
                            const isActive = currentFilters[filterType] === value;
                            const btn = Utils.createElement('button', {
                                className: `settings-tab ${isActive ? 'active' : ''}`,
                                textContent: text,
                                onclick: () => {
                                    currentFilters[filterType] = value; // 현재 필터를 선택한 값으로 설정
                                    render();
                                }
                            });
                            return btn;
                        };

                        container.appendChild(createBtn('all', '전체')); // '전체' 버튼 추가
                        items.forEach(item => container.appendChild(createBtn(item, item)));
                        return container;
                    };

                    const uniqueTitles = [...new Set(allLogs.map(l => l.title))];
                    const uniqueQrNames = [...new Set(allLogs.map(l => l.qrName.replace(/^DEFAULT /, '')))];

                    const titleFilterUI = createFilter('문서 제목', 'title', uniqueTitles);
                    const qrFilterUI = createFilter('QR 이름', 'qrName', uniqueQrNames);

                    controlsContainer.append(topButtons, titleFilterUI, qrFilterUI);

                    // --- 테이블 UI 생성 ---
                    const tableContainer = Utils.createElement('div', {
                        style: {
                            flexGrow: 1,
                            overflowY: 'auto',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px'
                        }
                    });
                    const tableHeader = Utils.createElement('div', {
                        style: {
                            display: 'flex',
                            fontWeight: 'bold',
                            background: 'rgba(255,255,255,0.1)',
                            padding: '10px',
                            borderBottom: '1px solid rgba(255,255,255,0.2)'
                        }
                    });
                    tableHeader.innerHTML = `<div style="flex: 2;">실행 QR</div><div style="flex: 3;">프롬프트</div><div style="flex: 3;">응답</div><div style="flex: 1.5; text-align: right;">실행 시간</div>`;

                    tableContainer.appendChild(tableHeader);

                    // [롤백] 필터링 로직을 단일 선택 방식으로 변경
                    const filteredLogs = allLogs.filter(log => {
                        const cleanQrName = log.qrName.replace(/^DEFAULT /, '');

                        const titleMatch = currentFilters.title === 'all' || log.title === currentFilters.title;
                        const qrMatch = currentFilters.qrName === 'all' || cleanQrName === currentFilters.qrName;

                        return titleMatch && qrMatch;
                    });

                    if (filteredLogs.length === 0) {
                        tableContainer.appendChild(Utils.createElement('div', {
                            style: {
                                padding: '20px',
                                textAlign: 'center'
                            }
                        }, '표시할 기록이 없습니다.'));
                    } else {
                        filteredLogs.forEach(log => {
                            const row = Utils.createElement('div', {
                                style: {
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '10px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }
                            });

                            const qrCell = Utils.createElement('div', {
                                style: {
                                    flex: 2,
                                    wordBreak: 'break-all',
                                    fontSize: 'clamp(11px, 1.8vw, 14px)'
                                },
                                textContent: log.qrName.replace(/^DEFAULT /, '')
                            });

                            const promptCell = Utils.createElement('details', {
                                style: {
                                    flex: 3,
                                    paddingRight: '10px'
                                }
                            });
                            promptCell.append(Utils.createElement('summary', {
                                style: {
                                    cursor: 'pointer'
                                }
                            }, '보기'), Utils.createElement('pre', {
                                style: {
                                    marginTop: '8px',
                                    padding: '10px',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: '4px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    fontSize: '12px'
                                }
                            }, log.prompt));

                            const responseCell = Utils.createElement('div', {
                                style: {
                                    flex: 3,
                                    paddingRight: '10px'
                                }
                            });
                            const responseButton = Utils.createElement('button', {
                                className: 'form-button',
                                style: {
                                    width: '100%',
                                    textAlign: 'left',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }
                            });

                            if (log.response === '[Image Output]') {
                                responseButton.innerHTML = `<i class="fa-solid fa-image"></i> [이미지 재생성]`;
                                responseButton.onclick = async (e) => {
                                    overlay.remove();
                                    const qr = Storage.getQRById(log.qrId);
                                    if (!qr) return alert('이미지 생성에 사용된 원본 QR을 찾을 수 없습니다.');
                                    const aiPreset = Storage.getAiPresetById(qr.aiPresetId);
                                    if (!aiPreset) return alert('이미지 생성에 사용된 AI 프리셋을 찾을 수 없습니다.');

                                    Utils.toggleLoading(true, e.target);
                                    try {
                                        const imageResponse = await ApiHandler.request(aiPreset, log.prompt);
                                        Features.Image.displayInPanel(imageResponse, log.qrId);
                                    } catch (err) {
                                        alert(`이미지 재생성 실패: ${err.message}`);
                                    } finally {
                                        Utils.toggleLoading(false, e.target);
                                    }
                                };
                            } else {
                                responseButton.textContent = log.response.split(/\s+/).slice(0, 2).join(' ') + '...';
                                responseButton.onclick = () => {
                                    overlay.remove();
                                    Features.Image.displayInPanel(log.response, log.qrId);
                                };
                            }
                            responseCell.appendChild(responseButton);

                            const timeCell = Utils.createElement('div', {
                                style: {
                                    flex: 1.5,
                                    textAlign: 'right',
                                    fontSize: '12px',
                                    opacity: 0.8,
                                    lineHeight: '1.4'
                                }
                            });
                            const d = new Date(parseInt(log.timestamp.slice(0, 4)), parseInt(log.timestamp.slice(4, 6)) - 1, parseInt(log.timestamp.slice(6, 8)), parseInt(log.timestamp.slice(8, 10)), parseInt(log.timestamp.slice(10, 12)), parseInt(log.timestamp.slice(12, 14)));
                            const year = d.getFullYear().toString().slice(-2);
                            const month = (d.getMonth() + 1).toString().padStart(2, '0');
                            const day = d.getDate().toString().padStart(2, '0');
                            const time = d.toTimeString().split(' ')[0];
                            timeCell.innerHTML = `${year}.${month}.${day}<br>${time}`;

                            row.append(qrCell, promptCell, responseCell, timeCell);
                            tableContainer.appendChild(row);
                        });
                    }

                    contentContainer.append(controlsContainer, tableContainer);
                };

                render();
            };

            initializeModal();
        },

        _createIndependentModal: function(title, content, width = '800px') {
            const overlay = Utils.createElement('div', {
                style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 30000,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                }
            });
            const modal = Utils.createElement('div', {
                style: {
                    background: 'var(--main-color)',
                    width: '90%',
                    maxWidth: width,
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                }
            });

            const header = Utils.createElement('div', {
                className: 'settings-header',
                style: {
                    padding: '0 15px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }
            });
            header.append(
                Utils.createElement('h4', {
                    textContent: title,
                    style: {
                        margin: 0,
                        flexGrow: 1
                    }
                }),
                Utils.createElement('button', {
                    textContent: '✕',
                    className: 'close-button',
                    onclick: () => overlay.remove()
                })
            );

            modal.append(header, content);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            return {
                overlay,
                modal
            };
        },

        _createFirebaseConfigModal: function() {
            const content = Utils.createElement('div', {
                style: {
                    padding: '15px',
                    overflowY: 'auto',
                    flexGrow: 1
                }
            });

            const statusContainer = Utils.createElement('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '15px'
                }
            });
            const statusIndicator = Utils.createElement('div', {
                style: {
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: 'gray'
                }
            });
            const statusText = Utils.createElement('span', {
                textContent: '상태 확인 중...'
            });
            statusContainer.append(statusIndicator, statusText);

            const updateStatusCallback = (message, color) => {
                statusIndicator.style.backgroundColor = color;
                statusText.textContent = message;
            };
            FirebaseLogger.init(updateStatusCallback);

            const configGroup = Utils.createElement('div', {
                className: 'form-group'
            });
            const configTextarea = Utils.createElement('textarea', {
                className: 'form-textarea',
                placeholder: 'Firebase 프로젝트 설정에서 복사한 전체 코드 스니펫을 여기에 붙여넣으세요.',
                textContent: Storage.getFirebaseConfig(),
                style: {
                    fontFamily: 'monospace',
                    minHeight: '150px'
                }
            });
            const saveButton = Utils.createElement('button', {
                className: 'form-button primary',
                style: {
                    marginTop: '10px'
                },
                textContent: '설정 저장 및 연결',
                onclick: () => {
                    Storage.setFirebaseConfig(configTextarea.value);
                    FirebaseLogger.init(updateStatusCallback);
                    alert('설정이 저장되었습니다. 연결 상태를 확인하세요.');
                }
            });
            configGroup.append(Utils.createElement('label', {
                className: 'form-label'
            }, 'Firebase 구성 스니펫'), configTextarea, saveButton);

            const guideDetails = Utils.createElement('details', {
                style: {
                    marginTop: '20px'
                }
            });
            guideDetails.append(Utils.createElement('summary', {
                style: {
                    cursor: 'pointer',
                    fontWeight: 'bold'
                }
            }, 'Firebase 설정 방법 안내'));
            const guideContent = Utils.createElement('div', {
                style: {
                    marginTop: '10px',
                    paddingLeft: '20px',
                    borderLeft: '2px solid #555',
                    fontSize: '14px',
                    lineHeight: '1.6'
                }
            });
            guideContent.innerHTML = `
            <p>이 기능은 QR 실행 기록(QR이름, 프롬프트, 응답)을 개인 Google Firebase 계정에 백업하는 기능입니다. <strong>데이터는 사용자의 개인 클라우드에만 저장되며, 개발자에게 전송되지 않습니다.</strong></p>
            <ol>
                <li><a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase 콘솔</a>로 이동하여 Google 계정으로 로그인합니다.</li>
                <li><strong>'프로젝트 추가'</strong>를 클릭하여 새 프로젝트를 만듭니다. (이름은 자유롭게 지정, Google 애널리틱스는 비활성화해도 무방합니다.)</li>
                <li>프로젝트 생성 후, 프로젝트 개요 페이지에서 웹 앱 아이콘 ( <strong></></strong> )을 클릭하여 새 웹 앱을 등록합니다. 앱 닉네임은 자유롭게 지정합니다.</li>
                <li>'Firebase SDK 추가' 단계에서 <strong>'구성'</strong> 옵션을 선택합니다. <code>firebaseConfig</code> 변수가 포함된 코드 스니펫이 표시됩니다.</li>
                <li><code>const firebaseConfig = { ... };</code> 부터 <code>firebase.initializeApp(firebaseConfig);</code> 까지의 <strong>전체 코드 블록을 복사</strong>하여 위 텍스트 영역에 붙여넣습니다.</li>
                <li>Firebase 콘솔의 왼쪽 메뉴에서 <strong>'빌드' > 'Authentication'</strong>으로 이동하여 <strong>'시작하기'</strong>를 클릭합니다.</li>
                <li>로그인 제공업체 목록에서 <strong>'익명'</strong>을 찾아 사용 설정(활성화)한 후 저장합니다.</li>
                <li>다시 왼쪽 메뉴에서 <strong>'빌드' > 'Realtime Database'</strong>로 이동하여 <strong>'데이터베이스 만들기'</strong>를 클릭합니다.</li>
                <li>위치 선택 후, 보안 규칙은 <strong>'잠금 모드에서 시작'</strong>을 선택하고 사용 설정을 클릭합니다.</li>
                <li>데이터베이스 화면에서 <strong>'규칙' 탭</strong>으로 이동하여, 기존 내용을 모두 지우고 아래의 JSON 코드로 덮어쓴 후 <strong>'게시'</strong> 버튼을 누릅니다. 이 규칙은 인증(연결)에 성공한 사용자는 데이터 기록/조회를 허용하며, 보안은 추측 불가능한 '동기화 키'로 유지됩니다.<br>
<pre style="padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px; white-space: pre-wrap; word-break: break-all; font-size: 12px; margin-top: 5px;">{
  "rules": {
    "users": {
      "$user_sync_key": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}</pre>
                </li>
                <li>모든 설정이 완료되면, 위에서 '설정 저장 및 연결' 버튼을 클릭하고 로깅 탭의 '활성화' 체크박스를 켭니다.</li>
            </ol>
        `;
            guideDetails.appendChild(guideContent);

            content.append(statusContainer, configGroup, guideDetails);
            this._createIndependentModal('Firebase 설정 관리', content);
        },

        createImagePanel: function() {
            if (document.getElementById('image-panel')) return;
            const imagePanel = Utils.createElement('div', {
                id: 'image-panel'
            });

            const header = Utils.createElement('div', {
                className: 'settings-header'
            });
            const dragHandle = Utils.createElement('div', {
                className: 'draggable-handle'
            });
            const closeButton = Utils.createElement('button', {
                className: 'close-button',
                onclick: () => this.toggleImagePanel(false)
            }, '✕');
            header.append(dragHandle, closeButton);

            const contentWrapper = Utils.createElement('div', {
                id: 'image-panel-content-wrapper'
            });

            imagePanel.append(header, contentWrapper);
            document.body.appendChild(imagePanel);

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'style') {
                        const displayStyle = imagePanel.style.display;
                        if (displayStyle === 'none') {
                            Features.Image.cleanup();
                        }
                    }
                });
            });
            observer.observe(imagePanel, {
                attributes: true
            });

            Utils.makeDraggable(imagePanel, dragHandle, null, "imagePanelPosition");
        },
        findOrCreateInlineImagePanel: function() {
            // 이미 패널이 존재하면 해당 요소를 즉시 반환
            const existingPanel = document.getElementById('inline-image-panel');
            if (existingPanel) return existingPanel;

            // 패널이 없으면 새로 생성
            const contentWrapper = Utils.createElement('div', {
                id: 'inline-image-panel-content-wrapper'
            });
            const inlineImagePanel = Utils.createElement('div', {
                id: 'inline-image-panel'
            });
            inlineImagePanel.appendChild(contentWrapper);

            // 삽입 위치 탐색 및 삽입
            const ttsControls = document.querySelector('.conversation-container .tts-controls');
            if (ttsControls && ttsControls.parentNode) {
                ttsControls.parentNode.insertBefore(inlineImagePanel, ttsControls);
                return inlineImagePanel; // 성공 시 생성된 패널 요소 반환
            } else {
                console.warn("[QR] .tts-controls 요소를 찾을 수 없어 인라인 이미지 패널을 삽입할 수 없습니다.");
                return null; // 실패 시 null 반환
            }
        },

        switchSettingsTab: function(tabId) {
            document.querySelectorAll('.settings-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelector(`.settings-tab[data-tab="${tabId}"]`).classList.add('active');

            document.querySelectorAll('.settings-section').forEach(section => section.style.display = 'none');
            const section = document.getElementById(`${tabId}-settings`);
            if (section) {
                let newContent;
                switch (tabId) {
                    case 'settings':
                        newContent = this.createGeneralSettingsSection();
                        break;
                    case 'qr':
                        newContent = this.createQrSettingsSection();
                        break;
                    case 'ai':
                        newContent = this.createAiSettingsSection();
                        break;
                    case 'prompt':
                        newContent = this.createPromptSettingsSection();
                        break;
                    case 'lorebook':
                        newContent = this.createLorebookSettingsSection();
                        break;
                    case 'remote':
                        newContent = this.createRemoteSettingsSection();
                        break;
                    case 'logging':
                        newContent = this.createLoggingSettingsSection();
                        break; // [수정] logging 케이스 추가
                    default:
                        return;
                }
                newContent.id = `${tabId}-settings`;
                newContent.style.display = 'block';
                section.replaceWith(newContent);
            }
        },


        toggleSettingsPanel: function(show = null) {
            const panel = document.getElementById('settings-panel');
            if (!panel) return;
            const shouldShow = show === null ? (panel.style.display === 'none' || panel.style.display === '') : show;
            panel.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) this.extractMainColor();
        },

        toggleOutputPanel: function(show = null) {
            const panel = document.getElementById('output-panel');
            if (!panel) return;
            const shouldShow = show === null ? (panel.style.display === 'none' || panel.style.display === '') : show;
            panel.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) this.extractMainColor();
        },

        toggleImagePanel: function(show = null) {
            const panel = document.getElementById('image-panel');
            if (!panel) return;
            const shouldShow = show === null ? (panel.style.display === 'none' || panel.style.display === '') : show;
            panel.style.display = shouldShow ? 'flex' : 'none';
            if (shouldShow) this.extractMainColor();
        },

        toggleTranslationInput: function() {
            const container = document.getElementById('translation-input-container');
            if (container) container.style.display = 'block';
        },


        updateTextStyle: function() {
            const italic = Storage.get('ns-italic', false) ? 'italic' : 'normal';
            const bold = Storage.get('ns-bold', false) ? 'bold' : 'normal';
            const color = Storage.get('ns-highlight', false) ? Storage.get('colorCode', CONFIG.defaultHighlightColor) : 'inherit';
            document.documentElement.style.setProperty('--italic-active', italic);
            document.documentElement.style.setProperty('--bold-active', bold);
            document.documentElement.style.setProperty('--text-highlight-color', color);
        },

        extractMainColor: function() {
            const infobarElement = document.querySelector('.menubar');
            if (infobarElement) {
                const mainColor = window.getComputedStyle(infobarElement).backgroundColor;
                document.documentElement.style.setProperty('--main-color', mainColor);
                Storage.set('tMainColor', mainColor);
            }
        }
    };

    // ======================== NEW: 실행 추적 및 UI 피드백 관리자 ========================
    const ExecutionTracker = {
        _runningQrs: new Map(), // Map<qrId, { clickedButton: HTMLElement | null }>

        start: function(qrId, clickedButton = null) {
            if (!qrId || this._runningQrs.has(qrId)) return;

            // 실행 시작 시 QR ID와 클릭된 버튼 정보를 함께 저장
            this._runningQrs.set(qrId, {
                clickedButton
            });

            const qr = Storage.getQRById(qrId);
            if (!qr) return;
            const aiPreset = Storage.getAiPresetById(qr.aiPresetId) || Storage.getAiPresetById('ai-default');
            const aiType = aiPreset ? aiPreset.type : null;

            // 1. 리모컨의 기본 버튼에 로딩 적용
            Utils.toggleLoading(true, qrId, aiType);
            // 2. 클릭된 버튼이 있다면, 그 버튼에도 로딩 적용
            if (clickedButton) {
                Utils.toggleLoading(true, clickedButton, aiType);
            }
        },

        finish: function(qrId) {
            if (!qrId || !this._runningQrs.has(qrId)) return;

            const trackerInfo = this._runningQrs.get(qrId);
            if (trackerInfo) {
                // 1. 리모컨 버튼 로딩 종료
                Utils.toggleLoading(false, qrId);
                // 2. 클릭된 버튼이 있었다면 로딩 종료
                if (trackerInfo.clickedButton) {
                    Utils.toggleLoading(false, trackerInfo.clickedButton);
                }
            }
            this._runningQrs.delete(qrId);
        },

        finishAll: function() {
            // Map의 모든 키(qrId)를 순회하며 finish 호출
            const allRunningIds = [...this._runningQrs.keys()];
            allRunningIds.forEach(id => this.finish(id));
        },

        updateLoadingType(qrId, aiType) {
            if (!this._runningQrs.has(qrId)) return;
            const trackerInfo = this._runningQrs.get(qrId);
            Utils.toggleLoading(true, qrId, aiType);
            if (trackerInfo.clickedButton) {
                Utils.toggleLoading(true, trackerInfo.clickedButton, aiType);
            }
        },

        isRunning: function(qrId) {
            return this._runningQrs.has(qrId);
        }
    };


    // ======================== QR 실행기 모듈 (무한 루프 방지 적용) ========================
    const QRExecutor = {
        MAX_MULTI_QR_DEPTH: 10,

        async execute(qrId, clickedButton = null, options = {}) {
            if (ExecutionTracker.isRunning(qrId)) {
                return;
            }

            try {
                // 1. 실행 추적 시작 (로딩 UI 자동 활성화)
                ExecutionTracker.start(qrId, clickedButton);

                const mainQr = Storage.getQRById(qrId);
                if (!mainQr) throw new Error(`ID가 '${qrId}'인 QR을 찾을 수 없습니다.`);

                const qrIdsToRun = [qrId];
                if (Array.isArray(mainQr.simultaneousQrIds)) {
                    qrIdsToRun.push(...mainQr.simultaneousQrIds.filter(id => id !== qrId));
                }

                const executionPromises = qrIdsToRun.map(id => {
                    const isMainQr = id === qrId;
                    const currentClickedButton = isMainQr ? clickedButton : null;
                    if (!isMainQr) { // 동시 실행 QR 추적 시작
                        ExecutionTracker.start(id, currentClickedButton);
                    }
                    return this._executeInternal(id, {
                        ...options,
                        executionPath: []
                    });
                });

                await Promise.all(executionPromises);

            } catch (error) {
                console.error(`QR 실행 중 치명적인 오류 발생 (시작 QR: ${qrId}):`, error);
                alert(`QR 실행 중 오류가 발생했습니다: ${error.message}`);
            } finally {
                // 2. 모든 실행 추적 및 UI 피드백 종료
                ExecutionTracker.finishAll();
            }
        },

        async _executeInternal(qrId, options = {}) {
            const executionPath = options.executionPath || [];

            if (executionPath.length >= this.MAX_MULTI_QR_DEPTH || executionPath.includes(qrId)) {
                throw new Error(executionPath.length >= this.MAX_MULTI_QR_DEPTH ? '연속 QR 깊이 초과' : '무한 루프 감지');
            }
            const newExecutionPath = [...executionPath, qrId];

            try {
                const qr = Storage.getQRById(qrId);
                if (!qr) throw new Error(`ID가 '${qrId}'인 QR을 찾을 수 없습니다.`);

                const aiPreset = Storage.getAiPresetById(qr.aiPresetId) || Storage.getAiPresetById('ai-default');
                if (!aiPreset) throw new Error(`AI 프리셋을 찾을 수 없습니다.`);

                // 연속 실행 시, 다음 QR의 AI 타입에 맞춰 로딩 UI를 업데이트
                ExecutionTracker.updateLoadingType(qrId, aiPreset.type);

                const userInputs = await this._collectUserInputs(qr, options);
                if (userInputs === null) {
                    return; // 사용자가 입력 취소. finally에서 일괄 처리.
                };
                const fullPrompt = await this._assemblePrompt(qr, userInputs, options.previousResponse, options.insertSlot, aiPreset.type);

                const apiResponse = await ApiHandler.request(aiPreset, fullPrompt);

                if (FirebaseLogger.isEnabled()) {
                    FirebaseLogger.log(qr.id, qr.name, fullPrompt, apiResponse);
                }

                if (qr.postProcess.action === 'multi_qr' && qr.postProcess.nextQrId) {
                    const nextQrId = qr.postProcess.nextQrId;
                    const nextOptions = {
                        previousResponse: apiResponse,
                        insertSlot: qr.postProcess.insertSlot,
                        executionPath: newExecutionPath
                    };
                    // 연속 실행은 클릭된 버튼이 없으므로 null 전달
                    await this.execute(nextQrId, null, nextOptions);
                } else {
                    await this._handlePostProcess(qr, apiResponse, null, newExecutionPath);
                }
            } catch (error) {
                throw error;
            }
        },
        _loadAllContent: async function() {
            const scrollContainer = document.querySelector('.conversation-main');
            if (!scrollContainer) {
                console.warn('전체 텍스트 로딩 실패: 스크롤 컨테이너(.conversation-main)를 찾을 수 없습니다.');
                return;
            }
            console.log('전체 텍스트 로딩 시작...');
            try {
                let previousHeight = -1;
                let attempts = 0;
                const maxAttempts = 30;
                while (attempts < maxAttempts) {
                    const currentHeight = scrollContainer.scrollHeight;
                    if (currentHeight === previousHeight) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        if (scrollContainer.scrollHeight === currentHeight) {
                            console.log('전체 텍스트 로딩 완료.');
                            break;
                        }
                    }
                    previousHeight = currentHeight;
                    scrollContainer.scrollTop = 0;
                    await new Promise(resolve => setTimeout(resolve, 150));
                    attempts++;
                }
                if (attempts >= maxAttempts) {
                    console.warn('최대 시도 횟수에 도달하여 전체 텍스트 로딩을 중단합니다.');
                }
            } catch (error) {
                console.error('전체 텍스트 로딩 중 오류 발생:', error);
            } finally {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        },

        async _collectUserInputs(qr, options = {}) {
            const inputs = {};
            const slotOrder = ['prefix', 'afterPrefix', 'beforeBody', 'afterBody', 'beforeSuffix', 'suffix', 'afterSuffix'];

            for (const slotName of slotOrder) {
                const slotValue = qr.slots[slotName];
                if (typeof slotValue === 'object' && slotValue?.type === 'user_input') {
                    let userInput;
                    if (options.directUserInput && options.userInputSlot === slotName) {
                        userInput = options.directUserInput;
                    } else {
                        userInput = prompt(slotValue.caption);
                    }

                    if (userInput === null) return null;
                    inputs[slotName] = userInput;
                }
            }
            return inputs;
        },

        async _assemblePrompt(qr, userInputs, previousResponse, insertSlot, aiType) {
            if (qr.extractLength >= 10000) {
                await this._loadAllContent();
            }

            const promptParts = [];
            const slotOrder = ['prefix', 'afterPrefix', 'beforeBody', 'afterBody', 'beforeSuffix', 'suffix', 'afterSuffix'];
            const bodyText = (qr.extractLength > 0) ? this._extractBodyText(qr.extractLength) : '';

            for (const slotName of slotOrder) {
                if (previousResponse && slotName === insertSlot) {
                    promptParts.push(previousResponse);
                }

                const slotValue = qr.slots[slotName];
                if (slotValue) {
                    if (typeof slotValue === 'string') {
                        const promptPreset = Storage.getPromptById(slotValue);
                        if (promptPreset) promptParts.push(promptPreset.content);
                    } else if (slotValue.type === 'user_input' && userInputs[slotName] !== undefined) {
                        promptParts.push(userInputs[slotName]);
                    } else if (slotValue.type === 'lorebook') {
                        const lorebookText = this._compileLorebookText(slotValue.ids, bodyText);
                        if (lorebookText) promptParts.push(lorebookText);
                    }
                }

                if (slotName === 'afterBody') {
                    if (bodyText) promptParts.push(bodyText);
                }
            }

            const filteredParts = promptParts.filter(p => p && (typeof p === 'string' && p.trim() !== ''));
            return (aiType === 'novelai') ? filteredParts.join(', ') : filteredParts.join('\n\n');
        },

        _compileLorebookText(lorebookIds, bodyText) {
            if (!lorebookIds || lorebookIds.length === 0) return '';

            const lowerCaseBody = bodyText.toLowerCase();
            const allLorebooks = Storage.getLorebooks();
            const activeEntries = [];

            lorebookIds.forEach(id => {
                const lorebook = allLorebooks.find(lb => lb.id === id);
                if (!lorebook || !lorebook.enabled || !lorebook.data.entries) return;

                lorebook.data.entries.forEach(entry => {
                    if (!entry.enabled) return;

                    const isKeywordFound = entry.keys.some(key => lowerCaseBody.includes(key));
                    if (entry.forceActivation || isKeywordFound) {
                        activeEntries.push(entry);
                    }
                });
            });

            if (activeEntries.length === 0) return '';

            activeEntries.sort((a, b) => (b.contextConfig?.budgetPriority || 0) - (a.contextConfig?.budgetPriority || 0));

            return activeEntries.map(entry => entry.text).join('\n');
        },
        _extractBodyText(length) {
            const proseMirrorDiv = document.querySelector('.ProseMirror');
            if (!proseMirrorDiv) return '';

            const paragraphs = proseMirrorDiv.querySelectorAll('p');
            let pText = '';
            for (let i = paragraphs.length - 1; i >= 0; i--) {
                pText = paragraphs[i].textContent + '\n' + pText;
                if (pText.length >= length) break;
            }
            return pText
        },
        async _handlePostProcess(qr, response, buttonElement, executionPath) {
            switch (qr.postProcess.action) {
                case 'output_panel':
                    UI.toggleOutputPanel(true);
                    Features.Translation.displayFormattedText(response);
                    break;
                case 'prosemirror': {
                    const proseMirror = document.querySelector('.ProseMirror');
                    if (!proseMirror) break;
                    const paragraphsToInsert = response.split('\n').filter(p => p.trim() !== '');
                    if (paragraphsToInsert.length === 0) break;
                    let lastInsertedParagraphElement = null;
                    paragraphsToInsert.forEach(pText => {
                        const span = document.createElement('span');
                        span.className = 'userText';
                        span.textContent = pText;
                        const newParagraph = document.createElement('p');
                        newParagraph.appendChild(span);
                        proseMirror.appendChild(newParagraph);
                        lastInsertedParagraphElement = newParagraph;
                    });
                    if (lastInsertedParagraphElement) {
                        const finalSpan = lastInsertedParagraphElement.querySelector('span.userText');
                        if (finalSpan && finalSpan.firstChild) {
                            const finalTextNode = finalSpan.lastChild;
                            const range = document.createRange();
                            const sel = window.getSelection();
                            range.setStart(finalTextNode, finalTextNode.length);
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);
                            proseMirror.focus();
                            lastInsertedParagraphElement.scrollIntoView({
                                behavior: 'smooth',
                                block: 'end'
                            });
                        }
                    }
                    break;
                }
                case 'image_panel':
                    Features.Image.displayInPanel(response, qr.id);
                    break;
                case 'inline_image_panel': {
                    const panel = UI.findOrCreateInlineImagePanel();
                    if (panel) {
                        Features.Image.displayInline(response, qr.id, panel);
                    } else {
                        alert('인라인 삽화를 위한 위치(.tts-controls)를 찾을 수 없습니다. 현재 페이지에서는 이 기능을 사용할 수 없습니다.');
                    }
                    break;
                }
                case 'multi_qr':
                    // 연속 실행은 이제 execute에서 처리되므로 이 블록은 비워둡니다.
                    // 단, 하위호환성을 위해 케이스는 남겨둡니다.
                    break;
                case 'none':
                default:
                    break;
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
            if (typeof fullPrompt !== 'string') {
                throw new Error('fullPrompt는 문자열이어야 합니다.');
            }

            switch (aiPreset.type) {
                case 'gemini':
                    return await this.requestGemini(aiPreset, fullPrompt);
                case 'openai':
                    return await this.requestOpenAI(aiPreset, fullPrompt);
                case 'claude':
                    return await this.requestClaude(aiPreset, fullPrompt);
                case 'novelai':
                    return await this.requestNovelAI(aiPreset, fullPrompt);
                case 'textcompletion':
                    return await this.requestTextCompletion(aiPreset, fullPrompt);
                default:
                    throw new Error(`지원되지 않는 AI 프리셋 유형입니다: ${aiPreset.type}`);
            }
        },

        /**
         * Gemini API 요청
         * @private
         */
        async requestGemini(aiPreset, fullPrompt) {
            const {
                apiKey,
                endpoint,
                parameters
            } = aiPreset;
            const model = parameters.model;
            const apiUrl = `${endpoint.replace(/\/$/, '')}/${model}:generateContent?key=${apiKey}`;

            const safetySettings = [{
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_NONE'
            }, {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_NONE'
            }, {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_NONE'
            }, {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_NONE'
            }];

            const requestBody = {
                contents: [{
                    parts: [{
                        text: fullPrompt
                    }]
                }],
                generationConfig: {
                    temperature: parameters.temperature,
                    topK: parameters.topK,
                    topP: parameters.topP,
                },
                safetySettings: safetySettings
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const responseText = await response.text();

            if (!response.ok) {
                let errorMessage = `Gemini API 요청 실패 (HTTP ${response.status}): `;
                try {
                    const errorJson = JSON.parse(responseText);
                    errorMessage += errorJson.error?.message || responseText;
                } catch (e) {
                    errorMessage += responseText;
                }
                throw new Error(errorMessage);
            }

            try {
                const data = JSON.parse(responseText);
                if (data.candidates && data.candidates[0]?.content.parts[0]?.text) {
                    return data.candidates[0].content.parts[0].text;
                } else if (data.promptFeedback) {
                    throw new Error("Gemini 요청이 차단되었습니다: " + JSON.stringify(data.promptFeedback));
                } else {
                    throw new Error("Gemini로부터 유효한 응답을 받지 못했습니다. 받은 내용: " + responseText);
                }
            } catch (jsonError) {
                throw new Error(`Gemini API 응답이 유효한 JSON 형식이 아닙니다. 받은 응답: ${responseText}`);
            }
        },

        /**
         * OpenAI Chat Completions API 요청
         * @private
         */
        async requestOpenAI(aiPreset, fullPrompt) {
            const {
                apiKey,
                endpoint,
                parameters
            } = aiPreset;
            const apiUrl = endpoint?.trim().replace(/\/$/, '') || 'https://api.openai.com/v1/chat/completions';

            const requestBody = {
                model: parameters.model,
                messages: [{
                    role: 'user',
                    content: fullPrompt
                }],
                temperature: parameters.temperature,
                top_p: parameters.topP,
                stream: false // 스트리밍 응답 방지
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            const responseText = await response.text();

            if (!response.ok) {
                let errorMessage = `OpenAI API 요청 실패 (HTTP ${response.status}): `;
                try {
                    const errorJson = JSON.parse(responseText);
                    errorMessage += errorJson.error?.message || responseText;
                } catch (e) {
                    errorMessage += responseText;
                }
                throw new Error(errorMessage);
            }

            try {
                const data = JSON.parse(responseText);
                if (data.choices && data.choices[0]?.message?.content) {
                    return data.choices[0].message.content;
                } else {
                    throw new Error("OpenAI로부터 유효한 응답을 받지 못했습니다. 받은 내용: " + responseText);
                }
            } catch (jsonError) {
                throw new Error(`OpenAI API 응답이 유효한 JSON 형식이 아닙니다. 받은 응답: ${responseText}`);
            }
        },
        /**
         * OpenAI Text Completions API 요청 (스트리밍 및 Generic 필터링 지원)
         * @private
         */
        async requestTextCompletion(aiPreset, fullPrompt) {
            const {
                apiKey,
                endpoint,
                parameters
            } = aiPreset;

            // --- [수정된 부분] ---
            // 엔드포인트 URL의 끝에 '/v1'이 있으면 제거하고, '/v1/completions'를 붙여 경로를 보정합니다.
            // 이렇게 하면 사용자가 'https://host/v1' 또는 'https://host' 중 어떻게 입력하든 올바른 URL이 생성됩니다.
            const baseUrl = endpoint?.trim().replace(/\/v1\/?$/, '').replace(/\/$/, '');
            const apiUrl = `${baseUrl}/v1/completions`;
            // --- [수정 끝] ---

            const validKeys = [
                'model', 'prompt', 'temperature', 'top_p', 'max_tokens',
                'presence_penalty', 'frequency_penalty', 'repetition_penalty',
                'stop', 'stream', 'logit_bias', 'user', 'n', 'logprobs', 'echo'
            ];

            const paramMap = {
                temperature: 'temperature',
                topP: 'top_p',
            };

            const requestBody = {
                model: parameters.model,
                prompt: fullPrompt,
                max_tokens: 4096,
                stream: true
            };

            Object.keys(parameters).forEach(key => {
                const mappedKey = paramMap[key] || key;
                if (validKeys.includes(mappedKey) && parameters[key] !== null && parameters[key] !== undefined) {
                    requestBody[mappedKey] = parameters[key];
                }
            });

            if (Array.isArray(requestBody.stop)) {
                requestBody.stop = requestBody.stop.slice(0, 4);
            }

            // 디버깅 로그는 유지하여 계속 확인하는 것이 좋습니다.
            console.log("===== [Text Completion] API 요청 디버그 정보 =====");
            console.log("요청 URL:", apiUrl);
            console.log("요청 본문 (Body):", JSON.stringify(requestBody, null, 2));
            console.log("==================================================");

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            // ... (이하 스트리밍 처리 로직은 동일)
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = `Text Completion API 요청 실패 (HTTP ${response.status}): `;
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMessage += errorJson.error?.message || errorText;
                } catch (e) {
                    errorMessage += errorText;
                }
                throw new Error(errorMessage);
            }

            if (!response.body) {
                throw new Error("API 응답에 스트림 바디가 없습니다.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponseText = '';

            try {
                while (true) {
                    const {
                        value,
                        done
                    } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.substring(6);
                            if (data.trim() === '[DONE]') {
                                break;
                            }
                            try {
                                const json = JSON.parse(data);
                                if (json.choices && json.choices[0]?.text) {
                                    fullResponseText += json.choices[0].text;
                                }
                            } catch (e) {
                                console.error('스트림 데이터 파싱 오류:', e, '데이터:', data);
                            }
                        }
                    }
                }
            } catch (error) {
                throw new Error(`스트림 읽기 중 오류 발생: ${error.message}`);
            }

            return fullResponseText.trim();
        },
        /**
         * Claude (Anthropic) Messages API 요청
         * @private
         */
        async requestClaude(aiPreset, fullPrompt) {
            const {
                apiKey,
                endpoint,
                parameters
            } = aiPreset;
            const apiUrl = endpoint?.trim().replace(/\/$/, '') || 'https://api.anthropic.com/v1/messages';

            const requestBody = {
                model: parameters.model,
                messages: [{
                    role: 'user',
                    content: fullPrompt
                }],
                temperature: parameters.temperature,
                top_p: parameters.topP,
                top_k: parameters.topK,
                max_tokens: 4096,
                stream: false // 스트리밍 응답 방지
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });

            const responseText = await response.text();

            if (!response.ok) {
                let errorMessage = `Claude API 요청 실패 (HTTP ${response.status}): `;
                try {
                    const errorJson = JSON.parse(responseText);
                    errorMessage += errorJson.error?.message || responseText;
                } catch (e) {
                    errorMessage += responseText;
                }
                throw new Error(errorMessage);
            }

            try {
                const data = JSON.parse(responseText);
                if (Array.isArray(data.content)) {
                    const textPart = data.content.find(part => part.type === 'text');
                    if (textPart?.text) return textPart.text;
                }
                throw new Error("Claude로부터 유효한 텍스트 응답을 받지 못했습니다. 받은 내용: " + responseText);
            } catch (jsonError) {
                throw new Error(`Claude API 응답이 유효한 JSON 형식이 아닙니다. 받은 응답: ${responseText}`);
            }
        },

        /**
         * NovelAI 이미지 생성 API 요청 (V4 구조 복원)
         * @private
         */
        async requestNovelAI(aiPreset, fullPrompt) {
            const JSZip = await Utils.loadJSZip();
            const {
                apiKey,
                endpoint,
                parameters
            } = aiPreset;
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
                    ucPreset: 1,
                    legacy: false,
                    v4_prompt: {
                        caption: {
                            base_caption: fullPrompt,
                            char_captions: [],
                        },
                        use_coords: false,
                        use_order: true,
                    },
                    v4_negative_prompt: {
                        caption: {
                            base_caption: naiParams.negative_prompt,
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

            // [변경점] blob 대신 base64로 이미지 데이터를 추출합니다.
            const imageBase64 = await imageFile.async('base64');
            // [변경점] Data URL 형식으로 만듭니다.
            const imageUrl = `data:image/png;base64,${imageBase64}`;

            const title = document.querySelector('[aria-label="Story Title"]')?.value || 'story';
            const dateTime = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
            const imageName = `${title}_${dateTime}.png`;

            return {
                imageUrl,
                prompt: fullPrompt,
                imageName
            };
        }
    };
    // ======================== 5. 기능별 모듈========================
    const Features = {
        // 번역 및 마크다운 관련 표시 기능
        Translation: {
            /**
             * 포맷팅된 텍스트를 출력 패널에 표시
             * @param {string} pText - 처리할 텍스트
             */
            displayFormattedText: function(pText) {
                const extractedText = document.getElementById('extracted-text');
                if (!extractedText) return;

                const shouldRenderMarkdown = Storage.get('renderMarkdown', true);
                UI.updateTextStyle();

                // 1. 텍스트를 문단 배열로 나눕니다.
                const paragraphs = pText.split('\n');

                // 2. 각 문단(line)을 순회하며 하이라이트를 적용합니다. (이 부분이 복원되었습니다)
                const processedParagraphs = paragraphs.map(line => {
                    // 정규식으로 "..." 와 “...” 두 패턴을 모두 찾아 처리합니다.
                    return line.replace(/"(.*?)"|“(.*?)”/g, (match, group1, group2) => {
                        if (group1 !== undefined) {
                            return `<span class="highlight-text">"${group1}"</span>`;
                        }
                        if (group2 !== undefined) {
                            return `<span class="highlight-text">“${group2}”</span>`;
                        }
                        return match;
                    });
                });

                // 3. 처리된 문단 배열을 기반으로 최종 HTML을 생성합니다.
                let finalHtml;
                if (shouldRenderMarkdown) {
                    const processedText = processedParagraphs.join('\n');
                    finalHtml = this._markdownToHtml(processedText);
                } else {
                    finalHtml = processedParagraphs.map(line => {
                        return `<p>${line.trim() === '' ? '<br>' : line}</p>`;
                    }).join('');
                }

                extractedText.innerHTML = finalHtml;
            },

            /**
             * Marked.js를 사용하여 텍스트를 HTML로 변환 (하이라이트 기능 제거됨)
             * @param {string} mdText - 변환할 텍스트
             * @returns {string} 변환된 HTML 문자열
             * @private
             */
            _markdownToHtml: function(mdText) {
                // 원본 스크립트의 중복 하이라이트 로직을 완전히 제거했습니다.

                let html = marked.parse(mdText);

                if (html.includes('<table')) {
                    this._ensureTableStyles();
                }
                html = html.replace(/<p>(\s*<(?:table|thead|tbody|tr|th|td|ul|ol|li|pre|code|hr)[\s\S]*?)<\/p>/g, '$1');
                html = html.replace(/<p>(\s*<h[1-6][\s\S]*?)<\/p>/g, '$1');
                html = html.replace(/<p><\/p>/g, '');

                return html;
            },
            /**
             * Markdown 테이블 스타일이 문서에 없으면 추가하는 함수
             * @private
             */
            _ensureTableStyles: function() {
                const styleId = 'md-table-style';
                if (document.getElementById(styleId)) return;

                const tableStyle = `
                .md-table { border-collapse: collapse; margin: 1em 0; width: 100%; background: transparent; font-size: 14px; }
                .md-table th, .md-table td { border: 1px solid rgba(255, 255, 255, 0.3); padding: 8px; text-align: left; }
                .md-table th { font-weight: bold; background-color: rgba(255, 255, 255, 0.1); }
            `;
                const styleEl = document.createElement('style');
                styleEl.id = styleId;
                styleEl.textContent = tableStyle;
                document.head.appendChild(styleEl);
            }
        },

        // 보조창(Auxiliary Panel) 관리 모듈
        Image: {
            currentResponse: null,
            currentQrId: null,
            currentBlobUrl: null,

            /**
             * 창이 닫힐 때 Blob URL 등 리소스 정리
             */
            cleanup: function() {
                if (this.currentBlobUrl) {
                    this.currentBlobUrl = null;
                }
                const contentWrapper = document.getElementById('image-panel-content-wrapper');
                if (contentWrapper) contentWrapper.innerHTML = '';
            },

            /**
             * API 응답을 받아 콘텐츠 유형을 판별하고 콘텐츠를 렌더링합니다.
             * @param {string | Object} response - API 응답. 텍스트 또는 이미지 정보 객체.
             * @param {string} qrId - 이 응답을 생성한 QR의 ID
             * @param {HTMLElement} wrapperElement - 콘텐츠를 삽입할 HTML 요소 (예: #image-panel-content-wrapper)
             * @param {string | null} [overridePromptText=null] - 재생성 시 텍스트에리어 내용을 유지하기 위한 파라미터
             */
            _renderContent: function(response, qrId, wrapperElement, overridePromptText = null) {
                // 이 함수는 cleanup을 호출하지 않고, 외부에서 cleanup을 호출해야 합니다.
                wrapperElement.innerHTML = '';

                // 1. 메인 콘텐츠 렌더링
                if (typeof response === 'object' && response.imageUrl) {
                    this._renderImageContent(response, wrapperElement, overridePromptText);
                } else if (typeof response === 'string') {
                    this._renderMixedContent(response, wrapperElement);
                } else {
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.textContent = `알 수 없는 형식의 응답입니다:\n${JSON.stringify(response, null, 2)}`;
                    wrapperElement.appendChild(fallbackDiv);
                }

                // 2. 공통 버튼을 맨 아래에 추가 (어느 wrapper에 속하는지 컨텍스트 전달)
                const buttonsContainer = this._createPanelButtons(wrapperElement);
                wrapperElement.appendChild(buttonsContainer);

                // 콘텐츠가 새로 렌더링된 후 스크롤을 맨 위로 이동
                wrapperElement.scrollTop = 0;
            },

            /**
             * 보조창(Auxiliary Panel)에 콘텐츠 표시
             */
            displayInPanel: function(response, qrId, overridePromptText = null) {
                this.cleanup(); // 기존 리소스 정리
                this.currentResponse = response;
                this.currentQrId = qrId;

                const contentWrapper = document.getElementById('image-panel-content-wrapper');
                if (!contentWrapper) return;

                this._renderContent(response, qrId, contentWrapper, overridePromptText);
                UI.toggleImagePanel(true);
            },

            /**
             * 인라인 패널에 콘텐츠 표시 (cleanup 로직 분리)
             */
            displayInline: function(response, qrId, panelElement) {
                if (!panelElement) return;

                // 이전에 등록된 resize 핸들러가 있다면 제거 (메모리 누수 방지)
                if (panelElement._resizeHandler) {
                    window.removeEventListener('resize', panelElement._resizeHandler);
                    delete panelElement._resizeHandler;
                }

                this.currentResponse = response;
                this.currentQrId = qrId;

                const contentWrapper = panelElement.querySelector('#inline-image-panel-content-wrapper');
                if (!contentWrapper) return;

                panelElement.style.height = '';
                panelElement.style.minHeight = '';

                this._renderContent(response, qrId, contentWrapper);
                panelElement.style.display = 'block';

                if (typeof response === 'object' && response.imageUrl) {
                    const imageElement = contentWrapper.querySelector('img.generated-image');
                    if (imageElement) {
                        const resizeHandler = () => {
                            const aspectRatio = parseFloat(panelElement.dataset.aspectRatio);
                            if (!aspectRatio) return;
                            const panelWidth = panelElement.offsetWidth;
                            const newImageHeight = panelWidth * aspectRatio;
                            const wrapperStyles = window.getComputedStyle(contentWrapper);
                            const paddingTop = parseFloat(wrapperStyles.paddingTop);
                            const paddingBottom = parseFloat(wrapperStyles.paddingBottom);
                            const calculatedHeight = newImageHeight + paddingTop + paddingBottom;
                            const viewportMaxHeight = window.innerHeight - 350;
                            const finalHeight = Math.min(calculatedHeight, viewportMaxHeight);
                            panelElement.style.minHeight = `${finalHeight}px`;
                        };
                        const onImageLoad = () => {
                            const aspectRatio = imageElement.naturalHeight / imageElement.naturalWidth;
                            panelElement.dataset.aspectRatio = aspectRatio;
                            panelElement._resizeHandler = resizeHandler;
                            window.addEventListener('resize', panelElement._resizeHandler);
                            resizeHandler();
                        };
                        if (imageElement.complete) {
                            onImageLoad();
                        } else {
                            imageElement.onload = onImageLoad;
                        }
                    }
                }
            },

            /** @private 이미지와 프롬프트 편집기를 렌더링 */
            _renderImageContent: function(imageData, wrapper, overridePromptText = null) {
                this.currentBlobUrl = imageData.imageUrl;
                const image = Utils.createElement('img', {
                    className: 'generated-image',
                    src: imageData.imageUrl,
                    alt: '생성된 삽화',
                    style: {
                        display: 'block'
                    }
                });
                const imageLink = Utils.createElement('a', {
                    href: imageData.imageUrl,
                    download: imageData.imageName || 'generated_image.png'
                });
                imageLink.appendChild(image);
                imageLink.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    imageLink.click();
                });
                imageLink.addEventListener('click', (e) => {
                    if (e.isTrusted) {
                        e.preventDefault();
                    }
                });
                const promptContainer = Utils.createElement('div', {
                    className: 'prompt-editor-container'
                });
                const promptLabel = Utils.createElement('label', {
                    className: 'form-label',
                    textContent: '프롬프트 (수정 후 재생성 가능)'
                });
                const promptForEditor = overridePromptText !== null ? overridePromptText : imageData.prompt;
                // [ID -> CLASS 변경]
                const promptTextarea = Utils.createElement('textarea', {
                    className: 'form-textarea image-prompt-editor', // ID 대신 클래스 사용
                }, promptForEditor || '');
                promptContainer.append(promptLabel, promptTextarea);
                wrapper.append(imageLink, promptContainer);
            },
            /** @private 텍스트와 HTML이 섞인 콘텐츠를 렌더링 (안정적인 방식으로 변경) */
            _renderMixedContent: function(text, wrapper) {
                const shouldRenderMarkdown = Storage.get('renderMarkdown', true);
                const shouldRenderHtml = Storage.get('renderHtml', false);

                if (!shouldRenderMarkdown && !shouldRenderHtml) {
                    const contentDiv = Utils.createElement('div', {
                        style: {
                            padding: '5px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                        },
                        textContent: text
                    });
                    wrapper.appendChild(contentDiv);
                    return;
                }
                if (!shouldRenderHtml) {
                    if (shouldRenderMarkdown) {
                        const contentDiv = Utils.createElement('div');
                        contentDiv.innerHTML = Features.Translation._markdownToHtml(text);
                        contentDiv.style.textAlign = 'left';
                        contentDiv.style.padding = '5px';
                        wrapper.appendChild(contentDiv);
                    } else {
                        wrapper.textContent = text;
                    }
                    return;
                }

                const htmlBlockRegex = /```html\r?\n([\s\S]*?)\r?\n?```/g;
                let lastIndex = 0;
                let match;

                const renderPart = (content) => {
                    if (content.trim() === '') return;
                    const contentDiv = document.createElement('div');
                    contentDiv.style.padding = '1em';
                    contentDiv.style.textAlign = 'left';
                    contentDiv.innerHTML = shouldRenderMarkdown ? Features.Translation._markdownToHtml(content) : content.replace(/\n/g, '<br>');
                    wrapper.appendChild(contentDiv);
                };
                const renderHtmlPart = (htmlContent) => {
                    const iframeContainer = Utils.createElement('div', {
                        style: {
                            width: '100%',
                            overflow: 'hidden'
                        }
                    });
                    const iframe = Utils.createElement('iframe', {
                        srcdoc: htmlContent,
                        sandbox: "allow-scripts allow-same-origin",
                        style: {
                            width: '100%',
                            height: '90vh',
                            border: 'none',
                            display: 'block'
                        }
                    });
                    iframeContainer.appendChild(iframe);
                    wrapper.appendChild(iframeContainer);
                };

                while ((match = htmlBlockRegex.exec(text)) !== null) {
                    const textBefore = text.substring(lastIndex, match.index);
                    renderPart(textBefore);
                    const htmlContent = match[1];
                    renderHtmlPart(htmlContent);
                    lastIndex = htmlBlockRegex.lastIndex;
                }

                if (lastIndex < text.length) {
                    const textAfter = text.substring(lastIndex);
                    renderPart(textAfter);
                }
            },

            /** @private 보조창 하단에 들어갈 버튼들을 생성. 컨텍스트를 위해 wrapperElement를 받음 */
            _createPanelButtons: function(wrapperElement) {
                const buttonsContainer = Utils.createElement('div', {
                    className: 'buttons-container',
                    style: {
                        marginTop: '15px'
                    }
                });
                const response = this.currentResponse;

                // ==================== [수정 1: 조건부 버튼 생성] ====================
                // API 응답이 이미지가 아닐 경우(텍스트일 경우)에만 복사/번역 버튼을 생성합니다.
                if (!(typeof response === 'object' && response.imageUrl)) {
                    const copyButton = Utils.createElement('button', {
                        className: 'form-button',
                        textContent: '응답 복사'
                    });
                    copyButton.onclick = () => {
                        const responseToCopy = (typeof response === 'object') ? JSON.stringify(response, null, 2) : response;
                        Utils.copyToClipboard(responseToCopy, '응답 내용이 클립보드에 복사되었습니다.');
                    };

                    const translateButton = Utils.createElement('button', {
                        className: 'form-button',
                        textContent: '번역'
                    });
                    translateButton.onclick = async (e) => {
                        const button = e.currentTarget;
                        if (button.classList.contains('loading')) return;
                        if (!wrapperElement || wrapperElement.querySelector('.translation-wrapper')) return;

                        const textToTranslate = typeof this.currentResponse === 'string' ? this.currentResponse : '';
                        if (!textToTranslate.trim()) {
                            alert('번역할 텍스트가 없습니다.');
                            return;
                        }
                        Utils.toggleLoading(true, button);
                        try {
                            const translateQr = Storage.getQRById('default-translate');
                            if (!translateQr) throw new Error("기본 번역 QR('default-translate')을 찾을 수 없습니다.");
                            const aiPresetId = translateQr.aiPresetId || 'ai-default';
                            const aiPreset = Storage.getAiPresetById(aiPresetId);
                            if (!aiPreset) throw new Error(`기본 번역에 사용할 AI 프리셋(ID: ${aiPresetId})을 찾을 수 없습니다.`);
                            const promptPreset = Storage.getPromptById(translateQr.slots.prefix);
                            if (!promptPreset) throw new Error("기본 번역 프롬프트를 찾을 수 없습니다.");

                            const fullPrompt = `${promptPreset.content}\n\n${textToTranslate}`;
                            const translatedText = await ApiHandler.request(aiPreset, fullPrompt);

                            const buttonsContainerInWrapper = wrapperElement.querySelector('.buttons-container');
                            const childrenToWrap = [...wrapperElement.children].filter(child => child !== buttonsContainerInWrapper);
                            const originalContentContainer = Utils.createElement('div');
                            childrenToWrap.forEach(child => originalContentContainer.appendChild(child));
                            const details = Utils.createElement('details', {
                                open: false
                            }, [
                                Utils.createElement('summary', {
                                    textContent: '원문 보기',
                                    style: {
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        margin: '10px 0'
                                    }
                                }),
                                originalContentContainer
                            ]);
                            const translationDiv = Utils.createElement('div', {
                                className: 'translation-wrapper'
                            });
                            translationDiv.innerHTML = Features.Translation._markdownToHtml(translatedText);
                            wrapperElement.insertBefore(translationDiv, buttonsContainerInWrapper);
                            wrapperElement.insertBefore(details, buttonsContainerInWrapper);
                        } catch (error) {
                            console.error('보조창 번역 실패:', error);
                            alert(`번역 중 오류가 발생했습니다: ${error.message}`);
                        } finally {
                            Utils.toggleLoading(false, button);
                        }
                    };

                    buttonsContainer.append(copyButton, translateButton);
                }

                if (typeof response === 'object' && response.imageUrl) {
                    const downloadButton = Utils.createElement('button', {
                        className: 'form-button',
                        textContent: '다운로드'
                    });
                    downloadButton.onclick = () => {
                        const link = document.createElement('a');
                        link.href = response.imageUrl;
                        link.download = response.imageName || 'generated_image.png';
                        link.click();
                    };

                    const regenerateButton = Utils.createElement('button', {
                        className: 'form-button primary',
                        textContent: '재생성'
                    });
                    regenerateButton.onclick = async (e) => {
                        const promptTextarea = wrapperElement.querySelector('.image-prompt-editor');
                        if (!promptTextarea) return;

                        // 이제 QRExecutor를 사용하지 않고, 이미지 재생성 로직만 직접 처리합니다.
                        // 로딩 UI는 버튼 자신(e.currentTarget)에게 직접 적용합니다.
                        const clickedButton = e.currentTarget;
                        Utils.toggleLoading(true, clickedButton);
                        try {
                            const newResponse = await this.regenerateImage(promptTextarea.value);

                            // 현재 컨텍스트에 따라 올바른 display 함수를 호출하여 UI를 새로고침합니다.
                            const isInline = wrapperElement.id === 'inline-image-panel-content-wrapper';
                            if (isInline) {
                                const panel = wrapperElement.closest('#inline-image-panel');
                                this.displayInline(newResponse, this.currentQrId, panel);
                            } else {
                                this.displayInPanel(newResponse, this.currentQrId, promptTextarea.value);
                            }
                        } catch (error) {
                            alert(`재생성 실패: ${error.message}`);
                            console.error(error);
                        } finally {
                            // 성공하든 실패하든, 반드시 로딩 상태를 해제합니다.
                            Utils.toggleLoading(false, clickedButton);
                        }
                    };

                    buttonsContainer.append(downloadButton, regenerateButton);
                } else {
                    const regenerateButton = Utils.createElement('button', {
                        className: 'form-button primary',
                        textContent: '재생성'
                    });
                    regenerateButton.onclick = async (e) => {
                        if (!this.currentQrId) {
                            alert('재생성할 QR 정보를 찾을 수 없습니다.');
                            return;
                        }
                        await QRExecutor.execute(this.currentQrId, e.currentTarget);
                    };
                    buttonsContainer.appendChild(regenerateButton);
                }

                // ==================== [수정 2 & 3: 범용 닫기 버튼 + 위치 조정] ====================
                const closeButton = Utils.createElement('button', {
                    className: 'form-button',
                    textContent: '닫기',
                    // marginLeft: 'auto' 스타일로 버튼을 오른쪽 끝으로 밀어냅니다.
                    style: {
                        marginLeft: 'auto'
                    }
                });
                closeButton.onclick = () => {
                    // 현재 컨텍스트가 인라인 패널인지 확인
                    const inlinePanel = wrapperElement.closest('#inline-image-panel');
                    if (inlinePanel) {
                        // 인라인 패널이면 해당 패널을 숨김
                        inlinePanel.style.display = 'none';
                    } else {
                        // 그렇지 않으면 보조창(auxiliary panel)을 닫는 함수를 호출
                        UI.toggleImagePanel(false);
                    }
                };
                buttonsContainer.appendChild(closeButton);

                return buttonsContainer;
            },

            /**
             * 현재 프롬프트를 사용하여 이미지 재생성.
             * [REFACTORED] 이제 display 함수를 호출하지 않고, 생성된 응답 객체를 반환합니다.
             * @param {string} newPromptText - 텍스트에리어에서 수정된 프롬프트
             * @returns {Promise<Object>} API 응답 객체
             */
            regenerateImage: async function(newPromptText) {
                const qr = Storage.getQRById(this.currentQrId);
                if (!qr) throw new Error("원본 QR 정보를 찾을 수 없습니다.");

                const aiPreset = Storage.getAiPresetById(qr.aiPresetId);
                if (!aiPreset) throw new Error("AI 프리셋을 찾을 수 없습니다.");
                if (aiPreset.type !== 'novelai') throw new Error("이미지 재생성은 NovelAI 프리셋에서만 지원됩니다.");

                // API 요청 후, 받은 응답을 그대로 반환
                const response = await ApiHandler.request(aiPreset, newPromptText);
                return response;
            }
        }
    };

    // ======================== NEW: 자동 실행 모듈 (컨텍스트 인지 최종 버전) ========================
    const AutoExecutor = {
        // isGenerating 상태: null(비활성), false(활성/대기중), true(생성중)
        isGenerating: null,

        /**
         * 자동 실행이 설정된 모든 QR을 찾아 실행하고, 각 버튼에 로딩 애니메이션을 적용합니다.
         */
        run: function() {
            setTimeout(() => {
                const allQrs = Storage.getQRs();
                const qrsToRun = allQrs.filter(qr => qr.autoExecute);

                if (qrsToRun.length > 0) {
                    console.log(`[QR 자동 실행] ${qrsToRun.length}개의 QR을 실행합니다.`);
                    const remoteButtons = document.querySelectorAll('#remote-control .remote-button');
                    const qrButtonMap = new Map();
                    remoteButtons.forEach(button => {
                        const qrId = button.dataset.qrId;
                        if (qrId) {
                            qrButtonMap.set(qrId, button);
                        }
                    });
                    qrsToRun.forEach(qr => {
                        const buttonElement = qrButtonMap.get(qr.id) || null;
                        QRExecutor.execute(qr.id, buttonElement);
                    });
                }
            }, 500);
        },

        /**
         * NAI 생성 페이지('.conversation-controls-container' 존재)에서만
         * Send 버튼의 상태를 감시하여 자동 실행을 트리거합니다.
         */
        setupObserver: function() {
            const mainObserver = new MutationObserver(() => {
                const isEditorPage = document.querySelector('.conversation-controls-container') !== null;

                // 1. 생성 페이지에 있을 경우
                if (isEditorPage) {
                    // 1-1. 시스템이 비활성(null) 상태이면 활성(false) 상태로 전환
                    if (this.isGenerating === null) {
                        this.isGenerating = false;
                        console.log('[QR 자동 실행] 에디터 UI 감지. 시스템을 활성화합니다.');
                    }

                    const sendButtonExists = document.querySelector('button.send') !== null;

                    // 1-2. 생성 시작/종료 감지 (시스템이 활성화된 상태에서만 작동)
                    if (this.isGenerating === false && !sendButtonExists) {
                        // 대기 중 -> 생성 중
                        this.isGenerating = true;
                        console.log('[QR 자동 실행] Send 버튼 사라짐 감지 (생성 시작).');
                    } else if (this.isGenerating === true && sendButtonExists) {
                        // 생성 중 -> 대기 중 + 자동실행
                        this.isGenerating = false;
                        console.log('[QR 자동 실행] Send 버튼 재등장 감지 (생성 완료).');
                        this.run();
                    }
                }
                // 2. 생성 페이지가 아닐 경우
                else {
                    // 2-1. 시스템이 활성 상태였다면 비활성(null) 상태로 되돌려 오작동 방지
                    if (this.isGenerating !== null) {
                        this.isGenerating = null;
                        console.log('[QR 자동 실행] 에디터 UI 벗어남. 시스템을 비활성화합니다.');
                    }
                }
            });

            mainObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    };
    // ======================== 6. 초기화 함수 ========================

    function initialize() {
        // 스크립트 실행 시 가장 먼저 핵심 설정값의 존재를 확인하고 필요시 생성합니다.
        Storage.initializeCoreSettings();

        // Marked.js 기본 옵션 설정 (GFM 지원, 한 줄 개행을 <br>로 처리)
        if (window.marked) {
            marked.setOptions({
                gfm: true,
                breaks: true,
            });
        }

        // 기본 프리셋 로드/초기화
        Storage.upsertDefaultPresets();

        // [수정] Firebase 로거 초기화. UI 콜백은 UI 생성 시 연결됩니다.
        if (Storage.isLoggingEnabled()) {
            FirebaseLogger.init();
        }

        // UI 초기화
        UI.init();
        AutoExecutor.setupObserver();
    }

    // 스크립트 실행
    initialize();
})();
