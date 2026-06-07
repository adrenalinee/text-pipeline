# Text Pipeline 에이전트 안내

## 프로젝트 의도

Text Pipeline은 텍스트를 눈에 보이는 반복 가능한 단계로 변환하는 브라우저 기반 개발자 워크벤치다. 일반적인 랜딩 페이지나 문서 사이트가 아니라, 로그, JSON 페이로드, 인코딩된 문자열, 서비스 운영 중 복사한 조각들을 빠르게 다루는 실무 도구처럼 느껴져야 한다.

핵심 모델은 다음과 같다.

```text
입력 텍스트 -> 변환 단계 -> 결과 -> 다음 변환 단계
```

각 변환은 플로우 안에 하나의 단계로 남아야 한다. 이전 단계를 선택한 뒤 새 변환을 적용하면, 기존 입력을 덮어쓰는 것이 아니라 자연스럽게 분기형 히스토리가 만들어져야 한다.

## 현재 개발환경

이 저장소의 현재 설정은 초기 안내와 일부 다르다. 작업 전에 실제 파일을 기준으로 확인한다.

- React `19.2.0`
- TypeScript `6.0.2`
- Vite `8.0.0`
- Mantine UI `9.3.0`
- TanStack React Start / React Router 기반 파일 라우팅
- Tailwind CSS `4.1.18` 및 `@tailwindcss/vite`
- `lucide-react` 아이콘 사용 가능
- 테스트는 Vitest 기반
- 린트/포맷은 ESLint와 Prettier 기반

현재 `vite.config.ts`는 다음 플러그인을 사용한다.

- `@tanstack/devtools-vite`
- `@tailwindcss/vite`
- `@tanstack/react-start/plugin/vite`
- `@vitejs/plugin-react`

현재 `vite.config.ts`에는 GitHub Pages 배포용 `base: './'` 설정이 없다. 정적 호스팅이나 GitHub Pages 배포를 실제로 목표로 할 때는 TanStack Start 빌드 방식과 함께 별도 확인이 필요하다.

## 패키지 매니저와 명령

저장소에는 `yarn.lock`이 있으며 README도 Yarn 명령을 안내한다. 잠금 파일 기준으로는 Yarn 사용이 자연스럽다. 다만 `package.json` 스크립트는 npm으로도 실행할 수 있다.

의존성 설치:

```bash
yarn install
```

개발 서버:

```bash
yarn run dev
```

현재 `dev` 스크립트는 로컬 Vite CLI를 직접 호출해 3000번 포트로 실행한다.

```bash
node ./node_modules/vite/bin/vite.js dev --port 3000
```

브라우저 스모크 테스트처럼 localhost 바인딩이 필요하면 다음 스크립트를 사용한다.

```bash
yarn run dev:local
```

자동화된 브라우저 스모크 테스트처럼 명령이 종료된 뒤 서버가 계속 살아 있어야 하면 다음 서버 관리 스크립트를 사용한다. 이 스크립트는 `.tmp/dev-server.json`에 PID를 기록하고, `.tmp/dev-server.*.log`에 로그를 남긴다.

```bash
yarn run dev:server
yarn run dev:status
yarn run dev:logs
yarn run dev:stop
```

3000번 포트가 이미 사용 중이면 Vite를 직접 실행해 다른 포트를 지정한다.

```bash
node ./node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 3001
```

프로덕션 빌드:

```bash
yarn run build
```

프리뷰:

```bash
yarn run preview
```

테스트:

```bash
yarn run test
```

린트:

```bash
yarn run lint
```

포맷:

```bash
yarn run format
```

포맷 확인:

```bash
yarn run check
```

npm을 사용해야 하는 상황에서는 같은 스크립트를 `npm run build`, `npm run test`처럼 실행할 수 있다. 단, 의존성 설치에 `npm install`을 사용하면 `package-lock.json`이 새로 생길 수 있으므로 lockfile 변경 의도가 분명할 때만 사용한다.

## 현재 구현 상태

현재 앱은 TanStack Start 기본 구조에 가깝다.

- 루트 문서는 `src/routes/__root.tsx`에 있다.
- 홈 라우트는 `src/routes/index.tsx`에 있다.
- 홈 라우트는 현재 `MantineProvider`만 감싸고 있으며 실제 워크벤치 UI는 아직 구현 전이다.
- 스타일은 `src/styles.css`에서 Tailwind와 Mantine 레이어를 함께 불러온다.
- 라우트 트리는 `src/routeTree.gen.ts`로 생성된다.

