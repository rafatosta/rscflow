# RSCFlow agent contract

Before changing code, every agent must read this file and the relevant documentation in `docs/`.

1. Do not invent, complete, adjust, or reinterpret missing normative rules.
2. Source-of-truth priority is: current maintainer instruction > official resolution > validated normative JSON > documentation > code. Conforme o roteiro da nova bateria de 11/09/2026, a resolução é a única fonte normativa oficial; a planilha é material informal auxiliar de terceiro, sem autoridade normativa.
3. Em divergências entre resolução normativa, planilha e JSON, prevalece sempre a resolução normativa, conforme decisão do mantenedor em 10/09/2026. Registre a divergência e sua fonte. Não resolva por inferência ambiguidades internas da própria normativa.
4. Keep domain, rules, persistence, UI, memorial, and PDF separate. Normative rules are forbidden in React components.
5. Every behavioral change requires its corresponding test.
6. Do not leave TODOs, stubs, or deliberately incomplete functionality.
7. Update documentation and the changelog when applicable.
8. Before concluding, run lint, typecheck, applicable tests, build, and applicable E2E checks; explicitly report any validation not run.
9. Use Conventional Commits with descriptions and bodies in Portuguese, retaining standard type tokens, in the format `type(escopo): descrição`. Suggest a message at the end; never create a commit without explicit maintainer authorization.

## Repository boundaries

- `src/domain/`: stable domain contracts and schemas.
- `src/rules/`: deterministic normative rule evaluation, only after source validation.
- `src/storage/`: persistence adapters, including Dexie.
- `src/components/` and `src/app/`: presentation and composition only.
- `src/memorial/` and `src/pdf/`: document assembly and rendering, separate from rule evaluation.
- `src/data/regulations/`: versioned source data. Pending data must remain explicitly unvalidated.

If this contract conflicts with a maintainer instruction, follow the maintainer instruction and document the decision.

## Required reading by change

- Architecture or dependencies: `docs/architecture.md` and `docs/development-workflow.md`.
- Domain, import, export, or persistence: `docs/domain.md` and `docs/data-model.md`.
- Rules or normative data: `docs/rsc-regulation.md` and the cited official source in `docs/ifba/`.
- Interface behavior: `docs/frontend.md` and `docs/ux.md`.
- Tests or fixtures: `docs/testing.md`.
- Commit preparation: `docs/commit-convention.md` and `CHANGELOG.md`.

## Current normative snapshot

The scoring policy is source-validated. The populated production RSC I, II, and III catalogs remain
`pending-official-validation` and without a normative version. Production scoring must stay
unavailable until the complete catalog and its recorded conflict are validated. Synthetic fixtures
are test-only and the E2E catalog is injected only in Vite `e2e` mode.
