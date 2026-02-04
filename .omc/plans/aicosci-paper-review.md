# Work Plan: AI CoSci Paper Review System

## Context

### Original Request
PRD.md 기반으로 AI CoSci Paper Review System을 구현합니다. 137편의 논문을 효율적으로 탐색, 열람, 설문할 수 있는 단일 페이지 웹 애플리케이션을 개발합니다.

### Key Requirements (from PRD)
- **3-Column Layout**: Paper List (왼쪽) | Paper Viewer (중앙) | Survey Sidebar (오른쪽)
- **전체화면 모드**: Paper Viewer 전체화면 토글
- **익명 사용자 지원**: 로그인 없이 세션 기반 식별
- **관리자 페이지**: 이메일/비밀번호 인증, 대시보드, 논문 관리, 설문 결과, 데이터 다운로드
- **기술 스택**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase, PDF.js, mammoth.js

### Design Reference
- `/Users/tykimos/vibecode/aicosci-paper/ref/assibucks/` 프로젝트의 디자인 패턴 적용
- shadcn/ui (new-york style) 컴포넌트 사용
- oklch 기반 색상 시스템, radius: 0.625rem

---

## Work Objectives

### Core Objective
PRD에 명시된 모든 기능을 갖춘 AI CoSci Paper Review System 구현

### Deliverables
1. **프로젝트 기본 설정** - Next.js 16, Tailwind CSS 4, Supabase 설정
2. **메인 페이지** - 3-Column 레이아웃, Paper List, Paper Viewer, Survey Sidebar
3. **문서 뷰어** - PDF.js 기반 PDF 뷰어, mammoth.js 기반 DOCX 뷰어
4. **설문 시스템** - 투표 기능, 설문 폼, 세션 기반 중복 방지
5. **관리자 페이지** - 로그인, 대시보드, 논문 관리, 설문 결과, 데이터 내보내기

### Definition of Done
- 모든 Public/Admin API 엔드포인트 작동
- 3-Column 레이아웃 및 전체화면 모드 정상 동작
- PDF/DOCX 파일 렌더링 가능
- 익명 사용자 설문/투표 가능 (중복 방지)
- 관리자 로그인 및 대시보드 접근 가능
- 반응형 디자인 적용 (모바일/태블릿/데스크톱)

---

## Guardrails

### Must Have
- TypeScript strict mode
- Supabase를 통한 데이터 관리
- 익명 세션 기반 중복 투표/설문 방지
- 관리자 인증 (bcrypt + JWT)
- 반응형 디자인

### Must NOT Have
- 댓글 기능 (추후 확장 예정)
- 소셜 로그인 (관리자만 이메일/비밀번호)
- 실시간 협업 기능

---

## Task Flow and Dependencies

```
Phase 1: 프로젝트 설정 (의존성 없음)
    |
    v
Phase 2: 데이터베이스 및 타입 정의 (Phase 1 필요)
    |
    v
Phase 3: UI 컴포넌트 기반 구축 (Phase 1 필요)
    |
    v
Phase 4: 메인 레이아웃 구현 (Phase 2, 3 필요)
    |
    v
Phase 5: Paper List 구현 (Phase 4 필요)
    |
    v
Phase 6: Paper Viewer 구현 (Phase 4 필요)
    |
    v
Phase 7: Survey Sidebar 구현 (Phase 4 필요)
    |
    v
Phase 8: Public API 구현 (Phase 2 필요)
    |
    v
Phase 9: 관리자 인증 시스템 (Phase 2 필요)
    |
    v
Phase 10: 관리자 대시보드 (Phase 9 필요)
    |
    v
Phase 11: 관리자 논문 관리 (Phase 9, 10 필요)
    |
    v
Phase 12: 관리자 설문 결과 및 내보내기 (Phase 9, 10 필요)
    |
    v
Phase 13: 반응형 최적화 및 마무리 (모든 Phase 필요)
```

---

## Detailed TODOs

### Phase 1: 프로젝트 설정

