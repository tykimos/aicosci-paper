# AI-CO-SCI 온톨로지 분석 시스템 PRD

> **문서 버전**: v1.0
> **작성일**: 2026-02-24
> **플랫폼**: AI-CO-SCI 연구보고서 리뷰 시스템
> **현황**: 논문 137건, 익명 참여자 565+명, 설문 500+건

---

## 1. 개요

### 1.1 배경

AI-CO-SCI 플랫폼은 과학기술 연구보고서를 대중에 공개하고, 익명 참여자로부터 설문 평가를 수집하는 시스템이다. 현재 관리자 페이지에는 기본 통계(총 논문 수, 설문 수, 참여자 수)와 단순 분포 차트(디바이스, 브라우저, OS)만 제공되며, 데이터 간의 관계성 분석이나 심층 인사이트 도출이 불가능하다.

### 1.2 목표

**온톨로지 분석 시스템**을 통해 다음을 실현한다:

1. **연구 주제 간 관계 지도** 구축 - 논문들이 어떻게 연결되는가
2. **참여자 행동 패턴 분석** - 누가, 어떻게, 왜 특정 논문을 읽는가
3. **이상 징후 자동 탐지** - 봇, 조작, 중복 응답을 식별
4. **실행 가능한 인사이트** - 분석 결과에서 구체적 액션을 도출

### 1.3 핵심 원칙

- **인사이트 → 액션**: 모든 분석 화면은 "그래서 무엇을 해야 하는가"로 끝나야 한다
- **기존 데이터 활용**: 새로운 데이터 수집 없이, 현재 DB에 축적된 데이터만으로 분석
- **점진적 구현**: 가장 가치 있는 모듈부터 순차 개발

---

## 2. 활용 가능한 데이터 인벤토리

### 2.1 핵심 테이블

| 테이블 | 주요 컬럼 | 레코드 규모 | 분석 활용 |
|--------|-----------|------------|----------|
| `papers` | title, authors[], tags[], vote_count, survey_count, created_at, hidden_at | ~137건 | 주제 분류, 품질-참여 매트릭스 |
| `anonymous_sessions` | fingerprint, ip_address, device_type, browser, os, referrer, language, created_at, last_active_at | ~565+건 | 사용자 클러스터링, 이상 탐지 |
| `surveys` | paper_id, session_id, responses(JSONB), completed_at | ~500+건 | 평가 품질 분석, 이상 탐지 |
| `paper_read_progress` | session_id, paper_id, scroll_percentage, read_complete, time_spent_seconds, created_at | 수천 건 | 읽기 행동, 탐색 흐름 |
| `votes` | paper_id, session_id, vote_type(up/down), created_at | 수백 건 | 참여도, 투표 조작 탐지 |
| `chat_sessions` | session_id, messages(JSONB), signals(JSONB), created_at | 수백 건 | AI 활용 패턴 |
| `paper_chunks` | paper_id, content, embedding(vector 1536), metadata | 수천 건 | 콘텐츠 유사도 |
| `paper_summaries` | paper_id, summary, key_points, methodology, results | ~137건 | 주제 요약 |
| `tags` | name, paper_count | ~20+개 | 주제 분류 체계 |

### 2.2 설문 응답 구조 (JSONB)

```
섹션 1 - 응답자 정보
├── q1-birthYear: 출생연도 (숫자)
├── q1-organization: 소속기관 (대학/출연연/기업/기타비영리/기타)
├── q1-1: 소속유형 (일반국민/대학생/대학원생/연구자/산업계/기타)
└── q1-2: 연구보고서 접촉빈도 (거의없음/가끔/종종/자주)

섹션 2 - 논문 평가
├── q2-1: 전반적 평가 (매우우수~매우미흡, 5점)
├── q2-2: 세부평가 매트릭스 (5항목 x 5척도)
│   ├── 주제 흥미도
│   ├── 사회적 의미
│   ├── 이해 용이성
│   ├── 문제 제기 타당성
│   └── 결론 설득력
├── q2-3: 대국민 공개 가치 (5점)
├── q2-4: 실생활 기여 가능성 (5점)
└── q2-5: 추천 의향 (적극추천~추천안함, 4점)

섹션 3 - 추가 의견
├── q3-1: 가장 인상적인 부분 (자유텍스트)
├── q3-2: 어렵거나 개선할 부분 (자유텍스트)
├── q3-3: 개선 제안 (체크박스 복수선택)
└── q3-4: 기타 의견 (자유텍스트)
```

---

## 3. 분석 모듈 상세

### 3.1 모듈 1: 주제 분석 (Topic Landscape)

#### 목적
137개 논문이 연구 주제별로 어떻게 연결되고, 어떤 주제가 높은 참여를 이끌어내는지 파악한다.

#### 데이터 소스
- `papers.tags[]` - 논문별 태그 배열
- `tags` 테이블 - 태그별 논문 수
- `paper_chunks.embedding` - 1536차원 벡터 임베딩
- `paper_read_progress` - 태그별 읽기 수 집계
- `surveys` - 태그별 설문 수 집계

