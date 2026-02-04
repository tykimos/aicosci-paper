# AI CoSci Paper Review - PRD v2

## 개요

AI Co-Scientist Challenge Korea 논문 리뷰 플랫폼의 확장 기능 명세서입니다.
ce-tyriunnie의 Skill-based LLM Orchestration 아키텍처를 참고하여 구현합니다.

---

## 기능 요구사항

### 3. 논문 카드에 분야 해시태그 표시
- 왼쪽 사이드바의 논문 카드에 분야(field/domain) 해시태그 표시
- 메타데이터의 `tags` 필드를 활용
- 태그 클릭 시 해당 분야 논문 필터링

### 4. 논문 뷰어 (PDF/DOCX)
- 논문 클릭 시 중앙 영역에 문서 표시
- PDF: react-pdf 활용
- DOCX: mammoth.js 활용 (이미 설치됨)
- 확대/축소, 페이지 네비게이션 지원

### 5. 하단 채팅창
- 고정된 하단 채팅 인터페이스
- 논문 검색 쿼리 입력
- 검색 결과가 왼쪽 사이드바에 반영
- 실시간 스트리밍 응답 지원

### 6. 벡터스토어 기반 검색
- Azure OpenAI Embedding (text-embedding-3-small) 활용
- Supabase pgvector의 `paper_chunks` 테이블 활용
- 시맨틱 검색 + 키워드 검색 하이브리드

### 7. 설문 완료 시 논문 추천
- 설문 완료 → 고생했다는 메시지
- 관심사 기반 논문 추천 (벡터 유사도 활용)

### 8. 논문 요약 생성
- 특정 논문 선택 시 AI 요약본 자동 생성
- 청크 기반 요약 → 전체 요약 2단계

### 9. 논문 완독 후 추천
- 논문 끝까지 스크롤/읽기 완료 감지
- 설문 유도 + 관련 논문 추천

---

## 아키텍처 설계

### 1. Skill-based Orchestration (ce-tyriunnie 참고)

```
User Input / Hook Event
        ↓
[1] Pre-Orchestrator (LLM)
    - 사용자 입력/이벤트 분석
    - 적절한 Skill 라우팅
        ↓
[2] Composer (Code)
    - Context Pack 조립
    - 필요한 모듈 주입
        ↓
[3] Executor (LLM)
    - Skill 실행
    - 응답 + Signals 생성
        ↓
[4] Post-Orchestrator (Code)
    - Reroute 결정
    - Skill Chaining
        ↓
Response to User
```

### 2. Skills Registry

```typescript
// /skills/registry.json
{
  "skills": [
    {
      "skill_id": "greeting",
      "description": "사이트 방문 시 인사 및 안내",
      "triggers": ["site_enter", "first_visit"],
      "requires": ["user_state"],
      "budget": { "context_tokens": 2000 }
    },
    {
      "skill_id": "paper_search",
      "description": "논문 검색 (키워드 + 벡터)",
      "triggers": ["search_query", "user_question"],
      "requires": ["vector_search", "keyword_search"],
      "budget": { "context_tokens": 4000, "search_topk": 10 }
    },
    {
      "skill_id": "paper_explain",
      "description": "선택된 논문 요약 및 설명",
      "triggers": ["paper_select", "paper_open"],
      "requires": ["paper_chunks", "paper_metadata"],
      "budget": { "context_tokens": 8000 }
    },
    {
      "skill_id": "survey_complete",
      "description": "설문 완료 축하 및 논문 추천",
      "triggers": ["survey_submitted"],
      "requires": ["survey_responses", "vector_search"],
      "budget": { "context_tokens": 4000, "candidates_topk": 5 }
    },
    {
      "skill_id": "recommend_next",
      "description": "다음 논문 추천",
      "triggers": ["paper_read_complete", "ask_recommendation"],
      "requires": ["reading_history", "vector_search"],
      "budget": { "context_tokens": 4000, "candidates_topk": 5 }
    },
    {
      "skill_id": "general_chat",
      "description": "일반 대화 및 질문 응답",
      "triggers": ["default"],
      "requires": ["conversation_history"],
      "budget": { "context_tokens": 3000 }
    }
  ]
}
```

### 3. Hook Events

```typescript
type TriggerEvent =
  | 'site_enter'           // 사이트 접속
  | 'paper_select'         // 논문 선택
  | 'paper_open'           // 논문 열기
  | 'paper_read_complete'  // 논문 읽기 완료
  | 'survey_submitted'     // 설문 제출
  | 'search_query'         // 검색 쿼리
  | 'user_message'         // 사용자 메시지
  | 'ask_recommendation';  // 추천 요청
```