#### TODO 1.1: Next.js 프로젝트 초기화
```bash
# 실행할 명령어
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

**Acceptance Criteria:**
- Next.js 16.x 프로젝트 생성
- TypeScript 설정 완료
- Tailwind CSS 4.x 설정 완료
- ESLint 설정 완료

#### TODO 1.2: 필수 의존성 설치
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-scroll-area @radix-ui/react-tabs @radix-ui/react-separator @radix-ui/react-label
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react
npm install react-pdf pdfjs-dist mammoth
npm install bcryptjs jsonwebtoken
npm install @tanstack/react-query
npm install recharts
npm install xlsx
npm install uuid

npm install -D @types/bcryptjs @types/jsonwebtoken @types/uuid
```

**Acceptance Criteria:**
- 모든 패키지 설치 완료
- package.json에 의존성 명시됨

#### TODO 1.3: 프로젝트 구조 생성
```
aicosci-paper/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── page.tsx
│   │   ├── papers/page.tsx
│   │   ├── surveys/page.tsx
│   │   ├── export/page.tsx
│   │   └── settings/page.tsx
│   └── api/v1/
│       ├── papers/
│       ├── tags/
│       ├── session/
│       └── admin/
├── components/
│   ├── layout/
│   ├── admin/
│   ├── papers/
│   ├── surveys/
│   └── ui/
├── hooks/
├── lib/
│   ├── supabase/
│   └── api/
├── types/
└── middleware.ts
```

**Acceptance Criteria:**
- 디렉토리 구조 생성 완료
- 빈 파일들 생성 (placeholder)

#### TODO 1.4: Tailwind CSS 4 및 globals.css 설정
**File:** `/app/globals.css`

assibucks 참조 프로젝트의 globals.css를 기반으로 설정:
- oklch 기반 색상 시스템
- CSS 변수 정의 (light/dark mode)
- radius: 0.625rem
- typography 플러그인 설정

**Acceptance Criteria:**
- globals.css에 oklch 색상 변수 정의
- light/dark mode 색상 설정 완료
- tailwind 플러그인 설정 완료

#### TODO 1.5: shadcn/ui 초기화 및 components.json 설정
**File:** `/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**Acceptance Criteria:**
- components.json 생성
- new-york 스타일 설정

---

### Phase 2: 데이터베이스 및 타입 정의

#### TODO 2.1: Supabase 프로젝트 설정
**Files:**
- `/lib/supabase/client.ts` - 브라우저 클라이언트
- `/lib/supabase/server.ts` - 서버 클라이언트
- `/lib/supabase/admin.ts` - Admin 클라이언트
- `/lib/supabase/index.ts` - 내보내기

**Acceptance Criteria:**
- Supabase 클라이언트 설정 완료
- 환경 변수 설정 (.env.local)

#### TODO 2.2: 데이터베이스 스키마 정의
**File:** `/supabase/migrations/001_initial_schema.sql`

```sql
-- Papers 테이블
CREATE TABLE papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL DEFAULT '{}',
  abstract TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'doc')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  vote_count INTEGER NOT NULL DEFAULT 0,
  survey_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Tags 테이블
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6B7280',
  paper_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Anonymous Sessions 테이블
CREATE TABLE anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Votes 테이블
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(paper_id, session_id)
);

-- Survey Questions 테이블
CREATE TABLE survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('radio', 'checkbox', 'text', 'scale')),
  options JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Surveys 테이블
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES anonymous_sessions(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '[]',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(paper_id, session_id)
);

-- Admins 테이블
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')) DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Site Settings 테이블
CREATE TABLE site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_papers_tags ON papers USING GIN (tags);
CREATE INDEX idx_papers_created_at ON papers (created_at DESC);
CREATE INDEX idx_votes_paper_id ON votes (paper_id);
CREATE INDEX idx_surveys_paper_id ON surveys (paper_id);
```

**Acceptance Criteria:**
- 모든 테이블 생성
- 인덱스 설정 완료
- 외래 키 관계 설정

#### TODO 2.3: TypeScript 타입 정의
**File:** `/types/database.ts`

```typescript
export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract?: string;
  file_url: string;
  file_type: 'pdf' | 'docx' | 'doc';
  tags: string[];
  vote_count: number;
  survey_count: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  paper_count: number;
  created_at: string;
}

export interface AnonymousSession {
  id: string;
  fingerprint?: string;
  created_at: string;
  last_active_at: string;
}

export interface Vote {
  id: string;
  paper_id: string;
  session_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: 'radio' | 'checkbox' | 'text' | 'scale';
  options?: { value: string; label: string }[];
  order_index: number;
  is_required: boolean;
  created_at: string;
}

