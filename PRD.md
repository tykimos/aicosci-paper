# PRD: AI CoSci Paper Review System

## 1. 개요

### 1.1 프로젝트 목적
137편의 논문을 효율적으로 탐색, 열람, 설문할 수 있는 단일 페이지 웹 애플리케이션 개발

### 1.2 핵심 가치
- **원페이지 경험**: 페이지 전환 없이 논문 목록 조회, 논문 열람, 설문 응답을 한 화면에서 수행
- **효율적 탐색**: 검색, 필터, 태그 기능을 통한 빠른 논문 탐색
- **몰입형 리뷰**: 전체화면 모드로 논문에 집중할 수 있는 환경 제공
- **투명한 진행 상황**: 논문별 투표 수, 설문 완료 수 등 통계 표시
- **비로그인 사용**: 일반 사용자는 로그인 없이 바로 참여 가능
- **관리자 전용 대시보드**: 미리 등록된 관리자만 상세 통계 및 데이터 접근 가능

---

## 2. 사용자 인터페이스

### 2.1 레이아웃 구조 (3-Column Layout)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Header                                       │
├──────────────┬────────────────────────────────────┬─────────────────────┤
│              │                                    │                     │
│   Paper      │         Paper Viewer               │      Survey         │
│   List       │                                    │      Sidebar        │
│              │    [전체화면 버튼]                  │                     │
│   (왼쪽)     │         (중앙)                     │       (오른쪽)       │
│   ~280px     │        flex-1                      │       ~320px        │
│              │                                    │                     │
└──────────────┴────────────────────────────────────┴─────────────────────┘
```

### 2.2 전체화면 모드

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Header                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         Paper Viewer (Full)                              │
│                                                                         │
│                        [전체화면 해제 버튼]                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 기능 명세

### 3.1 Header
- **로고**: AI CoSci Paper Review
- **글로벌 검색바**: 논문 제목, 저자, 키워드 검색
- **관리자 버튼**: 관리자 로그인 페이지로 이동 (작은 아이콘/링크)

### 3.2 Paper List (왼쪽 사이드바)

#### 3.2.1 검색 및 필터
| 기능 | 설명 |
|------|------|
| 텍스트 검색 | 제목, 저자, 키워드로 검색 |
| 태그 필터 | 다중 태그 선택 가능 |
| 정렬 옵션 | 최신순, 투표순, 설문완료순 |
| 상태 필터 | 전체, 설문 완료, 설문 미완료 |

#### 3.2.2 논문 카드 표시 정보
- 논문 제목 (truncate)
- 저자명
- 태그 뱃지 (최대 3개)
- 투표 수 (upvote/downvote)
- 설문 완료 수
- 파일 형식 아이콘 (PDF/DOCX/DOC)

#### 3.2.3 상호작용
- 클릭 시 Paper Viewer에 해당 논문 표시
- 선택된 논문 하이라이트 표시
- 무한 스크롤 또는 페이지네이션

### 3.3 Paper Viewer (중앙)

#### 3.3.1 지원 파일 형식
| 형식 | 뷰어 구현 방식 |
|------|---------------|
| PDF | PDF.js 또는 react-pdf |
| DOCX | mammoth.js로 HTML 변환 후 렌더링 |
| DOC | 서버사이드 변환 또는 외부 서비스 |

#### 3.3.2 뷰어 기능
- 페이지 네비게이션 (PDF)
- 줌 인/아웃
- 텍스트 선택 및 복사
- 전체화면 토글 버튼
- 다운로드 버튼

#### 3.3.3 전체화면 모드
- 전체화면 버튼 클릭 시 좌우 사이드바 숨김
- Paper Viewer가 전체 너비 차지
- ESC 키 또는 해제 버튼으로 원래 레이아웃 복귀
- 키보드 단축키: `F` (전체화면 토글)

#### 3.3.4 빈 상태
- 논문 미선택 시 안내 메시지 표시
- "왼쪽 목록에서 논문을 선택하세요"

### 3.4 Survey Sidebar (오른쪽 사이드바)

#### 3.4.1 표시 조건
- 논문이 선택되었을 때만 활성화
- 전체화면 모드에서는 숨김

#### 3.4.2 설문 구성
```
┌─────────────────────────┐
│  논문: [선택된 논문 제목]  │
├─────────────────────────┤
│  ▲ 투표하기              │
│  [123]                  │
│  ▼                      │
├─────────────────────────┤
│  설문 항목들              │
│  ┌─────────────────────┐│
│  │ Q1. 논문의 신뢰성    ││
│  │ ○ 매우 높음         ││
│  │ ○ 높음             ││
│  │ ○ 보통             ││
│  │ ○ 낮음             ││
│  └─────────────────────┘│
│  ┌─────────────────────┐│
│  │ Q2. 연구 방법론      ││
│  │ ○ 매우 적절         ││
│  │ ○ 적절             ││
│  │ ○ 보통             ││
│  │ ○ 부적절           ││
│  └─────────────────────┘│
│  ...                    │
├─────────────────────────┤
│  [설문 제출]             │
└─────────────────────────┘
```

#### 3.4.3 표시되는 통계
- 총 투표 수
- 총 설문 응답 수
- 내 설문 상태 (완료/미완료)

#### 3.4.4 표시되지 않는 항목
- 다른 사용자의 댓글
- 설문 응답 내용 (개인정보 보호)

### 3.5 투표 시스템

| 기능 | 설명 |
|------|------|
| Upvote | 긍정 투표 |
| Downvote | 부정 투표 |
| 투표 취소 | 기존 투표 제거 가능 |
| 중복 방지 | 브라우저 세션/로컬스토리지 기반 중복 방지 |

### 3.6 익명 사용자 식별

일반 사용자는 로그인 없이 사용하므로 다음 방식으로 익명 식별:
- **Session ID**: 브라우저 세션별 고유 ID 생성
- **LocalStorage**: 설문/투표 상태 로컬 저장
- **Fingerprint (선택)**: 기기 핑거프린트로 중복 방지 강화

---

## 4. 관리자 페이지

### 4.1 관리자 인증

#### 4.1.1 로그인 방식
- **이메일 + 비밀번호** 기반 인증
- 사전 등록된 관리자 계정만 접근 가능
- 신규 관리자 등록은 기존 관리자 또는 DB 직접 등록

#### 4.1.2 로그인 UI
```
┌─────────────────────────────────────┐
│     AI CoSci Paper Review           │
│        관리자 로그인                 │
├─────────────────────────────────────┤
│                                     │
│  이메일                              │
│  ┌─────────────────────────────────┐│
│  │ admin@example.com              ││
│  └─────────────────────────────────┘│
│                                     │
│  비밀번호                            │
│  ┌─────────────────────────────────┐│
│  │ ••••••••••                     ││
│  └─────────────────────────────────┘│
│                                     │
│        [로그인]                      │
│                                     │
└─────────────────────────────────────┘
```

### 4.2 관리자 대시보드 레이아웃

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header (로고, 관리자 이름, 로그아웃)                                     │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │                                                          │
│   Nav Menu   │              Main Content Area                           │
│              │                                                          │
│  - 대시보드   │   ┌──────────┬──────────┬──────────┬──────────┐         │
│  - 논문 관리  │   │ 총 논문  │ 총 설문  │ 총 투표  │ 참여자 수 │         │
│  - 설문 결과  │   │   137    │   523    │  1,245   │    89    │         │
│  - 데이터     │   └──────────┴──────────┴──────────┴──────────┘         │
│    다운로드   │                                                          │
│  - 설정      │   [차트 및 상세 테이블 영역]                              │
│              │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### 4.3 관리자 기능

#### 4.3.1 대시보드 (Dashboard)
| 항목 | 설명 |
|------|------|
| 총 논문 수 | 등록된 전체 논문 수 |
| 총 설문 수 | 완료된 설문 응답 수 |
| 총 투표 수 | upvote + downvote 합계 |
| 일별 참여 추이 | 일별 설문/투표 그래프 |
| 논문별 설문율 | 설문 완료 비율 차트 |

#### 4.3.2 논문 관리 (Papers)
| 기능 | 설명 |
|------|------|
| 논문 목록 | 전체 논문 테이블 뷰 |
| 논문 추가 | 새 논문 업로드 (제목, 저자, 파일, 태그) |
| 논문 수정 | 메타데이터 수정 |
| 논문 삭제 | 논문 제거 (soft delete) |
| 태그 관리 | 태그 생성/수정/삭제 |

#### 4.3.3 설문 결과 (Survey Results)
| 기능 | 설명 |
|------|------|
| 전체 설문 목록 | 모든 설문 응답 테이블 |
| 논문별 설문 상세 | 특정 논문의 모든 응답 내용 |
| 질문별 통계 | 질문별 응답 분포 차트 |
| 개별 응답 조회 | 응답 상세 내용 확인 |

#### 4.3.4 데이터 다운로드 (Export)
| 형식 | 설명 |
|------|------|
| CSV | 설문 결과 CSV 내보내기 |
| Excel | 설문 결과 Excel 내보내기 |
| JSON | 전체 데이터 JSON 내보내기 |

다운로드 가능한 데이터:
- 전체 설문 응답 데이터
- 논문별 설문 응답
- 투표 데이터
- 참여자 통계 (익명화)

#### 4.3.5 설정 (Settings)
| 기능 | 설명 |
|------|------|
| 관리자 계정 관리 | 관리자 추가/제거 |
| 설문 문항 편집 | 설문 질문 추가/수정/삭제 |
| 사이트 설정 | 사이트 제목, 설명 등 |

---

## 5. 데이터 모델

### 5.1 Paper (논문)
```typescript
interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract?: string;
  file_url: string;
  file_type: 'pdf' | 'docx' | 'doc';
  tags: string[];
  created_at: string;
  updated_at: string;
  vote_count: number;
  survey_count: number;
}
```

### 5.2 Vote (투표)
```typescript
interface Vote {
  id: string;
  paper_id: string;
  user_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}
