# Architecture and mathematical contract

The stateless Worker serves the interface and invokes the same pure optimizer used by the tests. Validation builds a directed acyclic dependency graph. Exact subset enumeration selects optional work; prerequisite closure adds required ancestors; a precedence-aware scheduler allocates effort against each team's period capacity.

## Hard constraints

- Unique feature and team identities
- Acyclic, known prerequisites
- Mandatory features included; excluded features omitted
- A selected feature implies all prerequisites are selected
- Team allocation never exceeds capacity in a period
- Prerequisites finish before dependents start
- Deadline-constrained work finishes by its declared period
- All work finishes inside the horizon

## Objective

Each scenario supplies weights totaling 100. Revenue is transformed with `10 × log(1 + feature revenue) / log(1 + maximum backlog revenue)`. Risk is inverted. The weighted sum is divided by 100. A lower-effort plan breaks equal-utility ties.

## Honest optimality boundary

Subset selection is exhaustive within the configured input bound. Scheduling uses a deterministic ready-list heuristic, so a subset rejected by that scheduler might theoretically admit another allocation. Accordingly, the output says “optimal for enumerated search,” not globally optimal across all schedules. A production CP-SAT formulation should use optional interval variables, cumulative team resources, prerequisite implications, deadline constraints and an explicit time limit.

## Complexity and limits

Enumeration is exponential in optional features. The Worker rejects more than 20 optional features and more than 22 total features. This makes the limit explicit instead of risking unbounded edge computation. Large backlogs belong in the optional OR-Tools service or should be decomposed into portfolios.