#### 분석 항목

**A. 태그 동시출현 매트릭스**
- 모든 태그 쌍(A, B)에 대해 두 태그를 동시에 가진 논문 수를 계산
- 결과: 대칭 행렬 (예: "바이오" + "AI" = 8건)

```
계산 로직:
1. 모든 papers에서 tags[] 추출
2. 각 논문의 태그 쌍 조합 생성
3. 쌍별 빈도 누적 → N x N 매트릭스
```

**B. 태그별 참여도 랭킹**

| 태그 | 논문수 | 총읽기 | 총설문 | 평균평점 | 참여율(설문/읽기) |
|------|--------|--------|--------|---------|----------------|
| 바이오 | 30 | 450 | 120 | 3.8 | 26.7% |
| AI | 15 | 380 | 95 | 4.1 | 25.0% |
| ... | ... | ... | ... | ... | ... |

계산: 태그별로 해당 태그를 가진 논문들의 read_count, survey_count, q2-1 평균을 집계

**C. 콘텐츠 유사도 클러스터**
- 논문별 청크 임베딩의 중심점(centroid) 계산
- 논문 간 코사인 유사도 > 0.8이면 동일 클러스터
- 태그와 무관한 "내용 기반" 유사 논문 그룹 발견

#### 시각화
1. **태그 히트맵**: X/Y축 = 태그, 셀 색상 = 동시출현 빈도
2. **태그 참여도 테이블**: 정렬 가능한 표
3. **유사 논문 클러스터 카드**: 클러스터별 논문 목록 + 공통 키워드

#### 인사이트 예시
- "바이오와 AI 태그가 8건에서 교차 → 융합연구 트렌드"
- "수학 태그 논문 15건 중 설문 참여율 8%로 최하위 → 접근성 문제"
- "태그 없이 콘텐츠 유사도로 보면 '에너지'와 '재료화학'이 실질적으로 같은 클러스터"

#### 실행 액션
| 액션 | 트리거 조건 | 구체적 행동 |
|------|-----------|-----------|
| 태그 병합 제안 | 두 태그의 논문 80%+ 중복 | "A와 B를 통합하시겠습니까?" 버튼 |
| 저참여 주제 프로모션 | 참여율 10% 미만 태그 | 해당 태그 논문을 메인 추천에 가중치 부여 |
| 리딩 패스 생성 | 높은 동시출현 태그 쌍 | "A → B → C" 추천 경로 자동 생성 |

---

### 3.2 모듈 2: 사용자 행동 분석 (User Behavior Clusters)

#### 목적
565+ 익명 참여자를 행동 패턴에 따라 페르소나로 분류하고, 각 그룹의 특성을 파악한다.

#### 데이터 소스
- `anonymous_sessions` - 세션 메타데이터
- `paper_read_progress` - 읽기 행동 (시간, 스크롤, 완료 여부)
- `surveys` - 설문 참여 이력 + 응답 내용
- `votes` - 투표 이력

#### 분석 항목

**A. 세션별 특징 벡터**

각 session_id에 대해 다음 지표를 계산:

| 지표 | 계산 방법 | 용도 |
|------|----------|------|
| `papers_read` | paper_read_progress에서 distinct paper_id 수 | 탐색 범위 |
| `papers_completed` | read_complete = true 수 | 깊이 |
| `total_time` | SUM(time_spent_seconds) | 총 투자 시간 |
| `avg_time_per_paper` | total_time / papers_read | 논문당 집중도 |
| `avg_scroll_depth` | AVG(scroll_percentage) | 읽기 깊이 |
| `surveys_completed` | surveys 테이블에서 해당 세션 수 | 설문 참여 |
| `survey_rate` | surveys / papers_read | 설문 전환율 |
| `votes_cast` | votes 테이블에서 해당 세션 수 | 투표 참여 |
| `tags_explored` | 읽은 논문들의 distinct 태그 수 | 주제 다양성 |
| `session_duration` | last_active_at - created_at | 총 체류 시간 |
| `avg_rating` | 설문 q2-1의 평균값 | 평가 경향 |

**B. 규칙 기반 클러스터링 (5개 유형)**

| 페르소나 | 조건 | 예상 비율 |
|---------|------|----------|
| **스키머 (Skimmer)** | papers_read ≥ 5 AND avg_time < 60초 AND avg_scroll < 50% | ~25-35% |
| **딥리더 (Deep Reader)** | avg_time ≥ 180초 AND avg_scroll ≥ 80% | ~15-20% |
| **서베이 챔피언** | survey_rate ≥ 50% AND surveys ≥ 3 | ~10-15% |
| **드라이브바이 방문자** | papers_read ≤ 2 AND surveys = 0 AND session_duration < 300초 | ~30-40% |
| **파워유저** | papers_read ≥ 10 AND surveys ≥ 5 AND avg_time ≥ 120초 | ~5-10% |

