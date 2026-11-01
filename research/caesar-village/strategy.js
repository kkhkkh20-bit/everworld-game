'use strict';
// Design-only examples. No game state, RNG, storage, resource spending or simulation.
const strategyExamples = {
  self: {
    name: '우리 힘으로 버티기',
    aim: '먹거리와 잠자리를 우선해요.',
    cost: '먹거리 확보에 힘을 쓰는 만큼 다른 생산과 공사가 늦어질 수 있어요.',
    terms: '새 외부 길은 자동으로 열지 않아요. 기존 운송과 협정은 유지해요.',
    observe: '먹거리 비축과 완성된 집을 살펴봐요.',
  },
  trade: {
    name: '나무로 곡물 구하기',
    aim: '정한 이웃과 허용한 나무 상한 안에서 곡물을 반복 교환해요.',
    cost: '새 길이 필요하면 정찰 식량 5, 개척 나무 12·돌 3과 작업 시간이 들어요. 교환할 나무도 따로 필요해요.',
    terms: '상대의 남는 곡물과 교환 조건을 확인해요. 수레가 도착해야 먹을 수 있어요.',
    observe: '수레 도착과 남은 건설용 나무를 살펴봐요.',
  },
  protect: {
    name: '강한 이웃의 보호',
    aim: '협정을 맺고 보호와 가능한 초기 지원을 받아요.',
    cost: '이후 수확 100개 중 12개를 보내요. 연결이 없다면 길을 여는 비용도 필요해요.',
    terms: '이웃에게 실제 여유가 있어야 지원을 보내요. 도착하기 전에는 우리 재고가 아니에요.',
    observe: '지원 수레와 실제로 보낸 조공을 살펴봐요.',
  },
};
let selectedStrategy = 'self';
const strategyPreview = document.getElementById('strategy-preview');
const strategyStatus = document.getElementById('strategy-status');

function previewStrategy(id) {
  selectedStrategy = id;
  const p = strategyExamples[id];
  document.querySelectorAll('[data-strategy]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.strategy === id));
  });
  strategyPreview.innerHTML = `<dl><div><dt>마을이 할 일</dt><dd>${p.aim}</dd></div><div><dt>감수할 점</dt><dd>${p.cost}</dd></div><div><dt>필요한 조건</dt><dd>${p.terms}</dd></div><div><dt>다음에 볼 것</dt><dd>${p.observe}</dd></div></dl>`;
  document.getElementById('strategy-apply').disabled = false;
}

document.querySelectorAll('[data-strategy]').forEach(button => {
  button.addEventListener('click', () => {
    previewStrategy(button.dataset.strategy);
    strategyStatus.textContent = '선택 전 미리보기 · 실제 게임은 변경되지 않아요.';
  });
});
document.getElementById('strategy-apply').addEventListener('click', () => {
  strategyStatus.textContent = `맡긴 방향(시안): ${strategyExamples[selectedStrategy].name}. 마을이 판단해 실행할 방향을 정했어요. 이 시안은 실제 진행·결과를 계산하지 않아요.`;
  document.getElementById('strategy-apply').disabled = true;
});
document.getElementById('strategy-auto').addEventListener('click', () => {
  document.querySelectorAll('[data-strategy]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  document.getElementById('strategy-apply').disabled = true;
  strategyPreview.innerHTML = '<p>승인한 조건과 한도 안에서 마을 지도자가 판단하도록 맡겨요. 큰 협정의 수락 권한과 수동 외교 설정은 따로 정해요.</p>';
  strategyStatus.textContent = 'AI에 맡긴 상태(시안) · 실제 게임은 변경되지 않아요.';
});
previewStrategy(selectedStrategy);
