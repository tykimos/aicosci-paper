# PRD v2 Implementation Plan

## Overview

Implementation plan for PRD v2 features of the AI CoSci Paper Review platform.
This plan covers 7 features (#3-#9) following the ce-tyriunnie Skill-based LLM Orchestration architecture.

---

## Context

### Original Request
Implement PRD v2 features:
- #3: Paper card field hashtag display
- #4: PDF/DOCX click to display in center
- #5: Bottom chat interface (search integration)
- #6: Vector store based search
- #7: Survey completion congratulations + recommendations
- #8: AI summary generation on paper selection
- #9: Paper read completion survey prompt + recommendations

### Current Architecture
- **Framework**: Next.js 16.1.6 with React 19
- **Database**: Supabase with pgvector extension
- **UI**: Radix UI + Tailwind CSS + shadcn/ui
- **Existing Components**:
  - `PaperListSidebar` - Left sidebar with paper cards and tag filtering
  - `PaperViewer` - Center panel (placeholder, no actual viewer)
  - `SurveySidebar` - Right sidebar with voting and survey
- **Existing APIs**: Papers, Tags, Votes, Surveys, Sessions
- **Dependencies**: react-pdf, mammoth.js, openai already installed

### Research Findings
- `paper_chunks` table with pgvector already defined in `supabase-vector.sql`
- `match_paper_chunks` function ready for similarity search
- ce-tyriunnie reference has complete skill-based orchestration implementation
- Embedding dimension: 1536 (OpenAI ada-002 compatible)

---

## Work Objectives

### Core Objective
Implement an interactive paper review platform with AI-powered chat, semantic search, document viewing, and intelligent recommendations.

### Deliverables
1. Enhanced paper cards with clickable hashtags
2. Functional PDF/DOCX viewer with zoom and navigation
3. Fixed bottom chat interface
4. Vector-based semantic search API
5. Skill-based chat orchestration system
6. AI paper summary generation
7. Reading progress tracking and recommendations

### Definition of Done
- [ ] All 7 features (#3-#9) are functional
- [ ] Chat interface responds to user queries
- [ ] Vector search returns relevant results
- [ ] PDF and DOCX files render correctly
- [ ] Survey completion triggers congratulations and recommendations
- [ ] Paper summaries are generated and cached
- [ ] Reading progress is tracked and triggers recommendations

---

## Guardrails

### Must Have
- Use existing Supabase tables (papers, paper_chunks, etc.)
- Follow ce-tyriunnie skill-based architecture pattern
- Use Azure OpenAI for chat and embeddings
- Maintain responsive design
- Support Korean language UI

### Must NOT Have
- User authentication (keep anonymous sessions)
- Server-side rendering for chat (use client components)
- External search APIs (use internal pgvector)
- Breaking changes to existing API responses

---

## Task Flow

```
Phase 0: Database Prerequisites (Task 20)
    |
    v
Phase 1: UI Foundation (Tasks 1-5)
    |
    v
Phase 2: Document Viewer (Tasks 6-8)
    |
    v
Phase 3: Chat Backend (Tasks 9-15)
    |
    v
Phase 4: Vector Search (Tasks 16-18)
    |
    v
Phase 5: AI Features (Tasks 19, 21)
    |
    v
Phase 6: Recommendations (Tasks 22-25)
    |
    v
Phase 7: Integration (Tasks 26-27)
```

### Task Dependencies Within Phases

```
Phase 0:
  Task 20 (DB Migration) ─────────────────────┐
                                              │
Phase 1:                                      │
  Task 1 (Hashtags) ──┬── Task 5 (Layout) <───┘
  Task 2 (Chat UI) ───┤        │
  Task 3 (Message) ───┤        │
  Task 4 (Prompts) ───┘        │
                               │
Phase 2:                       │
  Task 6 (PDF) ─┬── Task 8 (Viewer Integration)
  Task 7 (DOCX) ┘        │
                         │
Phase 3:                 │
  Task 9 (Registry) ──┬── Task 15 (Chat API)
  Task 10 (Prompts) ──┤        │
  Task 11 (Pre-Orch) ─┤        │
  Task 12 (Composer) ─┤        │
  Task 13 (Executor) ─┤        │
  Task 14 (Post-Orch) ┘        │
                               │
Phase 4:                       │
  Task 16 (Embedding) ─┬── Task 18 (Hybrid)
  Task 17 (Vector API) ┘       │
                               │
Phase 5:                       │
  Task 19 (Summary API) ───────┤
  Task 21 (Types) ─────────────┤
                               │
Phase 6:                       │
  Task 22 (Recommend Svc) ─┬── Task 25 (Progress API)
  Task 23 (Survey Handler) ┤
  Task 24 (Progress Hook) ─┘
                               │
Phase 7:                       │
  Task 26 (Integration Test) ──┤
  Task 27 (UI Polish) ─────────┘
```

---

## Detailed TODOs

### Phase 0: Database Prerequisites (MUST COMPLETE FIRST)

#### Task 20: Create Database Migration for New Tables
**New File**: `/supabase/migrations/002_chat_and_progress.sql`
**CRITICAL**: This task MUST be completed before any other phase begins.

**Tables to Create**:
- `chat_sessions` - Store conversation history
- `paper_read_progress` - Track reading progress
- `paper_summaries` - Cache AI summaries

**Acceptance Criteria**:
- [ ] Tables created successfully
- [ ] Foreign keys correct
- [ ] RLS policies in place

**Estimated LOC**: ~80 (SQL)

---

### Phase 1: UI Foundation

#### Task 1: Enhance Paper Card Hashtags (#3)
**File**: `/components/layout/paper-list-sidebar.tsx`
**Changes**:
- Add `#` prefix to tag badges
- Make tags clickable to filter papers
- Improve tag styling with hover effects

**Acceptance Criteria**:
- [ ] Tags display as `#tag-name` format
- [ ] Clicking a tag filters the paper list
- [ ] Selected tag is visually highlighted

**Estimated LOC**: ~30

---

#### Task 2: Create Chat Interface Component
**New File**: `/components/chat/chat-interface.tsx`
**Dependencies**: Task 1

**Implementation**:
```typescript
interface ChatInterfaceProps {
  paperId: string | null;
  onSearchResults: (papers: Paper[]) => void;
  sessionId: string;
}
```

**Features**:
- Fixed bottom position
- Input field with send button
- Message list with streaming support
- Prompt suggestion buttons

**Acceptance Criteria**:
- [ ] Chat interface is fixed at bottom
- [ ] Messages display with proper styling
- [ ] Input field submits on Enter
- [ ] Prompt buttons are clickable

**Estimated LOC**: ~200

---

#### Task 3: Create Chat Message Component
**New File**: `/components/chat/chat-message.tsx`

**Features**:
- User/Assistant message styling
- Markdown rendering support
- Paper recommendation cards
- Loading indicator

**Acceptance Criteria**:
- [ ] User messages align right
- [ ] Assistant messages align left
- [ ] Markdown renders correctly
- [ ] Paper cards are clickable

**Estimated LOC**: ~100

---

#### Task 4: Create Prompt Buttons Component
**New File**: `/components/chat/prompt-buttons.tsx`

**Features**:
- Dynamic button rendering from signals
- Hover and click states
- Icon support

**Acceptance Criteria**:
- [ ] Buttons render dynamically
- [ ] Click triggers chat message
- [ ] Buttons hide after use

**Estimated LOC**: ~50

---

#### Task 5: Update Main Layout for Chat
**File**: `/app/page.tsx`

**Changes**:
- Add ChatInterface below main content
- Adjust height calculation for chat area
- Pass state handlers between components

**Acceptance Criteria**:
- [ ] Chat interface visible at bottom
- [ ] Layout adjusts for chat height
- [ ] State flows correctly between components

**Estimated LOC**: ~40

---

### Phase 2: Document Viewer

#### Task 6: Create PDF Viewer Component (#4)
**New File**: `/components/papers/pdf-viewer.tsx`

**Implementation**:
- Use react-pdf for rendering
- Support zoom in/out (50% - 200%)
- Page navigation (prev/next, jump to page)
- Scroll position tracking

**Acceptance Criteria**:
- [ ] PDF files render correctly
- [ ] Zoom controls work
- [ ] Page navigation works
- [ ] Scroll position is tracked

**Estimated LOC**: ~250

---

#### Task 7: Create DOCX Viewer Component
**New File**: `/components/papers/docx-viewer.tsx`

**Implementation**:
- Use mammoth.js for conversion
- HTML rendering with sanitization
- Basic styling for document content

**Acceptance Criteria**:
- [ ] DOCX files render correctly
- [ ] Formatting is preserved
- [ ] Images display if present

**Estimated LOC**: ~150

---

#### Task 8: Update Paper Viewer Component
**File**: `/components/papers/paper-viewer.tsx`

**Changes**:
- Integrate PDF and DOCX viewers
- Fetch paper data including file URL
- Implement zoom state management
- Add download button functionality

**Acceptance Criteria**:
- [ ] Correct viewer loads based on file type
- [ ] Zoom state persists
- [ ] Download works correctly
- [ ] Loading state shows properly

**Estimated LOC**: ~100

---

### Phase 3: Chat Backend

#### Task 9: Create Skills Registry
**New File**: `/skills/registry.json`

**Skills to Define**:
```json
{
  "skills": [
    { "skill_id": "greeting", "triggers": ["site_enter"] },
    { "skill_id": "paper_search", "triggers": ["search_query"] },
    { "skill_id": "paper_explain", "triggers": ["paper_select"] },
    { "skill_id": "survey_complete", "triggers": ["survey_submitted"] },
    { "skill_id": "recommend_next", "triggers": ["paper_read_complete"] },
    { "skill_id": "general_chat", "triggers": ["default"] }
  ]
}
```

**Acceptance Criteria**:
- [ ] All 6 skills defined
- [ ] Triggers mapped correctly
- [ ] Budget constraints set

**Estimated LOC**: ~100 (JSON)

---

#### Task 10: Create Skill Prompts
**New File**: `/lib/orchestrator/prompts.ts`

**Prompts to Create**:
- `greeting`: Welcome message, introduce platform
- `paper_search`: Vector search, format results
- `paper_explain`: Summarize selected paper
- `survey_complete`: Congratulate, recommend papers
- `recommend_next`: Find similar papers
- `general_chat`: Handle general questions

**Acceptance Criteria**:
- [ ] Each skill has a prompt template
- [ ] Prompts include output format specs
- [ ] Signals schema documented

**Estimated LOC**: ~300

---

#### Task 11: Create Pre-Orchestrator
**New File**: `/lib/orchestrator/pre-orchestrator.ts`

**Implementation**:
- Parse user message/hook event
- Route to appropriate skill
- Handle ambiguous requests

**Acceptance Criteria**:
- [ ] Correctly routes messages to skills
- [ ] Handles hook events
- [ ] Returns skill_id and context

**Estimated LOC**: ~150

---

#### Task 12: Create Context Composer
**New File**: `/lib/orchestrator/composer.ts`

**Implementation**:
- Build context pack for skill
- Include relevant paper data
- Include conversation history
- Respect token budgets

**Acceptance Criteria**:
- [ ] Context includes required modules
- [ ] Token budget respected
- [ ] Conversation history trimmed appropriately

**Estimated LOC**: ~200

---

#### Task 13: Create Skill Executor
**New File**: `/lib/orchestrator/executor.ts`

**Implementation**:
- Call Azure OpenAI with composed context
- Parse response and signals
- Handle streaming responses

**Acceptance Criteria**:
- [ ] LLM calls complete successfully
- [ ] Signals are parsed correctly
- [ ] Streaming works properly

**Estimated LOC**: ~250

---

#### Task 14: Create Post-Orchestrator
**New File**: `/lib/orchestrator/post-orchestrator.ts`

**Implementation**:
- Evaluate execution signals
- Decide reroute or stop
- Handle skill chaining

**Acceptance Criteria**:
- [ ] Reroute decisions correct
- [ ] Skill chaining works
- [ ] Stop conditions respected

**Estimated LOC**: ~100

---

#### Task 15: Create Chat API Endpoint
**New File**: `/app/api/v1/chat/route.ts`

**Implementation**:
- Handle POST requests
- Support streaming responses
- Integrate orchestrator pipeline

**Request/Response**:
```typescript
interface ChatRequest {
  message?: string;
  trigger?: TriggerEvent;
  paperId?: string;
  sessionId: string;
  history?: Message[];
  stream?: boolean;
}
```

**Acceptance Criteria**:
- [ ] API accepts chat requests
- [ ] Streaming response works
- [ ] Signals returned in response
- [ ] Search results included when relevant

**Estimated LOC**: ~200

---

### Phase 4: Vector Search

#### Task 16: Create Embedding Service
**New File**: `/lib/embeddings/azure-embeddings.ts`

**Implementation**:
- Azure OpenAI embedding API wrapper
- text-embedding-3-small model
- Batch embedding support

**Acceptance Criteria**:
- [ ] Embeddings generated successfully
- [ ] Correct dimension (1536)
- [ ] Error handling in place

**Estimated LOC**: ~80

---

#### Task 17: Create Vector Search API (#6)
**New File**: `/app/api/v1/search/vector/route.ts`

**Implementation**:
- Accept query string
- Generate embedding
- Call `match_paper_chunks` function
- Return ranked results

**Request/Response**:
```typescript
interface VectorSearchRequest {
  query: string;
  topK?: number;
  threshold?: number;
  paperId?: string;
}
```

**Acceptance Criteria**:
- [ ] Semantic search returns relevant results
- [ ] Threshold filtering works
- [ ] Paper-specific search works

**Estimated LOC**: ~100

---

#### Task 18: Create Hybrid Search Service
**New File**: `/lib/search/hybrid-search.ts`

**Implementation**:
- Combine vector search + keyword search
- Rank fusion algorithm (RRF)
- Deduplication

**Acceptance Criteria**:
- [ ] Both search types combined
- [ ] Results properly ranked
- [ ] No duplicates in results

**Estimated LOC**: ~150

---

### Phase 5: AI Features

#### Task 19: Create Paper Summary API (#8)
**New File**: `/app/api/v1/papers/[id]/summary/route.ts`

**Implementation**:
- Fetch paper chunks
- Two-stage summarization (chunk -> full)
- Cache to `paper_summaries` table
- Return structured summary

**Response**:
```typescript
interface SummaryResponse {
  summary: string;
  keyPoints: string[];
  methodology?: string;
  results?: string;
  conclusion?: string;
}
```

**Acceptance Criteria**:
- [ ] Summary generates correctly
- [ ] Cached summaries returned fast
- [ ] Structured fields populated

**Estimated LOC**: ~200

---

#### Task 21: Update Types
**File**: `/types/database.ts`

**New Types**:
```typescript
interface ChatSession { ... }
interface PaperReadProgress { ... }
interface PaperSummary { ... }
interface Message { ... }
interface ExecutionSignals { ... }
```

**Acceptance Criteria**:
- [ ] All new types defined
- [ ] Database types updated
- [ ] No TypeScript errors

**Estimated LOC**: ~100

---

### Phase 6: Recommendations

#### Task 22: Create Paper Recommendation Service
**New File**: `/lib/recommendations/paper-recommendations.ts`

**Implementation**:
- Find similar papers by embedding
- Filter by user's reading history
- Score and rank candidates

**Acceptance Criteria**:
- [ ] Returns relevant recommendations
- [ ] Excludes already-read papers
- [ ] Respects diversity

**Estimated LOC**: ~150

---

#### Task 23: Survey Completion Handler (#7)
**File**: `/components/layout/survey-sidebar.tsx`

**Changes**:
- Add survey completion callback
- Trigger `survey_complete` event
- Display congratulations message
- Show recommended papers

**Acceptance Criteria**:
- [ ] Completion triggers event
- [ ] Congratulations shown
- [ ] Recommendations displayed
- [ ] Animation/celebration effect

**Estimated LOC**: ~100

---

#### Task 24: Reading Progress Tracker (#9)
**New File**: `/hooks/use-reading-progress.ts`

**Implementation**:
- Track scroll percentage
- Detect completion (>90% scrolled)
- Debounced progress updates
- Trigger recommendation on completion

**Acceptance Criteria**:
- [ ] Progress tracked accurately
- [ ] Completion detected
- [ ] API updates sent
- [ ] Recommendations triggered

**Estimated LOC**: ~100

---

#### Task 25: Create Progress API
**New File**: `/app/api/v1/papers/[id]/progress/route.ts`

**Implementation**:
- GET: Fetch progress for paper
- POST/PUT: Update progress
- Handle completion flag

**Acceptance Criteria**:
- [ ] Progress saved correctly
- [ ] Completion flag set
- [ ] Session isolation works

**Estimated LOC**: ~80

---

### Phase 7: Integration

#### Task 26: Integration Testing
**Files**: Multiple

**Tasks**:
- Test chat flow end-to-end
- Test PDF and DOCX viewing
- Test search functionality
- Test recommendations

**Acceptance Criteria**:
- [ ] All features work together
- [ ] No console errors
- [ ] Performance acceptable

---

#### Task 27: UI Polish
**Files**: Multiple

**Tasks**:
- Add loading states
- Add error handling UI
- Improve animations
- Mobile responsiveness check

**Acceptance Criteria**:
- [ ] Loading states visible
- [ ] Errors handled gracefully
- [ ] Smooth animations
- [ ] Mobile works correctly

---

## Commit Strategy

### Commit 0: Database Prerequisites
- Task 20 (Database Migration)
- Message: "feat(db): Add chat_sessions, paper_read_progress, paper_summaries tables"
- **MUST** be committed and applied before other work begins

### Commit 1: UI Foundation
- Tasks 1-5 (Hashtags, Chat Interface, Chat Message, Prompt Buttons, Layout Update)
- Message: "feat(ui): Add chat interface and enhanced paper cards"

### Commit 2: Document Viewer
- Tasks 6-8 (PDF Viewer, DOCX Viewer, Paper Viewer Integration)
- Message: "feat(viewer): Add PDF and DOCX document viewers"

### Commit 3: Chat Backend Core
- Tasks 9-15 (Skills Registry, Prompts, Pre-Orchestrator, Composer, Executor, Post-Orchestrator, Chat API)
- Message: "feat(chat): Implement skill-based chat orchestration"

### Commit 4: Vector Search
- Tasks 16-18 (Embedding Service, Vector Search API, Hybrid Search)
- Message: "feat(search): Add vector-based semantic search"

### Commit 5: AI Summary & Types
- Tasks 19, 21 (Summary API, Types Update)
- Message: "feat(ai): Add AI paper summary generation"

### Commit 6: Recommendations
- Tasks 22-25 (Recommendation Service, Survey Handler, Progress Hook, Progress API)
- Message: "feat(recommend): Add reading progress and recommendations"

### Commit 7: Polish
- Tasks 26-27 (Integration Testing, UI Polish)
- Message: "chore: Polish UI and integration testing"

---

## Success Criteria

### Functional Requirements Met
- [ ] #3: Paper cards show `#hashtags` and filter on click
- [ ] #4: PDF/DOCX files display in center viewer
- [ ] #5: Chat interface at bottom handles queries
- [ ] #6: Vector search returns semantically similar papers
- [ ] #7: Survey completion shows congrats + recommendations
- [ ] #8: Paper selection generates AI summary
- [ ] #9: Reading completion prompts survey + recommendations

### Non-Functional Requirements
- [ ] Chat response time < 3s for non-streaming
- [ ] Document viewer renders within 2s
- [ ] Search results return within 1s
- [ ] No memory leaks in long sessions
- [ ] Mobile-responsive layout

---

## Existing Infrastructure

### Paper Chunking Script
**File**: `scripts/import-papers.ts`
**Status**: Already exists and handles paper chunking
**Usage**: Run this script to populate `paper_chunks` table before testing vector search

---

## Risk Identification

### Risk 1: Paper Chunks Not Populated
**Mitigation**: Run existing `scripts/import-papers.ts` to populate `paper_chunks` table. This script already handles chunking logic.

### Risk 2: Azure OpenAI Rate Limits
**Mitigation**: Implement retry logic with exponential backoff

### Risk 3: Large PDF Performance
**Mitigation**: Implement virtual scrolling, load pages on demand

### Risk 4: DOCX Formatting Issues
**Mitigation**: Test with sample files, handle edge cases gracefully

### Risk 5: Vector Search Cold Start
**Mitigation**: Pre-warm embeddings, cache common queries

---

## File Structure (New Files)

```
/app
  /api/v1
    /chat
      route.ts                    # Chat API
    /search
      /vector
        route.ts                  # Vector search API
    /papers/[id]
      /summary
        route.ts                  # Summary API
      /progress
        route.ts                  # Progress API

/components
  /chat
    chat-interface.tsx           # Main chat UI
    chat-message.tsx             # Message component
    prompt-buttons.tsx           # Suggestion buttons
  /papers
    pdf-viewer.tsx               # PDF viewer
    docx-viewer.tsx              # DOCX viewer

/lib
  /orchestrator
    pre-orchestrator.ts          # Skill routing
    composer.ts                  # Context building
    executor.ts                  # LLM execution
    post-orchestrator.ts         # Reroute logic
    prompts.ts                   # Skill prompts
  /embeddings
    azure-embeddings.ts          # Embedding service
  /search
    hybrid-search.ts             # Combined search
  /recommendations
    paper-recommendations.ts     # Recommendation logic

/hooks
  use-reading-progress.ts        # Reading progress hook

/skills
  registry.json                  # Skills metadata

/supabase/migrations
  002_chat_and_progress.sql      # New tables

/types
  database.ts                    # Updated types (modify)
```

---

## Dependencies to Verify

### Already Installed (package.json)
- [x] react-pdf ^9.2.0
- [x] mammoth ^1.9.0
- [x] openai ^6.17.0
- [x] @supabase/supabase-js ^2.93.3

### Environment Variables Needed
```env
# Azure OpenAI (Chat) - VERIFY deployment name with team
# The deployment name below is a placeholder - confirm actual deployment name
AZURE_OPENAI_CHAT_DEPLOYMENT=<your-chat-deployment-name>
AZURE_OPENAI_CHAT_API_VERSION=2024-12-01-preview

# Azure OpenAI (Embedding) - verify existing
AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-small
AZURE_EMBEDDING_API_VERSION=2023-05-15
```

**NOTE**: Verify the Azure OpenAI chat deployment name before implementation. Check existing `.env` or Azure portal for the correct deployment name.

---

## Estimated Timeline

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| Phase 0: Database Prerequisites | 20 | 0.5-1 hour |
| Phase 1: UI Foundation | 1-5 | 4-6 hours |
| Phase 2: Document Viewer | 6-8 | 3-4 hours |
| Phase 3: Chat Backend | 9-15 | 6-8 hours |
| Phase 4: Vector Search | 16-18 | 2-3 hours |
| Phase 5: AI Features | 19, 21 | 2-3 hours |
| Phase 6: Recommendations | 22-25 | 4-5 hours |
| Phase 7: Integration | 26-27 | 2-3 hours |

**Total Estimated**: 24-34 hours

---

## Notes for Executor

1. **Phase 0 is mandatory first** - Task 20 (Database Migration) MUST complete before any other phase. Other tasks depend on new tables.
2. **Task 9 (Skills Registry)** should match ce-tyriunnie patterns closely
3. **Task 6 (PDF Viewer)** - react-pdf requires special Next.js config for worker
4. **Task 15 (Chat API)** is the integration point - test thoroughly
5. **Paper chunking already exists** - Run `scripts/import-papers.ts` if `paper_chunks` is empty (no new task needed)

---

PLAN_READY: .omc/plans/prd-v2-implementation.md
