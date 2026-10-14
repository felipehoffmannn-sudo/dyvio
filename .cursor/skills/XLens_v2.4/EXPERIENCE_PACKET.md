# Experience Packet
## Evidence contract between observation and XLens reasoning

An Experience Packet is evidence, not diagnosis. For an existing design or implementation, it must be explicitly recorded before XLens Core starts. An implicit or mentally assembled Packet does not satisfy the contract.

It exists so XLens Core can reason without mixing current reality, documentation, and inference.

---

# Template

```md
# Experience Packet

Version: XLens 2.4.0
Run ID:
Evidence mode: fresh | verified-prior-sources | independent-test
Created / updated:
Evidence artifact location (when saved):
Status: READY | NOT_READY

## Decision
What experience decision are we trying to understand?

## Human context and intended value

### Known
- ...

### Hypotheses
- ...

### Human goal or outcome (source / confidence)
- ...

## Scope
Product / area:
Variant:
Environment:
Route:
States inspected:
Interactions inspected:
Not inspected:

## Observed
- Statement:
  Provenance:
  Scope:

## Observed absent
- Statement:
  Provenance:
  Scope:

## Documented intent
- Statement:
  Provenance:
  Scope:

## Unknowns
- ...

## Blocking unknowns
Only when Status = NOT_READY.
- ...

## Evidence limitations
- ...

## Packet note
Short factual note if needed.
No diagnosis or recommendation.
```

---

# Rules

## 1. Observed means observed

Do not place a documented or inferred claim in `Observed`.

## 2. Absence must be checked

`Observed absent` means the Observer deliberately checked the relevant state.

`Not inspected` is not the same as absent.

## 3. Documentation stays separate

A spec may say something should exist.

The Packet records that under `Documented intent`.

If runtime differs, keep both facts.

Example:

```md
## Observed absent
- Blue unread dot was not present on the inspected unread row.
  Provenance: runtime

## Documented intent
- Unread treatment includes a blue dot.
  Provenance: specification
```

XLens Core may later reason about that divergence.

The Packet does not.

## 4. Unknown is a valid result

Do not force completeness.

If an unknown changes the decision, set `Status: NOT_READY`.

## 5. No design judgment

Do not include:
- declared human satisfaction or success without human evidence;
- tension;
- problem statement;
- recommendation;
- path;
- severity;
- usability score;
- emotional conclusion.

## 6. Keep the scope narrow

Collect the smallest evidence set required for the decision.

Do not build an exhaustive product inventory unless the decision requires it.

## 7. Mandatory handoff gate

For Design or Implemented experience:

1. Produce the complete Packet as a saved Markdown file when supported, or as a verifiable structured artifact within the active run.
2. Check readiness against the **specific decision**, not against an imagined requirement for perfect evidence.
3. Set `READY` only if no missing fact would materially change the judgment. `READY` does not mean runtime was always inspected.
4. Set `NOT_READY` and list blocking unknowns when essential evidence is missing. Do not pass `NOT_READY` to the Core for judgment.
5. Hand the recorded Packet to the Core. Do not substitute a summary from memory.

Source code is `current-code` evidence of implementation structure, not automatically `runtime` observation. Every invocation must create a new, run-specific Packet. Existing Packets are never the handoff to the Core. In normal mode they can suggest which primary sources to verify; in independent test mode they must not be consulted. Do not import previous hypotheses or readiness status. Record the actual source of each fact, not the previous Packet as a substitute for the underlying source.

If the execution environment cannot produce a reviewable Packet, state the limitation rather than claim an XLens evaluation was completed.

## 8. New Packet is not necessarily new runtime inspection

A new Packet means a new assessment of available evidence, not mandatory browser work. Keep `runtime`, `current-code`, `fixture`, `research`, `spec`, and previous historical observations clearly differentiated. If a key unknown changes the decision, mark `NOT_READY`. Do not turn a supported *potential risk* into a confirmed user behavior.
