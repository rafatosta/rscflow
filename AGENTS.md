# RSCFlow agent contract

Before changing code, every agent must read this file and the relevant documentation in `docs/`.

1. Do not invent, complete, adjust, or reinterpret missing normative rules.
2. Source-of-truth priority is: current maintainer instruction > official resolution > official scoring spreadsheet > validated normative JSON > documentation > code.
3. If the resolution, spreadsheet, and JSON diverge, stop the rule change and report the inconsistency for human decision.
4. Keep domain, rules, persistence, UI, memorial, and PDF separate. Normative rules are forbidden in React components.
5. Every behavioral change requires its corresponding test.
6. Do not leave TODOs, stubs, or deliberately incomplete functionality.
7. Update documentation and the changelog when applicable.
8. Before concluding, run lint, typecheck, applicable tests, build, and applicable E2E checks; explicitly report any validation not run.
9. Use English Conventional Commits in the format `type(scope): description`. Suggest a message at the end; never create a commit without explicit maintainer authorization.

## Repository boundaries

- `src/domain/`: stable domain contracts and schemas.
- `src/rules/`: deterministic normative rule evaluation, only after source validation.
- `src/storage/`: persistence adapters, including Dexie.
- `src/components/` and `src/app/`: presentation and composition only.
- `src/memorial/` and `src/pdf/`: document assembly and rendering, separate from rule evaluation.
- `src/data/regulations/`: versioned source data. Pending data must remain explicitly unvalidated.

If this contract conflicts with a maintainer instruction, follow the maintainer instruction and document the decision.
