# 妃子怀孕扩展系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有孕率、怀孕、生产、健康与死亡流程上，加入统一管理的流产、流产后永久不孕、双胞胎生产、风险修正、事件记录和设置项，并保证时间推进与旧存档兼容。

**Architecture:** 保留 `GameState.pregnancies` 作为唯一怀孕数据源，在 `simulation.ts` 的每日流程中调用独立的生育规则函数。妃子的长期状态使用 `PersonRecord.miscarriageCount` 与 `PersonRecord.infertile` 持久化；生产仍由现有 `processPregnancies` 完成，但改为批量创建子女并生成一个汇总事件。

**Tech Stack:** React, TypeScript, Vitest, Testing Library, 现有 GameState/存档/每日 simulation 架构。

**Spec:** 用户在本对话提供的《妃子怀孕扩展系统》完整规格。

## Global Constraints

- 不创建第二套 pregnancy 状态；继续使用 `GameState.pregnancies`。
- 死亡是终止状态；死亡妃子不得受孕、流产结算或生产。
- 不孕只影响受孕概率，不影响临幸、宠爱、晋封或宫斗。
- 所有百分比限制在 0～100；双胞胎率单独配置，默认 3%。
- 默认值：流产率 10%、流产后不孕基础率 5%、双胞胎率 3%。
- 现有旧存档缺少新字段时必须自动迁移为安全默认值。
- 保留并尊重工作区中已有的未提交改动，不做无关重构。

## 文件结构与职责

- Modify `src/game/gameState.ts`: 扩展人物、怀孕、事件和游戏设置类型。
- Create `src/game/pregnancyRules.ts`: 集中保存健康 modifier、双胎 modifier、不孕次数 modifier、每日风险换算和胎数判定。
- Modify `src/game/simulation.ts`: 接入受孕资格、每日流产结算、双胎生产和汇总事件。
- Modify `src/game/person.ts`: 死亡清理怀孕状态时保留一致的终止语义。
- Modify `src/game/initialGameState.ts`: 新游戏默认值与旧存档迁移。
- Modify `src/features/Settings.tsx`: 增加流产、不孕、双胞胎配置及边界联动。
- Modify `src/components/ApprovedPersonDetail.tsx`: 展示“不孕”和流产次数等长期状态。
- Modify `src/features/Settings.test.tsx`: 验证新增设置的 UI 边界与存档状态。
- Modify `src/game/gameSettings.test.ts`: 验证设置默认值、迁移和保存读取。
- Modify `src/game/simulation.test.ts`: 验证受孕、流产、生产、双胎和死亡优先级。
- Modify or create `src/game/pregnancyRules.test.ts`: 纯规则函数的概率与 modifier 测试。

### Task 1: 扩展领域类型与兼容默认值

**Files:**
- Modify: `src/game/gameState.ts`
- Modify: `src/game/initialGameState.ts`
- Test: `src/game/gameSettings.test.ts`

**Interfaces:**
- `GameSettings` produces `pregnancyRate`, `maleBirthRate`, `miscarriageRate`, `postMiscarriageInfertilityRate`, `twinRate`。
- `PersonRecord` produces optional `miscarriageCount?: number` and `infertile?: boolean`，迁移后运行时保证为数字/布尔值。
- `PregnancyRecord` produces `fetusCount: 1 | 2`，保留现有 `status: ACTIVE | DELIVERED | LOST`。
- `GameEvent.type` consumes and produces `MISCARRIAGE_NOTICE`。

- [ ] **Step 1: Write failing migration tests**

```ts
it('defaults new pregnancy settings and person fields for old saves', () => {
  const state = createInitialGameState();
  const loaded = migrateGameState({ ...state, gameSettings: { pregnancyRate: 30, maleBirthRate: 50 } } as GameState);
  expect(loaded.gameSettings).toEqual({ pregnancyRate: 30, maleBirthRate: 50, miscarriageRate: 10, postMiscarriageInfertilityRate: 5, twinRate: 3 });
  expect(loaded.people.empress.miscarriageCount).toBe(0);
  expect(loaded.people.empress.infertile).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/game/gameSettings.test.ts`

Expected: FAIL because the new settings and person fields do not exist.

- [ ] **Step 3: Add fields, defaults, and normalization**

Use defaults `{ miscarriageRate: 10, postMiscarriageInfertilityRate: 5, twinRate: 3 }`. Normalize each rate with the existing 0–100 helper; normalize `miscarriageCount` to a non-negative integer and `infertile` to a boolean. Preserve existing `pregnancyRate` and `maleBirthRate` behavior.

- [ ] **Step 4: Run focused tests and the existing settings tests**

Run: `npm test -- --run src/game/gameSettings.test.ts src/game/initialGameState.test.ts`

Expected: PASS with old tests updated only where the expected settings object intentionally gains the new fields.

