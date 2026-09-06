const SCENARIOS={
  balanced:{impact:20,revenue:15,retention:15,strategy:15,confidence:10,risk:10,deadline:15},
  growth:{impact:30,revenue:10,retention:10,strategy:20,confidence:10,risk:5,deadline:15},
  revenue:{impact:10,revenue:35,retention:10,strategy:15,confidence:10,risk:5,deadline:15},
  retention:{impact:10,revenue:10,retention:35,strategy:15,confidence:10,risk:5,deadline:15},
  lowRisk:{impact:10,revenue:10,retention:10,strategy:15,confidence:20,risk:30,deadline:5},
};
const bounded=(value,name,min,max)=>{if(!Number.isFinite(value)||value<min||value>max)throw new Error(`${name} must be ${min}–${max}`);return value};
export function validate(input){
  if(!input||typeof input!=='object')throw new Error('Input must be an object');
  const horizon=bounded(Number(input.horizon??6),'horizon',1,24);
  const teams=(input.teams??[]).map(t=>({id:String(t.id??'').trim(),capacity:bounded(Number(t.capacity),'team capacity',1,100)}));
  if(!teams.length||new Set(teams.map(t=>t.id)).size!==teams.length||teams.some(t=>!t.id))throw new Error('Teams need unique nonempty IDs');
  const features=(input.features??[]).map(f=>({
    id:String(f.id??'').trim(),name:String(f.name??'').trim(),team:String(f.team??'').trim(),effort:bounded(Number(f.effort),'effort',1,100),
    impact:bounded(Number(f.impact),'impact',0,10),revenue:bounded(Number(f.revenue),'revenue',0,1000000000),retention:bounded(Number(f.retention??0),'retention',0,10),
    strategy:bounded(Number(f.strategy),'strategy',0,10),confidence:bounded(Number(f.confidence),'confidence',0,1),risk:bounded(Number(f.risk),'risk',0,10),
    deadline:f.deadline==null?null:bounded(Number(f.deadline),'deadline',1,horizon),dependencies:(f.dependencies??[]).map(String),mandatory:Boolean(f.mandatory),excluded:Boolean(f.excluded),
  }));
  if(!features.length||features.length>22)throw new Error('Provide 1–22 features');
  const ids=new Set(features.map(f=>f.id));
  if(ids.size!==features.length||features.some(f=>!f.id||!f.name))throw new Error('Features need unique IDs and names');
  if(features.some(f=>!teams.some(t=>t.id===f.team)))throw new Error('Every feature must reference a known team');
  if(features.some(f=>f.dependencies.some(d=>!ids.has(d)||d===f.id)))throw new Error('Dependencies must reference another feature');
  const byId=new Map(features.map(f=>[f.id,f]));const visiting=new Set(),done=new Set();
  const visit=id=>{if(visiting.has(id))throw new Error('Dependency cycle detected');if(done.has(id))return;visiting.add(id);for(const d of byId.get(id).dependencies)visit(d);visiting.delete(id);done.add(id)};
  features.forEach(f=>visit(f.id));
  if(features.some(f=>f.mandatory&&f.excluded))throw new Error('A feature cannot be mandatory and excluded');
  return {horizon,teams,features};
}
function normalizedRevenue(features,value){const max=Math.max(...features.map(f=>f.revenue),1);return 10*Math.log1p(value)/Math.log1p(max)}
export function utility(feature,features,weights){
  const deadline=feature.deadline?10:0;
  const raw=weights.impact*feature.impact+weights.revenue*normalizedRevenue(features,feature.revenue)+weights.retention*feature.retention+weights.strategy*feature.strategy+weights.confidence*(feature.confidence*10)+weights.risk*(10-feature.risk)+weights.deadline*deadline;
  return raw/100;
}
function closure(selected,byId){for(const id of [...selected])for(const d of byId.get(id).dependencies){if(!selected.has(d)){selected.add(d);closure(selected,byId)}}return selected}
function schedule(selected,data,scores){
  const {features,teams,horizon}=data,byId=new Map(features.map(f=>[f.id,f]));
  const capacity=Object.fromEntries(teams.map(t=>[t.id,Array(horizon).fill(t.capacity)]));
  const end=new Map(),rows=[],pending=new Set(selected);
  while(pending.size){
    const ready=[...pending].filter(id=>byId.get(id).dependencies.every(d=>end.has(d))).sort((a,b)=>scores[b]-scores[a]||a.localeCompare(b));
    if(!ready.length)return null;
    let placed=false;
    for(const id of ready){const f=byId.get(id),earliest=Math.max(1,...f.dependencies.map(d=>end.get(d)+1));let remaining=f.effort,start=null,last=null;
      const allocations=[];for(let p=earliest;p<=horizon&&remaining>0;p++){const take=Math.min(remaining,capacity[f.team][p-1]);if(take>0){start??=p;last=p;allocations.push([p,take]);remaining-=take}}
      if(remaining>0)continue;if(f.deadline&&last>f.deadline)continue;
      allocations.forEach(([p,n])=>capacity[f.team][p-1]-=n);end.set(id,last);rows.push({...f,start,end:last,utility:scores[id],allocations});pending.delete(id);placed=true;
    }
    if(!placed)return null;
  }
  return {items:rows.sort((a,b)=>a.start-b.start||b.utility-a.utility),capacity};
}
export function optimize(raw,scenario='balanced'){
  const data=validate(raw),weights=SCENARIOS[scenario];if(!weights)throw new Error('Unknown scenario');
  const byId=new Map(data.features.map(f=>[f.id,f])),scores=Object.fromEntries(data.features.map(f=>[f.id,utility(f,data.features,weights)]));
  const candidates=data.features.filter(f=>!f.excluded&&!f.mandatory),base=closure(new Set(data.features.filter(f=>f.mandatory).map(f=>f.id)),byId);
  let best=null,explored=0;const total=2**candidates.length;if(total>2**20)throw new Error('Too many optional features for browser solve; mark items excluded or use the Python solver');
  for(let mask=0;mask<total;mask++){explored++;const selected=new Set(base);for(let i=0;i<candidates.length;i++)if(mask&(1<<i))selected.add(candidates[i].id);closure(selected,byId);
    if([...selected].some(id=>byId.get(id).excluded))continue;const plan=schedule(selected,data,scores);if(!plan)continue;
    const value=[...selected].reduce((n,id)=>n+scores[id],0);const tie=[...selected].reduce((n,id)=>n+byId.get(id).effort,0);
    if(!best||value>best.value+1e-9||(Math.abs(value-best.value)<1e-9&&tie<best.effort))best={...plan,value,effort:tie,selected};
  }
  if(!best)throw new Error('No feasible roadmap satisfies mandatory items, dependencies, deadlines, and capacity');
  const unscheduled=data.features.filter(f=>!best.selected.has(f.id)).map(f=>({id:f.id,name:f.name,reason:f.excluded?'Explicitly excluded':'Not selected within this scenario and capacity'}));
  return {schemaVersion:'1.0.0',scenario,objective:Number(best.value.toFixed(3)),horizon:data.horizon,items:best.items.map(({allocations,...x})=>({...x,utility:Number(x.utility.toFixed(3))})),unscheduled,utilization:Object.fromEntries(data.teams.map(t=>[t.id,best.capacity[t.id].map(n=>Number(((t.capacity-n)/t.capacity).toFixed(3)))])),diagnostics:{method:'exact subset search with precedence-aware deterministic scheduling',optimalForEnumeratedSearch:true,explored},assumptions:['Effort and capacity use the same unit per period','Revenue is log-normalized within this backlog','Scores express the selected scenario, not causal estimates']};
}
export function compare(input){return Object.keys(SCENARIOS).map(name=>optimize(input,name));}
export {SCENARIOS};
