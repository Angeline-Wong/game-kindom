# Palace Game Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable portrait H5 demo with a shared imperial HUD, front-court and inner-court maps, accelerated game time, inspectable characters, one court-session interaction, and one Imperial Household Department interaction.

**Architecture:** Use a Vite React TypeScript single-page app. Keep deterministic game rules in framework-independent TypeScript modules, React state in a small context/reducer, and visual scenes as responsive DOM layers over concept-art map assets. This first demo persists locally and defines interfaces that can later be backed by a server.

**Tech Stack:** Node.js 24, npm 11, Vite, React, TypeScript, Vitest, Testing Library, CSS, localStorage.

## Global Constraints

- Portrait mobile is the primary viewport; desktop displays a centered phone-width game surface.
- V1 bottom navigation shows only Front Court, Inner Court, Treasury, and More.
- One game day lasts 72 real seconds at 1x; support pause, 1x, 2x, and 4x.
- Front Court and Inner Court use the same fixed HUD and navigation frame.
- Character details use six-axis radar summaries while retaining detailed internal data.
- Hidden intent is never displayed as exact truth; uncertain traits use known estimates.
- All romanceable characters are adults.
- Use `npm.cmd` and `npx.cmd` under PowerShell.

---

### Task 1: Project shell and test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/test/setup.ts`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: React application root and `npm` scripts `dev`, `build`, `test`, `typecheck`.

- [ ] Write `App.test.tsx` asserting the title “紫宸纪” and four navigation labels render.
- [ ] Run `npm.cmd test -- --run` and confirm failure because the project shell is absent.
- [ ] Add the minimal Vite/React/TypeScript files and dependencies.
- [ ] Run the test and confirm it passes.

### Task 2: Deterministic clock and calendar

**Files:**
- Create: `src/game/clock.ts`
- Test: `src/game/clock.test.ts`

**Interfaces:**
- Produces: `advanceClock(clock: GameClock, realMs: number, speed: TimeSpeed): GameClock`, `formatShichen(minuteOfDay: number): string`, and immutable `GameClock`.

- [ ] Write failing tests proving 72 seconds advances one day at 1x, pause advances nothing, and 4x advances four times faster.
- [ ] Run the clock tests and confirm the expected missing-module failure.
- [ ] Implement minute/day/month/year rollover and twelve-shichen formatting.
- [ ] Run the tests and confirm they pass.

### Task 3: Character summaries and radar data

**Files:**
- Create: `src/game/characters.ts`
- Create: `src/components/RadarChart.tsx`
- Create: `src/components/CharacterSheet.tsx`
- Test: `src/game/characters.test.ts`
- Test: `src/components/CharacterSheet.test.tsx`

**Interfaces:**
- Produces: `Character`, `EmperorCharacter`, `OfficialCharacter`, `ConsortCharacter`, `getRadarAxes(character)`, and `CharacterSheet`.

- [ ] Write failing tests for the exact six emperor, official, and consort axes and for unknown estimates rendering as `?`.
- [ ] Run tests and confirm they fail because the character module is absent.
- [ ] Implement typed character models, demo fixtures, SVG radar rendering, and the sheet drawer.
- [ ] Run tests and confirm they pass.

### Task 4: Game state, persistence, and shared HUD

**Files:**
- Create: `src/game/state.tsx`
- Create: `src/game/persistence.ts`
- Create: `src/components/GameShell.tsx`
- Create: `src/components/TopStatus.tsx`
- Create: `src/components/BottomNav.tsx`
- Test: `src/game/persistence.test.ts`
- Test: `src/components/GameShell.test.tsx`

**Interfaces:**
- Produces: `GameProvider`, `useGame()`, `GameAction`, `saveGame(state)`, `loadGame()`, and shared shell slots.

- [ ] Write failing tests for save/load round-trip, map switching, fixed currency values, and disabled future navigation not rendering.
- [ ] Run tests and confirm expected failures.
- [ ] Implement reducer state, local persistence, shared top status, speed controls, and four-item bottom navigation.
- [ ] Run tests and confirm they pass.

### Task 5: Map scenes and moving NPCs

**Files:**
- Create: `src/game/locations.ts`
- Create: `src/game/schedules.ts`
- Create: `src/components/MapScene.tsx`
- Create: `src/components/NpcSprite.tsx`
- Create: `src/data/frontCourt.ts`
- Create: `src/data/innerCourt.ts`
- Copy: `src/assets/front-court-concept.png`
- Copy: `src/assets/inner-court-concept.png`
- Test: `src/game/schedules.test.ts`
- Test: `src/components/MapScene.test.tsx`

**Interfaces:**
- Produces: `LocationDefinition`, `NpcSchedule`, `getNpcPosition(schedule, clock)`, and clickable `MapScene`.

- [ ] Write failing tests for location lookup, schedule interpolation, and opening a location panel.
- [ ] Run tests and confirm expected failures.
- [ ] Implement both map datasets, background assets, labeled hotspot buttons, NPC markers, and click-to-move feedback.
- [ ] Run tests and confirm they pass.

### Task 6: Daily court-session vertical slice

**Files:**
- Create: `src/game/court.ts`
- Create: `src/features/court/CourtSession.tsx`
- Create: `src/features/court/DebatePanel.tsx`
- Test: `src/game/court.test.ts`
- Test: `src/features/court/CourtSession.test.tsx`

**Interfaces:**
- Produces: `CourtIssue`, `CourtAction`, `applyCourtAction(issue, action)`, and `CourtSession`.

- [ ] Write failing tests for questioning a report, asking an official to answer, deferring an issue to tomorrow, and rage increasing fear while reducing candor.
- [ ] Run tests and confirm expected failures.
- [ ] Implement one major flood-relief issue with debate statements, source credibility hints, universal emperor actions, and a final ruling.
- [ ] Run tests and confirm they pass.

### Task 7: Imperial Household Department vertical slice

**Files:**
- Create: `src/game/treasury.ts`
- Create: `src/features/household/HouseholdOffice.tsx`
- Test: `src/game/treasury.test.ts`
- Test: `src/features/household/HouseholdOffice.test.tsx`

**Interfaces:**
- Produces: `TreasuryState`, `transferFunds(state, request)`, `approveProcurement(state, request)`, and `HouseholdOffice`.

- [ ] Write failing tests for separate state/private balances, two-way transfers, insufficient funds, and audit records.
- [ ] Run tests and confirm expected failures.
- [ ] Implement balances, transfers, a winter charcoal procurement choice, corruption clues, and transaction history.
- [ ] Run tests and confirm they pass.

### Task 8: Responsive visual system and demo integration

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: all prior game modules and components.
- Produces: complete interactive demo flow.

- [ ] Extend the app test to switch maps, open an official, enter court, and open the treasury.
- [ ] Run the integration test and confirm the new expectations fail.
- [ ] Compose the finished demo and apply responsive portrait styles, safe-area padding, touch targets, weather overlay, drawers, and modals.
- [ ] Run `npm.cmd test -- --run`, `npm.cmd run typecheck`, and `npm.cmd run build`.
- [ ] Start `npm.cmd run dev -- --host 127.0.0.1`, verify the page responds, and inspect desktop/mobile screenshots.

## Deferred After Demo

- Server account, cloud save, payment, and anti-cheat.
- Full official roster, all court issues, autonomous intrigue planner, succession simulation, and three-year fast-forward.
- Production 2.5D animated art, complete palace interiors, audio, and content pipeline.
- Capital and Imperial Tour maps.