```

### 5.3 Survey (설문)
```typescript
interface Survey {
  id: string;
  paper_id: string;
  user_id: string;
  responses: SurveyResponse[];
  completed_at: string;
}

interface SurveyResponse {
  question_id: string;
  answer: string | number;
}
```

### 5.4 Tag (태그)
```typescript
interface Tag {
  id: string;
  name: string;
  color: string;
  paper_count: number;
}
```

### 5.5 Admin (관리자)
```typescript
interface Admin {
  id: string;
  email: string;
  password_hash: string;  // bcrypt 해시
  name: string;
  role: 'super_admin' | 'admin';
  created_at: string;
  last_login_at: string;
}
```

### 5.6 Session (익명 사용자 세션)
```typescript
interface AnonymousSession {
  id: string;              // UUID
  fingerprint?: string;    // 브라우저 핑거프린트
  created_at: string;
  last_active_at: string;
}
```

---

## 6. API 엔드포인트

### 6.1 Public APIs (비인증)

#### Papers
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/papers` | 논문 목록 조회 (검색, 필터, 페이지네이션) |
| GET | `/api/v1/papers/:id` | 논문 상세 조회 |
| GET | `/api/v1/papers/:id/file` | 논문 파일 스트림 |

#### Votes
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/papers/:id/vote` | 투표하기 (session_id 필요) |
| DELETE | `/api/v1/papers/:id/vote` | 투표 취소 |

#### Surveys
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/papers/:id/survey` | 내 설문 조회 (session_id로 식별) |
| POST | `/api/v1/papers/:id/survey` | 설문 제출 |

