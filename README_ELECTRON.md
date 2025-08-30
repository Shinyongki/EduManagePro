# 교육관리 시스템 (EduManagePro) - Electron 데스크톱 앱

## 📖 개요
경상남도 교육-종사자 연동분석을 위한 전용 데스크톱 애플리케이션입니다.

## ✨ 주요 기능
- **대시보드**: 종합 현황 및 통계 분석
- **데이터 관리**: 기관, 종사자, 교육 데이터 업로드 및 관리
- **종합지도**: 지역별 현황을 시각화한 인터랙티브 지도
- **연동분석**: 다양한 데이터 소스 간 상관관계 분석
- **데이터 내보내기**: 분석 결과를 CSV 형태로 내보내기

## 🚀 실행 방법

### 1. 개발 모드 실행
```bash
# 서버 시작
npm run dev

# 새 터미널에서 Electron 실행
npm run electron-dev
```

### 2. 프로덕션 빌드
```bash
# 전체 빌드 (Windows용)
npm run build-electron-win

# 포터블 버전 (설치 불필요)
npm run build-electron-portable

# 인스톨러 포함 버전
npm run build-electron-installer
```

## 📁 프로젝트 구조
```
EduManagePro/
├── client/                 # React 프론트엔드
├── server/                 # Node.js 백엔드
├── electron/              # Electron 메인 프로세스
├── data/                  # 데이터 파일들
├── dist-electron-final/   # 빌드 결과물
└── dist/                  # 웹 빌드 결과물
```

## 🛠 기술 스택
- **프론트엔드**: React 18, TypeScript, Tailwind CSS
- **백엔드**: Node.js, Express, TypeScript
- **데스크톱**: Electron 37
- **데이터 처리**: XLSX, PapaParse
- **지도**: React-Leaflet
- **차트**: Recharts
- **상태관리**: Zustand

## 📊 데이터 구조
- **기관 데이터**: 경상남도 내 교육 기관 정보
- **종사자 데이터**: 전담사회복지사, 생활지원사 정보
- **교육 데이터**: 기초/심화 교육 수료 현황
- **통합 분석**: I/H, I/D 이수율 계산 시스템

## 🔧 개발 환경 설정
1. Node.js 18+ 설치
2. 의존성 설치: `npm install`
3. 개발 서버 실행: `npm run dev`
4. Electron 개발 모드: `npm run electron-dev`

## 📦 배포 파일
- **실행 파일**: `교육관리 시스템 (EduManagePro).exe`
- **위치**: `dist-electron-final/win-unpacked/`
- **크기**: 약 200MB (모든 런타임 포함)
- **요구사항**: Windows 10 이상

## 🏗 빌드 설정
- **앱 ID**: com.edumanagepro.app
- **압축**: 최대 압축 적용
- **서명**: 비활성화 (개발용)
- **데이터**: JSON 파일 자동 포함

## 📝 버전 정보
- **버전**: 2.0
- **빌드 날짜**: 2025-08-30
- **Electron**: 37.2.6
- **Node.js**: 22.16.0

---
*이 시스템은 경상남도 교육 현황 분석을 위해 특별히 설계되었습니다.*