### 4. Execution Signals

```typescript
interface ExecutionSignals {
  coverage: 'enough' | 'partial' | 'none';
  confidence: 'high' | 'medium' | 'low';
  search_performed?: boolean;
  papers_found?: number;
  summary_generated?: boolean;
  recommendation_ready?: boolean;
  next_action_hint: 'stop' | 'reroute' | 'wait_user';
  suggested_skill_id?: string;
  prompt_buttons?: string[];
}
```

---

## API 설계

### 1. Chat API

**Endpoint:** `POST /api/v1/chat`

```typescript
interface ChatRequest {
  message?: string;
  trigger?: TriggerEvent;
  type?: 'hook' | 'orchestrate' | 'execute-skill';
  paperId?: string;           // 현재 선택된 논문
  sessionId: string;          // 익명 세션
  history?: Message[];
  stream?: boolean;
  skillId?: string;           // execute-skill용
  previousSignals?: ExecutionSignals;
}

interface ChatResponse {
  content: string;
  signals: ExecutionSignals;
  promptButtons?: string[];
  searchResults?: Paper[];    // 검색 결과
  recommendedPapers?: Paper[];
  summary?: string;           // 논문 요약
}
```

### 2. Vector Search API

**Endpoint:** `POST /api/v1/search/vector`

```typescript
interface VectorSearchRequest {
  query: string;
  topK?: number;           // default: 10
  threshold?: number;      // default: 0.7
  paperId?: string;        // 특정 논문 내 검색
}

interface VectorSearchResponse {
  results: {
    paperId: string;
    paperTitle: string;
    chunkContent: string;
    similarity: number;
  }[];
}
```

### 3. Paper Summary API

**Endpoint:** `POST /api/v1/papers/[id]/summary`

```typescript
interface SummaryRequest {
  paperId: string;
  language?: 'ko' | 'en';
}

interface SummaryResponse {
  summary: string;
  keyPoints: string[];
  methodology?: string;
  results?: string;
  conclusion?: string;
}
```

---

## UI 컴포넌트 설계

### 1. 레이아웃 구조

```
+------------------+------------------------+------------------+
|                  |                        |                  |
|  Paper List      |    Paper Viewer        |  Survey Panel    |
|  Sidebar         |    (PDF/DOCX)          |  (Optional)      |
|  (Resizable)     |                        |                  |
|                  |                        |                  |
|  - Search        |                        |                  |
|  - Tags Filter   |                        |                  |
|  - Paper Cards   |                        |                  |
|    with #tags    |                        |                  |
|                  |                        |                  |
+------------------+------------------------+------------------+
|                      Chat Interface                          |
|  [Input Field]                              [Send Button]    |
|  Prompt Buttons: [논문 검색] [요약 보기] [추천 받기]           |
+--------------------------------------------------------------+
```

### 2. 컴포넌트 계층

```
app/page.tsx
├── Header
├── MainContent (flex)
│   ├── PaperListSidebar (resizable)
│   │   ├── SearchInput
│   │   ├── TagFilter
│   │   └── PaperCardList
│   │       └── PaperCard (with hashtags)
│   ├── PaperViewer
│   │   ├── PDFViewer (react-pdf)
│   │   └── DocxViewer (mammoth)
│   └── SurveySidebar (conditional)
└── ChatInterface (fixed bottom)
    ├── ChatMessages
    ├── PromptButtons
    └── ChatInput
```

### 3. 채팅 인터페이스 컴포넌트

```typescript
// components/chat/chat-interface.tsx
interface ChatInterfaceProps {
  paperId: string | null;
  onSearchResults: (papers: Paper[]) => void;
  onPaperSelect: (paperId: string) => void;
}

// 상태 관리
const [messages, setMessages] = useState<Message[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [promptButtons, setPromptButtons] = useState<string[]>([]);
```

---

## 데이터베이스 스키마 추가

### 1. chat_sessions 테이블

