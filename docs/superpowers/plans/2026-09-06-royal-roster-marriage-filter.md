# 皇嗣名册婚姻筛选与召见机制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为皇嗣名册建立统一的婚姻筛选、居住状态、召见权限和跨日清除机制。

**Architecture:** 在 `src/game/royalRoster.ts` 集中提供婚姻状态兼容、筛选统计、居所分组和人物操作 selector；`PersonRecord` 保存明确的婚姻/正式住所/召见字段。`PersonRoster` 四个皇嗣视图只消费共享 selector，婚配结算和模拟跨日分别负责状态写入与召见清理。

**Tech Stack:** React + TypeScript + Vitest + Testing Library + Vite。

**Spec:** `docs/superpowers/specs/2026-09-06-royal-roster-marriage-filter-design.md`

## Global Constraints

- 不把“已婚”简单等同于“宫外”，太子是明确例外。
- 正式 `residence` 不因召见修改。
- 公主与皇子共同参与统计、筛选、居所和母妃分组。
- 保留现有画像、爵位、齿序、母妃/养母、履历与关系数据。
- 每项新行为先写失败测试并确认失败，再写最小生产代码。

---

### Task 1: 建立皇嗣状态领域函数

**Files:**
- Create: `src/game/royalRoster.ts`
- Create: `src/game/royalRoster.test.ts`
- Modify: `src/game/gameState.ts: PersonRecord`

**Interfaces:**
- Produces `MarriageFilter`, `MaritalStatus`, `ResidenceType`, `getMarriageStatus`, `filterByMarriage`, `getMarriageCounts`, `isCurrentlyInPalace`, `getAvailableRoyalActions`, `getRoyalResidenceGroup`, `clearSummonedRoyals`。

- [ ] **Step 1: Write failing tests**

覆盖以下真实行为：旧人物通过配偶关系推导 `MARRIED`；三种筛选只返回对应皇嗣；统计总数/未婚/已婚；已婚宫外人物未召见只有 `召见/赏赐/封爵/问责`；召见后恢复现有皇嗣操作；太子和未婚人物不被错误限制；跨日清除召见但不改正式住所。

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- --run src/game/royalRoster.test.ts`

Expected: FAIL because the shared module and explicit fields do not yet exist.

- [ ] **Step 3: Add explicit optional-compatible fields and minimal selectors**

为 `PersonRecord` 增加可兼容旧存档的可选字段，并让 selector 优先读取字段、字段缺失时从 `relationships` 和 `crownPrinceId` 推导。操作 selector 复用 `getPersonActions`，只在“已婚 + 宫外 + 未召见”时返回四个限制操作。

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/game/royalRoster.test.ts`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/game/gameState.ts src/game/royalRoster.ts src/game/royalRoster.test.ts
git commit -m "feat: add royal marriage and residence selectors"
```

### Task 2: 接入婚配结算与跨日召见状态

**Files:**
- Modify: `src/game/royalMarriage.ts`
- Modify: `src/game/simulation.ts`
- Modify: `src/game/useGameStore.ts` or the existing state update path used by App
- Test: `src/game/royalRoster.test.ts`, `src/game/royalMarriage.test.ts`, `src/game/simulation.test.ts`

**Interfaces:**
- Consumes `isCrownPrince`, `getRoyalResidenceGroup`, `clearSummonedRoyals`。
- Produces state transitions for `marryCandidate`, `marryMinister`, `summonRoyal`, and day advancement.

- [ ] **Step 1: Write failing marriage and day-transition tests**

断言普通皇子/公主婚配后为 `MARRIED + OUTSIDE_PALACE + isSummoned=false`；太子婚配后仍为 `MARRIED + PALACE` 且住所为毓庆宫；召见只设置 `isSummoned`；下一日清除召见。

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm test -- --run src/game/royalMarriage.test.ts src/game/simulation.test.ts src/game/royalRoster.test.ts`

Expected: FAIL on missing state transitions.

- [ ] **Step 3: Implement minimal transitions**

在婚配成功的统一出口更新皇嗣状态；对太子保留毓庆宫；在日推进完成时调用 `clearSummonedRoyals`。新增不可越权的 `summonRoyal(state, personId)`，仅允许已婚宫外皇嗣。

- [ ] **Step 4: Run focused tests and existing marriage/simulation tests**

