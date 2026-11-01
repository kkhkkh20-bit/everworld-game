'use strict';
// This document is an explicitly fictional UI prototype. It never loads or writes game saves.
const people = [
  {id:'harin',name:'하린',job:'농사',task:'곡물 3개를 창고로 옮기는 중',short:'곡물 운반',home:'home',work:'farm',icon:'🌾'},
  {id:'doyun',name:'도윤',job:'농사',task:'강변 밭에서 수확하는 중',short:'밭에서 수확',home:'home',work:'farm',icon:'🌾'},
  {id:'sua',name:'수아',job:'나무 구하기',task:'숲에서 나무를 모으는 중',short:'나무 모으기',home:'home',work:null,icon:'🌲'},
  {id:'jun',name:'준',job:'나무 구하기',task:'나무를 창고로 옮기는 중',short:'나무 운반',home:'home',work:null,icon:'🌲'},
  {id:'nari',name:'나리',job:'돌 구하기',task:'돌을 캐는 중',short:'돌 캐기',home:'home',work:null,icon:'🪨'},
  {id:'ian',name:'이안',job:'건설',task:'다음 공사에 쓸 재료를 확인하는 중',short:'공사 준비',home:'home',work:null,icon:'🔨'},
  {id:'mira',name:'미라',job:'지금은 쉬는 중',task:'중앙 텐트에서 쉬는 중',short:'텐트에서 쉼',home:'tent',work:null,icon:'☕'},
  {id:'noel',name:'노엘',job:'지금은 쉬는 중',task:'중앙 텐트에서 쉬는 중',short:'텐트에서 쉼',home:'tent',work:null,icon:'☕'},
  {id:'arin',name:'아린',job:'지금은 쉬는 중',task:'중앙 텐트에서 쉬는 중',short:'텐트에서 쉼',home:'tent',work:null,icon:'☕'},
  {id:'roa',name:'로아',job:'지금은 쉬는 중',task:'중앙 텐트에서 쉬는 중',short:'텐트에서 쉼',home:'tent',work:null,icon:'☕'},
  {id:'sol',name:'솔',job:'지금은 쉬는 중',task:'중앙 텐트에서 쉬는 중',short:'텐트에서 쉼',home:'tent',work:null,icon:'☕'},
  {id:'yul',name:'율',job:'지금은 쉬는 중',task:'중앙 텐트에서 쉬는 중',short:'텐트에서 쉼',home:'tent',work:null,icon:'☕'},
];
const card=document.getElementById('card-content'), panel=document.querySelector('.inspector'), hint=document.getElementById('world-hint');
const heading=(icon,title,sub)=>`<div class="card-heading"><span class="card-icon">${icon}</span><div><h3>${title}</h3><small>${sub}</small></div></div>`;
const personRow=(p,i=0)=>`<button class="person-row" data-person="${p.id}"><span class="avatar ${i%2?'gold':''}">${p.name[0]}</span><span><strong>${p.name}</strong><small>${p.short}</small></span><span class="arrow">›</span></button>`;
const action=(label,view,secondary=false)=>`<button class="action-button ${secondary?'secondary-button':''}" data-view="${view}">${label}</button>`;
function show(view,personId){
  panel.hidden=false; document.getElementById('reopen').hidden=true;
  document.querySelectorAll('.game-bottom button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view));
  document.querySelectorAll('.map-point').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
  let html='';
  if(view==='farm'){
    html=heading('🌾','강변 밭','우리 마을 · 먹거리')+`<div class="card-body"><p class="purpose">주민이 먹을 곡물을 기르는 곳이에요.</p><div class="status-strip">● 일하는 중 · 2명<br>수확한 곡물 3개가 창고로 가고 있어요.</div><span class="section-label">여기서 일하는 주민</span><div class="person-list">${people.slice(0,2).map(personRow).join('')}</div><span class="section-label">오늘 수확한 곡물 · 예시</span><div class="harvest-totals"><span><i>🌾</i><b>4.8</b><small>수확한 양</small></span><span><i>🚶</i><b>3</b><small>운반 중</small></span><span><i>▣</i><b>1.8</b><small>창고 도착</small></span></div><p class="card-footnote">창고 도착 1.8 + 운반 중 3 = 수확 4.8개</p></div>`;
    hint.textContent='밭에서 일하는 하린을 누르면, 어디로 무엇을 옮기는지 볼 수 있어요.';
  }else if(view==='person'||view==='harin'){
    const p=people.find(x=>x.id===(personId||'harin'))||people[0];
    html=heading(p.icon,p.name,`${p.job} · 예시 주민`)+`<div class="card-body"><div class="status-strip">● ${p.task}</div>${p.id==='harin'?`<div class="path-card"><button data-view="farm"><b>🌾</b>강변 밭</button><span>→</span><button data-view="depot"><b>▣</b>마을 창고</button></div>`:''}<div class="detail-pair"><span>잠자는 곳</span><button data-view="${p.home}">${p.home==='home'?'첫 번째 집':'중앙 텐트'} ↗</button></div><div class="detail-pair"><span>지금 가진 짐</span><b>${p.id==='harin'?'곡물 3개':p.id==='jun'?'나무 2개':'없음'}</b></div><div class="detail-pair"><span>다음에 할 일</span><b>${p.work==='farm'?'밭에서 수확':p.work?'일터로 돌아가기':p.short}</b></div><button class="action-button" data-follow="${p.id}">◎ ${p.name} 따라가기</button>${p.work?action('일터 보기 →',p.work,true):action('주민 전체 보기 →','people',true)}<p class="card-footnote">일은 자동으로 해요. 이 카드는 사람을 살펴보는 창이에요.</p></div>`;
    hint.textContent=`${p.name}의 집과 지금 하는 일이 연결됩니다. 이름과 일과는 시안용 예시예요.`;
  }else if(view==='home'||view==='tent'){
    const tent=view==='tent',occupants=people.filter(p=>p.home===view);
    html=heading(tent?'⛺':'⌂',tent?'중앙 텐트':'첫 번째 집','우리 마을 · 잠자리')+`<div class="card-body"><p class="purpose">주민이 잠자는 곳이에요.</p><div class="status-strip">● 6명이 지내요 · 남는 잠자리 0개</div><div class="bed-slots" aria-label="잠자리 6개 모두 사용 중">${'<span>🛏</span>'.repeat(6)}</div><span class="section-label">여기 사는 주민 · 눌러서 살펴보기</span><div class="residents-grid">${occupants.map(p=>`<button class="resident-tile" data-person="${p.id}"><span class="avatar">${p.name[0]}</span><span><b>${p.name}</b><small>${p.short}</small></span></button>`).join('')}</div><p class="card-footnote">예시: 집에 6명, 텐트에 6명. 주민 12명과 잠자리 12자리가 맞아요. 식사는 마을 창고에서 함께 집계해요.</p>${action('마을 먹거리 보기 →','food',true)}</div>`;
    hint.textContent='집 안의 이름을 누르면 그 주민의 일터와 지금 하는 일을 볼 수 있어요.';
  }else if(view==='depot'){
    html=heading('▣','마을 창고','중앙 적재 장소 · 새 건물 아님')+`<div class="card-body"><p class="purpose">주민이 가져온 물건을 함께 모아 두는 곳이에요.</p><div class="status-strip">🍲 먹을 것 48개 · 지금 인원으로 20일분</div><div class="quantity-row"><span>🌲 나무</span><b>22개</b></div><div class="quantity-row"><span>🪨 돌</span><b>8개</b></div><span class="section-label">지금 창고로 오는 짐</span><div class="person-list">${personRow(people[0])}${personRow(people[3],1)}</div><p class="card-footnote">예시 기준: 12명이 하루에 먹는 양은 2.4개. 앞으로 들어올 곡물은 현재 48개에 넣지 않아요.</p>${action('먹거리 흐름 보기 →','food')}</div>`;
    hint.textContent='들고 오는 짐은 아직 창고의 물건이 아니에요. 도착하면 창고의 수가 늘어요.';
  }else if(view==='people'){
    html=heading('👥','우리 주민','12명 · 예시 개인 기록')+`<div class="card-body"><p class="purpose">이름을 누르면 지금 하는 일과 집이 나와요.</p><div class="residents-grid">${people.map(p=>`<button class="resident-tile" data-person="${p.id}"><span class="avatar">${p.name[0]}</span><span><b>${p.name}</b><small>${p.short}</small></span></button>`).join('')}</div><p class="resident-summary">일하는 중 6명 · 쉬는 중 6명<br>집 6명 · 중앙 텐트 6명</p><p class="card-footnote">시안의 12명 모두 카드를 열 수 있어요. 실제 게임에는 개인 기록을 먼저 구현해야 해요.</p></div>`;
    hint.textContent='모든 주민에게 카드가 있어요. 일을 시키는 메뉴를 열지 않아도 자동으로 살아가요.';
  }else{
    view='food';
    html=heading('🍲','먹거리가 가는 길','한눈에 보는 마을 생활')+`<div class="card-body"><p class="purpose">수확한 곡물이 도착해야 먹을 수 있어요.</p><div class="food-steps"><button class="food-step" data-view="farm"><span class="food-icon">🌾</span><span><strong>1. 밭에서 수확</strong><small>오늘 수확 · 예시</small></span><em>4.8개</em></button><span>↓</span><button class="food-step" data-person="harin"><span class="food-icon">🚶</span><span><strong>2. 창고로 운반</strong><small>하린이 옮기는 중</small></span><em>3개</em></button><span>↓</span><button class="food-step" data-view="depot"><span class="food-icon">▣</span><span><strong>3. 창고에 도착</strong><small>오늘 도착한 수확물</small></span><em>1.8개</em></button><span>↓</span><button class="food-step" data-view="meal"><span class="food-icon">🍲</span><span><strong>4. 함께 식사</strong><small>12명이 하루에 먹는 양</small></span><em>2.4개</em></button></div><p class="card-footnote">창고 총량은 48개. 수확·운반·도착은 같은 물건의 단계이므로 서로 더하지 않아요. 단계별로 누르면 현장으로 이어져요.</p></div>`;
    hint.textContent='밭 → 운반 → 창고 → 식사. 화살표마다 누르면 관련 건물과 주민을 볼 수 있어요.';
  }
  card.innerHTML=html;panel.scrollTop=0;
  document.querySelectorAll('.game-bottom button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===view||(view==='person'&&b.dataset.view==='people')));
}
document.addEventListener('click',e=>{
  const person=e.target.closest('[data-person]'), target=e.target.closest('[data-view]'), follow=e.target.closest('[data-follow]');
  if(person)show('person',person.dataset.person);
  else if(target){if(target.dataset.view==='meal'){show('food');hint.textContent='식사는 창고에서 하루 2.4개가 나가는 기록으로 보여줍니다. 집마다 배달하는 기능은 현재 없어요.';}else show(target.dataset.view);}
  else if(follow){const p=people.find(x=>x.id===follow.dataset.follow);hint.textContent=`따라가기 시안: ${p.name}의 실제 위치로 카메라를 옮기는 기능이 연결될 자리예요.`;document.querySelector('.map-person').classList.add('selected');}
});
document.getElementById('close-inspector').onclick=()=>{panel.hidden=true;document.getElementById('reopen').hidden=false;document.getElementById('reopen').focus();};
document.getElementById('reopen').onclick=()=>show('farm');
document.getElementById('demo-pause').onclick=e=>{const button=e.currentTarget,playing=document.getElementById('game-frame').classList.toggle('playing');button.setAttribute('aria-pressed',String(!playing));button.innerHTML=(playing?'Ⅱ':'▶')+' <span>경로 재생</span>';hint.textContent=playing?'경로 표시만 재생 중이에요. 실제 주민 이동과 경제는 이 시안에서 계산하지 않아요.':'경로 표시를 멈췄어요. 실제 게임의 시간과는 연결되지 않아요.';};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)document.getElementById('close-inspector').click();});
show('farm');
