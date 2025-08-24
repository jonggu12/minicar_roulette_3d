# Repository Guidelines

## Project Structure & Modules

- `frontend`: Vite + React + TypeScript app.
  - `src/components/3d`: R3F/Rapier components (`PhysicsCar.tsx`, `TestTrack.tsx`, `PhysicsScene.tsx`).
  - `src`: UI/scene wiring.
- `backend`: Server placeholders (`lib`, `pages`).
- `shared`: TS types and utilities.
- `.env` / `.env.example`: Runtime config (do not commit secrets).

## Build, Test, Develop

- Dev: `cd frontend && npm run dev` (Vite dev server).
- Build: `cd frontend && npm run build` (outputs `dist/`).
- Preview: `cd frontend && npm run preview` (serve build).

## Coding Style

- TypeScript, 2-space indent. Components in PascalCase; utils/hooks in camelCase.
- File name matches export (`Car.tsx` → `Car`). Keep diffs minimal; use editor formatting.

## Testing

- No formal tests yet. Validate locally:
  - Physics: stable frame time, no tunneling, no spawn jitter.
  - Visuals: materials, shadows, colliders aligned.
- If adding tests: `*.test.ts(x)` colocated or in `__tests__/`.

## Commits & PRs

- Commits: short, imperative; optional scope.
  - e.g., `feat(frontend): add TestTrack walls`, `fix(physics): clamp slip`.
- PRs: explain what/why, attach gif/screenshot, repro steps, link issues, note breaking/config changes.

## Agent-Specific Instructions (Korean Output)

- 모든 설명과 답변은 한국어로 제공하세요. 필요한 경우 핵심 추론을 간단히 요약해 한국어로 포함합니다.

## Vehicle Physics Notes (three.js + Rapier)

- 일반적 접근
  - 아케이드 단일 바디: 차체 1개, 롤/피치 잠금, 휠 접점 기준의 종/횡 타이어 힘(슬립 각/슬립 비율), 속도 기반 스티어, 다운포스. 콜라이더 마찰은 보통 수준(0.3~0.6).
  - 레이캐스트 차량: 바퀴 4개 레이캐스트, 서스펜션(스프링/댐핑) + 타이어 힘을 접점에 적용, 마찰원(μ·N)으로 클램프.
  - 조인트 휠: 프리즈매틱/리볼트 조인트로 서스펜션/조향/구동 재현(가장 현실적, 가장 복잡).
- 권장 관례
  - 힘은 바퀴 위치에 `addForceAtPoint`로 적용, 큰 Yaw 토크 직접 주입은 지양.
  - 타력/브레이크는 μ·N으로 제한, 스티어 각은 속도에 따라 감소.
  - 고정 타임스텝(1/60) 선호, CCD는 터널링에만 사용.
- 현재 코드와 차이
  - CoM(질량중심)에 추진력 + 직접 Yaw 토크 적용, 바퀴 접점 기반 힘/슬립 각 모델 부재.
  - 횡슬립 억제를 큰 상수력으로 처리(솔버 부담), μ·N 기반 트랙션 클램프 없음.
  - 회전 제약(Yaw만 허용)과 `Min` 마찰 결합은 아케이드 지향이나, 접점 기반 힘이 없어서 거동이 단순.