분류 우선순위: 파워유저 > 서베이챔피언 > 딥리더 > 스키머 > 드라이브바이

**C. 인구통계 교차 분석**
- 각 클러스터 내에서 설문 섹션1 응답(소속, 유형, 접촉빈도) 분포
- 예: "딥리더의 60%가 대학원생/연구자, 스키머의 45%가 일반국민"

#### 시각화
1. **산점도**: X = 읽은 논문 수, Y = 논문당 평균 시간, 색상 = 클러스터, 크기 = 설문 수
2. **클러스터 요약 카드**: 클러스터별 인원, 핵심 지표, 특징 설명
3. **인구통계 스택 바**: 클러스터별 소속/유형 분포
4. **세션 타임라인** (선택): 특정 세션의 시간순 논문 방문 기록

#### 인사이트 예시
- "드라이브바이 방문자가 35%로 가장 큰 비중 → 초기 진입 경험 개선 필요"
- "딥리더의 설문 완료율 78%, 스키머는 12% → 읽기 깊이와 설문 참여 강한 상관"
- "대학 소속 참여자는 딥리더 확률 3배 높음"
- "파워유저 32명이 전체 설문의 40%를 차지"

#### 실행 액션
| 액션 | 대상 클러스터 | 구체적 행동 |
|------|-------------|-----------|
| 간소화 설문 도입 | 드라이브바이 | 필수 항목만 남긴 1분 설문 옵션 제공 |
| 읽기 유도 | 스키머 | 논문 하이라이트/요약 자동 표시로 체류 시간 증가 |
| 인센티브 | 파워유저 | 참여 배지/인증서 또는 결과 리포트 공유 |
| 모바일 최적화 | 디바이스별 분석 | 모바일 비율 높은 클러스터에 맞춘 UI 개선 |

---

### 3.3 모듈 3: 탐색 흐름 분석 (Navigation Flows)

#### 목적
사용자가 논문을 어떤 순서로 탐색하는지 파악하여, "게이트웨이 논문"과 최적 리딩 경로를 발견한다.

#### 데이터 소스
- `paper_read_progress.created_at` - 논문 최초 접근 시간 (순서 결정)
- `paper_read_progress.session_id` - 세션별 그룹핑
- `papers.tags[]` - 태그 수준 흐름 분석
- `surveys.completed_at` - 설문 전환 시점

#### 분석 항목

**A. 논문 간 전이 매트릭스**

```
계산 로직:
1. paper_read_progress를 session_id로 그룹핑
2. 각 세션 내에서 created_at 순으로 정렬
3. 연속된 논문 쌍 (A→B) 카운트
4. 상위 50개 전이 쌍 추출
```

결과 예시:
| 출발 논문 | 도착 논문 | 전이 횟수 |
|----------|----------|----------|
| 논문 #42 (AI 윤리) | 논문 #38 (AI 안전) | 23회 |
| 논문 #15 (바이오) | 논문 #22 (신약) | 18회 |

**B. 게이트웨이 논문 랭킹**
- 각 세션에서 가장 먼저 읽은 논문 (created_at이 가장 이른 paper_id)
- "첫 논문"으로 가장 많이 선택된 상위 20개

| 순위 | 논문 | 첫 읽기 횟수 | 설문 전환율 | 2번째 논문으로 이어진 비율 |
|------|------|------------|-----------|---------------------|
| 1 | 논문 #42 | 87회 (15.4%) | 34% | 78% |
| 2 | 논문 #15 | 52회 (9.2%) | 28% | 65% |

**C. 태그 간 전이 흐름**
- 논문 수준이 아닌 태그 수준에서의 전이
- 예: "바이오" 태그 논문 → "AI" 태그 논문으로 전환한 세션 수
- 교차 주제 브릿지 논문: 두 태그의 전이를 매개하는 논문

**D. 전환 퍼널**

```
세션 생성        → 565명 (100%)
↓
첫 논문 읽기     → ???명 (??%)
↓
2번째 논문 읽기  → ???명 (??%)
↓
설문 시작        → ???명 (??%)
↓
설문 완료        → ???명 (??%)
```

각 단계별 이탈률 계산

**E. 빈출 읽기 시퀀스**
- 2-논문 시퀀스 TOP 10
- 3-논문 시퀀스 TOP 10

#### 시각화
1. **생키 다이어그램**: 상위 20개 논문 간 전이 흐름 (Recharts Sankey)
2. **게이트웨이 테이블**: 첫 읽기 빈도 + 전환율 정렬
3. **태그 전이 히트맵**: 태그 간 전이 빈도
4. **퍼널 차트**: 단계별 전환/이탈률
5. **인기 시퀀스 목록**: 빈출 읽기 경로 카드

