# Bookmark — 개발 계획 (Phase 0 점검 + 보완 기준)

> 이 문서는 환경 점검 결과와 이후 모든 Phase의 작업 기준을 정리한 기준 문서입니다.
> Phase 1에서 프로젝트가 생성되면 `docs/`로 이동하거나 정리할 수 있습니다.

---

## 1) 현재 프로젝트 폴더 상태

- 경로: `c:\Users\sec\Desktop\VIBEC\bookmark`
- **폴더는 완전히 비어 있음** (숨김 파일 포함 0개)
- Git 저장소로 초기화되어 있지 않음 (`.git` 없음)
- → 새 프로젝트를 이 폴더에 **바로** 생성하기 좋은 상태 (중첩 폴더 만들지 않음)

## 2) Node.js / npm

| 항목 | 상태 | 비고 |
|---|---|---|
| Node.js | OK `v22.22.0` | Tauri 2 권장(18+) 충족 |
| npm | OK `11.12.1` | 충분 |
| pnpm / yarn | 없음 | npm으로 진행 (추가 설치 불필요) |

## 3) Rust / Cargo

| 항목 | 상태 |
|---|---|
| rustc | **미설치** |
| cargo | **미설치** |
| rustup | **미설치** (`~/.cargo` 없음) |

→ **Rust 전체가 없으므로 설치 필요.**

## 4) Windows 빌드 도구 (검증 방식 주의)

| 항목 | PATH 검색 결과 | 비고 |
|---|---|---|
| MSVC 링커 (`link.exe`) | 일반 PowerShell에서 미검색 | **이것만으로 미설치라고 단정하지 않음** (아래 참고) |
| Visual Studio / Build Tools | `vswhere` 미검색 | 설치 여부는 vswhere/설치 폴더로 별도 확인 |
| WebView2 런타임 | OK `148.0.3967.96` | 이미 설치됨 (재설치 불필요) |
| Git | OK `2.54.0` | GitHub 연동 준비됨 |

> **중요(보완 2):** `link.exe`는 일반 PowerShell PATH에는 보통 잡히지 않고,
> **Visual Studio Developer PowerShell / Developer Command Prompt**에서만 PATH에 들어옵니다.
> 따라서 일반 PowerShell에서 안 보인다는 이유만으로 "MSVC 미설치"로 단정하지 않습니다.
> 현재 PC는 `vswhere`도 없어 미설치 가능성이 높지만, **최종 판단은 실제 Tauri 빌드 성공 여부로** 합니다.

## 요약: 점검 결론

Windows 개발 3대 요소 중 **WebView2만 충족**, 나머지 확인/설치 필요.

1. **Microsoft C++ Build Tools** (MSVC 컴파일러 + Windows SDK) — 설치/검증 필요
2. **Rust (rustup, MSVC 툴체인)** — 설치 필요
3. WebView2 — 완료

---

# 설치 안내 (승인 후 진행 — 자동 실행하지 않음)

### 권장 설치 순서 (보완 1)

```text
권장 설치 순서:
Microsoft C++ Build Tools → Rust → 터미널 다시 열기

다른 순서로 설치했더라도 필요한 도구를 모두 설치한 뒤
터미널을 다시 열고 실제 빌드로 검증하면 된다.
(Rust를 먼저 설치한 경우에도, 이후 C++ Build Tools 설치 후
 터미널을 새로 열면 정상 진행 가능)
```

### (1) Microsoft C++ Build Tools

