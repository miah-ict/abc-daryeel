# 22-Agent Quality Workflow

## Agents
- 00 Manager
- 01 Planner
- 02–11 Design agents: Super Admin, Admin, Teacher, Student, Accountant, Cleaner, Cooking, Driver, ICT, Landing/Auth
- 12–21 Audit agents: matching page ownership

## Cycle
1. Planner creates page/component/asset acceptance matrix.
2. Design agents create/review page structure and visual tokens.
3. Implementation uses shared React components so every dashboard follows the same system.
4. Audit agents compare each page to its reference screenshot.
5. Manager consolidates findings and classifies them by severity.
6. BLOCKER/HIGH gaps return to the owning design agent.
7. Rebuild and re-audit.
8. Release only after all required checks pass.

## Automated commands
`npm run audit`
`npm run audit:design`
`npm run audit:ui`

The included scripts are deterministic local QA helpers; they do not pretend to be external autonomous LLM agents. They provide the orchestration contract so an AI coding workflow can plug real sub-agents into the same cycle.
