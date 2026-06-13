# Text Pipeline 에이전트 안내

## 프로젝트 의도

Text Pipeline은 텍스트를 눈에 보이는 반복 가능한 단계로 변환하는 브라우저 기반 개발자 워크벤치다. 랜딩 페이지나 문서 사이트가 아니라, 로그, JSON 페이로드, 인코딩된 문자열, 서비스 운영 중 복사한 조각을 빠르게 다루는 실무 도구처럼 느껴져야 한다.

핵심 모델은 다음과 같다.

```text
입력 텍스트 -> 변환 단계 -> 결과 -> 다음 변환 단계
```

각 변환은 플로우 안에 하나의 단계로 남아야 한다. 이전 단계를 선택한 뒤 새 변환을 적용하면 기존 입력을 덮어쓰지 않고 분기형 히스토리를 만든다.

## 현재 개발환경

작업 전 실제 파일을 기준으로 확인한다. 저장소의 주요 설정은 다음과 같다.

- React `19.2.0`
- TypeScript `6.0.2`
- Vite `8.0.0`
- Mantine UI `9.3.0`
- TanStack React Start / React Router 기반 파일 라우팅
- Tailwind CSS `4.1.18` 및 `@tailwindcss/vite`
- CodeMirror 기반 source editor
- `lucide-react` 아이콘 사용
- 테스트는 Vitest 기반
- 린트/포맷은 ESLint와 Prettier 기반

`vite.config.ts`는 다음 플러그인을 사용한다.

- `@tanstack/devtools-vite`
- `@tailwindcss/vite`
- `@tanstack/react-start/plugin/vite`
- `@vitejs/plugin-react`

`vite.config.ts`에는 GitHub Pages 배포용 `base: './'` 설정이 없다. 정적 호스팅이나 GitHub Pages 배포가 목표라면 TanStack Start 빌드 방식과 함께 별도 확인한다.

## 패키지 매니저와 명령

저장소에는 `yarn.lock`이 있으며 README도 Yarn 명령을 안내한다. 의존성 설치와 lockfile 변경은 Yarn 기준으로 처리한다.

```bash
yarn install
yarn run dev
yarn run dev:local
yarn run dev:server
yarn run dev:status
yarn run dev:logs
yarn run dev:stop
yarn run build
yarn run preview
yarn run test
yarn run lint
yarn run format
yarn run check
```

`dev` 스크립트는 로컬 Vite CLI를 직접 호출해 3000번 포트로 실행한다. 브라우저 스모크 테스트처럼 localhost 바인딩이 필요하면 `yarn run dev:local` 또는 서버 관리 스크립트인 `yarn run dev:server`를 사용한다.

3000번 포트가 이미 사용 중이면 Vite를 직접 실행해 다른 포트를 지정한다.

```bash
node ./node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 3001
```

npm 스크립트도 동작할 수 있지만, `npm install`은 `package-lock.json`을 만들 수 있으므로 lockfile 변경 의도가 분명할 때만 사용한다.

## 현재 구현 상태

현재 앱은 실제 워크벤치 UI가 구현된 상태다.

- 루트 문서는 `src/routes/__root.tsx`에 있다.
- 홈 워크벤치는 `src/routes/index.tsx`에 있다.
- 포맷 capability는 `src/features/workbench/formats.tsx`에 모인다.
- 변환 정의와 실행기는 `src/features/workbench/transforms` 아래에 있다.
- 검증과 editor lint는 `src/features/workbench/utils` 아래에 있다.
- source/view mode용 시각화 컴포넌트는 `src/features/workbench/views` 아래에 있다.
- 샘플 텍스트는 `src/features/workbench/samples.ts`에서 관리한다.
- 스타일은 `src/styles.css`에서 Tailwind와 Mantine 레이어를 함께 불러온다.
- 라우트 트리는 `src/routeTree.gen.ts`로 생성된다.

기능을 추가할 때는 문서에 적힌 목표 기능이 이미 존재한다고 가정하지 말고, 실제 코드와 테스트를 먼저 확인한다.

## 제품 원칙

- 첫 화면은 실제 워크벤치여야 한다.
- 마케팅 페이지형 레이아웃이나 설명용 히어로 섹션을 만들지 않는다.
- UI는 촘촘하고 작업 중심이며 빠르게 훑어볼 수 있어야 한다.
- 사용자가 직접 원본 입력을 수정하지 않는 한 원본 입력을 보존한다.
- 변환은 명시적이어야 하며 히스토리를 통해 되돌아갈 수 있어야 한다.
- 핵심 변환은 로컬 브라우저에서 실행한다.
- 사용자 텍스트를 기본 동작으로 서버에 보내지 않는다.
- 로그, JWT, 토큰, 페이로드는 민감한 데이터일 수 있다고 가정한다.
- 새 기능은 독립 유틸리티가 아니라 파이프라인 모델 안에 들어가야 한다.
- TanStack Start의 서버 함수나 API 라우트를 사용하더라도 핵심 텍스트 변환 데이터가 서버로 이동하지 않도록 설계한다.

## UI 방향

워크벤치 레이아웃을 기본으로 한다.

```text
플로우 / 히스토리 | 액션 + 입력/결과 편집기
```

선호하는 UI 개념:

- 커밋 히스토리처럼 읽히는 변환 단계
- 이전 단계에서 새 변환을 만들 때의 분기형 흐름
- 아이콘이 포함된 명령/액션 버튼
- 모노스페이스 텍스트 편집기
- source/view mode 전환
- 이후 확장 가능한 트리, 테이블, diff, 구조화된 뷰