#### 인사이트 예시
- "논문 #42가 전체 세션의 15%에서 첫 논문 → 메인 노출 효과 확인"
- "AI 윤리 → AI 안전 → 바이오AI 순서가 가장 인기 있는 3-논문 경로"
- "첫 논문 읽기까지 85%가 진행하지만, 2번째 논문으로는 45%만 이어짐"
- "설문 전환율: 읽기 대비 18% → 설문 진입점 UX 개선 필요"

#### 실행 액션
| 액션 | 트리거 조건 | 구체적 행동 |
|------|-----------|-----------|
| 게이트웨이 프로모션 | 첫 읽기 빈도 상위 5개 | 메인 페이지 "추천 시작 논문" 섹션 |
| 리딩 패스 추천 | 빈출 시퀀스 TOP 5 | "이 논문 다음에 읽을 논문" 자동 추천 |
| 이탈 방지 | 1→2번째 논문 전환율 < 50% | 논문 하단에 관련 논문 카드 추가 |
| 설문 유도 | 읽기→설문 전환율 < 20% | 논문 80% 스크롤 시 설문 프롬프트 |

---

### 3.4 모듈 4: 품질-참여 매트릭스 (Quality-Engagement Matrix)

#### 목적
논문의 "평가 품질"과 "참여도"를 교차 분석하여 히든젬(높은 품질 + 낮은 참여)을 발견하고, 읽기 행동과 평가 품질의 상관관계를 파악한다.

#### 데이터 소스
- `surveys.responses` - q2-1(전반적 평가), q2-3(공개 가치), q2-4(기여도), q2-5(추천)
- `paper_read_progress` - 읽기 수, 시간, 스크롤 깊이
- `votes` - 투표 수
- `papers.tags[]` - 태그별 집계

#### 분석 항목

**A. 복합 품질 점수 (Quality Score)**

논문별로 설문 응답을 정규화하여 0~1 사이 점수 산출:

```
quality_score = 0.40 * normalize(q2-1 평균)   # 전반적 평가
              + 0.30 * normalize(q2-5 평균)   # 추천 의향
              + 0.30 * normalize(q2-3 평균)   # 공개 가치

normalize: 1점→0.0, 2점→0.25, 3점→0.5, 4점→0.75, 5점→1.0
```

최소 설문 수: 3건 이상인 논문만 점수 산출 (통계적 의미)

**B. 복합 참여 점수 (Engagement Score)**

```
engagement_score = 0.30 * normalize(read_count)         # 읽기 수
                 + 0.30 * normalize(avg_time_spent)     # 평균 읽기 시간
                 + 0.20 * normalize(avg_scroll_depth)   # 평균 스크롤 깊이
                 + 0.20 * normalize(survey_count)       # 설문 수

normalize: 각 지표를 전체 논문 중 min-max 정규화
```

**C. 4사분면 분류**

```
                높은 참여
                   │
    인기 불일치     │     스타
    (Popular but   │   (Stars)
     Questionable) │
    ───────────────┼───────────────
    주의 필요       │   히든젬
    (Needs         │   (Hidden
     Attention)    │    Gems)
                   │
                낮은 참여
   낮은 품질 ─────────────── 높은 품질
```

기준선: 품질/참여 각각의 중앙값(median)

**D. 읽기 시간 vs 평가 품질 상관관계**
- X축: 논문당 평균 읽기 시간 (초)
- Y축: 해당 논문의 평균 q2-1 점수
- 피어슨 상관계수(r) 계산
- 가설: "오래 읽은 논문일수록 높은 평가를 받는가?"

**E. 설문 응답 깊이 분석**
- 텍스트 응답(q3-1, q3-2, q3-4) 길이와 읽기 시간의 관계
- "깊이 있게 읽은 사용자가 더 상세한 피드백을 남기는가?"

**F. 태그별 품질-참여 집계**
- 각 태그의 평균 품질 점수와 평균 참여 점수
- 어떤 연구 분야가 "고품질 저참여"인지 한눈에 파악

#### 시각화
1. **2D 매트릭스 산점도**: X=참여, Y=품질, 점=논문, 색=태그, 4사분면 구분선
2. **히든젬 테이블**: 고품질 저참여 논문 목록 (품질순 정렬)
3. **상관관계 차트**: 읽기 시간 vs 평점 산점도 + 추세선 + r값
4. **태그별 매트릭스**: 태그를 점으로 표시한 축소판 매트릭스

#### 인사이트 예시
- "12개 논문이 히든젬: 평균 평점 4.2이지만 읽기 5건 미만"
- "3분 이상 읽은 논문의 평균 평점 3.8, 1분 미만은 2.9 (r=0.72)"
- "'AI 윤리' 태그: 사회적 기여도 최상위, 추천 의향은 중간"
- "인기 불일치 논문 3건: 높은 조회수에도 평점 2.5 이하 → 제목과 내용 불일치 가능성"

