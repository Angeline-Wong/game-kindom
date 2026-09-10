# 人物管理与仪式化操作闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前二级场景人物互动升级为可持久化的人物管理中心，并完成赏赐、妃嫔互动、皇嗣教育和大臣任免的首个仪式化操作闭环。

**Architecture:** 使用独立的领域状态模块保存人物、场景位置、库存和待执行事件；场景人物栏只读取可见状态，人物详情根据身份渲染操作。重要操作先创建待确认事件，再展示叙事/宣旨界面，结算后写回同一状态与历史记录。

**Tech Stack:** React、TypeScript、Vitest、现有 Vite 项目。

## Global Constraints

- 竖屏优先，前朝和后宫使用相同顶部、地图主视区和底栏框架。
- 重要操作必须经历“确认 → 剧情/动画 → 结果”，不得直接加数值。
- 人物只在二级/三级场景底部固定头像栏出现，最多四名。
- 赏赐必须从国库库存选择；宠幸在宫殿入口不翻牌，敬事房入口才翻牌。
- 视觉遵循鎏金、深红、深木色、楷体与宫廷牌匾/卷轴规范，禁止现代白卡与系统 UI。

---

### Task 1: 人物世界状态与场景位置

**Files:**
- Create: `src/game/people.ts`
- Create: `src/game/people.test.ts`
- Modify: `src/features/ScenePeople.tsx`

**Interfaces:**
- Produces: `ScenePersonState`, `getScenePeople(sceneId, state)`, `movePerson(personId, targetSceneId, state)`。
- Consumes: 场景 ID、人物身份、`IN_SCENE | OUTSIDE | EVENT | REST | SICK | LOCK`。

- [ ] **Step 1: Write failing location-continuity test**

```ts
it('keeps an absent consort at the announced destination', () => {
  const moved = movePerson('consort-001', 'garden', initialPeopleState);
  expect(getScenePeople('garden', moved)[0].id).toBe('consort-001');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test -- src/game/people.test.ts --run`

- [ ] **Step 3: Implement immutable scene-person state**

```ts
export function movePerson(personId: string, targetSceneId: string, state: PeopleState): PeopleState {
  return { ...state, people: state.people.map((person) => person.id === personId ? { ...person, sceneId: targetSceneId, status: 'IN_SCENE' } : person) };
}
```

- [ ] **Step 4: Render four sorted fixed-size avatars and absent-owner message**
- [ ] **Step 5: Run focused tests and commit**

### Task 2: 人物详情与身份操作配置

**Files:**
- Create: `src/game/personActions.ts`
- Create: `src/game/personActions.test.ts`
- Modify: `src/features/ScenePeople.tsx`

**Interfaces:**
- Produces: `getPersonActions(type)` and `PersonAction` descriptors.
- Consumes: `MINISTER | PRINCE | CONSORT`。

- [ ] **Step 1: Write failing action-set tests**

```ts
expect(getPersonActions('MINISTER').map((action) => action.id)).toContain('appoint-duty');
expect(getPersonActions('CONSORT').map((action) => action.id)).toContain('promote');
```

- [ ] **Step 2: Implement action descriptors and grouped “更多” actions**
- [ ] **Step 3: Replace placeholder action buttons with data-driven operation grid**
- [ ] **Step 4: Run focused tests and commit**

### Task 3: 国库赏赐事件

**Files:**
- Create: `src/game/gifts.ts`
- Create: `src/game/gifts.test.ts`
- Modify: `src/features/Treasury.tsx`
- Modify: `src/features/ScenePeople.tsx`

**Interfaces:**
- Produces: `createGiftEvent`, `confirmGiftEvent`, `GiftEvent`。
- Consumes: 国库物品 ID、数量、受赠人 ID。

- [ ] **Step 1: Write failing inventory deduction and history tests**

```ts
const result = confirmGiftEvent(createGiftEvent('gold-ingot', 2, 'consort-001'), state);
expect(result.inventory['gold-ingot']).toBe(state.inventory['gold-ingot'] - 2);
expect(result.history[0].kind).toBe('GIFT');
```

- [ ] **Step 2: Implement confirmation state and inventory deduction**
- [ ] **Step 3: Add “打开国库 → 选择 → 宣旨确认 → 谢恩结果” UI flow**
- [ ] **Step 4: Run focused tests and commit**

### Task 4: 妃嫔互动、宠幸与晋升入口

**Files:**
- Create: `src/game/consortEvents.ts`
- Create: `src/game/consortEvents.test.ts`
- Modify: `src/features/ScenePeople.tsx`

**Interfaces:**
- Produces: `scheduleConsortVisit`, `validatePromotion`。
- Consumes: 当前时辰、地点入口、位分编制、禁足/疾病状态。

- [ ] **Step 1: Write failing direct-palace versus flip-card tests**

```ts
expect(scheduleConsortVisit({ source: 'PALACE', consortId: 'consort-001' }).requiresFlipCard).toBe(false);
expect(scheduleConsortVisit({ source: 'JINGSHIFANG', consortId: 'consort-001' }).requiresFlipCard).toBe(true);
```

- [ ] **Step 2: Implement pending nightly event and rank-cap validation**
- [ ] **Step 3: Add scroll confirmation, night result and promotion-cap message UI**
- [ ] **Step 4: Run focused tests and commit**

### Task 5: 大臣任免、皇嗣教育与历史记录骨架

**Files:**
- Create: `src/game/appointments.ts`
- Create: `src/game/appointments.test.ts`
- Modify: `src/features/ScenePeople.tsx`

**Interfaces:**
- Produces: `proposeAppointment`, `assignChildSchedule`, `HistoryEntry`。

- [ ] **Step 1: Write failing appointment exchange and education schedule tests**
- [ ] **Step 2: Implement pending confirmation records and event-history entries**
- [ ] **Step 3: Add ceremonial confirmation views for appointment and education**
- [ ] **Step 4: Run full test suite, typecheck, production build and commit**

## Review Checklist

- 人物位置在切换场景后保持连续，且不在场人物展示明确去向。
- 赏赐、宠幸、晋升、调任、教育均不以单次按钮直接结算。
- 所有结果写入历史记录，库存与人物状态只从领域状态更新。
- 视觉未引入白底卡片、现代按钮或未授权外部素材。
