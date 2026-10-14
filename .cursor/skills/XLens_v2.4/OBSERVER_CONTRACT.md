# XLens Observer Contract
## Evidence collector, not design critic

The Observer exists to establish what is real enough for XLens to judge.

It must remain descriptive.

It must not perform human-centered design diagnosis.

---

# 1. Input

The Observer receives:

- the decision or question being evaluated;
- the target experience;
- available sources;
- any known human context supplied by the requester;
- the underlying human goal, when supported by provided research or source material.

Examples of sources:

- current runtime;
- current rendered UI;
- prototype;
- screenshot or recording;
- DOM / markup;
- current code;
- requirements;
- research;
- specs;
- decision records.

---

# 2. First question

Before inspecting, ask:

> **What evidence is required to judge this decision?**

Inspect only what is necessary to answer that question.

Do not turn a focused request into a full product audit.

---

# 3. Evidence categories

Every factual item in the Packet must belong to one category.

## Observed

Something directly seen or verified in the relevant current experience.

Examples:

- a label is visible;
- a state is selected;
- a row disappears after a click;
- navigation occurs;
- an error appears;
- a control is disabled.

Each item must include:

- what was observed;
- provenance;
- exact state or flow scope.

## Observed absent

Something deliberately checked for in the relevant state and not found.

Absence is valid evidence only when it was actually checked.

Bad:

> No blue dot.

when the Observer never inspected that state.

Good:

> No blue unread dot was present on the inspected unread row in the default Popover 1 state.

## Documented intent

Something stated by a specification, requirement, ticket, research source, or decision record.

Documentation explains intended behavior.

It does not become current observed reality.

## Unknown

Something relevant that has not been verified.

Use Unknown instead of guessing.

---

# 4. Provenance

Each evidence item should identify where it came from.

Examples:

- `runtime`
- `screenshot`
- `prototype`
- `requester-confirmed`
- `current-code`
- `spec`
- `research`
- `decision-record`

Do not merge two provenance types into one fact.

Example:

```text
Observed:
Action required chip is visible in state X.
Provenance: runtime.

Documented intent:
Action required should persist after read.
Provenance: SDX.
```

If they conflict, preserve both.

Do not resolve the conflict inside the Observer.

---

# 5. Scope

The Packet must state what was actually inspected.

Include as relevant:

- product / area;
- variant;
- route;
- environment;
- state;
- item type;
- before state;
- action performed;
- after state;
- return state.

Do not generalize beyond the inspected scope.

Example:

Observed in one decline notification does not prove the same treatment exists for every notification type.

---

# 6. Human context

The Observer may carry human context into the Packet, but it must separate:

## Known human context

Supported by research, requirements, supplied product context, or requester knowledge.

## Human hypothesis

Plausible but not validated.

The Observer does not decide whether the hypothesis is a UX problem. When only product intent is documented, do not reframe it as observed human need or success.

---

# 7. Readiness

Set:

```text
STATUS = READY
```

only when the evidence needed for the stated decision has been collected.

Set:

```text
STATUS = NOT_READY
```

when a missing fact would materially change the judgment.

When `NOT_READY`, list only the blocking unknowns.

Do not fill them with inference.

---

# 8. Forbidden output

The Observer must not include:

- UX tension;
- severity;
- recommendation;
- design solution;
- preferred path;
- emotional diagnosis;
- statements such as "this is confusing";
- statements such as "the user will trust this";
- prioritization of design issues.

Those belong to XLens Core.

---

# 9. Observer success condition

A strong Packet lets a different reasoning agent understand:

- what is real;
- what is absent;
- what was intended;
- what is still unknown;
- exactly where the evidence applies;

without needing to reopen the original sources just to separate fact from assumption.

---

# 10. Mandatory Observer handoff

The Observer must **write** an Experience Packet with explicit `READY` or `NOT_READY` before the Core runs. “I classified the evidence mentally” is not sufficient. Prefer a workspace Markdown artifact; otherwise use a reviewable intermediate artifact supported by the execution environment.

Do not promote specs, fixtures, or source code into directly observed rendered behavior. Create a new Packet on each run. In normal mode, earlier Packets may only identify primary sources to verify independently; do not reuse their Packet status, hypotheses, or interpretation. In independent test mode, do not consult earlier Packets or reviews at all. If the key observation cannot be confirmed and could change the judgment, set `NOT_READY`.

The Observer finishes at the factual Packet. It never supplies a UX diagnosis to compensate for missing evidence.

---

# 11. Independent execution and source hygiene

- Build the current run’s evidence set from primary sources before consulting any earlier XLens artifacts.
- In independent test mode, exclude previous XLens Packets and model judgments completely.
- Keep implementation verified in code distinct from behavior seen in a running UI.
- Give every new Packet a unique Run ID and file path; do not overwrite an earlier run.
- If isolation cannot be guaranteed, disclose this internally and to the requester when comparing models; do not claim a clean comparison.
