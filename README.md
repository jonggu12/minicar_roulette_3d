# MiniRoulette 3D

A 3D racing-based random selection tool that spawns mini cars based on input names, runs an AI-controlled race, and determines winners through fair racing mechanics. Perfect for streamers, educators, and content creators who need engaging, transparent, and broadcast-friendly random selection.

## Features

- **Fair Random Selection**: Transparent seed-based randomness with commit/reveal protocol
- **3D Racing Simulation**: Engaging visual experience with mini car racing
- **Weighted Entries**: Support for weighted probability entries (e.g., "John*3, Mary, Bob*2")
- **OBS Integration**: Browser source compatible for streaming overlays
- **Multiple Race Modes**: Sprint, Podium, Knockout, and Tournament modes
- **Reproducible Results**: Identical inputs produce identical results for verification

## Quick Start

### Prerequisites

- Node.js 18+ 
- Modern web browser with WebGL support

### Installation

```bash
# Clone the repository
git clone https://github.com/jonggu12/minicar_roulette_3d.git
cd minicar_roulette_3d

# Install dependencies (frontend)
cd frontend
npm install

# Install dependencies (backend)
cd ../backend
npm install

# Start development servers
npm run dev
```

### Basic Usage

1. **Input Names**: Enter participant names (optionally with weights: "name*3")
2. **Configure Race**: Select track and race mode
3. **Generate Seed**: System creates fairness commit hash
4. **Start Race**: Watch the 3D race unfold
5. **View Results**: See winner and download race data

## Project Structure

```
├── frontend/          # React Three Fiber 3D frontend
├── backend/           # API and race logic backend  
├── shared/           # Shared utilities and types
└── docs/             # Documentation and guides
```

## Tech Stack

- **Frontend**: React Three Fiber, Next.js, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL
- **3D Engine**: Three.js with Rapier physics
- **State Management**: Zustand

## Race Modes

- **Sprint**: Single lap, first place wins
- **Podium**: Top N winners (configurable)
- **Knockout**: Eliminate last place each lap
- **Tournament**: Bracket-style elimination

## Fairness & Transparency

MiniRoulette 3D uses a commit/reveal protocol to ensure fair random selection:

1. Pre-race seed generation with SHA256 commit hash
2. Public display of commit hash before race starts
3. Post-race seed reveal for verification
4. Reproducible results for third-party validation

## Development

### Repository Setup Process

This section documents the complete setup process for future reference:

#### 1. Initial Repository Setup
```bash
# Initialize Git repository
git init

# Create project structure
mkdir frontend backend shared

# Add remote repository
git remote add origin https://github.com/jonggu12/minicar_roulette_3d.git
```