export interface Survey {
  id: string;
  paper_id: string;
  session_id: string;
  responses: SurveyResponse[];
  completed_at: string;
}

export interface SurveyResponse {
  question_id: string;
  answer: string | number | string[];
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin';
  created_at: string;
  last_login_at?: string;
}
```

**Acceptance Criteria:**
- 모든 데이터 모델 타입 정의
- PRD의 데이터 모델과 일치

#### TODO 2.4: API 타입 정의
**File:** `/types/api.ts`

```typescript
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    has_more?: boolean;
  };
}

// ... (Paper, Vote, Survey API types)
```

**Acceptance Criteria:**
- API 응답 타입 정의
- 에러 코드 정의

---

### Phase 3: UI 컴포넌트 기반 구축

#### TODO 3.1: 유틸리티 함수 설정
**File:** `/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Acceptance Criteria:**
- cn 함수 구현
- tailwind-merge 설정

#### TODO 3.2: Button 컴포넌트
**File:** `/components/ui/button.tsx`

assibucks 참조 프로젝트의 button.tsx 패턴 적용:
- variant: default, destructive, outline, secondary, ghost, link
- size: default, xs, sm, lg, icon, icon-xs, icon-sm, icon-lg
- class-variance-authority 사용

**Acceptance Criteria:**
- 모든 variant 스타일 적용
- 모든 size 옵션 지원

#### TODO 3.3: Card 컴포넌트
**File:** `/components/ui/card.tsx`

- Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- data-slot 속성 적용

**Acceptance Criteria:**
- 카드 컴포넌트 세트 완성
- 둥근 모서리 (rounded-xl) 적용

#### TODO 3.4: Input 컴포넌트
**File:** `/components/ui/input.tsx`

- 기본 input 스타일
- 둥근 pill 스타일 옵션 (검색바용)

**Acceptance Criteria:**
- Input 컴포넌트 완성
- focus 스타일 적용

#### TODO 3.5: Badge 컴포넌트
**File:** `/components/ui/badge.tsx`

- variant: default, secondary, destructive, outline
- 태그 표시용 소형 뱃지

**Acceptance Criteria:**
- Badge 컴포넌트 완성
- 태그 색상 지원

#### TODO 3.6: ScrollArea 컴포넌트
**File:** `/components/ui/scroll-area.tsx`

- @radix-ui/react-scroll-area 기반
- 커스텀 스크롤바 스타일

**Acceptance Criteria:**
- ScrollArea 컴포넌트 완성
- 스크롤바 스타일 적용

#### TODO 3.7: Dialog 컴포넌트
**File:** `/components/ui/dialog.tsx`

- @radix-ui/react-dialog 기반
- 모달 스타일

**Acceptance Criteria:**
- Dialog 컴포넌트 완성
- 오버레이 및 애니메이션

#### TODO 3.8: Tabs 컴포넌트
**File:** `/components/ui/tabs.tsx`

- @radix-ui/react-tabs 기반

**Acceptance Criteria:**
- Tabs 컴포넌트 완성

#### TODO 3.9: Skeleton 컴포넌트
**File:** `/components/ui/skeleton.tsx`

- 로딩 상태 표시용

**Acceptance Criteria:**
- Skeleton 컴포넌트 완성
- 애니메이션 적용

#### TODO 3.10: Table 컴포넌트
**File:** `/components/ui/table.tsx`

- 관리자 페이지용 테이블

**Acceptance Criteria:**
- Table 컴포넌트 세트 완성

---

### Phase 4: 메인 레이아웃 구현

#### TODO 4.1: 루트 레이아웃
**File:** `/app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI CoSci Paper Review',
  description: 'AI 과학 논문 리뷰 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

**Acceptance Criteria:**
- Geist 폰트 설정
- 메타데이터 설정

#### TODO 4.2: Header 컴포넌트
**File:** `/components/layout/header.tsx`

- 로고: "AI CoSci Paper Review"
- 글로벌 검색바 (중앙)
- 관리자 버튼 (우측)

**Acceptance Criteria:**
- 로고 표시
- 검색바 UI 완성
- 관리자 링크

#### TODO 4.3: 3-Column 메인 레이아웃
**File:** `/app/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { PaperListSidebar } from '@/components/layout/paper-list-sidebar';
import { PaperViewer } from '@/components/papers/paper-viewer';
import { SurveySidebar } from '@/components/layout/survey-sidebar';

