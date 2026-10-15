# 살아있는 왕국 · 자동 사회 시뮬레이터 (v0.8)

이 게임은 플레이어가 아무 행동을 하지 않아도 NPC들이 직업과 성격을 바탕으로 살아가는 실험적 판타지 사회 시뮬레이션입니다.

## 실행
- 게임: https://kkhkkh20-bit.github.io/everworld-game/
- 코드: https://github.com/kkhkkh20-bit/everworld-game
- 모바일/PC 단일 화면. GitHub Pages의 Source가 **GitHub Actions**로 설정되어 있어야 합니다.

## v0.8
- 기본 화면을 지도가 아닌 **직책 현황표**로 교체
- 국왕, 재상, 귀족, 치안대, 상인, 농부, 대장장이, 여관주인, 치료사, 도적 등 20개 직책 추적
- 왕실/치안/생업/외곽/공석 필터. 모바일은 페이지 단위로 표시하여 세로 스크롤 최소화
- 사망, 퇴임, 왕위 포기 때 공석 발생. 후임 임명까지 대기 기간 적용
- 충원 이후에도 사망한 전임자의 이름과 사유 기록 유지
- 낮에는 농사·장사·치안 활동·행정·치료·제작 같은 **본업을 우선**하는 시뮬레이션
- 성격/목표에 따라 사기·절도·폭력·정치 공작도 벌어질 수 있음
- 지도는 '지도' 버튼으로만 이동하는 보조 화면
- 브라우저 저장으로 세계 상태 유지, 이후 접속 시 일부 경과 시간 반영(실시간 서버 시뮬레이션 아님)

## 개발 및 테스트
`index.html` 자체로 실행되는 정적 웹앱입니다.
개발자 도구 콘솔에서 `window.__EVERWORLD__`를 사용할 수 있습니다.
`window.__EVERWORLD__.getState()`: 인구, 직책, 공석, 업무 수 등의 상태
`window.__EVERWORLD__.advance(24 * 120)`: 120일 진행
`window.__EVERWORLD__.reset(101)`: 시드 101로 새 세계 생성

## 배포
Settings > Pages > Build and deployment > Source가 **GitHub Actions**인지 확인합니다.
그다음 Actions > Deploy game to GitHub Pages에서 배포 성공 여부를 확인합니다.