#### 실행 액션
| 액션 | 대상 | 구체적 행동 |
|------|------|-----------|
| 히든젬 프로모션 | 히든젬 사분면 논문 | 메인 "숨겨진 보석" 섹션에 노출 |
| 품질 조사 | 인기 불일치 논문 | 해당 논문의 설문 텍스트 응답 집중 분석 |
| 최소 읽기 시간 | 전체 | 30초 미만 읽기 시 설문 진입 제한 검토 |
| 태그별 전략 | 저참여 고품질 태그 | 해당 분야 논문 추천 알고리즘 가중치 조정 |

---

### 3.5 모듈 5: 이상 징후 탐지 (Anomaly Detection)

#### 목적
봇, 설문 조작, IP 담합 등 비정상 행동을 자동 탐지하여 데이터 신뢰도를 확보한다.

#### 데이터 소스
- `anonymous_sessions` - fingerprint, ip_address, created_at
- `surveys` - session_id, paper_id, completed_at, responses
- `paper_read_progress` - time_spent_seconds, scroll_percentage, created_at
- `votes` - session_id, paper_id, created_at

#### 탐지 규칙 (8개)

##### 규칙 1: 연타 설문 (RAPID_SURVEY) - 심각도: HIGH

| 항목 | 내용 |
|------|------|
| **조건** | 한 세션이 10분 내 3건 이상 설문 제출, 또는 연속 설문 간격 < 2분 |
| **쿼리** | surveys를 session_id로 그룹, completed_at 순 정렬, 시간 간격 계산 |
| **근거** | 설문 최소 소요시간 약 3-5분. 2분 내 제출은 무성의 응답 가능성 |

##### 규칙 2: 초고속 읽기 (SPEED_READING) - 심각도: MEDIUM

| 항목 | 내용 |
|------|------|
| **조건** | read_complete = true이면서 time_spent_seconds < 15초 |
| **쿼리** | paper_read_progress에서 read_complete=true AND time_spent<15 |
| **근거** | 논문을 15초 내에 완독하는 것은 물리적으로 불가능 |

##### 규칙 3: IP 담합 (IP_CLUSTER) - 심각도: HIGH

| 항목 | 내용 |
|------|------|
| **조건** | 동일 IP에서 5개 이상 서로 다른 fingerprint의 세션 생성, 또는 1시간 내 10건 이상 설문 |
| **쿼리** | anonymous_sessions를 ip_address로 그룹, distinct fingerprint 수 계산 |
| **근거** | 같은 네트워크에서 다수의 브라우저/시크릿모드로 중복 참여 가능성 |

##### 규칙 4: 중복 핑거프린트 (FINGERPRINT_DUPE) - 심각도: MEDIUM

| 항목 | 내용 |
|------|------|
| **조건** | 동일 fingerprint로 3개 이상 session_id 존재 |
| **쿼리** | anonymous_sessions를 fingerprint로 그룹, 세션 수 ≥ 3 |
| **근거** | 브라우저 자동화 도구로 세션 반복 생성 가능성 |

##### 규칙 5: 균일 응답 (UNIFORM_RESPONSES) - 심각도: MEDIUM

| 항목 | 내용 |
|------|------|
| **조건** | 한 세션의 3건 이상 설문에서 q2-1~q2-5 응답이 모두 동일 |
| **쿼리** | surveys를 session_id로 그룹, 응답 패턴 비교 |
| **근거** | 모든 논문에 동일 점수 = 내용 무관하게 기계적으로 클릭 |

##### 규칙 6: 봇 패턴 (BOT_BEHAVIOR) - 심각도: HIGH

| 항목 | 내용 |
|------|------|
| **조건** | 10개 이상 논문의 time_spent_seconds 차이가 5초 이내 (표준편차 < 5), 또는 논문 ID/생성일 순서대로 순차 읽기 |
| **쿼리** | paper_read_progress를 session_id로 그룹, time_spent의 stddev 계산, 읽기 순서와 논문 순서 비교 |
| **근거** | 인간의 읽기 시간은 논문마다 편차가 큼. 일정한 시간 = 자동화 |

##### 규칙 7: 버스트 활동 (BURST_ACTIVITY) - 심각도: LOW

| 항목 | 내용 |
|------|------|
| **조건** | 5분 내 20건 이상의 액션 (읽기 + 설문 + 투표 합산) |
| **쿼리** | 3개 테이블의 타임스탬프를 합쳐 5분 윈도우 슬라이딩 |
| **근거** | 과도한 활동량은 자동화 스크립트일 가능성 (정보 목적) |

##### 규칙 8: 투표 조작 (VOTE_GAMING) - 심각도: HIGH

| 항목 | 내용 |
|------|------|
| **조건** | 5분 내 20건 이상 투표, 또는 동일 IP의 여러 세션이 같은 논문에 투표 |
| **쿼리** | votes를 session_id+시간으로 그룹, ip_address JOIN으로 교차 확인 |
| **근거** | 다중 계정으로 특정 논문 투표 조작 |

#### 출력 데이터 구조

