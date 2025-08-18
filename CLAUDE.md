# Install bun
curl -fsSL https://bun.sh/install | bash

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.

# 고급 연동분석 페이지 정보

## 페이지 개요
- **파일**: `client/src/pages/advanced-education.tsx`
- **제목**: 심화 교육 데이터 관리
- **설명**: 심화 교육 수료 데이터를 업로드하고 관리합니다

## 주요 기능
1. **데이터 업로드**: Excel/CSV 파일을 통한 심화 교육 수료 데이터 일괄 업로드
2. **복합 데이터 분석**: 다양한 카테고리별 통계 분석
   - 백업입력 (수강권리 등록자 수/예산지시 등록자 수)
   - D급 백업입력 현황  
   - 근무자 자격현황 (전업사회복지사, 생활지원사)
   - 근무자 근속현황 및 재응률
   - 직무교육 이수율
3. **연동 분석**: 여러 데이터 소스 간의 상관관계 분석
4. **시각화**: 복합 테이블 형태로 다차원 데이터를 한눈에 표시

## 테이블 헤더 구조 (2층 복합 헤더)

### 1단계 헤더 (상위 카테고리)
- 기본 정보: 관리명, 시도, 시군구, 기관코드, 기관명 (5개 컬럼)
- 백업입력(수강권리 등록자 수): 3개 컬럼
- 백업입력(예산지시 등록자 수): 4개 컬럼
- D급 백업입력(수강권리 등록자 수): 3개 컬럼
- (1-1.) 근무자 자격현황: 3개 컬럼
- (1-1.a) 근무자 근속현황: 3개 컬럼
- (1-4.) 근무자 직무교육 이수율: 4개 컬럼

### 2단계 헤더 (세부 항목)
#### 백업입력(수강권리 등록자 수):
- 전체 근무자(=O+@)
- 전문사회복지사 ①
- 생활지원사회복지사 ②

#### 백업입력(예산지시 등록자 수):
- A 전체
- B 전업사회복지사
- C 생활지원사
- 전체 근무자(=@+@)

#### D급 백업입력(수강권리 등록자 수):
- 전문사회복지사 ①
- 생활지원사 ②
- D 전체

#### 근무자 자격현황:
- 전업사회복지사
- 생활지원사
- 자격취득(=@+@)

#### 근무자 근속현황:
- 전문사회복지사 ①
- 생활지원사 ②
- (E/A) 재응률

#### 근무자 직무교육 이수율:
- F 재응률
- (F/B) 재응률
- (경고) 총험률
- G 재응관관(G/C) 재응률(경고) 총험률 근속 기간(1년) 전업사회복지사 생활지원사 H 전체 H 전업사회복지사

## 색상 구분
- 기본 정보: 회색 (bg-gray-100)
- 백업입력(수강권리): 연두색 (bg-green-100)
- 백업입력(예산지시): 청록색 (bg-cyan-100)
- D급 백업입력: 파란색 (bg-blue-100)
- 근무자 자격현황: 보라색 (bg-purple-200)
- 근무자 근속현황: 노란색 (bg-yellow-100)
- 직무교육 이수율: 연두색 (bg-green-200)

## 기술적 특징
- `border-collapse` 테이블 스타일
- 가로 스크롤 지원 (`overflow-x-auto`)
- 최소 너비 2000px 설정
- rowSpan, colSpan을 사용한 복합 헤더 구조
- 반응형 hover 효과