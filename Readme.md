# 파일 설명

## **oneTouchQR.user.js**: NAI 공홈에서 커스텀 AI 생성 기능.


Nai_preset.js: 공홈 그림 생성용 프리셋

one_touch.user.js: 소설 번역용(구버전. 업데이트 중단)

---

## 깡갤 노벨 AI 원터치 QR 사용자 설명서

이 문서는 NAI 소설 작성 보조용 유저스크립트의 모든 기능을 상세히 설명합니다.

### 1. 스크립트 소개

'원터치 QR'은 NovelAI(NAI) 웹사이트에서 소설 작성을 보조하는 강력한 도구입니다. NAI 본문 내용을 활용하여 번역, 요약, 장면 분석, 삽화 생성 등 다양한 작업을 버튼 클릭 한 번으로 수행할 수 있습니다.

스크립트의 핵심은 **QR(Quick Response)** 시스템입니다. 사용자는 'QR'이라는 이름의 커스텀 기능을 자유롭게 만들고 편집할 수 있습니다. 각 QR은 다음과 같은 요소들의 조합으로 이루어진 하나의 '레시피'와 같습니다.

-   **프롬프트**: AI에게 내릴 지시사항
-   **본문 추출**: 소설 본문에서 가져올 내용의 분량
-   **AI 프리셋**: 작업을 수행할 AI 모델(Gemini, NovelAI, OpenAI 등)과 세부 설정
-   **후처리**: AI의 응답을 어떻게 처리할지 (출력창 표시, 본문 삽입, 이미지로 보기 등)

이 시스템을 통해 단순 번역을 넘어, 사용자의 상상력에 따라 무한한 가능성을 가진 자신만의 보조 기능을 만들 수 있습니다.

---

### 2. 주요 UI 구성 요소

스크립트를 설치하면 NAI 화면에 몇 가지 새로운 UI가 추가됩니다.

1.  **리모컨 (Remote Control)**
    -   화면 한쪽에 떠 있는 원형 또는 사각형 버튼 모음입니다.
    -   모든 기능 실행의 시작점입니다.
    -   **즐겨찾기 버튼**: 자주 사용하는 QR 버튼이 바로 표시됩니다.
    -   **폴더 버튼**: QR을 '분류'별로 정리하여 폴더 형태로 보여줍니다. 폴더를 클릭하면 해당 분류의 QR 버튼들이 펼쳐집니다.
    -   **설정 버튼 (`⚙️`)**: 스크립트의 모든 설정을 변경할 수 있는 설정창을 엽니다.
    -   드래그하여 위치를 옮길 수 있습니다.

2.  **출력창 (Output Panel)**
    -   번역 결과처럼 간단한 텍스트 응답을 빠르게 확인하는 용도의 창입니다.
    -   화면 오른쪽에 나타나며, 창의 아무 곳이나 클릭하면 사라집니다.
    -   하단에는 한영 번역을 위한 전용 입력창이 있습니다.

3.  **보조창 (Auxiliary Panel / Image Panel)**
    -   삽화(이미지)나 요약문처럼 길거나 복잡한 AI 응답을 확인하는 용도의 창입니다.
    -   출력창과 달리 클릭해도 사라지지 않으며, 우측 상단의 `X` 버튼으로 직접 닫아야 합니다.
    -   드래그하여 위치를 옮길 수 있습니다.

4.  **설정창 (Settings Panel)**
    -   스크립트의 모든 기능을 관리하는 제어 센터입니다.
    -   QR, AI 프리셋, 프롬프트 등을 생성, 수정, 삭제할 수 있습니다.

---

### 3. 핵심 기능 사용법

#### 3.1. 기본 번역 (`default-translate`)

1.  NAI 편집기에서 번역하고 싶은 부분까지 소설을 작성합니다.
2.  리모컨에서 **번역 아이콘 (`🌐`)** 버튼을 클릭합니다.
3.  스크립트가 자동으로 본문 마지막 부분의 텍스트를 추출하여 AI에게 번역을 요청합니다.
4.  잠시 후, 화면 오른쪽에 **출력창**이 나타나며 번역된 결과가 표시됩니다.

#### 3.2. 삽화 생성 (`default-image-prompt`)

이 기능은 두 개의 QR이 연계(다중 QR)되어 작동하는 복합 기능입니다.

