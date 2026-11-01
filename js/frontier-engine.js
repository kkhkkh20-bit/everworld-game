/* A self-contained scenario. Old Everworld saves and simulation are untouched. */
(function(root){
'use strict';
const KEY='everworld_frontier_v1';
const plans={farm:{name:'공동 밭',wood:18,stone:0,days:5,desc:'식량 생산 +5 / 일'},home:{name:'동료의 집',wood:24,stone:6,days:6,desc:'거주 공간 +4명 · 장인 정착 조건'},smith:{name:'대장간',wood:38,stone:20,days:8,desc:'목재 생산 +2 / 일 · 철제 도구 교역'},market:{name:'교역소',wood:32,stone:12,days:7,desc:'남쪽 상단과 첫 협정 체결 가능'}};
function fresh(){return {version:1,day:1,name:'새벽숲',food:100,wood:62,stone:30,coin:0,morale:72,pop:8,buildings:{farm:0,home:0,smith:0,market:0},project:null,workers:'balanced',accepted:false,declined:false,arrival:false,storm:false,tribute:null,treaty:false,tradeDay:0,ended:false,starving:0,milestones:[],log:[{day:1,text:'여덟 사람이 숲의 빈터에 첫 불을 피웠다. 이곳을 새벽숲이라 부르기로 했다.'}]};}
function note(s,text){s.log.unshift({day:s.day,text});s.log=s.log.slice(0,60);}
function stage(s){return s.treaty?'자유 교역촌':s.buildings.smith?'장인의 마을':s.buildings.home?'뿌리내린 정착지':'숲속의 작은 야영지';}
function capacity(s){return 8+s.buildings.home*4;}
function rates(s){const gather=s.workers==='food';return {food:(gather?8:3)+s.buildings.farm*5-(s.pop-8)*.5,wood:(gather?1:4)+(s.buildings.smith?2:0),stone:gather?0:1};}
function ready(s,id){if(id==='smith'&&!s.accepted)return '대장장이 로운을 먼저 맞이하세요';if(id==='smith'&&!s.buildings.home)return '로운 가족이 살 동료의 집이 필요합니다';if(id==='market'&&!s.buildings.smith)return '먼저 대장간에서 교역할 도구를 만드세요';return '';}
function build(s,id){const p=plans[id];if(!p)return '알 수 없는 시설입니다';if(s.project)return '진행 중인 공사를 먼저 마쳐주세요';if(s.buildings[id]>=(id==='home'?3:id==='farm'?2:1))return '이미 충분히 지었습니다';const why=ready(s,id);if(why)return why;if(s.wood<p.wood||s.stone<p.stone)return '자재가 부족합니다';s.wood-=p.wood;s.stone-=p.stone;s.project={id,left:p.days,total:p.days};note(s,p.name+' 공사를 시작했다. 목재 '+p.wood+' · 석재 '+p.stone+' 사용.');return '';}
function choose(s,id){if(id==='accept'){if(!s.arrival||s.accepted||s.declined)return '현재 결정할 방문자가 없습니다';if(s.food<25)return '나눌 식량 25가 필요합니다';if(capacity(s)<s.pop+3)return '가족 세 명이 살 동료의 집을 먼저 지어주세요';s.food-=25;s.pop+=3;s.accepted=true;s.morale=Math.min(100,s.morale+8);note(s,'로운과 두 아이가 주민이 되었다. 식량 25를 나눴다. “이번에는 오래 머물고 싶습니다.”');}
else if(id==='later'){if(!s.arrival||s.accepted)return '이미 정착한 동료입니다';s.declined=true;note(s,'로운 가족은 숲 가장자리에서 기다리기로 했다. 준비되면 다시 초대할 수 있다.');}
else if(id==='recall'){s.declined=false;return choose(s,'accept');}
else if(id==='tribute'){if(s.day<32||s.tribute)return '지금은 답할 요구가 없습니다';if(s.wood<30)return '목재 30이 필요합니다';s.wood-=30;s.tribute='paid';s.morale=Math.max(0,s.morale-5);note(s,'북부 철갑령에 목재 30을 보냈다. 국경 통행을 보장받았지만 주민들은 독립을 바란다.');}
else if(id==='refuse'){if(s.day<32||s.tribute)return '지금은 답할 요구가 없습니다';s.tribute='free';s.morale=Math.min(100,s.morale+5);note(s,'북부의 조공 요구를 거절했다. 독립을 지키는 대신 남쪽 협정에 교섭금 20이 더 필요해졌다.');}
else if(id==='treaty'){const price=s.tribute==='free'?60:40;if(!s.buildings.market)return '교역소가 필요합니다';if(s.treaty)return '이미 협정을 맺었습니다';if(s.coin<price)return '교섭금 '+price+' 금화가 필요합니다. 도구를 판매하세요';s.coin-=price;s.treaty=true;note(s,'해오름 상단과 첫 교역 협정! 새벽숲이 독립된 교역 상대가 되었다. 이제 10일마다 교역 수입 18.');}
else if(id==='trade'){if(!s.buildings.smith)return '대장간을 먼저 완성하세요';if(s.day-s.tradeDay<5)return '다음 상인은 '+(5-s.day+s.tradeDay)+'일 뒤에 옵니다';if(s.wood<12)return '도구 제작용 목재 12가 필요합니다';s.wood-=12;s.coin+=24;s.tradeDay=s.day;note(s,'로운의 도구를 팔았다. 목재 12 → 금화 24. 상인은 다음에는 더 많은 물건을 사고 싶다고 했다.');}
else if(id==='food'||id==='balanced'){s.workers=id;note(s,id==='food'?'미라가 채집을 이끈다. 식량을 더 모으고 건축 자재 수집을 줄인다.':'다시 식량과 건축 자재를 균형 있게 모은다.');}
else if(id==='relief'){if(!s.starving)return '현재 식량 위기가 아닙니다';s.food+=40;s.morale=Math.max(0,s.morale-8);s.workers='food';note(s,'이웃에 구호를 요청해 식량 40을 받았다. 주민들은 당분간 채집에 집중한다.');}
else return '알 수 없는 선택입니다';return '';}
function tick(s){s.day++;const r=rates(s);for(const k of ['food','wood','stone'])s[k]=Math.max(0,Math.round((s[k]+r[k])*10)/10);if(s.food===0){s.starving++;s.morale=Math.max(0,s.morale-2);}else s.starving=0;
if(s.project&&--s.project.left<=0){const id=s.project.id;s.buildings[id]++;s.project=null;note(s,plans[id].name+' 완성! '+plans[id].desc);s.milestones.push({day:s.day,id});}
if(s.day>=4&&!s.arrival){s.arrival=true;note(s,'숲길에 대장장이 로운과 두 아이가 도착했다. 머물 집과 식량이 필요하다.');}
if(s.day>=23&&!s.storm){s.storm=true;s.food=Math.max(0,s.food-35);note(s,'긴 비로 비축 식량 35가 상했다. 미라가 공동 밭과 식량 중심 작업을 제안했다.');}
if(s.day===32)note(s,'북부 철갑령의 사절: “우리의 보호 아래 들어오라.” 목재 30의 조공을 요구했다.');
if(s.treaty&&s.day%10===0){s.coin+=18;note(s,'협정에 따른 정기 교역 수입 +18 금화.');}
if(s.treaty&&!s.ended){s.ended=true;s.milestones.push({day:s.day,id:'treaty'});}
return s;}
const api={KEY,plans,fresh,note,stage,capacity,rates,ready,build,choose,tick};if(typeof module!=='undefined')module.exports=api;else root.Frontier=api;
})(typeof window==='undefined'?globalThis:window);