#### Tags
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/tags` | 태그 목록 조회 |

#### Session
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/session` | 익명 세션 생성/갱신 |

### 6.2 Admin APIs (관리자 인증 필요)

#### Authentication
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/admin/login` | 관리자 로그인 |
| POST | `/api/v1/admin/logout` | 관리자 로그아웃 |
| GET | `/api/v1/admin/me` | 현재 관리자 정보 |

#### Dashboard
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/admin/stats` | 전체 통계 조회 |
| GET | `/api/v1/admin/stats/daily` | 일별 통계 조회 |

#### Paper Management
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/admin/papers` | 논문 추가 |
| PUT | `/api/v1/admin/papers/:id` | 논문 수정 |
| DELETE | `/api/v1/admin/papers/:id` | 논문 삭제 |

#### Survey Results
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/admin/surveys` | 전체 설문 결과 조회 |
| GET | `/api/v1/admin/surveys/:paperId` | 논문별 설문 상세 |
| GET | `/api/v1/admin/surveys/stats` | 질문별 통계 |

#### Data Export
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/admin/export/surveys?format=csv` | 설문 CSV 다운로드 |
| GET | `/api/v1/admin/export/surveys?format=xlsx` | 설문 Excel 다운로드 |
| GET | `/api/v1/admin/export/all?format=json` | 전체 데이터 JSON |

#### Settings
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/admin/settings` | 설정 조회 |
| PUT | `/api/v1/admin/settings` | 설정 수정 |
| GET | `/api/v1/admin/admins` | 관리자 목록 |
| POST | `/api/v1/admin/admins` | 관리자 추가 |
| DELETE | `/api/v1/admin/admins/:id` | 관리자 삭제 |