- 다운로드: Build Tools for Visual Studio 2022
  (https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- 설치 시 **"C++를 사용한 데스크톱 개발(Desktop development with C++)"** 워크로드 체크
  (MSVC 컴파일러 + Windows SDK 포함)
- 또는 winget:

```powershell
winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--quiet --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

### (2) Rust (MSVC 툴체인)

```powershell
winget install --id Rustlang.Rustup
```

설치 후 **터미널(또는 PC) 재시작**, MSVC 기본 툴체인 확인:

```powershell
rustup default stable-msvc
rustc --version
cargo --version
```

### 설치 후 MSVC 검증 방식 (보완 2)

`link.exe` 단순 PATH 검색에 의존하지 않고 아래를 함께 확인:

1. Visual Studio Build Tools 설치 정보 (`vswhere` 또는 설치 폴더)
2. `Desktop development with C++` 워크로드 설치 여부
3. Windows SDK 설치 여부
4. 필요 시 Developer PowerShell에서 MSVC 도구 확인
5. **가장 중요: Tauri 기본 앱의 실제 `tauri dev` 실행 / `tauri build` 성공 여부**

> 단순 PATH 검색 결과보다 **실제 Tauri 빌드 결과를 우선**해서 설치 완료 여부를 판단.

---

# 새 프로젝트 생성 (Phase 1, 보완 3)

먼저 현재 폴더에 직접 생성 시도:

```powershell
npm create tauri-app@latest . -- --template react-ts --manager npm
```

- **옵션 해석 오류가 나면 억지로 진행하지 않음.** 오류 메시지를 먼저 설명한 뒤,
  아래 대화형 방식으로 전환:

```powershell
npm create tauri-app@latest
```

대화형 선택 방향:

```text
프로젝트 경로: 현재 bookmark 폴더 (.)
패키지 관리자: npm
프런트엔드: React
언어: TypeScript
빌드 도구: Vite
```

- 현재 폴더가 비어 있으므로 **기존 `bookmark` 폴더 안에 바로 생성**.
  `bookmark/bookmark` 중첩 폴더 금지.

이후:

```powershell
npm install
npm run tauri dev      # 개발 실행
npm run tauri build    # 설치 파일(.exe/.msi) 빌드
```

## 요구 플러그인 (모두 Tauri 2 공식 플러그인으로 존재 확인됨)

| 요구 기능 | 공식 플러그인 | 추가 시점 |
|---|---|---|
| SQLite 저장 | `sql` (sqlx 기반, 마이그레이션 지원) | Phase 3 |
| 자동 실행 | `autostart` | Phase 5 |
| 전역 단축키 | `global-shortcut` | Phase 5 |
| 파일 대화상자 | `dialog` | Phase 6 |
| 파일 시스템 | `fs` | Phase 6 |
| 창 위치 헬퍼 | `positioner` | Phase 4 |
| 창 상태 저장 | `window-state` | Phase 4 |
| 단일 인스턴스 | `single-instance` (필수) | Phase 5 |
| 설정 K-V (선택) | `store` | 필요 시 |

> 트레이/다중창은 별도 플러그인 없이 Tauri 2 코어(`tray-icon`, `WebviewWindow`)로 구현.
> 플러그인 추가 시 `npm run tauri add <플러그인>` + capabilities 권한 설정 동반.

---

# Tailwind CSS 적용 방식 (Phase 1, 보완 4)

오래된 블로그/구버전 초기화 명령을 그대로 쓰지 않음. 다음 순서로 진행:

1. 설치되는 **Tailwind CSS 버전 확인**
2. 해당 버전의 **공식 문서 기준**으로 Vite + React 설정 적용
   (버전에 따라 PostCSS 방식 / 전용 Vite 플러그인 방식이 다를 수 있음)
3. 실제 화면에 Tailwind 클래스가 반영되는지 확인
4. 설정 파일과 CSS 진입점을 요약 보고

---

# 추천 폴더 구조 (Phase 1 정리 목표)

```text
bookmark/
├─ src/                        # React 프런트엔드
│  ├─ windows/                 # 창별 진입점
│  │  ├─ edge-tabs/            # 오른쪽 리본 책갈피 창
│  │  ├─ note-panel/           # 메모 편집 패널
│  │  ├─ note-list/            # 메모 목록 패널
│  │  └─ settings/             # 설정 창
│  ├─ components/              # 공용 UI (Ribbon, NoteCard 등)
│  ├─ features/                # 도메인 로직 (notes, bookmarks, trash...)
│  ├─ lib/                     # db, ipc, date, color 유틸
│  ├─ types/                   # Note, Settings 등 타입 정의
│  ├─ constants/               # 색상 팔레트, 크기, 기본 단축키 등 상수
│  └─ styles/                  # Tailwind 진입 CSS
├─ src-tauri/
│  ├─ src/
│  │  ├─ lib.rs / main.rs
│  │  ├─ commands/             # 모니터 정보, 백업 등 Rust 커맨드
│  │  ├─ tray.rs               # 트레이 메뉴
│  │  └─ windows.rs            # 창 생성/배치 로직
│  ├─ migrations/              # SQLite 마이그레이션 SQL
│  ├─ capabilities/            # 플러그인 권한 설정
│  ├─ icons/                   # 앱 아이콘 (임시 → 교체 가능)
│  └─ tauri.conf.json
├─ .github/workflows/          # Phase 8에서 추가
└─ package.json
```

---

# 단계별 범위 (보완 5, 6, 7 반영)

## Phase 1 — 프로젝트 초기화 (보완 11: 범위 엄수)

### 작업 범위

- 설치된 개발 환경 재검증 (실제 빌드 기준)
- Tauri 2 + React + TypeScript + Vite 프로젝트 초기화
- npm 의존성 설치
- Tailwind CSS 연결 (설치 버전 공식 문서 기준)
- 기본 앱 실행 확인
- 추천 폴더 구조 생성
- 임시 홈 화면 구현
- 개발 실행 명령어 정리

### Phase 1에서 하지 않을 작업

- SQLite / TipTap / 트레이 아이콘 / 전역 단축키 / 시작 프로그램 등록
- 백업·복원 / 다중 모니터 / 여러 개의 메모 창 / GitHub Actions

### Phase 1 종료 후 보고 형식

```text
1. 구현한 내용
2. 설치한 패키지
3. 생성 또는 수정한 파일
4. 실행 명령어
5. 직접 확인할 테스트 항목
6. 발견된 문제
7. Phase 2 진행 전 확인이 필요한 사항
```

## Phase 2 — UI 프로토타입

- 대표 책갈피 UI
- 개별 책갈피 UI
- **단일** 메모 패널 열기와 닫기
- 목록 패널
- 슬라이드 애니메이션 (180~260ms)
- 기본 너비 420px
- 샘플 데이터 기반 UI 동작
- 본문 편집은 **단순 `textarea`/기본 편집 영역**으로 구조만 검증 (TipTap 아님, 보완 7)
- **투명 책갈피 창의 클릭 방해 문제를 이 단계부터 검증** (보완 6)

> **여러 고정 메모 패널을 나란히 배치하는 기능은 Phase 2에서 구현하지 않음** (보완 5 → Phase 4).

### Phase 2 투명 창 클릭 방해 전략 (보완 6)

1. `edge-tabs` 창 크기를 책갈피 묶음의 실제 크기에 최대한 맞춤
2. 불필요하게 화면 전체 높이의 투명 창을 만들지 않음
3. 다른 앱의 스크롤바·오른쪽 가장자리 버튼 클릭 가능 여부 확인
4. 책갈피 묶음 이동 시에만 필요한 영역을 조절
5. 투명 영역 클릭 통과(click-through)가 필요하면 Tauri/Windows에서 가능한 방식을
   조사하고 장단점 설명 후 적용

### Phase 2 추가 테스트 체크리스트 (보완 6)

```text
- [ ] 책갈피가 없는 오른쪽 영역에서 다른 프로그램 클릭이 정상 작동한다.
- [ ] 웹브라우저의 오른쪽 스크롤바를 정상적으로 사용할 수 있다.
- [ ] 책갈피 탭 자체는 정상적으로 클릭할 수 있다.
- [ ] 책갈피 창이 다른 앱의 조작을 과도하게 방해하지 않는다.
```

## Phase 3 — SQLite 저장 + 본문 편집기 (보완 7, 8)

- SQLite 저장 연결
- **TipTap 도입** (체크박스 / 굵게 / 강조 / 자동 링크 / 실행 취소·다시 실행 / 오늘 날짜 삽입)
- 본문 데이터 저장 형식 결정 (아래 비교 후 추천안 적용)
- 메모 CRUD / 검색 / 정렬 / 필터 / 휴지통 / 30일 자동 삭제 / 설정 저장 / 마이그레이션 구조

### 본문 저장 형식 결정 시 설명할 내용 (보완 7)

1. JSON 저장 방식의 장단점
2. HTML 저장 방식의 장단점
3. 검색 기능 구현 난이도
4. 백업 파일·향후 마이그레이션에 미치는 영향
5. Bookmark에 적합한 추천 방식
→ 추천안 설명 후 적용

### SQLite 저장 안정성 (보완 8)

- 자동 저장: 입력 멈춘 뒤 약 **500ms 디바운스**
- 추가로 다음 상황에서 **즉시 저장/flush**:
  - 메모 패널을 접을 때
  - 다른 메모를 열 때
  - 패널 포커스를 잃을 때
  - 트레이 메뉴에서 앱 종료 시
  - Windows 종료 흐름에서 가능한 경우
  - 앱 창 닫기 이벤트 발생 시
- 가능하면 **SQLite WAL 모드** 사용
- 저장 실패 시 조용히 무시하지 않고 **`저장 실패` 상태 표시**

## Phase 4 — Windows 네이티브 + 다중 패널/모니터 (보완 5)

- **여러 개의 고정 메모 패널** (Phase 2에서 이관)
- 패널별 독립 창 또는 적절한 창 관리 구조
- 열린 패널을 왼쪽 방향으로 나란히 배치 / 겹침 방지 / 화면 너비 초과 안내
- 다중 모니터 + DPI 배율 대응 (Rust `available_monitors()` + `scale_factor`)
- 모니터 분리 시 재배치, 해상도 변경 시 화면 밖 이탈 보정
- 책갈피 묶음 세로 드래그 / 패널 너비 조절

### Phase 4 구현 전 비교·추천 (보완 5)

1. **메모마다 별도의 Tauri 창** 방식 — 장단점
2. **하나의 넓은 Tauri 창 안에 여러 패널 렌더링** 방식 — 장단점
→ 추천안 설명 후 구현

## Phase 5 — 시스템 기능

- 트레이 아이콘 / 트레이 메뉴 / 완전 종료 확인창
- 전역 단축키 (`global-shortcut`)
- 시작 프로그램 등록 (`autostart`, 시작 시 패널 크게 펼치지 않음)
- 첫 실행 안내
- **단일 인스턴스 (보완 9)**: `single-instance` 유지. 재실행 시 새 인스턴스 생성 금지 →
  1) 기존 인스턴스 활성화 2) 대표 책갈피/목록 위치를 사용자에게 표시 3) 필요 시 목록 패널 열기

## Phase 6 — 백업과 복원 (보완 10)

`.bookmark` 파일 메타데이터:

```ts
interface BookmarkBackup {
  appName: "Bookmark";
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  notes: unknown[];
  settings: unknown;
}
```

복원 시:

- 앱 이름 검증 / 스키마 버전 검증 / 데이터 구조 검증
- 현재 데이터 덮어쓰기 확인
- 복원 실패 시 기존 데이터 유지
- 향후 버전 마이그레이션 가능성 고려

## Phase 7 — 품질 점검
## Phase 8 — GitHub Actions (태그 기반 Windows 자동 빌드 + Release 첨부)

---

# 지금 수행할 작업 (보완 12)

- 전체 코드는 아직 작성하지 않음.
- (사용자) Microsoft C++ Build Tools + Rust 설치 완료 후, 아래 "Phase 1 시작용 프롬프트"를 붙여넣어 진행.

## Phase 1 시작용 짧은 프롬프트

```text
C++ Build Tools와 Rust 설치를 완료했어. 이제 Phase 1을 시작해줘.

진행 기준:
- 먼저 개발 환경을 재검증해줘. 단순 PATH 검색이 아니라,
  rustc/cargo 확인 + 실제 Tauri 빌드 가능 여부를 기준으로 판단해줘.
- 현재 비어 있는 bookmark 폴더에 Tauri 2 + React + TypeScript + Vite 프로젝트를
  생성해줘. 중첩 폴더(bookmark/bookmark) 만들지 마.
  먼저 `npm create tauri-app@latest . -- --template react-ts --manager npm`을
  시도하고, 옵션 오류가 나면 멈추고 오류를 설명한 뒤 대화형 방식으로 전환해줘.
- npm 의존성 설치 후 Tailwind CSS를 연결해줘.
  설치된 Tailwind 버전을 먼저 확인하고, 그 버전의 공식 문서 기준으로 설정해줘.
- 추천 폴더 구조를 생성하고 임시 홈 화면을 만들어줘.
- `npm run tauri dev`로 기본 앱이 실제로 실행되는지 확인해줘.

Phase 1 범위 제한:
- SQLite, TipTap, 트레이, 전역 단축키, 시작 프로그램, 백업/복원,
  다중 모니터, 여러 메모 창, GitHub Actions는 아직 하지 마.

Phase 1이 끝나면 아래 형식으로 보고해줘:
1. 구현한 내용
2. 설치한 패키지
3. 생성 또는 수정한 파일
4. 실행 명령어
5. 직접 확인할 테스트 항목
6. 발견된 문제
7. Phase 2 진행 전 확인이 필요한 사항
```
