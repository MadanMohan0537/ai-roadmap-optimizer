# AI Roadmap Optimizer

A constraint-aware product roadmap workspace that chooses **what fits, when it fits, and why it changes across strategies**. It replaces manual drag-and-drop ordering with a deterministic optimization model while keeping business estimates and final decisions with the product team.

## Why this product is viable

Roadmaps combine selection and scheduling. A high-scoring feature may still be impossible to start because a prerequisite is unfinished, its team has no capacity, or its deadline cannot be met. The optimizer treats those as hard constraints and uses scoring only to choose among feasible plans.

The MVP compares five objectives:

| Scenario | Emphasis |
|---|---|
| Balanced | Broad product value |
| Growth | Customer impact and strategy |
| Revenue | Revenue opportunity |
| Retention | Retention impact |
| Low risk | Confidence and delivery risk |

## What is implemented

- Exact subset enumeration for up to 22 features, with a safety limit of 20 optional features
- Dependency-cycle validation and automatic prerequisite inclusion
- Per-team, per-period capacity scheduling
- Hard mandatory, excluded and deadline constraints
- Balanced, growth, revenue, retention and low-risk scenarios
- Log-normalized revenue so one large estimate does not linearly dominate every plan
- Deterministic tie-breaking, utilization data and explicit unscheduled reasons
- Responsive light/dark working interface
- Cloudflare Worker API with no paid model or external runtime dependency
- Optional Google OR-Tools CP-SAT reference model for larger offline experiments
- Core and HTTP tests

The browser/Worker solver reports optimality only for the subsets it enumerates. Its precedence-aware scheduler is deterministic, but it does not claim globally optimal start dates across every possible resource allocation. The optional CP-SAT model is deliberately separate and is not silently presented as the Cloudflare implementation.

## Quick start

```bash
git clone https://github.com/MadanMohan0537/ai-roadmap-optimizer.git
cd ai-roadmap-optimizer
npm test
npm run check
npx wrangler dev
```

Open the local address, load the sample, and compare scenarios. No `npm install` is required for the test suite itself; Wrangler is needed only for local Worker development or deployment.

## Input contract

```json
{
  "horizon": 6,
  "teams": [{"id": "platform", "capacity": 8}],
  "features": [{
    "id": "billing",
    "name": "Self-serve billing",
    "team": "platform",
    "effort": 14,
    "impact": 7,
    "revenue": 1000000,
    "retention": 4,
    "strategy": 7,
    "confidence": 0.8,
    "risk": 5,
    "deadline": 5,
    "dependencies": ["identity"],
    "mandatory": false,
    "excluded": false
  }]
}
```

Effort and capacity must share one unit, such as engineering points per two-week period. Impact, retention, strategy and risk use `0–10`; confidence uses `0–1`. Revenue is a scenario input, not a forecast produced by the application.

## Optimization model

For feature \(i\), the scenario utility is a weighted sum of customer impact, log-normalized revenue, retention, strategic alignment, confidence, inverse risk and deadline importance:

\[
U_i = \sum_k w_k x_{ik}
\]

The solver maximizes selected utility subject to prerequisite closure, team capacity, exclusions, mandatory commitments, deadlines and the planning horizon. Full definitions, limitations and future OR-Tools formulation are in [the architecture](docs/ARCHITECTURE.md).

## API

`POST /api/optimize` accepts the input contract plus `scenario`. Use `compare` to return every scenario. `GET /api/health` is public. Invalid or infeasible inputs return `422` with a specific message.

This MVP has no persistent customer data and no authentication because optimization is stateless. Before adding saved proprietary roadmaps, add identity, tenant isolation, authorization and retention controls. Configure Cloudflare rate limiting before exposing the endpoint broadly.

## Optional OR-Tools solver

Google OR-Tools is open source and appropriate when the backlog grows beyond bounded browser enumeration or needs richer scheduling constraints. The included Python model demonstrates optional intervals, precedence, deadlines and a ten-second solve limit:

```bash
python -m venv .venv
pip install -r requirements.txt
python python/ortools_solver.py examples/backlog.json
```

The reference model currently uses simplified full-capacity, contiguous tasks and a compact objective. Its output should not be compared numerically with the Worker solver until both objective definitions are aligned.

## Research decisions

- OR-Tools models job-shop scheduling with precedence and resource exclusivity, which matches roadmap dependencies and constrained teams.
- Knapsack models explain why high-value work may be left out when capacity is limited.
- CP-SAT operates on integer coefficients, so production score scales should be explicit and tested.
- Google recommends solve-time limits for potentially expensive constraint models.
- WSJF informed the inclusion of value, time sensitivity and job size, but this product does not label its multi-factor objective as WSJF.
- Cloudflare Workers have bounded CPU and 128 MB isolate memory, motivating a guarded MVP input size and an offline solver for larger studies.

Sources: [OR-Tools scheduling](https://developers.google.com/optimization/scheduling), [job-shop model](https://developers.google.com/optimization/scheduling/job_shop), [knapsack](https://developers.google.com/optimization/pack/knapsack), [CP-SAT](https://developers.google.com/optimization/cp/cp_solver), [solve limits](https://developers.google.com/optimization/cp/cp_tasks), [WSJF](https://framework.scaledagile.com/wsjf), and [Cloudflare Worker limits](https://developers.cloudflare.com/workers/platform/limits/).

## Product boundaries

- Optimization cannot repair unreliable impact, revenue or effort estimates.
- Scenario weights are transparent policy choices, not learned truth.
- Cross-team staffing, partial allocation, uncertainty simulation, calendar dates and multi-quarter carryover are not yet modeled.
- The system recommends a feasible roadmap; accountable leaders approve it.
- “AI” is reserved for a future explanation layer. The current explanations are deterministic and evidence-based.

## Repository map

```text
src/             Optimization engine and Worker
public/          Responsive product interface
python/          Optional OR-Tools CP-SAT reference
tests/           Deterministic and HTTP tests
examples/        Synthetic backlog
docs/            PRD, architecture, metrics and strategy
```

## License

MIT. See [LICENSE](LICENSE).