```typescript
interface AnomalyResult {
  rule_id: string;          // 'RAPID_SURVEY', 'IP_CLUSTER', ...
  rule_name: string;        // '연타 설문', 'IP 담합', ...
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  flagged_sessions: {
    session_id: string;
    ip_address: string | null;
    details: string;        // "10분 내 5건 설문 제출"
    evidence: {             // 증거 데이터
      timestamps?: string[];
      paper_ids?: string[];
      values?: number[];
    };
    detected_at: string;
  }[];
  total_flagged: number;
}
```

#### 시각화
1. **이상 징후 대시보드**: HIGH/MEDIUM/LOW 개수 배지 + 총 플래그 세션 수
2. **플래그 세션 테이블**: 심각도, 규칙, IP, 상세내용, 타임스탬프 정렬
3. **IP 클러스터 맵**: IP별 세션 수, 설문 수, fingerprint 수
4. **타임라인**: X=시간, Y=세션, 색=이상 유형의 산점도

#### 인사이트 예시
- "IP 203.xxx.xxx.xxx에서 3개 세션이 20분 내 47건 설문 제출 → HIGH"
- "세션 abc123이 15개 논문을 모두 정확히 22초씩 읽음 → 봇 가능성 HIGH"
- "5개 세션이 fingerprint 'xyz' 공유, IP는 서로 다름 → 브라우저 자동화"
- "전체 설문 중 7.2%가 이상 징후 플래그 → 통계 보정 필요"

#### 실행 액션
| 액션 | 트리거 | 구체적 행동 |
|------|--------|-----------|
| 설문 플래그 처리 | HIGH 규칙 해당 세션 | 해당 세션의 설문을 flagged로 마킹, 집계에서 제외 옵션 |
| IP 모니터링 | IP_CLUSTER 탐지 | 해당 IP 주소를 감시 목록에 추가 |
| 데이터 보정 | 전체 이상 세션 | "이상 세션 제외" 토글로 클린 데이터 통계 재계산 |
| 상세 조사 | 개별 플래그 | 세션의 전체 활동 타임라인 조회 |

---

### 3.6 모듈 6: 실행 가능한 인사이트 (Actionable Insights)

#### 목적
모듈 1~5의 분석 결과를 종합하여 관리자가 즉시 실행할 수 있는 우선순위별 추천 액션을 제시한다.

#### 인사이트 카테고리

**A. 콘텐츠 추천 (Content)**
- 히든젬 논문 프로모션 목록
- 태그 병합/정리 제안
- 추천 리딩 패스 자동 생성

**B. 참여 개선 (Engagement)**
- 드라이브바이 → 활성 사용자 전환 전략
- 설문 전환율 개선 포인트
- 모바일 사용자 경험 개선 항목

**C. 데이터 품질 (Data Quality)**
- 이상 징후 플래그 요약
- 중복 응답 의심 세션 목록
- 데이터 보정 전/후 통계 비교

**D. 연구 발견 (Research Findings)**
- 주제별 평가 점수 분석
- 읽기 깊이와 평가 품질 상관관계
- 인구통계별 참여 패턴 차이

#### 인사이트 데이터 구조

```typescript
interface ActionableInsight {
  id: string;
  category: 'content' | 'engagement' | 'data_quality' | 'research';
  severity: 'critical' | 'warning' | 'info';
  title: string;             // "5개 히든젬 논문 발견"
  description: string;       // "높은 평가를 받았지만 읽기 5건 미만인 논문..."
  metric_value: string;      // "평균 평점 4.2, 평균 읽기 3.2건"
  action_label: string;      // "메인 페이지에 노출"
  action_type: 'link' | 'api_call' | 'export';
  action_target: string;     // "/admin/papers" 또는 API endpoint
  related_entities: {
    type: 'paper' | 'session' | 'tag' | 'ip';
    id: string;
    label: string;
  }[];
  generated_at: string;
}
```

#### 시각화
1. **우선순위 인사이트 카드**: severity별 색상, 제목, 설명, 액션 버튼
2. **KPI 대시보드**: 핵심 지표 8~10개 (히든젬 수, 이상 세션 비율, 평균 전환율 등)
3. **주간 비교**: "이번 주 vs 지난 주" 핵심 지표 트렌드

#### 인사이트 생성 규칙

| 조건 | 인사이트 | severity |
|------|---------|----------|
| 히든젬 5개 이상 발견 | "N개 히든젬 논문을 프로모션하세요" | warning |
| 이상 세션 HIGH 3개+ | "N개 세션에서 심각한 이상 징후 발견" | critical |
| 설문 전환율 < 15% | "설문 참여율이 낮습니다 (X%)" | warning |
| 드라이브바이 비율 > 40% | "방문자의 X%가 1-2개 논문만 보고 이탈" | warning |
| 특정 태그 참여율 < 10% | "'X' 분야 참여율이 Y%로 최하위" | info |
| 읽기→설문 상관 r > 0.7 | "읽기 시간과 평가 품질 강한 상관관계" | info |
| 태그 중복 > 80% | "'A'와 'B' 태그가 Y% 중복됩니다" | info |
| 게이트웨이 논문 발견 | "논문 X가 전체의 Y%에서 첫 논문" | info |

