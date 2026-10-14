# XLens v2.4.0

A human-centered experience judgment workflow for ideas, prototypes, and implemented product experiences. It offers another evidence-grounded perspective; the designer owns the decision.

> Functional completion is not the same as experience completion.

## Quick start

Place the four files together where your assistant can read them and ask:

> Julie, use `XLENS.md` to evaluate this experience.

The agent should follow `XLENS.md`, inspect relevant primary sources, create a new Experience Packet for this run, and evaluate only when the evidence is sufficient. No special long test prompt should be necessary.

## Files needed for installation

- `XLENS.md`: single entry point and orchestration
- `OBSERVER_CONTRACT.md`: evidence collection rules
- `EXPERIENCE_PACKET.md`: fact / source / unknown / READY gate
- `XLENS_CORE.md`: evidence-grounded human-centered judgment

## Per-run records

Default to **at most two Markdown files** for an evaluated design or implementation:

1. Experience Packet (required evidence handoff)
2. XLens Review (single concise judgment record, saved when practical)

A screenshot or trace is optional when necessary evidence. No separate Core, visual report, executive report, or index by default.

## What this does not do

XLens is not a user research substitute, automated UX certification, usability-only audit, or design decision maker. Code and specs do not prove that people understand, trust, or benefit from the experience. A valid outcome can be a meaningful concern, a promising opportunity, something worth preserving, or insufficient evidence.

## Version notes

v2.4.0 builds on v2.3.0. It keeps fresh per-run packets, source provenance, READY/NOT_READY, independent-test hygiene and the simple invocation. It reduces generated documentation and explicitly widens Core judgment beyond usability to human goals, value, context, agency, trust and experience completion. These changes are design revisions, not claims of benchmark validation.

**Naming:** This package intentionally retains **XLens**. Future names such as UXTake are being explored separately and are not treated as an adopted rename here.
