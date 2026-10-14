# 이번 생은 살아남자 — Everworld

플레이어가 마을에서 생활하는 동안 NPC들이 독립적으로 움직이는 도트 판타지 생존 RPG 실험작입니다.

## 플레이
- 웹 게임: https://kkhkkh20-bit.github.io/everworld-game/
- PC: WASD/방향키, 주민 클릭, 행동 버튼
- 모바일: 화면 터치 이동, 주민 터치, 행동 버튼
- 사망 후 다른 인물로 계속 살아가는 영속 세계를 목표로 개발 중입니다.

## 현재 상태 (alpha 0.6)
- 한 화면의 작은 마을에서 이동과 NPC 상호작용
- NPC별 목표/성격과 자율적 활동
- 범죄, 전투, 사망, 이주, 왕위 변동을 다루는 기본 규칙
- 아직 고도화가 필요한 데모이며 시뮬레이션 반응과 수사/정치 시스템은 개발 중입니다.

## 배포
`main`에 변경 사항을 푸시하면 `.github/workflows/deploy.yml`에서 GitHub Pages 배포를 시도합니다.
첫 배포 전에 Repository > Settings > Pages > Build and deployment > Source가 `GitHub Actions`인지 확인하세요.

게임은 `index.html` 한 파일로 구성된 정적 웹 앱입니다.