1.  NAI 편집기에서 삽화로 만들고 싶은 장면까지 소설을 작성합니다.
2.  리모컨에서 **이미지 아이콘 (`🖼️`)** 버튼을 클릭합니다.
3.  **1단계 (프롬프트 생성)**: 스크립트가 본문 내용을 AI(기본: Gemini)에게 보내 장면을 묘사하는 NovelAI용 이미지 프롬프트로 변환해달라고 요청합니다.
4.  **2단계 (이미지 생성)**: 1단계에서 받은 이미지 프롬프트를 즉시 NovelAI 이미지 생성 AI에게 전송하여 이미지를 생성합니다.
5.  잠시 후, 화면에 **보조창**이 나타나며 생성된 삽화가 표시됩니다.
6.  보조창 하단에서는 프롬프트를 직접 수정하여 이미지를 **재생성**하거나 **다운로드**할 수 있습니다.

#### 3.3. 한영 입력 번역 (`default-ko-en-translate`)

출력창 하단의 입력창을 이용해, 즉석에서 한국어 문장을 소설 문맥에 맞게 영어로 번역하여 본문에 바로 삽입할 수 있습니다.

1.  **출력창**을 엽니다. (예: 번역 기능을 한 번 실행)
2.  출력창 하단의 입력창에 번역할 한국어 문장을 입력합니다.
3.  **Enter** 키를 누릅니다.
4.  스크립트가 현재 소설 내용과 입력한 한국어 문장을 함께 AI에게 보내, 문맥에 맞는 영어 번역을 요청합니다.
5.  번역된 영어 문장이 NAI 편집기의 커서 위치에 자동으로 입력됩니다.

#### 3.4. 실행 기록 (로깅)

QR 실행 기록(사용한 QR, 전송한 프롬프트, 받은 응답)을 사용자의 개인 Google Firebase 계정에 안전하게 저장하고 관리하는 기능입니다. **이 데이터는 개발자에게 전송되지 않으며, 사용자 본인의 클라우드에만 저장됩니다.**

-   **최초 설정**:
    1.  `설정창` > `로깅` 탭으로 이동합니다.
    2.  'Firebase에 QR 실행 기록 저장 활성화'를 체크합니다.
    3.  'Firebase 설정 관리' 버튼을 클릭하여 안내에 따라 Firebase 프로젝트를 설정하고, 발급받은 **구성 스니펫**을 붙여넣습니다.
    4.  '데이터 동기화 키'를 **새로 생성**하거나, 다른 기기에서 사용하던 키를 붙여넣습니다. 이 키가 데이터의 고유한 주소가 됩니다.
-   **사용법**:
    -   **기록 조회**: `로깅` 탭의 '기록 조회' 버튼으로 기록 목록을 보고, 프롬프트나 응답을 다시 확인하거나 이미지를 재생성할 수 있습니다.
    -   **데이터 관리**: 기록을 CSV 파일로 다운로드하거나, 전체 또는 개별 기록을 삭제할 수 있습니다.
    -   **동기화**: 여러 PC에서 동일한 'Firebase 구성 스니펫'과 '데이터 동기화 키'를 사용하면 모든 기기에서 실행 기록이 동기화됩니다.

---

### 4. 설정창 상세 가이드

설정창에서는 스크립트의 모든 것을 커스터마이징할 수 있습니다.

#### 4.1. 설정 탭

-   **표시 설정**:
    -   `대사 강조`: AI 응답 속의 큰따옴표(" ") 안 텍스트에 이탤릭, 볼드, 하이라이트 효과를 적용할지 설정합니다.
    -   `콘텐츠 렌더링`: AI 응답을 보조창/출력창에 표시할 때 마크다운(표, 목록 등)이나 HTML을 렌더링할지 설정합니다.
    -   `보조창 크기`: 삽화나 긴 글이 표시되는 보조창의 가로/세로 기본 크기를 조절합니다.
-   **데이터 관리**:
    -   `내보내기 (백업)`: 현재 스크립트의 모든 설정(QR, AI 프리셋 등)을 하나의 JSON 파일로 백업합니다.
    -   `가져오기 (복원)`: 백업해둔 JSON 파일을 이용해 설정을 복원합니다.
    -   `설정 초기화`: 스크립트의 모든 설정을 삭제하고 초기 상태로 되돌립니다. (주의: 복구 불가)
    -   `기본 프리셋 복구`: 사용자가 만든 QR은 유지한 채, '기본 번역', '기본 삽화' 등 내장된 기능만 초기 설정으로 되돌립니다.

#### 4.2. QR 탭

스크립트의 핵심인 QR 기능을 관리합니다. `+ 추가` 버튼으로 새 QR을 만들 수 있습니다.