---

## 7. 기술 스택

### 7.1 Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.x | React 프레임워크 |
| React | 19.x | UI 라이브러리 |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 4.x | 스타일링 |
| Radix UI | - | 접근성 컴포넌트 |
| Lucide React | - | 아이콘 |

### 7.2 Document Viewers
| 라이브러리 | 용도 |
|-----------|------|
| react-pdf / PDF.js | PDF 렌더링 |
| mammoth.js | DOCX → HTML 변환 |

### 7.3 Backend
| 기술 | 용도 |
|------|------|
| Supabase | 인증, 데이터베이스, 스토리지 |
| PostgreSQL | 데이터 저장 |
| Supabase Storage | 논문 파일 저장 |

---

## 8. 디자인 시스템

### 8.1 색상 (assibucks 기반)
- **Primary**: emerald-600 ~ blue-500 그라데이션
- **Background**: oklch 기반 라이트/다크 모드
- **Accent**: 상황별 색상 (orange, blue, green, purple)

### 8.2 컴포넌트 스타일
- **Card**: 둥근 모서리 (radius: 0.625rem), subtle shadow
- **Button**: 그라데이션 또는 ghost 스타일
- **Input**: 둥근 pill 스타일 (검색바)
- **Badge**: 소형 태그 표시용

### 8.3 반응형 브레이크포인트
| 크기 | 레이아웃 |
|------|---------|
| < 768px (sm) | 모바일 - 단일 컬럼, 탭 네비게이션 |
| 768px ~ 1024px (md) | 태블릿 - 2컬럼 |
| > 1024px (lg) | 데스크톱 - 3컬럼 |

---

## 9. 상태 관리

### 9.1 클라이언트 상태
```typescript
interface AppState {
  // Paper List
  papers: Paper[];
  selectedPaperId: string | null;
  searchQuery: string;
  selectedTags: string[];
  sortOption: 'newest' | 'votes' | 'surveys';

  // Viewer
  isFullscreen: boolean;
  viewerZoom: number;

  // Survey
  currentSurvey: Survey | null;
  surveyDraft: Partial<Survey>;
}
```

### 9.2 상태 관리 방식
- React `useState`/`useReducer` (로컬 상태)
- URL 쿼리 파라미터 (검색, 필터 공유 가능)
- Supabase 실시간 구독 (투표 수 실시간 업데이트)

---

## 10. 구현 계획

### Phase 1: 기본 구조 (1주차)
- [x] 프로젝트 설정 (Next.js, Tailwind, Supabase)
- [ ] 3-Column 레이아웃 구현
- [ ] Header 컴포넌트
- [ ] Paper List 기본 UI
- [ ] 익명 세션 관리 구현

### Phase 2: 논문 뷰어 (2주차)
- [ ] PDF 뷰어 구현
- [ ] DOCX 뷰어 구현
- [ ] 전체화면 토글 기능
- [ ] 줌 인/아웃 기능

### Phase 3: 설문 시스템 (3주차)
- [ ] Survey Sidebar 구현
- [ ] 투표 기능 구현 (세션 기반 중복 방지)
- [ ] 설문 제출 기능
- [ ] 통계 표시 (투표 수, 설문 수)

### Phase 4: 검색 및 필터 (4주차)
- [ ] 텍스트 검색 구현
- [ ] 태그 필터 구현
- [ ] 정렬 옵션 구현
- [ ] 무한 스크롤

### Phase 5: 관리자 페이지 (5주차)
- [ ] 관리자 로그인 페이지
- [ ] 관리자 인증 (이메일/비밀번호)
- [ ] 대시보드 (통계 카드, 차트)
- [ ] 논문 관리 CRUD

### Phase 6: 관리자 고급 기능 (6주차)
- [ ] 설문 결과 상세 조회
- [ ] 질문별 통계 차트
- [ ] 데이터 다운로드 (CSV, Excel, JSON)
- [ ] 관리자 계정 관리