```sql
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES anonymous_sessions(id),
  messages JSONB DEFAULT '[]',
  current_skill_id TEXT,
  signals JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. paper_read_progress 테이블

```sql
CREATE TABLE IF NOT EXISTS paper_read_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES anonymous_sessions(id),
  paper_id UUID REFERENCES papers(id),
  scroll_percentage INTEGER DEFAULT 0,
  read_complete BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, paper_id)
);
```

### 3. paper_summaries 테이블 (캐시용)

```sql
CREATE TABLE IF NOT EXISTS paper_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES papers(id) UNIQUE,
  summary TEXT,
  key_points JSONB,
  methodology TEXT,
  results TEXT,
  conclusion TEXT,
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 구현 순서

### Phase 1: 기본 UI (1-2일)
1. [ ] 논문 카드에 해시태그 표시 (#3)
2. [ ] PDF/DOCX 뷰어 구현 (#4)
3. [ ] 하단 채팅 UI 레이아웃 (#5)

### Phase 2: 채팅 백엔드 (2-3일)
4. [ ] Chat API 엔드포인트 구현
5. [ ] Skills Registry 설정
6. [ ] Pre-Orchestrator 구현
7. [ ] 각 Skill 프롬프트 작성

### Phase 3: 검색 기능 (1-2일)
8. [ ] 벡터 검색 API 구현 (#6)
9. [ ] 하이브리드 검색 (키워드 + 벡터)
10. [ ] 검색 결과 → 사이드바 연동

### Phase 4: 논문 요약 (1일)
11. [ ] 논문 요약 생성 API (#8)
12. [ ] 요약 캐싱 구현
13. [ ] 요약 표시 UI

### Phase 5: 추천 시스템 (1-2일)
14. [ ] 설문 완료 시 추천 (#7)
15. [ ] 논문 읽기 완료 감지 (#9)
16. [ ] 관련 논문 추천 로직

### Phase 6: Hook 통합 (1일)
17. [ ] Hook 이벤트 처리
18. [ ] Skill Chaining 구현
19. [ ] 스트리밍 응답 구현

---

## 환경 변수 추가

```env
# Azure OpenAI (Chat)
AZURE_OPENAI_CHAT_DEPLOYMENT=gpt-5.2-chat
AZURE_OPENAI_CHAT_API_VERSION=2024-12-01-preview

# Azure OpenAI (Embedding) - 이미 설정됨
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-small
AZURE_EMBEDDING_API_VERSION=2023-05-15
```

---

## 참고 사항

### ce-tyriunnie 아키텍처에서 가져올 패턴
1. **2-Phase LLM Architecture**: Pre-Orchestrator → Executor
2. **Skill Registry JSON**: 스킬 메타데이터 관리
3. **Context Pack Builder**: 모듈별 컨텍스트 조립
4. **Execution Signals**: 스킬 간 상태 전달
5. **Post-Orchestrator**: Reroute/Chaining 결정
6. **Hook Message Conversion**: 이벤트 → 자연어 변환

### 주요 차이점
- ce-tyriunnie: 학습 콘텐츠 중심
- 본 프로젝트: 논문 리뷰 중심
- 벡터 검색: ce-tyriunnie는 키워드 기반, 본 프로젝트는 pgvector 활용

---

## 파일 구조 (신규 생성)

```
/app
  /api/v1
    /chat
      route.ts              # 메인 Chat API
    /search
      /vector
        route.ts            # 벡터 검색 API
    /papers/[id]
      /summary
        route.ts            # 논문 요약 API
      /progress
        route.ts            # 읽기 진행률 API

/components
  /chat
    chat-interface.tsx      # 채팅 UI
    chat-message.tsx        # 메시지 컴포넌트
    prompt-buttons.tsx      # 프롬프트 버튼
  /papers
    pdf-viewer.tsx          # PDF 뷰어
    docx-viewer.tsx         # DOCX 뷰어

/lib
  /orchestrator
    pre-orchestrator.ts     # 스킬 라우팅
    post-orchestrator.ts    # Reroute 결정
    composer.ts             # 컨텍스트 조립
    executor.ts             # 스킬 실행
  /skills
    registry.ts             # 스킬 레지스트리
    prompts.ts              # 스킬별 프롬프트

/skills
  registry.json             # 스킬 메타데이터
```

---

## 완료 조건

- [ ] 논문 카드에 분야 해시태그 표시
- [ ] PDF/DOCX 클릭 시 중앙에 표시
- [ ] 하단 채팅창으로 논문 검색 가능
- [ ] 벡터스토어 기반 시맨틱 검색 동작
- [ ] 설문 완료 시 축하 + 추천 논문 표시
- [ ] 논문 선택 시 요약본 자동 생성
- [ ] 논문 완독 후 설문 유도 및 추천