-   **QR 편집 항목**:
    -   `이름`: 리모컨과 목록에 표시될 QR의 이름입니다.
    -   `슬롯 (서문, 본문 전, 탈옥 등)`: 프롬프트를 구성하는 각 부분입니다. 각 슬롯을 클릭하면 **프롬프트 프리셋 선택, 새 프롬프트 생성, 사용자 입력창 설정, 로어북 설정**이 가능한 복합 모달이 나타납니다.
    -   `본문 추출`: NAI 소설 본문 끝에서부터 몇 글자를 가져와 프롬프트에 포함할지 결정합니다. `0`으로 설정하면 본문을 포함하지 않습니다.
    -   `AI 프리셋`: 이 QR이 사용할 AI 모델을 선택합니다.
    -   `순차 실행 (후처리)`: QR 실행 후 AI의 응답을 어떻게 처리할지 결정합니다.
        -   `출력창`: 번역 결과처럼 작은 창에 표시합니다.
        -   `본문입력`: NAI 편집기 커서 위치에 바로 입력합니다.
        -   `보조창`: 삽화처럼 큰 창에 표시합니다.
        -   `연속실행`: 현재 QR의 응답을 가지고 **다음 QR을 즉시 실행**합니다. (예: 삽화 기능)
    -   `동시 실행`: 이 QR을 실행할 때, 여기에 등록된 다른 QR들도 **동시에 함께 실행**합니다.
    -   `분류`: QR을 그룹화할 폴더 이름입니다. 리모컨에 폴더 버튼으로 표시됩니다.
    -   `리모컨 설정`: `리모컨에 표시`, `즐겨찾기에 표시`, `아이콘`을 설정할 수 있습니다.

#### 4.3. AI 탭

Gemini, NovelAI, OpenAI(ChatGPT, 오픈라우터 등) 등 다양한 AI 서비스를 등록하고 관리합니다.

-   **AI 프리셋 편집 항목**:
    -   `이름`: 프리셋 목록에 표시될 이름입니다.
    -   `요청 방식`: `Gemini`, `OpenAI`, `NovelAI` 등 API 종류를 선택합니다. 선택에 따라 아래 설정 항목이 변경됩니다.
    -   `API 키`: 각 서비스에서 발급받은 API 키를 입력합니다.
    -   `엔드포인트`: API 요청을 보낼 서버 주소입니다. (예: 오픈라우터 주소)
    -   `모델명`: 사용할 AI 모델의 정확한 이름을 입력합니다. (예: `gemini-2.5-pro`, `nai-diffusion-4-5-full`)
    -   `온도, Top-P, Top-K`: 텍스트 생성 AI의 다양성 등을 조절하는 파라미터입니다.
    -   `UC 프롬프트, 이미지 크기, 스케일 등`: `NovelAI` 방식 선택 시 나타나는 이미지 생성 전용 설정입니다.

#### 4.4. 프롬프트 탭

자주 사용하는 지시사항을 '프롬프트 프리셋'으로 저장하여 QR 슬롯에서 쉽게 불러올 수 있습니다.

-   **프롬프트 프리셋 편집 항목**:
    -   `이름`: 프리셋 목록에 표시될 이름입니다.
    -   `내용`: 실제 프롬프트 내용입니다.
    -   `분류`: 프롬프트들을 그룹화하여 관리할 수 있습니다.

#### 4.5. 로어북 탭

소설 본문에 특정 키워드가 나타날 때, 설정해둔 정보를 프롬프트에 자동으로 추가하는 기능입니다.

-   **NAI 공식 로어북 파일(.lorebook, .json)을 가져올 수 있습니다.**
-   폴더/기사 구조로 체계적인 관리가 가능하며, 키워드, 우선순위 등을 설정할 수 있습니다.

#### 4.6. 리모컨 탭

리모컨의 모양과 버튼 배열을 상세하게 설정합니다.

-   **리모컨 외형 설정**: 버튼의 `크기`, `간격`, `모양(원형/사각형)`, `배열(가로/세로)` 등을 조절할 수 있습니다.
-   **즐겨찾기 버튼 관리**: 즐겨찾기로 지정된 QR 버튼들의 순서를 바꾸거나 리모컨에서 숨길 수 있습니다.
-   **폴더(분류) 버튼 관리**: 각 폴더(분류)를 리모컨에 표시할지 여부, 순서, 아이콘, 이름 변경 등을 설정할 수 있습니다.

#### 4.7. 로깅 탭

Firebase를 이용한 실행 기록 저장 및 관리 기능을 설정합니다.

-   **Firebase에 QR 실행 기록 저장 활성화**: 기능 전체를 켜고 끕니다.
-   **데이터 동기화 키**: 데이터를 식별하는 고유 키입니다. '새 키 생성'으로 만들거나 다른 기기와 동기화하려면 같은 키를 입력해야 합니다.
-   **기록 조회**: Firebase에 저장된 모든 실행 기록을 보고, 필터링하며, CSV로 다운로드할 수 있는 창을 엽니다.
-   **Firebase 설정 관리**: Firebase 연동에 필요한 구성 코드(스니펫)를 입력하고, 상세한 설정 가이드를 확인할 수 있습니다.