피해야 할 것:

- 랜딩 페이지를 첫 화면으로 만드는 것
- 큰 장식용 히어로 섹션
- 앱 안의 기능 설명 블록
- 카드가 과도한 마케팅형 레이아웃
- 핵심 변환에 서버 실행을 전제로 두는 설계

## 구현 지침

- 변환 로직은 가능한 한 순수 함수로 유지한다.
- 변환 함수는 문자열을 받아 문자열을 반환하는 형태를 기본으로 한다. 비동기 라이브러리가 필요한 경우 `TransformRunner`의 Promise 반환을 사용한다.
- 구조화된 포맷 파싱은 해당 변환 또는 검증 내부에서만 수행한다.
- 변환 실패 시 명확한 오류 알림을 보여주고, 실패한 단계를 히스토리에 추가하지 않는다.
- 분기 히스토리를 고려해 각 단계는 입력, 출력, 변환 종류, 부모 단계 식별자를 추적할 수 있어야 한다.
- 원본 입력 변경과 변환 단계 추가를 혼동하지 않는다.
- 브라우저 호환성이 검증된 관리 상태가 좋은 패키지를 우선 사용한다.
- UI 컴포넌트는 Mantine 패턴을 우선 따르고, 아이콘은 가능하면 `lucide-react`를 사용한다.
- Tailwind와 Mantine을 함께 쓰고 있으므로 전역 스타일, 레이어 순서, 컴포넌트 스타일 충돌을 확인한다.
- 파일 경로 별칭은 `#/*`와 `@/*`가 `src/*`를 가리킨다.
- TypeScript strict 설정과 unused 검사에 맞춰 코드를 작성한다.

## 포맷 추가 체크리스트

새 포맷은 기능 하나가 아니라 capability 세트로 추가한다. 포맷을 추가할 때 다음 항목을 함께 점검한다.

- `SyntaxMode`, `FormatViewId`, `TransformId` 등 타입 확장
- `FORMAT_DEFINITIONS` 항목 추가: label, description, CodeMirror extension, validation, samples, transforms, viewIds, render policy/security
- CodeMirror syntax highlight와 가능한 경우 lint source
- `validateFormat` 지원 여부와 parser error 위치 매핑
- 샘플 텍스트와 sample menu 타입 확장
- 사용 가능한 transform action 목록과 section title
- 필요한 transform runner와 실패 메시지
- 가능한 경우 view mode 컴포넌트
- 라우트/toolbar/icon 표시가 새 포맷을 자연스럽게 보여주는지 확인
- unit test: registry, transform filtering, runner, validation/lint, view security 또는 unavailable view

## HTML 보안 결정

HTML은 민감한 포맷이다. 사용자 입력 HTML을 parent DOM에 직접 삽입하지 않는다.

- `dangerouslySetInnerHTML`을 사용하지 않는다.
- HTML preview는 `sandbox=""` iframe에서만 제공한다.
- iframe에는 `allow-scripts`, `allow-same-origin`, `allow-forms`, `allow-popups`, top-navigation 관련 권한을 주지 않는다.
- iframe `srcDoc` 앞에는 restrictive CSP meta를 넣는다.
- 기본 CSP는 외부 resource/network load를 차단한다: `default-src 'none'`, `script-src 'none'`, `connect-src 'none'`, `frame-src 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`.
- 인라인 스타일은 정적 미리보기 품질을 위해 허용할 수 있다. 외부 이미지/CSS/font/script 로딩은 기본 차단한다.
- HTML validation은 브라우저 복구형 파서의 parse error 확인으로 정의한다. 중첩 불일치처럼 파서가 자동 복구하는 구조 문제를 invalid로 보장하지 않는다.
- script 실행이 필요한 HTML preview는 이번 기본 모델 밖이다. 별도 origin, CSP, storage/cookie 격리, 네트워크 정책을 다시 설계해야 한다.

## 라우팅과 앱 구조

- 라우트는 `src/routes` 아래 파일 기반 라우팅을 따른다.
- 새 라우트를 추가한 뒤 필요하면 `yarn run generate-routes`를 실행해 라우트 트리를 갱신한다.
- 현재 루트 문서의 HTML 언어 값은 `en`이다. 제품 UI 언어는 기능 작업 시 실제 사용 흐름에 맞춰 판단한다.
- 제품 title/head 변경은 `src/routes/__root.tsx`에서 확인한다.

## 다음 기능 후보

- 로그에서 JSON 추출
- 현재 단계와 부모/원본/다른 단계 간 diff
- JSONPath query와 트리 노드 JSONPath 복사
- CSV 변환
- JSON에서 TypeScript 타입 생성
- JSON Schema 생성
- JWT decode
- 해시 생성
- 정규식 추출
- 타임스탬프 변환
- 최근 플로우 로컬 저장
- 파이프라인 정의 import/export/share

## 검증 기대사항

의미 있는 코드 변경을 넘기기 전에는 다음을 확인한다.

- `yarn run build`
- 필요한 경우 `yarn run test`
- 로컬 앱을 브라우저에서 열기
- 최소 하나의 변환을 스모크 테스트하기
- UI 변경 시 데스크톱과 좁은 화면에서 텍스트 겹침이 없는지 확인하기
- 생성 로그나 임시 파일을 저장소에 남기지 않기

문서만 수정한 경우 빌드가 필수는 아니지만, 문서에 명령이나 환경 정보를 추가했다면 실제 `package.json`과 설정 파일 기준으로 맞는지 확인한다.
