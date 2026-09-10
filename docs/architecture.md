# Architecture

The application is layered to keep legal/normative decisions auditable and independent of the interface.

- `app`: application entry points and composition.
- `components`: reusable presentation; `components/ui` hosts shadcn-compatible primitives.
- `domain`: versioned business-neutral contracts and schemas.
- `rules`: future pure, tested normative calculations.
- `data/regulations`: validated, versioned regulation datasets.
- `storage`: local persistence adapters.
- `features`: use-case orchestration.
- `memorial` and `pdf`: future document assembly and output.
- `utils`: framework-agnostic helpers.

React components may present outcomes but must never contain normative criteria or scoring logic.