### Task 2: Implement isolated pregnancy rule calculations

**Files:**
- Create: `src/game/pregnancyRules.ts`
- Create: `src/game/pregnancyRules.test.ts`

**Interfaces:**
- `healthMiscarriageModifier(health: number): number`
- `miscarriageCountModifier(count: number): number`
- `calculateDailyMiscarriageChance(input: { totalRate: number; gestationDays: number; health: number; fetusCount: 1 | 2; illness: boolean; miscarriageCount: number }): number`
- `rollFetusCount(twinRate: number, roll: number): 1 | 2`
- `shouldBecomeInfertile(input: { baseRate: number; miscarriageCount: number; health: number; roll: number }): boolean`

- [ ] **Step 1: Write failing pure-rule tests**

Cover health bands `0.5, 1, 1.5, 2, 3`, twin multiplier `1.5`, miscarriage-count modifier `5%, 10%, 20%, 30%`, 0%/100% clamps, and twin roll boundaries.

- [ ] **Step 2: Run the focused rule tests**

Run: `npm test -- --run src/game/pregnancyRules.test.ts`

Expected: FAIL because the rule module is missing.

- [ ] **Step 3: Implement deterministic rules**

Treat the configured miscarriage rate as the intended probability over the full ten-month pregnancy, then convert it to a daily hazard with `1 - (1 - adjustedTotal) ** (1 / gestationDays)`. This satisfies the requirement that time progression performs the check without applying a raw 10% roll every day. Apply health, illness, twin, and future-compatible modifiers in this module only; clamp the final result to 0–1.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- --run src/game/pregnancyRules.test.ts`; `npm run typecheck`

Expected: PASS.

### Task 3: Extend受孕资格 and pregnancy creation

**Files:**
- Modify: `src/game/simulation.ts`
- Modify: `src/game/simulation.test.ts`

**Interfaces:**
- `schedulePalaceVisit` continues to schedule visits for living, eligible consorts.
- `processVisitsAtCourtHour` consumes `pregnancyEligibility` rules and creates `PregnancyRecord` with `fetusCount`.

- [ ] **Step 1: Add failing tests**

Add cases proving that dead, already pregnant, and `infertile: true` consorts do not create pregnancies; cold-palace consorts remain excluded by the existing `consortVisitEligibility`; twin rate 0% produces one fetus and 100% produces two.

- [ ] **Step 2: Run focused simulation tests**

Run: `npm test -- --run src/game/simulation.test.ts -t "pregnan|fertil|twin|cold"`

Expected: FAIL for missing fields and twin assignment.

- [ ] **Step 3: Implement eligibility and conception**

Check `isPersonAlive(consort)`, `consort.kind === 'CONSORT'`, `!consort.infertile`, no active pregnancy, and the existing visit eligibility before rolling `pregnancyRate`. Assign `fetusCount` once at conception via `rollFetusCount`; do not reroll it during production.

- [ ] **Step 4: Run regression tests**

Run: `npm test -- --run src/game/simulation.test.ts src/game/health.test.ts`

Expected: PASS, including the existing dead-mother protections.

### Task 4: Add daily miscarriage lifecycle and events

**Files:**
- Modify: `src/game/simulation.ts`
- Modify: `src/game/person.ts`
- Modify: `src/game/simulation.test.ts`
- Modify: `src/game/health.test.ts`

**Interfaces:**
- `processPregnancies(state, date)` remains the single entry point for active pregnancy resolution.
- Internal miscarriage handling consumes `calculateDailyMiscarriageChance` and produces `MISCARRIAGE_NOTICE`, `MISCARRIAGE`, and optional `INFERTILITY` history entries.

- [ ] **Step 1: Add failing lifecycle tests**

Cover forced 100% miscarriage, no child creation, active pregnancy becoming `LOST`, mother returning from `PREGNANT` to `NORMAL`, health loss of `15` for singleton and `Math.round(15 * 1.5)` for twins, miscarriage count increment, and infertility at 100% post-miscarriage rate.

- [ ] **Step 2: Add death-priority tests**

Cover a mother who dies before a due date: pregnancy becomes `LOST`, no miscarriage event is created after death, no child is created, and the mother remains `DEAD`.

- [ ] **Step 3: Implement one daily resolution path**

For each `ACTIVE` pregnancy, first reject missing/dead mothers. Before due date, perform the deterministic daily hazard check using the pregnancy ID/date seed. On miscarriage, mark the record `LOST`, restore the mother to `NORMAL` unless another independent status requires preservation, subtract health, increment `miscarriageCount`, run the infertility check using the post-increment count, and append one pending miscarriage event plus history entries.

- [ ] **Step 4: Implement miscarriage event text and choices**

Use a single event with the mother as `personIds[0]`, include the health effect in the body/result, and append the infertility sentence only when the flag is set. Existing `resolveEvent` behavior must continue to mark stale events as `MISSED` if the mother later dies.

- [ ] **Step 5: Run health and simulation regression tests**

Run: `npm test -- --run src/game/simulation.test.ts src/game/health.test.ts`

Expected: PASS.

### Task 5: Implement singleton/twin production as one event

**Files:**
- Modify: `src/game/simulation.ts`
- Modify: `src/game/simulation.test.ts`

**Interfaces:**
- `processPregnancies` produces one `BIRTH_NOTICE` per pregnancy, regardless of `fetusCount`.
- Child creation consumes `fetusCount`; each child independently consumes the male-birth roll, royal birth order, identity, stats, traits, name placeholder, parent links, and residence logic.

- [ ] **Step 1: Add failing twin-production tests**

Verify two children are created for `fetusCount: 2`; sexes may differ; prince and princess birth orders advance independently; both children appear in mother and emperor `children`; exactly one birth event is present; event text contains “双生” or “龙凤呈祥” based on the sex combination.

- [ ] **Step 2: Add production-risk assertions**

Verify the mother’s health loss is multiplied by `1.5` for twins and that the stored `fetusCount` is available for future difficult-labor logic. Do not implement a separate difficult-labor outcome in this feature.

- [ ] **Step 3: Refactor production into a child loop with final guards**

Before creating any child, re-check the mother exists, is alive, has an active matching pregnancy, and is still `PREGNANT`. Generate all children in one transaction-like state update, then set pregnancy to `DELIVERED`, restore the mother to `REST`, and append one event/history entry.

- [ ] **Step 4: Preserve existing birth choices**

Keep promotion, honorific, rejoice, treasure, and visit choices on the single aggregate event. Promotion/honorific logic should run against the mother once, not once per child.

- [ ] **Step 5: Run all simulation tests**

Run: `npm test -- --run src/game/simulation.test.ts src/game/royalNames.test.ts src/game/health.test.ts`

Expected: PASS.

### Task 6: Update settings UI and person detail presentation

**Files:**
- Modify: `src/features/Settings.tsx`
- Modify: `src/features/Settings.test.tsx`
- Modify: `src/components/ApprovedPersonDetail.tsx`

**Interfaces:**
- Settings UI consumes the five persisted settings and updates `gameState.gameSettings` through the existing store setter.
- Person detail consumes `infertile` and `miscarriageCount` without changing visit eligibility or action availability.

- [ ] **Step 1: Add failing UI tests**

Verify the assist/game-rules panel shows “流产概率”, “流产后不孕概率”, and “双胞胎概率”; each value is adjustable in 5% increments and clamps at 0/100; existing孕率、生男率 behavior remains intact.

- [ ] **Step 2: Implement UI fields and safe twin display**

Extend the rate updater to the new keys. Display “单胎概率” as `100 - twinRate` and keep it informational. Since twin rate is independent and there is no multi-birth setting in this specification, no cross-field constraint is required.

- [ ] **Step 3: Add detail status**

For living consorts, show “生育状态：不孕” when `infertile` is true and optionally “流产次数：N” when `miscarriageCount > 0`; do not remove or disable the normal visit action.

- [ ] **Step 4: Run UI tests and typecheck**

Run: `npm test -- --run src/features/Settings.test.tsx src/features/PersonRoster.test.tsx`; `npm run typecheck`

Expected: PASS.

### Task 7: Complete persistence, migration, and verification

**Files:**
- Modify: `src/game/initialGameState.ts`
- Modify: `src/game/useGameStore.test.ts`
- Modify: `src/game/gameSettings.test.ts`
- Modify: `src/game/simulation.test.ts`

- [ ] **Step 1: Add save/load round-trip tests**

Persist a pregnant consort with `fetusCount: 2`, `miscarriageCount: 2`, `infertile: true`, and customized rule settings; reload through `migrateGameState` and assert every value is preserved.

- [ ] **Step 2: Add malformed-input migration tests**

Verify negative, non-finite, and over-100 rates clamp to valid values; missing fields receive defaults; negative or non-integer miscarriage counts normalize to zero or an integer.

- [ ] **Step 3: Run the complete verification suite**

Run: `npm test -- --run`; `npm run typecheck`; `npm run build`

Expected: all tests pass, typecheck exits 0, and Vite build completes successfully.

- [ ] **Step 4: Review the diff for scope**

Run: `git diff -- src/game/gameState.ts src/game/pregnancyRules.ts src/game/simulation.ts src/game/person.ts src/game/initialGameState.ts src/features/Settings.tsx src/components/ApprovedPersonDetail.tsx`

Confirm that only the pregnancy expansion files and their tests/docs changed, and that unrelated pre-existing worktree changes remain untouched.