Run: `npm test -- --run src/game/royalMarriage.test.ts src/game/simulation.test.ts src/game/royalRoster.test.ts`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/game/royalMarriage.ts src/game/simulation.ts src/game/useGameStore.ts src/game/*.test.ts
git commit -m "feat: move married royals outside and expire summons"
```

### Task 3: 统一人物详情操作权限

**Files:**
- Modify: `src/game/personActions.ts`
- Modify: `src/components/ApprovedPersonDetail.tsx`
- Modify: `src/features/ScenePeople.tsx`
- Modify: `src/App.tsx`
- Test: `src/game/personActions.test.ts`, `src/features/RoyalInteractions.test.tsx`

**Interfaces:**
- Consumes `getAvailableRoyalActions`, `isCurrentlyInPalace`, and `summonRoyal`。
- Produces identical action lists regardless of whether the detail was opened from roster, residence, order, or mother view。

- [ ] **Step 1: Write failing action/UI tests**

使用一个已婚宫外普通皇子断言详情显示召见、赏赐、封爵、问责且不显示教育/鼓励/闲聊；点击召见后显示正常操作和“奉召入宫”；太子婚后直接显示正常操作。

- [ ] **Step 2: Run focused tests to verify failure**

Run: `npm test -- --run src/game/personActions.test.ts src/features/RoyalInteractions.test.tsx`

Expected: FAIL because the current action table always exposes normal prince actions.

- [ ] **Step 3: Implement selector-driven rendering and summon callback**

保留年龄对幼年皇嗣的既有限制，把婚姻/宫内判断放在统一 selector；App 的状态更新调用 `summonRoyal`，不修改 `residence`。

- [ ] **Step 4: Run focused tests**

Run: `npm test -- --run src/game/personActions.test.ts src/features/RoyalInteractions.test.tsx`

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/game/personActions.ts src/components/ApprovedPersonDetail.tsx src/features/ScenePeople.tsx src/App.tsx src/game/personActions.test.ts src/features/RoyalInteractions.test.tsx
git commit -m "feat: gate royal interactions behind summons"
```

### Task 4: 重构皇嗣名册四视图

**Files:**
- Modify: `src/features/PersonRoster.tsx`
- Modify: `src/styles.css`
- Test: `src/features/PersonRoster.test.tsx`

**Interfaces:**
- Consumes `filterByMarriage`, `getMarriageCounts`, `getRoyalResidenceGroup` and the existing portrait/mother helpers。
- Produces default `UNMARRIED` state per opening, clickable total/unmarried/married cards, persistent filter across four bottom views, and filtered family counts。

- [ ] **Step 1: Write failing UI tests**

断言打开皇嗣名册默认选中未婚；三项统计可点击；名册/序齿/居所/母妃都随筛选变化；序齿太子独立分组且缺少太子时不显示空分组；居所正确显示毓庆宫、宫外；母妃隐藏无匹配子女并重新计算人数；公主包含在统计中。

- [ ] **Step 2: Run UI tests to verify failure**

Run: `npm test -- --run src/features/PersonRoster.test.tsx`

Expected: FAIL because current summary仍是皇嗣/成年/幼年，且视图按原始数组分组。

- [ ] **Step 3: Implement shared filtering and view-specific grouping**

将筛选状态设为组件打开时的局部初始值 `UNMARRIED`；切换底部 view 不重置；所有派生数组先经过共享婚姻过滤；太子由 `crownPrinceId` 单独分组；居所使用正式住所和太子特殊规则；母妃使用过滤后的 children。

- [ ] **Step 4: Add compact visual states and run UI tests**

为 active summary、婚姻/住所状态和奉召状态补充现有金色主题样式，运行 `npm test -- --run src/features/PersonRoster.test.tsx`，Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/features/PersonRoster.tsx src/styles.css src/features/PersonRoster.test.tsx
git commit -m "feat: filter royal roster by marriage status"
```

### Task 5: 全量验证与兼容修正

**Files:**
- Modify: only files needed for failing tests or type errors

- [ ] **Step 1: Run all tests**

Run: `npm test -- --run`

- [ ] **Step 2: Run typecheck and production build**

Run: `npm run typecheck` and `npm run build`

- [ ] **Step 3: Fix only regressions caused by this feature and repeat all checks**

确认无测试失败、无 TypeScript 错误、无构建错误，并检查 `git diff` 未覆盖用户原有未提交改动。

- [ ] **Step 4: Commit final integration fixes**

```bash
git add src docs/superpowers/plans/2026-09-06-royal-roster-marriage-filter.md
git commit -m "test: verify royal roster marriage workflow"
```