### Phase 7: 마무리 (7주차)
- [ ] 반응형 최적화
- [ ] 다크 모드
- [ ] 성능 최적화
- [ ] 보안 점검
- [ ] 테스트 및 버그 수정

---

## 11. 주요 고려사항

### 11.1 성능
- 논문 파일 lazy loading
- 가상 스크롤 (긴 논문 목록)
- 이미지/PDF 캐싱

### 11.2 접근성
- 키보드 네비게이션 지원
- 스크린 리더 호환
- 충분한 색상 대비

### 11.3 보안
- 관리자 인증: bcrypt 해시, JWT 토큰
- 익명 사용자: 세션 기반 중복 방지
- 파일 다운로드 권한 관리
- Rate limiting
- CORS 설정

### 11.4 확장성
- 설문 문항 동적 구성 가능
- 태그 시스템 관리자 편집 가능
- 추후 댓글 기능 추가 가능

---

## 12. 파일 구조

```
aicosci-paper/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # 메인 페이지 (3-Column)
│   ├── globals.css
│   ├── admin/
│   │   ├── layout.tsx              # 관리자 레이아웃
│   │   ├── login/
│   │   │   └── page.tsx            # 관리자 로그인
│   │   ├── page.tsx                # 대시보드
│   │   ├── papers/
│   │   │   └── page.tsx            # 논문 관리
│   │   ├── surveys/
│   │   │   └── page.tsx            # 설문 결과
│   │   ├── export/
│   │   │   └── page.tsx            # 데이터 다운로드
│   │   └── settings/
│   │       └── page.tsx            # 설정
│   └── api/
│       └── v1/
│           ├── papers/
│           │   ├── route.ts        # GET: 목록
│           │   └── [id]/
│           │       ├── route.ts    # GET: 상세
│           │       ├── file/
│           │       │   └── route.ts
│           │       ├── vote/
│           │       │   └── route.ts
│           │       └── survey/
│           │           └── route.ts
│           ├── tags/
│           │   └── route.ts
│           ├── session/
│           │   └── route.ts        # 익명 세션 관리
│           └── admin/
│               ├── login/
│               │   └── route.ts    # 관리자 로그인
│               ├── logout/
│               │   └── route.ts
│               ├── me/
│               │   └── route.ts
│               ├── stats/
│               │   └── route.ts
│               ├── surveys/
│               │   └── route.ts
│               ├── export/
│               │   └── route.ts
│               └── settings/
│                   └── route.ts
├── components/
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── paper-list-sidebar.tsx
│   │   └── survey-sidebar.tsx
│   ├── admin/
│   │   ├── admin-header.tsx
│   │   ├── admin-sidebar.tsx
│   │   ├── stats-cards.tsx
│   │   ├── survey-table.tsx
│   │   └── login-form.tsx
│   ├── papers/
│   │   ├── paper-card.tsx
│   │   ├── paper-viewer.tsx
│   │   └── pdf-viewer.tsx
│   ├── surveys/
│   │   ├── survey-form.tsx
│   │   └── vote-buttons.tsx
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       ├── badge.tsx
│       ├── input.tsx
│       ├── scroll-area.tsx
│       ├── table.tsx
│       └── ...
├── hooks/
│   ├── use-papers.ts
│   ├── use-survey.ts
│   ├── use-fullscreen.ts
│   ├── use-session.ts              # 익명 세션 관리
│   └── use-admin-auth.ts           # 관리자 인증
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── auth.ts                     # 관리자 인증 유틸
│   └── utils.ts
├── middleware.ts                   # 관리자 페이지 보호
├── types/
│   ├── database.ts
│   └── api.ts
└── PRD.md
```

---

## 13. 용어 정의

| 용어 | 설명 |
|------|------|
| Paper | 리뷰 대상 논문 |
| Survey | 논문에 대한 설문 응답 |
| Vote | 논문에 대한 간단한 투표 (upvote/downvote) |
| Tag | 논문 분류용 태그 |
| Fullscreen Mode | Paper Viewer만 표시되는 모드 |
| Admin | 사전 등록된 관리자 (이메일/비밀번호 인증) |
| Session | 익명 사용자 식별용 브라우저 세션 |
| Dashboard | 관리자 전용 통계 및 현황 페이지 |
