// Read-only selection of an event already produced by the simulation.
const local=new Set(['life','build','milestone','comparison','season_result','trade','pact','offer','water','crisis','ruin','technology','defense','territory','threat','war','battle','peace','weather','forecast','agreement','route','migration','recovery','decline','diplomacy']);
const global=new Set(['pact','war','battle','territory','threat','ruin','agreement','route','migration','crisis','weather','forecast']);
export function findObservedEvent(events,since,townId){
  const kinds=townId===null?global:local;
  return events.findLast(e=>e.id>=since&&kinds.has(e.type)&&(townId===null||e.ids.includes(townId)))||null;
}
