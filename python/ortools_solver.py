"""Optional CP-SAT reference model for larger offline studies. Requires ortools."""
import json,sys
from ortools.sat.python import cp_model

def solve(data):
    model=cp_model.CpModel(); horizon=data['horizon']; teams={t['id']:t['capacity'] for t in data['teams']}; features=data['features']; by_id={f['id']:f for f in features}
    selected={f['id']:model.new_bool_var('select_'+f['id']) for f in features}; start={}; end={}; intervals={t:[] for t in teams}; demands={t:[] for t in teams}
    for f in features:
        start[f['id']]=model.new_int_var(0,horizon-1,'start_'+f['id']); end[f['id']]=model.new_int_var(1,horizon,'end_'+f['id'])
        duration=max(1,(f['effort']+teams[f['team']]-1)//teams[f['team']]); interval=model.new_optional_interval_var(start[f['id']],duration,end[f['id']],selected[f['id']],'interval_'+f['id']);intervals[f['team']].append(interval);demands[f['team']].append(teams[f['team']])
        if f.get('mandatory'): model.add(selected[f['id']]==1)
        if f.get('excluded'): model.add(selected[f['id']]==0)
        if f.get('deadline'): model.add(end[f['id']]<=f['deadline']).only_enforce_if(selected[f['id']])
    for f in features:
        for dep in f.get('dependencies',[]): model.add(selected[f['id']]<=selected[dep]);model.add(start[f['id']]>=end[dep]).only_enforce_if(selected[f['id']])
    for team in teams:model.add_no_overlap(intervals[team])
    value={f['id']:round(100*(f['impact']+f.get('strategy',0)+10*f.get('confidence',0)-f.get('risk',0))) for f in features};model.maximize(sum(value[i]*selected[i] for i in selected))
    solver=cp_model.CpSolver();solver.parameters.max_time_in_seconds=10;status=solver.solve(model)
    if status not in (cp_model.OPTIMAL,cp_model.FEASIBLE):return {'status':'infeasible'}
    return {'status':'optimal' if status==cp_model.OPTIMAL else 'feasible','items':[{'id':f['id'],'start':solver.value(start[f['id']])+1,'end':solver.value(end[f['id']])} for f in features if solver.value(selected[f['id']])]}

if __name__=='__main__': print(json.dumps(solve(json.load(open(sys.argv[1],encoding='utf-8'))),indent=2))