---

## 4. 기술 아키텍처

### 4.1 파일 구조

```
app/
  admin/
    ontology/
      page.tsx                    # 메인 페이지 (6탭)
  api/
    v1/
      admin/
        ontology/
          topics/route.ts         # GET: 태그 동시출현 + 참여도
          similarity/route.ts     # GET: 논문 유사도 매트릭스
          behavior/route.ts       # GET: 사용자 행동 클러스터
          flows/route.ts          # GET: 탐색 흐름 + 퍼널
          quality-matrix/route.ts # GET: 품질-참여 매트릭스
          anomalies/route.ts      # GET: 이상 징후 탐지
          insights/route.ts       # GET: 종합 인사이트
```

### 4.2 API 엔드포인트 상세

| 엔드포인트 | 반환 데이터 | 예상 응답 크기 | 캐싱 |
|-----------|-----------|--------------|------|
| `GET /ontology/topics` | 태그 매트릭스, 참여 랭킹 | ~10KB | 1시간 |
| `GET /ontology/similarity` | 논문 유사도 쌍 (top 100) | ~20KB | 6시간 |
| `GET /ontology/behavior` | 세션 클러스터 요약 + 분포 | ~15KB | 1시간 |
| `GET /ontology/flows` | 전이 쌍, 게이트웨이, 퍼널 | ~15KB | 1시간 |
| `GET /ontology/quality-matrix` | 논문별 점수 + 사분면 | ~20KB | 1시간 |
| `GET /ontology/anomalies` | 8개 규칙별 플래그 결과 | ~30KB | 30분 |
| `GET /ontology/insights` | 종합 인사이트 목록 | ~5KB | 1시간 |

### 4.3 API 패턴 (기존 코드 준수)

```typescript
// 모든 온톨로지 API는 이 패턴을 따름
import { createAdminClient } from '@/lib/supabase/admin';
import { successResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api/response';
import { getCurrentAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return unauthorizedResponse();
    const supabase = createAdminClient();

    // ... 데이터 쿼리 및 계산 ...

    return successResponse(result);
  } catch (error) {
    console.error('Error:', error);
    return internalErrorResponse('Failed to ...');
  }
}
```

### 4.4 프론트엔드 컴포넌트

기존 사용 가능한 컴포넌트:
- `Card`, `CardContent`, `CardHeader`, `CardTitle` - shadcn/ui
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` - shadcn/ui
- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` - shadcn/ui
- `Badge`, `Skeleton`, `Dialog`, `Tooltip` - shadcn/ui
- Recharts (v2.14.0): `BarChart`, `LineChart`, `PieChart`, `ScatterChart`, `Sankey`, `ResponsiveContainer`

추가 고려:
- 태그 네트워크 그래프: 커스텀 SVG 또는 히트맵으로 대체
- 산점도 4사분면: Recharts ScatterChart + ReferenceLine

### 4.5 네비게이션 추가

`app/admin/layout.tsx`의 `navItems` 배열에 추가:

```typescript
{ href: '/admin/ontology', label: '온톨로지 분석', icon: Network }
```

### 4.6 성능 전략

| 전략 | 적용 대상 | 방법 |
|------|----------|------|
| **캐싱** | 유사도 매트릭스, 클러스터 | `site_settings` 테이블에 결과 + TTL 저장 |
| **지연 로딩** | 6개 탭 | 탭 활성화 시에만 해당 API 호출 |
| **페이지네이션** | 이상 징후 세션 | `parsePaginationParams()` 사용 |
| **중심점 사전 계산** | 논문 유사도 | paper_chunks 임베딩 평균을 별도 저장 |

---

## 5. 구현 로드맵

### Phase 1: 기반 API (1주)
1. `ontology/topics/route.ts` - 태그 동시출현 + 참여도
2. `ontology/anomalies/route.ts` - 8개 규칙 탐지
3. `ontology/quality-matrix/route.ts` - 품질-참여 점수

### Phase 2: 행동 분석 API (1주)
4. `ontology/behavior/route.ts` - 세션 클러스터링
5. `ontology/flows/route.ts` - 전이 매트릭스 + 퍼널

### Phase 3: 고급 분석 (0.5주)
6. `ontology/similarity/route.ts` - 벡터 유사도
7. `ontology/insights/route.ts` - 종합 인사이트

### Phase 4: 프론트엔드 (1주)
8. `app/admin/ontology/page.tsx` - 6탭 메인 페이지
9. `app/admin/layout.tsx` - 네비게이션 추가
10. 각 탭별 차트 및 테이블 구현

### Phase 5: 폴리시 (0.5주)
11. 로딩 상태 + 에러 핸들링
12. 캐싱 구현
13. 분석 결과 내보내기 기능