#### 2. Essential Files Created
- **README.md**: Project overview and documentation
- **.gitignore**: Comprehensive ignore patterns for Node.js/React/3D development
- **prd_document.md**: Product Requirements Document
- **CLAUDE.md**: Claude Code integration instructions
- **.taskmaster/**: TaskMaster AI project management setup

#### 3. Branch Protection Rules (GitHub Settings)
Navigate to Repository → Settings → Branches → Add rule:
- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require conversation resolution before merging

#### 4. Development Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Your commit message"

# Push and create PR
git push origin feature/your-feature
# Create Pull Request on GitHub → Review → Merge
```

### Running Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests  
cd backend
npm test
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@miniroulette3d.com
- 💬 Discord: [Community Server](https://discord.gg/miniroulette3d)
- 📖 Documentation: [docs.miniroulette3d.com](https://docs.miniroulette3d.com)

## Roadmap

- [x] MVP: Basic 3D racing with fair selection
- [ ] Beta: Advanced tracks and race modes
- [ ] Production: Custom branding and enterprise features

---

**Built for fairness, designed for engagement.** 🏎️✨

---

# MiniRoulette 3D (한국어)

이름을 입력하면 미니카가 생성되고, AI가 제어하는 레이스를 통해 공정한 경주 메커니즘으로 승자를 결정하는 3D 레이싱 기반 랜덤 선택 도구입니다. 스트리머, 교육자, 콘텐츠 크리에이터를 위한 흥미롭고 투명하며 방송 친화적인 랜덤 선택 도구입니다.

## 주요 기능

- **공정한 랜덤 선택**: 커밋/공개 프로토콜을 사용한 투명한 시드 기반 랜덤성
- **3D 레이싱 시뮬레이션**: 미니카 경주를 통한 흥미로운 시각적 경험
- **가중치 입력**: 가중치 확률 입력 지원 (예: "철수*3, 영희, 민수*2")
- **OBS 통합**: 스트리밍 오버레이용 브라우저 소스 호환
- **다양한 경주 모드**: 스프린트, 포디움, 녹아웃, 토너먼트 모드
- **재현 가능한 결과**: 동일한 입력은 검증을 위해 동일한 결과 생성

## 빠른 시작

### 필수 조건

- Node.js 18+ 
- WebGL을 지원하는 최신 웹 브라우저

### 설치

```bash
# 저장소 복제
git clone https://github.com/jonggu12/minicar_roulette_3d.git
cd minicar_roulette_3d

# 의존성 설치 (프론트엔드)
cd frontend
npm install

# 의존성 설치 (백엔드)
cd ../backend
npm install

# 개발 서버 시작
npm run dev
```

### 기본 사용법

1. **이름 입력**: 참가자 이름 입력 (선택적으로 가중치: "이름*3")
2. **경주 설정**: 트랙과 경주 모드 선택
3. **시드 생성**: 시스템이 공정성 커밋 해시 생성
4. **경주 시작**: 3D 경주 관람
5. **결과 확인**: 승자 확인 및 경주 데이터 다운로드

## 프로젝트 구조

```
├── frontend/          # React Three Fiber 3D 프론트엔드
├── backend/           # API 및 경주 로직 백엔드  
├── shared/           # 공유 유틸리티 및 타입
└── docs/             # 문서 및 가이드
```

## 기술 스택

- **프론트엔드**: React Three Fiber, Next.js, Tailwind CSS
- **백엔드**: Next.js API Routes, PostgreSQL
- **3D 엔진**: Three.js with Rapier 물리엔진
- **상태 관리**: Zustand

## 경주 모드

- **스프린트**: 1랩 경주, 1등이 승리
- **포디움**: 상위 N명 승자 (설정 가능)
- **녹아웃**: 매 랩마다 꼴찌 제거
- **토너먼트**: 브래킷 스타일 토너먼트

## 공정성 및 투명성

MiniRoulette 3D는 공정한 랜덤 선택을 보장하기 위해 커밋/공개 프로토콜을 사용합니다:

1. 경주 전 SHA256 커밋 해시와 함께 시드 생성
2. 경주 시작 전 커밋 해시 공개 표시
3. 검증을 위한 경주 후 시드 공개
4. 제3자 검증을 위한 재현 가능한 결과

## 개발

### 저장소 설정 과정

향후 참조를 위한 완전한 설정 과정:

#### 1. 초기 저장소 설정
```bash
# Git 저장소 초기화
git init

# 프로젝트 구조 생성
mkdir frontend backend shared

# 원격 저장소 추가
git remote add origin https://github.com/jonggu12/minicar_roulette_3d.git
```

#### 2. 생성된 필수 파일들
- **README.md**: 프로젝트 개요 및 문서
- **.gitignore**: Node.js/React/3D 개발을 위한 포괄적인 무시 패턴
- **prd_document.md**: 제품 요구사항 문서
- **CLAUDE.md**: Claude Code 통합 지침
- **.taskmaster/**: TaskMaster AI 프로젝트 관리 설정

#### 3. 브랜치 보호 규칙 (GitHub 설정)
저장소 → Settings → Branches → Add rule로 이동:
- 브랜치 이름 패턴: `main`
- ✅ 병합 전 풀 리퀘스트 필요
- ✅ 새 커밋 푸시 시 오래된 풀 리퀘스트 승인 해제
- ✅ 병합 전 대화 해결 필요

#### 4. 개발 워크플로우
```bash
# 기능 브랜치 생성
git checkout -b feature/your-feature

# 변경사항 커밋
git add .
git commit -m "커밋 메시지"

# 푸시 및 PR 생성
git push origin feature/your-feature
# GitHub에서 Pull Request 생성 → 리뷰 → 병합
```

### 테스트 실행

```bash
# 프론트엔드 테스트
cd frontend
npm test

# 백엔드 테스트  
cd backend
npm test
```

### 프로덕션 빌드

```bash
# 프론트엔드 빌드
cd frontend
npm run build

# 백엔드 빌드
cd backend
npm run build
```

## 기여하기

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 열기

## 라이선스

이 프로젝트는 MIT 라이선스 하에 라이선스가 부여됩니다 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 지원

- 📧 이메일: support@miniroulette3d.com
- 💬 디스코드: [커뮤니티 서버](https://discord.gg/miniroulette3d)
- 📖 문서: [docs.miniroulette3d.com](https://docs.miniroulette3d.com)

## 로드맵

- [x] MVP: 공정한 선택을 위한 기본 3D 레이싱
- [ ] 베타: 고급 트랙 및 경주 모드
- [ ] 프로덕션: 사용자 정의 브랜딩 및 기업용 기능

---

**공정성을 위해 구축되고, 참여를 위해 설계되었습니다.** 🏎️✨
