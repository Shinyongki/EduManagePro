# EduManagePro 시스템 이전 및 배포 가이드

## 📋 개요
이 문서는 EduManagePro 교육관리시스템을 다른 컴퓨터로 이전하거나 새로운 환경에서 설정하는 방법을 설명합니다.

## 🖥️ 시스템 요구사항

### 최소 사양
- **운영체제**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **메모리**: 최소 4GB RAM (권장 8GB+)
- **저장공간**: 최소 2GB 여유공간
- **네트워크**: 인터넷 연결 (패키지 설치용)

### 필수 소프트웨어
- **Node.js**: LTS 버전 (18.x 이상 권장)
- **npm**: Node.js와 함께 자동 설치됨

## 📦 1단계: 프로젝트 파일 준비

### 복사할 파일/폴더 ✅
```
📁 EduManagePro/
├── 📁 client/              # React 프론트엔드
├── 📁 server/              # Node.js 백엔드  
├── 📁 shared/              # 공통 타입 정의
├── 📁 electron/            # Electron 설정
├── 📄 package.json         # 의존성 정보
├── 📄 package-lock.json    # 정확한 버전 정보
├── 📄 vite.config.ts       # 빌드 설정
├── 📄 tsconfig.json        # TypeScript 설정
├── 📄 CLAUDE.md            # 프로젝트 지침
└── 📄 README.md            # 프로젝트 설명
```

### 복사하지 말아야 할 폴더 ❌
```
❌ node_modules/            # 패키지 파일들 (npm install로 재생성)
❌ dist/                   # 빌드 산출물 (자동 생성)
❌ dist-electron/          # Electron 빌드 파일
❌ .cache/                 # 캐시 파일들
❌ .vite/                  # Vite 캐시
```

## 🔧 2단계: 새 컴퓨터 환경 설정

### Node.js 설치
1. [https://nodejs.org](https://nodejs.org) 접속
2. **LTS 버전** 다운로드 및 설치
3. 설치 확인:
   ```bash
   node --version    # v18.x.x 또는 그 이상
   npm --version     # 9.x.x 또는 그 이상
   ```

### 프로젝트 설치
```bash
# 1. 복사한 EduManagePro 폴더로 이동
cd EduManagePro

# 2. 의존성 패키지 설치 (5-10분 소요)
npm install

# 3. 설치 완료 확인
# node_modules/ 폴더가 생성되어야 함 (약 200-500MB)
```

## ▶️ 3단계: 시스템 실행

### 개발 모드 실행 (권장)
```bash
npm run dev
```

### 프로덕션 모드 실행
```bash
# 빌드 후 실행
npm run build
npm start
```

### 실행 확인
- 터미널에 다음과 같은 메시지가 표시되어야 함:
  ```
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
  ```
- 브라우저에서 `http://localhost:3000` 접속
- 대시보드 화면이 정상적으로 로드되는지 확인

## 💾 4단계: 데이터 설정

### IndexedDB 데이터 이전
> ⚠️ **중요**: IndexedDB 데이터는 자동으로 이전되지 않습니다.

#### 새 시스템에서 해야 할 작업:
1. **기본 교육 데이터 업로드**
   - 대시보드 → 기본 교육 → 파일 업로드
   - Excel/CSV 파일 업로드

2. **심화 교육 데이터 업로드**
   - 대시보드 → 심화 교육 → 파일 업로드
   - Excel/CSV 파일 업로드

3. **참여자 데이터 업로드**
   - 대시보드 → 참여자 관리 → 파일 업로드
   - Excel/CSV 파일 업로드

4. **종사자 데이터 업로드**
   - 대시보드 → 종사자 데이터 → 파일 업로드
   - Excel/CSV 파일 업로드

5. **기관 데이터 업로드**
   - 대시보드 → 기관 관리 → 파일 업로드
   - Excel/CSV 파일 업로드

### IndexedDB 스토리지 확인
- 브라우저 개발자도구(F12) → Application → Storage → IndexedDB
- `education-db` 데이터베이스 확인
- 각 데이터 테이블에 정보가 저장되었는지 확인

## 🔧 문제 해결

### 자주 발생하는 오류

#### 1. "npm install" 실패
```bash
# 캐시 클리어 후 재시도
npm cache clean --force
npm install
```

#### 2. 포트 충돌 오류
```bash
# 다른 포트 사용
npm run dev -- --port 3001
```

#### 3. 메모리 부족 오류
```bash
# Node.js 메모리 증가
set NODE_OPTIONS=--max_old_space_size=4096
npm run dev
```

#### 4. TypeScript 컴파일 오류
```bash
# TypeScript 재설치
npm install typescript@latest
npm run dev
```

### 로그 확인
- 개발자 도구 콘솔에서 오류 메시지 확인
- 터미널에서 서버 로그 확인
- 네트워크 탭에서 API 요청 상태 확인

## 📱 Electron 앱 빌드 (선택사항)

### 데스크톱 앱으로 패키징
```bash
# Electron 앱 빌드
npm run electron:build

# 빌드된 실행파일 위치
# Windows: dist-electron/EduManagePro-Setup.exe
# macOS: dist-electron/EduManagePro.dmg
# Linux: dist-electron/EduManagePro.AppImage
```

## 🌐 네트워크 공유 설정 (5명 공동 사용)

### 서버 모드 실행
```bash
# 네트워크에서 접근 가능하도록 실행
npm run dev -- --host 0.0.0.0

# 또는 특정 IP 지정
npm run dev -- --host 192.168.1.100
```

### 방화벽 설정
- Windows: Windows Defender 방화벽에서 3000번 포트 허용
- 공유기: 필요시 포트 포워딩 설정

### 클라이언트 접속
```
사용자A: http://192.168.1.100:3000
사용자B: http://192.168.1.100:3000  
사용자C: http://192.168.1.100:3000
```

## 📋 체크리스트

### 이전 완료 확인
- [ ] Node.js 설치 완료
- [ ] EduManagePro 폴더 복사 완료
- [ ] npm install 실행 완료
- [ ] npm run dev 실행 성공
- [ ] 브라우저에서 정상 접속
- [ ] 모든 데이터 파일 업로드 완료
- [ ] IndexedDB에 데이터 저장 확인
- [ ] 각 메뉴의 기능 정상 동작 확인

### 성능 확인
- [ ] 대시보드 로딩 속도 양호
- [ ] 파일 업로드 정상 동작
- [ ] 데이터 검색/필터링 정상 동작
- [ ] 통계 차트 정상 표시
- [ ] 지도 시각화 정상 동작

## 📞 지원 및 문의

시스템 이전 중 문제가 발생하면:
1. 오류 메시지 스크린샷 캡처
2. 터미널 로그 복사
3. 브라우저 개발자도구 콘솔 로그 확인
4. 시스템 사양 및 운영체제 정보 준비

---
**문서 버전**: 1.0  
**최종 업데이트**: 2025-08-17  
**작성자**: Claude Code Assistant