---

## 6. 성공 지표

| 지표 | 목표 |
|------|------|
| 히든젬 발견 수 | 최소 5개 논문 식별 |
| 이상 세션 탐지율 | 전체 세션의 5~15% 플래그 |
| 인사이트 → 액션 전환 | 관리자가 월 3건 이상 액션 실행 |
| 데이터 신뢰도 | 이상 세션 제외 후 통계 변동률 확인 |
| 설문 전환율 개선 | 인사이트 적용 후 전환율 5%p 향상 |

---

## 7. DB 구현 가능성 검증

### 7.1 모듈별 검증 결과

| 모듈 | 구현 가능 | 필요 데이터 | 주의사항 |
|------|:--------:|-----------|---------|
| 1. 주제 분석 | ✅ | papers.tags[], paper_chunks.embedding, paper_read_progress, surveys | pgvector AVG() 미지원 → JS에서 centroid 계산 |
| 2. 행동 분석 | ✅ | anonymous_sessions, paper_read_progress, surveys, votes | ip_address 등 확장 컬럼은 `(supabase as any)` 패턴 |
| 3. 탐색 흐름 | ✅ | paper_read_progress.created_at, papers.tags[], surveys.completed_at | created_at으로 읽기 순서 결정 |
| 4. 품질-참여 | ✅ | surveys.responses(JSONB), paper_read_progress, votes | 텍스트→숫자 매핑 필요 |
| 5. 이상 탐지 | ✅ | anonymous_sessions, surveys, paper_read_progress, votes | fingerprint/ip_address 기반 |
| 6. 인사이트 | ✅ | 모듈 1~5 결과 집계 | 추가 데이터 불필요 |

### 7.2 스키마 vs 프로덕션 차이점

다음 컬럼들은 마이그레이션 파일에 없지만 **프로덕션 DB에 존재**한다 (Supabase 대시보드에서 직접 추가됨):

| 테이블 | 추가 컬럼 | 사용 코드 패턴 |
|--------|----------|--------------|
| `anonymous_sessions` | ip_address, user_agent, device_type, browser, os, referrer, screen_width, screen_height, language | `(supabase as any).from('anonymous_sessions')` |
| `papers` | hidden_at | `.is('hidden_at' as string, null)` |
| `chat_messages` | 별도 테이블 (마이그레이션 없음) | `(supabase as any).from('chat_messages')` |

온톨로지 API에서도 동일한 `(supabase as any)` 패턴을 사용해야 한다.

### 7.3 구현 시 필수 처리 항목

**A. 벡터 유사도 centroid 계산 (모듈 1)**
```
문제: pgvector는 SELECT AVG(embedding) 미지원
해결: paper_chunks에서 paper_id별 embedding을 JS로 가져와 평균 계산
성능: 137개 논문 × 평균 ~20청크 = ~2,740 벡터 → JS에서 충분히 처리 가능
최적화: 계산 결과를 site_settings에 캐싱 (TTL 6시간)
```

**B. 설문 응답 텍스트→숫자 매핑 (모듈 4)**
```typescript
// q2-1 전반적 평가
const Q2_1_MAP: Record<string, number> = {
  '매우 우수함': 5, '우수함': 4, '보통': 3, '미흡': 2, '매우 미흡': 1
};

// q2-5 추천 의향
const Q2_5_MAP: Record<string, number> = {
  '적극 추천': 4, '추천': 3, '보통': 2, '추천하지 않음': 1
};

// q2-3, q2-4도 유사한 5점 매핑 필요
```

**C. 대량 데이터 쿼리 주의 (모듈 2, 3)**
```
- paper_read_progress: 세션 수 × 논문 수 → 수천~수만 건
- Supabase 기본 limit 1000 → 필요 시 .limit(10000) 명시
- 또는 페이지네이션으로 분할 조회
```

---

## 8. 참고: 핵심 파일 경로

| 파일 | 역할 |
|------|------|
| `app/admin/layout.tsx` | 네비게이션 배열 (navItems) |
| `app/admin/surveys/page.tsx` | 탭 기반 관리자 페이지 참고 패턴 |
| `app/api/v1/admin/stats/route.ts` | 통계 API 패턴 참고 |
| `app/api/v1/admin/stats/users/route.ts` | 세션 집계 API 패턴 참고 |
| `app/api/v1/admin/surveys/aggregate/route.ts` | 설문 집계 로직 참고 |
| `lib/supabase/admin.ts` | createAdminClient() |
| `lib/auth.ts` | getCurrentAdmin() |
| `lib/api/response.ts` | successResponse(), parsePaginationParams() |
| `types/database.ts` | TypeScript 인터페이스 정의 |
| `supabase/migrations/001_initial_schema.sql` | 전체 DB 스키마 |
| `supabase/migrations/002_chat_and_progress.sql` | 채팅/읽기진행 스키마 |