기능을 추가할 때는 현재 구현 상태를 실제 기준으로 삼고, 문서에 적힌 목표 기능이 이미 존재한다고 가정하지 않는다.

## 목표 MVP 기능

제품 방향은 다음 기능들을 중심으로 한다.

- 입력 텍스트 편집기
- 현재 결과 편집기
- 변환 단계들을 보여주는 플로우 패널
- 이전 단계 선택
- 선택한 단계에서 새 변환 적용
- JSON pretty
- JSON minify
- JSON validation
- JSONPath query
- JSON to YAML
- URL encode/decode
- Base64 encode/decode
- 현재 결과 복사
- 라이트/다크 색상 모드 전환

이 목록은 목표 범위이며, 구현 여부는 코드에서 확인한다.

## 제품 원칙

- 첫 화면은 실제 워크벤치여야 한다.
- 마케팅 페이지형 레이아웃이나 설명용 히어로 섹션을 만들지 않는다.
- UI는 촘촘하고, 작업 중심이며, 빠르게 훑어볼 수 있어야 한다.
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
- 필요할 경우 나중에 리사이즈 가능한 패널 또는 분할 패널
- 이후 확장 가능한 JSON 트리, 테이블, diff, 구조화된 뷰

피해야 할 것:

- 랜딩 페이지를 첫 화면으로 만드는 것
- 큰 장식용 히어로 섹션
- 앱 안의 기능 설명 블록
- 카드가 과도한 마케팅형 레이아웃
- 핵심 변환에 서버 실행을 전제로 두는 설계

## 구현 지침

- 변환 로직은 가능한 한 순수 함수로 유지한다.
- 변환 함수는 문자열을 받아 문자열을 반환하는 형태를 기본으로 한다.
- 구조화된 포맷 파싱은 해당 변환 내부에서만 수행한다.
- 변환 실패 시 명확한 오류 알림을 보여주고, 의도적인 UX 이유가 없다면 실패한 단계를 히스토리에 추가하지 않는다.
- 분기 히스토리를 고려해 각 단계는 입력, 출력, 변환 종류, 부모 단계 식별자를 추적할 수 있어야 한다.
- 원본 입력 변경과 변환 단계 추가를 혼동하지 않는다.
- 브라우저 호환성이 검증된 관리 상태가 좋은 패키지를 우선 사용한다.
- UI 컴포넌트는 Mantine 패턴을 우선 따르고, 아이콘은 가능하면 `lucide-react`를 사용한다.
- Tailwind와 Mantine을 함께 쓰고 있으므로 전역 스타일, 레이어 순서, 컴포넌트 스타일 충돌을 확인한다.
- 파일 경로 별칭은 `#/*`와 `@/*`가 `src/*`를 가리킨다.
- TypeScript strict 설정과 unused 검사에 맞춰 코드를 작성한다.

## 라우팅과 앱 구조

- 라우트는 `src/routes` 아래 파일 기반 라우팅을 따른다.
- 새 라우트를 추가한 뒤 필요하면 `yarn run generate-routes`를 실행해 라우트 트리를 갱신한다.
- 현재 루트 문서의 HTML 언어 값은 `en`이다. 제품 UI를 한국어로 만들지 영어로 만들지는 기능 작업 시 별도로 판단한다.
- `src/routes/__root.tsx`의 head title은 아직 TanStack 기본값이다. 실제 제품 UI를 구현할 때 제품명에 맞게 수정한다.

## 다음 기능 후보

- 로그에서 JSON 추출
- 현재 단계와 부모/원본/다른 단계 간 diff
- JSON 트리 뷰
- 트리 노드에서 JSONPath 클릭 복사
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

- `yarn run build` 또는 현재 작업에서 사용 중인 패키지 매니저의 build 스크립트 실행
- 필요한 경우 `yarn run test`
- 로컬 앱을 브라우저에서 열기
- 최소 하나의 변환을 스모크 테스트하기
- UI 변경 시 데스크톱과 좁은 화면에서 텍스트 겹침이 없는지 확인하기
- 생성 로그나 임시 파일을 저장소에 남기지 않기

문서만 수정한 경우에는 빌드가 필수는 아니지만, 문서에 명령이나 환경 정보를 추가했다면 실제 `package.json`과 설정 파일 기준으로 맞는지 확인한다.