export default function HomePage() {
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        {!isFullscreen && (
          <PaperListSidebar
            selectedPaperId={selectedPaperId}
            onSelectPaper={setSelectedPaperId}
          />
        )}
        <main className="flex-1 min-w-0">
          <PaperViewer
            paperId={selectedPaperId}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />
        </main>
        {!isFullscreen && selectedPaperId && (
          <SurveySidebar paperId={selectedPaperId} />
        )}
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- 3-Column 레이아웃 구현
- 전체화면 토글 동작
- 반응형 레이아웃

#### TODO 4.4: PaperListSidebar 컴포넌트 (껍데기)
**File:** `/components/layout/paper-list-sidebar.tsx`

- width: ~280px
- 검색, 필터, 태그 UI 준비
- 논문 카드 리스트 영역

**Acceptance Criteria:**
- 사이드바 레이아웃 완성
- 스크롤 영역 설정

#### TODO 4.5: SurveySidebar 컴포넌트 (껍데기)
**File:** `/components/layout/survey-sidebar.tsx`

- width: ~320px
- 투표 UI 영역
- 설문 폼 영역

**Acceptance Criteria:**
- 사이드바 레이아웃 완성
- 스크롤 영역 설정

---

### Phase 5: Paper List 구현

#### TODO 5.1: usePapers 훅
**File:** `/hooks/use-papers.ts`

- 논문 목록 조회
- 검색, 필터, 정렬
- 페이지네이션 / 무한 스크롤

**Acceptance Criteria:**
- API 연동
- 상태 관리
- 에러 처리

#### TODO 5.2: useSession 훅
**File:** `/hooks/use-session.ts`

- 익명 세션 생성/관리
- LocalStorage 저장
- 세션 ID 반환

**Acceptance Criteria:**
- 세션 생성 로직
- LocalStorage 연동

#### TODO 5.3: PaperCard 컴포넌트
**File:** `/components/papers/paper-card.tsx`

- 논문 제목 (truncate)
- 저자명
- 태그 뱃지 (최대 3개)
- 투표 수/설문 완료 수
- 파일 형식 아이콘

**Acceptance Criteria:**
- 모든 정보 표시
- 선택 상태 하이라이트
- 클릭 핸들러

#### TODO 5.4: 검색 및 필터 UI
**File:** `/components/papers/paper-filters.tsx`

- 텍스트 검색 입력
- 태그 필터 (다중 선택)
- 정렬 옵션 (최신순, 투표순, 설문완료순)
- 상태 필터 (전체, 설문 완료, 미완료)

**Acceptance Criteria:**
- 필터 UI 완성
- 필터 상태 관리

#### TODO 5.5: PaperListSidebar 완성
**File:** `/components/layout/paper-list-sidebar.tsx`

- PaperFilters 통합
- PaperCard 리스트 렌더링
- 무한 스크롤 구현

**Acceptance Criteria:**
- 검색/필터 동작
- 논문 목록 표시
- 스크롤 로딩

---

### Phase 6: Paper Viewer 구현

#### TODO 6.1: PDF Viewer 컴포넌트
**File:** `/components/papers/pdf-viewer.tsx`

- react-pdf / PDF.js 기반
- 페이지 네비게이션
- 줌 인/아웃
- 텍스트 선택

**Acceptance Criteria:**
- PDF 렌더링
- 페이지 이동
- 줌 기능

#### TODO 6.2: DOCX Viewer 컴포넌트
**File:** `/components/papers/docx-viewer.tsx`

- mammoth.js로 HTML 변환
- HTML 렌더링
- 스타일 적용

**Acceptance Criteria:**
- DOCX 렌더링
- 스타일 적용

#### TODO 6.3: PaperViewer 통합 컴포넌트
**File:** `/components/papers/paper-viewer.tsx`

- 파일 타입에 따른 뷰어 선택
- 전체화면 토글 버튼
- 다운로드 버튼
- 빈 상태 안내

**Acceptance Criteria:**
- PDF/DOCX 자동 선택
- 전체화면 토글
- 다운로드 기능
- ESC 키 / F 키 단축키

#### TODO 6.4: useFullscreen 훅
**File:** `/hooks/use-fullscreen.ts`

- 전체화면 상태 관리
- 키보드 단축키 (F, ESC)

**Acceptance Criteria:**
- 상태 토글
- 키보드 이벤트 처리

---

### Phase 7: Survey Sidebar 구현

#### TODO 7.1: VoteButtons 컴포넌트
**File:** `/components/surveys/vote-buttons.tsx`

- Upvote / Downvote 버튼
- 투표 수 표시
- 세션 기반 중복 방지
- 투표 취소 기능

**Acceptance Criteria:**
- 투표 UI 완성
- API 연동
- 상태 표시

#### TODO 7.2: SurveyForm 컴포넌트
**File:** `/components/surveys/survey-form.tsx`

- 설문 문항 렌더링
- 라디오/체크박스/텍스트/스케일 지원
- 응답 상태 관리
- 제출 버튼

**Acceptance Criteria:**
- 모든 질문 타입 지원
- 유효성 검사
- 제출 처리

#### TODO 7.3: useSurvey 훅
**File:** `/hooks/use-survey.ts`

- 설문 문항 조회
- 내 설문 상태 조회
- 설문 제출

**Acceptance Criteria:**
- API 연동
- 상태 관리

#### TODO 7.4: useVote 훅
**File:** `/hooks/use-vote.ts`

- 투표 조회
- 투표 제출/취소

**Acceptance Criteria:**
- API 연동
- 상태 관리

#### TODO 7.5: SurveySidebar 완성
**File:** `/components/layout/survey-sidebar.tsx`

- 선택된 논문 제목 표시
- VoteButtons 통합
- SurveyForm 통합
- 통계 표시 (투표 수, 설문 응답 수)

**Acceptance Criteria:**
- 모든 요소 통합
- 상태 표시

---

### Phase 8: Public API 구현

#### TODO 8.1: API 응답 유틸리티
**File:** `/lib/api/response.ts`

- successResponse, errorResponse 등 헬퍼 함수
- 에러 코드 정의

**Acceptance Criteria:**
- 응답 헬퍼 완성

#### TODO 8.2: Papers API
**Files:**
- `/app/api/v1/papers/route.ts` - GET: 목록 조회
- `/app/api/v1/papers/[id]/route.ts` - GET: 상세 조회
- `/app/api/v1/papers/[id]/file/route.ts` - GET: 파일 스트림

**Acceptance Criteria:**
- 검색, 필터, 페이지네이션 지원
- 파일 다운로드 지원

#### TODO 8.3: Tags API
**File:** `/app/api/v1/tags/route.ts`

- GET: 태그 목록 조회

**Acceptance Criteria:**
- 태그 목록 반환

#### TODO 8.4: Session API
**File:** `/app/api/v1/session/route.ts`

- POST: 익명 세션 생성/갱신

**Acceptance Criteria:**
- 세션 ID 반환
- 중복 생성 방지

#### TODO 8.5: Vote API
**File:** `/app/api/v1/papers/[id]/vote/route.ts`

- POST: 투표하기
- DELETE: 투표 취소
- GET: 내 투표 상태

**Acceptance Criteria:**
- 세션 기반 중복 방지
- 투표 수 업데이트

#### TODO 8.6: Survey API
**Files:**
- `/app/api/v1/papers/[id]/survey/route.ts` - GET: 내 설문 조회, POST: 설문 제출
- `/app/api/v1/survey-questions/route.ts` - GET: 설문 문항 조회

**Acceptance Criteria:**
- 세션 기반 중복 방지
- 설문 수 업데이트

---

### Phase 9: 관리자 인증 시스템

#### TODO 9.1: 인증 유틸리티
**File:** `/lib/auth.ts`

- bcrypt 해시 함수
- JWT 토큰 생성/검증
- 쿠키 관리

**Acceptance Criteria:**
- 비밀번호 해시
- JWT 토큰 관리

#### TODO 9.2: Admin Login API
**File:** `/app/api/v1/admin/login/route.ts`

- POST: 로그인
- 이메일/비밀번호 검증
- JWT 토큰 발급

**Acceptance Criteria:**
- 인증 처리
- 토큰 발급

#### TODO 9.3: Admin Logout API
**File:** `/app/api/v1/admin/logout/route.ts`

- POST: 로그아웃
- 토큰 무효화

**Acceptance Criteria:**
- 로그아웃 처리

#### TODO 9.4: Admin Me API
**File:** `/app/api/v1/admin/me/route.ts`

- GET: 현재 관리자 정보

**Acceptance Criteria:**
- 토큰 검증
- 관리자 정보 반환

#### TODO 9.5: useAdminAuth 훅
**File:** `/hooks/use-admin-auth.ts`

- 로그인/로그아웃
- 인증 상태 관리
- 자동 리다이렉트

**Acceptance Criteria:**
- 인증 상태 관리
- API 연동

#### TODO 9.6: Middleware
**File:** `/middleware.ts`

- /admin/* 경로 보호
- 토큰 검증

**Acceptance Criteria:**
- 인증 확인
- 리다이렉트 처리

#### TODO 9.7: Admin Login Page
**File:** `/app/admin/login/page.tsx`

- 로그인 폼 UI
- 이메일/비밀번호 입력
- 에러 메시지 표시

**Acceptance Criteria:**
- 로그인 UI 완성
- 인증 처리

#### TODO 9.8: Admin Layout
**File:** `/app/admin/layout.tsx`

- 관리자 헤더 (로고, 관리자 이름, 로그아웃)
- 사이드바 네비게이션
- 메인 콘텐츠 영역

**Acceptance Criteria:**
- 레이아웃 완성
- 네비게이션 동작

---

### Phase 10: 관리자 대시보드

#### TODO 10.1: Stats API
**Files:**
- `/app/api/v1/admin/stats/route.ts` - GET: 전체 통계
- `/app/api/v1/admin/stats/daily/route.ts` - GET: 일별 통계

**Acceptance Criteria:**
- 통계 데이터 반환

#### TODO 10.2: StatsCards 컴포넌트
**File:** `/components/admin/stats-cards.tsx`

- 총 논문 수
- 총 설문 수
- 총 투표 수
- 참여자 수

**Acceptance Criteria:**
- 카드 UI 완성
- 데이터 표시

#### TODO 10.3: Charts 컴포넌트
**File:** `/components/admin/stats-charts.tsx`

- recharts 사용
- 일별 참여 추이 차트
- 논문별 설문율 차트

**Acceptance Criteria:**
- 차트 렌더링
- 데이터 연동

#### TODO 10.4: Dashboard Page
**File:** `/app/admin/page.tsx`

- StatsCards 표시
- Charts 표시

**Acceptance Criteria:**
- 대시보드 UI 완성

---

### Phase 11: 관리자 논문 관리

#### TODO 11.1: Admin Papers API
**Files:**
- `/app/api/v1/admin/papers/route.ts` - GET: 목록, POST: 추가
- `/app/api/v1/admin/papers/[id]/route.ts` - PUT: 수정, DELETE: 삭제

**Acceptance Criteria:**
- CRUD 완성
- 파일 업로드 처리

#### TODO 11.2: PaperTable 컴포넌트
**File:** `/components/admin/paper-table.tsx`

- 논문 목록 테이블
- 정렬, 검색
- 수정/삭제 버튼

**Acceptance Criteria:**
- 테이블 UI 완성
- 액션 처리

#### TODO 11.3: PaperForm 컴포넌트
**File:** `/components/admin/paper-form.tsx`

- 논문 추가/수정 폼
- 파일 업로드
- 태그 선택

**Acceptance Criteria:**
- 폼 UI 완성
- 유효성 검사

#### TODO 11.4: Papers Management Page
**File:** `/app/admin/papers/page.tsx`

- PaperTable 표시
- 추가 버튼
- PaperForm 모달

**Acceptance Criteria:**
- 논문 관리 UI 완성

---

### Phase 12: 관리자 설문 결과 및 내보내기

#### TODO 12.1: Admin Surveys API
**Files:**
- `/app/api/v1/admin/surveys/route.ts` - GET: 전체 설문 결과
- `/app/api/v1/admin/surveys/[paperId]/route.ts` - GET: 논문별 상세
- `/app/api/v1/admin/surveys/stats/route.ts` - GET: 질문별 통계

**Acceptance Criteria:**
- 설문 데이터 조회

#### TODO 12.2: SurveyTable 컴포넌트
**File:** `/components/admin/survey-table.tsx`

- 설문 응답 테이블
- 필터링 (논문별, 날짜별)

**Acceptance Criteria:**
- 테이블 UI 완성

#### TODO 12.3: SurveyStats 컴포넌트
**File:** `/components/admin/survey-stats.tsx`

- 질문별 응답 분포 차트
- 통계 요약

**Acceptance Criteria:**
- 통계 UI 완성

#### TODO 12.4: Surveys Page
**File:** `/app/admin/surveys/page.tsx`

- SurveyTable 표시
- SurveyStats 표시

**Acceptance Criteria:**
- 설문 결과 페이지 완성

#### TODO 12.5: Export API
**File:** `/app/api/v1/admin/export/route.ts`

- GET: 데이터 내보내기
- format: csv, xlsx, json

**Acceptance Criteria:**
- CSV/Excel/JSON 생성
- 파일 다운로드

#### TODO 12.6: Export Page
**File:** `/app/admin/export/page.tsx`

- 내보내기 옵션 선택
- 다운로드 버튼

**Acceptance Criteria:**
- 내보내기 UI 완성

---

### Phase 13: 반응형 최적화 및 마무리

#### TODO 13.1: 모바일 레이아웃
- < 768px: 단일 컬럼, 탭 네비게이션
- Paper List / Paper Viewer / Survey를 탭으로 전환

**Acceptance Criteria:**
- 모바일 레이아웃 동작

#### TODO 13.2: 태블릿 레이아웃
- 768px ~ 1024px: 2컬럼
- Paper List + Paper Viewer 또는 Paper Viewer + Survey

**Acceptance Criteria:**
- 태블릿 레이아웃 동작

#### TODO 13.3: 다크 모드
- 시스템 설정 감지
- 토글 버튼

**Acceptance Criteria:**
- 다크 모드 전환

#### TODO 13.4: 성능 최적화
- 논문 파일 lazy loading
- 이미지 최적화
- 코드 스플리팅

**Acceptance Criteria:**
- Lighthouse 점수 개선

#### TODO 13.5: 접근성 개선
- 키보드 네비게이션
- 스크린 리더 호환
- 색상 대비 확인

**Acceptance Criteria:**
- WCAG 기준 충족

#### TODO 13.6: 에러 처리 및 로딩 상태
- 에러 바운더리
- 로딩 스켈레톤
- 빈 상태 안내

**Acceptance Criteria:**
- 모든 상태 처리 완성

---

## Commit Strategy

| Phase | Commit Message |
|-------|----------------|
| Phase 1 | feat: initialize Next.js project with Tailwind CSS and dependencies |
| Phase 2 | feat: add database schema and TypeScript types |
| Phase 3 | feat: add shadcn/ui components |
| Phase 4 | feat: implement main 3-column layout |
| Phase 5 | feat: implement paper list with search and filters |
| Phase 6 | feat: implement PDF and DOCX viewers |
| Phase 7 | feat: implement survey sidebar with voting |
| Phase 8 | feat: implement public APIs |
| Phase 9 | feat: implement admin authentication |
| Phase 10 | feat: implement admin dashboard |
| Phase 11 | feat: implement admin paper management |
| Phase 12 | feat: implement admin survey results and export |
| Phase 13 | feat: add responsive design and optimizations |

---

## Success Criteria

1. **기능 완성도**
   - [ ] 3-Column 레이아웃 정상 동작
   - [ ] 전체화면 모드 동작
   - [ ] PDF/DOCX 뷰어 동작
   - [ ] 익명 투표/설문 동작
   - [ ] 관리자 로그인 및 대시보드 동작
   - [ ] 데이터 내보내기 동작

2. **품질**
   - [ ] TypeScript strict mode 통과
   - [ ] ESLint 에러 없음
   - [ ] 반응형 디자인 적용
   - [ ] 로딩/에러 상태 처리

3. **성능**
   - [ ] Lighthouse Performance 80+ 점
   - [ ] 첫 로딩 3초 이내

---

## Notes

- Supabase 프로젝트는 별도로 생성 필요 (supabase.com)
- 환경 변수 설정 필요 (.env.local)
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - JWT_SECRET
- PDF.js worker 설정 필요 (next.config.ts)
- 초기 관리자 계정은 DB에 직접 생성 또는 시드 스크립트 사용
