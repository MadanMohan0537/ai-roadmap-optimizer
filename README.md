<div align="center">

# AI Roadmap Optimizer

**Turn a feature backlog into feasible, strategy-aware delivery scenarios.**

[![Verify](https://github.com/MadanMohan0537/ai-roadmap-optimizer/actions/workflows/ci.yml/badge.svg)](https://github.com/MadanMohan0537/ai-roadmap-optimizer/actions/workflows/ci.yml)
[![Cloudflare Workers](https://img.shields.io/badge/runtime-Cloudflare%20Workers-F38020)](https://developers.cloudflare.com/workers/)
[![License: MIT](https://img.shields.io/badge/license-MIT-2563EB.svg)](LICENSE)

</div>

## Review feasibility before ranking

Use an included [example](examples/) and compare strategy scenarios. Check omitted initiatives, dependency ordering, capacity consumption and deadline conflicts before selecting a roadmap.

The core implementation is in [optimizer.js](src/optimizer.js); [worker.js](src/worker.js) exposes the application. The Node manifest includes `npm run check` and `npm test`, but no `dev` script. Follow the explicit Wrangler command in the local-run section below.

Scores express configured strategy preferences. They do not prove future revenue or globally optimal delivery. The optional [Python model](python/) has its own dependencies and is distinct from the JavaScript runtime.



Most roadmap tools help teams order a list. This project solves a harder problem: **which initiatives fit, in what sequence, under real delivery constraints?**

The optimizer evaluates customer impact, revenue opportunity, retention, strategic alignment, confidence, delivery risk and deadlines. It creates capacity-feasible schedules while enforcing dependencies, mandatory commitments and exclusions.

~~~text
Feature backlog
      ↓
Validate inputs and dependency graph
      ↓
Score five strategic scenarios
      ↓
Select feasible initiative portfolios
      ↓
Schedule work against team capacity
      ↓
Compare roadmaps and approve deliberately
~~~

## Product experience

The responsive workspace opens directly on the planning task:

1. Define teams and capacity per planning period.
2. Add feature effort, value signals, risk, deadlines and dependencies.
3. Run one objective or compare all five.
4. Review scheduled and omitted initiatives.
5. Inspect delivery periods and team utilization.

It supports light and dark browser themes and ships with a synthetic backlog that can be optimized immediately.

## Strategy scenarios

| Scenario | What it emphasizes |
|---|---|
| **Balanced** | Broad product value across every input |
| **Growth** | Customer impact and strategic alignment |
| **Revenue** | Revenue opportunity |
| **Retention** | Retention impact |
| **Low risk** | Confidence and lower delivery risk |

Scenario weights are transparent policy choices in [src/optimizer.js](src/optimizer.js). They are not learned facts.

## What is implemented

- Exact subset enumeration within a bounded MVP search space
- Dependency-cycle detection and prerequisite closure
- Per-team, per-period capacity allocation
- Hard mandatory, excluded, deadline and planning-horizon constraints
- Five deterministic scenario objectives
- Log-normalized revenue to reduce domination by one large estimate
- Stable tie-breaking and explicit unscheduled-item reasons
- Utilization output for every team and period
- Stateless Cloudflare Worker API
- Responsive, dependency-free browser interface
- Optional Google OR-Tools CP-SAT reference implementation
- Core, validation and HTTP tests in GitHub Actions

## Example input

~~~json
{
  "horizon": 6,
  "teams": [
    {"id": "platform", "capacity": 8},
    {"id": "growth", "capacity": 6}
  ],
  "features": [
    {
      "id": "identity",
      "name": "Identity foundation",
      "team": "platform",
      "effort": 10,
      "impact": 6,
      "revenue": 100000,
      "retention": 5,
      "strategy": 9,
      "confidence": 0.9,
      "risk": 3,
      "mandatory": true
    },
    {
      "id": "onboarding",
      "name": "Adaptive onboarding",
      "team": "growth",
      "effort": 12,
      "impact": 9,
      "revenue": 650000,
      "retention": 8,
      "strategy": 8,
      "confidence": 0.75,
      "risk": 4,
      "deadline": 5,
      "dependencies": ["identity"]
    }
  ]
}
~~~

Effort and capacity must use the same unit, such as engineering points per two-week period. Impact, retention, strategy and risk use 0–10; confidence uses 0–1.

The output contains the selected scenario, objective value, scheduled initiatives, delivery periods, omitted work, team utilization, solver diagnostics and assumptions.

## Run locally

Requirements: Node.js 20 or later.

~~~bash
git clone https://github.com/MadanMohan0537/ai-roadmap-optimizer.git
cd ai-roadmap-optimizer
node --test
node --check src/optimizer.js
npx wrangler dev
~~~

Open the Wrangler development URL and select **Load sample**.

## API

| Endpoint | Purpose |
|---|---|
| POST /api/optimize | Optimize one scenario or compare all five |
| GET /api/health | Check Worker availability |

Add scenario as balanced, growth, revenue, retention, lowRisk or compare. Invalid and infeasible inputs return HTTP 422 with a specific message.

## Optimization contract

For feature \(i\), the scenario utility is:

\[
U_i = \sum_k w_k x_{ik}
\]

Revenue is log-normalized within the submitted backlog, risk is inverted, and every other factor remains on its documented scale. The solver maximizes selected utility while enforcing known acyclic dependencies, prerequisite inclusion, per-period team capacity, commitments, exclusions, deadlines and the horizon.

Read [the architecture](docs/ARCHITECTURE.md) for the complete mathematical contract.

## Honest optimality boundary

The Worker exhaustively evaluates the allowed feature subsets, but uses a deterministic precedence-aware scheduling heuristic for each subset. It reports optimality only for the enumerated search, not global optimality across every theoretically possible schedule.

The edge solver accepts at most 22 total features and 20 optional features. This is an intentional safety bound for exponential enumeration and Cloudflare runtime limits.

## Optional OR-Tools model

The repository includes a separate CP-SAT reference for larger offline studies:

~~~bash
python -m venv .venv
pip install -r requirements.txt
python python/ortools_solver.py examples/backlog.json
~~~

The reference currently assumes contiguous, full-team task allocation and uses a simplified objective. Its score is not directly comparable with the Worker solver.

## Cloudflare deployment

~~~bash
npx wrangler deploy
~~~

The MVP is stateless and stores no customer roadmap data. Before introducing saved roadmaps, add authentication, tenant isolation, authorization, retention controls and durable storage. Configure rate limiting before broad public exposure.

## Repository structure

~~~text
.
├── src/                 Optimizer and Worker API
├── public/              Responsive product interface
├── python/              Optional OR-Tools reference solver
├── tests/               Core and HTTP tests
├── examples/            Synthetic runnable backlog
├── docs/                PRD, strategy, metrics and architecture
├── wrangler.jsonc       Cloudflare configuration
└── README.md
~~~

## Documentation

- [Product requirements](docs/PRD.md)
- [Architecture and mathematical contract](docs/ARCHITECTURE.md)
- [Product strategy](docs/PRODUCT_STRATEGY.md)
- [Success metrics](docs/METRICS.md)

## Relationship to ProdMind

[ProdMind](https://github.com/MadanMohan0537/prodmind) converts customer evidence into reviewed and prioritized opportunities. This optimizer is its planning companion: it converts approved initiatives, dependencies and team capacity into delivery scenarios.

The current handoff is documented, not automatically synchronized.

## Limitations

- The optimizer cannot correct unreliable impact, revenue or effort estimates.
- Cross-team staffing, split allocation, uncertainty simulation and calendar dates are not modeled.
- A feasible roadmap is not proof of commercial impact.
- Accountable product and engineering leaders remain responsible for approval.
- The current product uses deterministic optimization. A future AI explanation layer should cite actual score and constraint changes.

## License

[MIT](LICENSE)
