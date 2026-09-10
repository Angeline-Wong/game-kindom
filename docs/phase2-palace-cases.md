# 后宫事件系统 Phase 2 实施报告

本轮完成一条真实可玩的“妃嫔膳食异常”案件。沿用 Phase 1 的 stats、relationships、history、对话效果、处罚与禁足，没有新增平行人物属性或历史系统。

## 1. 修改文件

| 文件 | 改动 |
| --- | --- |
| src/App.tsx | 交泰殿“宫中选秀”下方增加宫中事务按钮；调查完成通知打开卷宗 |
| src/features/ScenePeople.tsx | SceneDialogue 执行 START_CASE，并打开指派调查界面 |
| src/components/PalacePunishmentDialog.tsx | 增加可选业务提交函数，保留原处罚默认行为 |
| src/game/gameState.ts | 增加 palaceCases，事件和履历增加可选 palaceCaseId |
| src/game/initialGameState.ts | 新游戏初始化空案件数组；旧存档缺省补 [] |
| src/game/simulation.ts | 每日结算调用 processPalaceCases，支持正常时钟、跳月、跳年 |
| src/game/palaceTypes.ts | 增加 CASE、START_CASE、caseTemplateId 和可选处罚来源案件 ID |
| src/game/palaceEvents.ts | 将唯一案件剧情接入现有随机入口；注入真实参与人物、冷却和重复案件过滤 |
| src/game/palacePunishments.ts | 原处罚履历附带来源案件关联，不改变处罚计算 |

工作区还包含其他既有改动；以上仅列本轮修改范围，未提交或覆盖其他工作。

## 2. 新增文件

- src/game/palaceCaseTypes.ts：案件、真相、调查结果、调查人快照和模板类型。
- src/game/palaceCaseTemplates.ts：膳食异常模板与唯一新剧情。
- src/game/palaceInvestigations.ts：调查人筛选、能力、用时、调查结果。
- src/game/palaceCases.ts：创建、指派、每日推进、公开视图、裁决和结案。
- src/features/PalaceCases.tsx、PalaceCases.css：指派、进度、结果、裁决和列表。
- src/game/palaceCases.test.ts：34 项业务测试。
- src/features/PalaceCases.test.tsx：4 项交互测试。
- docs/phase2-palace-cases.md：本报告。

## 3. PalaceCase 最终结构

完整类型以 `src/game/palaceCaseTypes.ts` 为准：

```ts
interface PalaceCase {
  id; templateId; title; description; severity;
  status; // PENDING | INVESTIGATING | WAITING_DECISION | CLOSED | REOPENED
  createdDate; createdDay;
  complainantId; victimIds; accusedIds;
  investigator?; // type, personId?, name, ability, integrity, speed, attributes?
  truth; // type: TRUE / FALSE_ACCUSATION / PARTIAL / ACCIDENT / UNKNOWN
         // culpritIds, difficulty
  result?; // conclusion, suspectedIds, confidence, summary
  investigationDaysRemaining;
  investigationTotalDays?;
  investigationStartedDay?;
  lastProcessedDay?;
  investigationRoll?;
  completedDate?;
  relatedDialogueId; sourceInteractionId;
  ruling?; // type, date, targetIds, punishmentHistoryId?
}
```

上面是字段概要，非可直接编译的类型定义。真相在创建时固定；调查用时、调查人快照和结果随机值在指派时固定。存档整体保存这些字段，迁移不重掷。版本保持 1，IndexedDB 不需要升级。公开视图显式挑选字段，排除 truth 和 investigationRoll。

## 4. 调查算法

`score = ability + floor(investigationRoll × 41) - 20 - difficulty`。

| score | 调查认知 |
| --- | --- |
| ≥20 | 根据固定真相返回主要责任、诬告、事故、部分成立或无法查明 |
| 0～19 | 部分有效线索，不能认定全部责任 |
| -20～-1 | 证据不足，不返回责任人 |
| <-20 | 调查失败，不返回责任人 |

UNKNOWN 不因高分变成确定结论。调查完成只生成结果和通知，不自动处罚。可信度是简单的结果分档展示值，不代表额外模拟系统。

## 5. 调查人能力和时间

- 内务府：ability 70、integrity 85、speed 60。
- 皇后与指定妃嫔：能力为 `round(智慧×0.4 + 谋略×0.4 + 威望×0.2)`。
- 缺少智慧时参考才情，缺少谋略时参考礼仪；再缺省用 40。威望缺省为 0。全部限制在 0～100。
- speed 为 `round(40 + 智慧×0.3)`；integrity 参考忠诚、礼仪或缺省 50。本轮 integrity 只保存在调查快照中，不参与干扰或说谎玩法。
- 只选存活、正常状态、无疾病、健康不低于 50、未禁足的妃嫔；排除原告、受害者和被告。皇后身份来自当前 rank/title。
- 模板基础用时随机 5～8 日，减去 `round((speed-50)/25)`，最终限制在 3～8 日范围内；当前内务府用时 5～8 日。
- 实际跨日扣减；同一天重复调用不再扣减。调查人中途死亡或失去行动资格，退回待指派并写履历，原真相不变。

上述能力仅为本次调查快照，不写入 PersonRecord 的永久属性。

## 6. UI 入口

按用户截图，入口在 **后宫 → 交泰殿 → 右侧“宫中选秀”下方的“宫中事务”**，复用相邻按钮样式。原先临时放置在后宫总览的入口已移除。

列表分待指派、调查中、待裁决、已结案，显示数量、人物和剩余时间。调查完成也能通过内侍呈报直接打开。结果显示调查人、用时、公开结论和可信度，不展示内部真相。

## 7. 测试案件完整流程

妃嫔闲聊随机遇到膳食异常 → 命人彻查 → 创建 PENDING 案件并打开指派 → 选择内务府/皇后/符合条件妃嫔 → INVESTIGATING → 实际跨日倒计时 → WAITING_DECISION 与内侍通知 → 查看结果 → 召来问话、直接处置、不予追究或暂缓处理。

直接处置：选择相关人物 → 原 Phase 1 处罚确认界面 → 确认后调用 applyPunishment，并在同一状态更新中 CLOSED。取消处罚不结案；不予追究确认后结案；暂缓处理保持待裁决。诬告结果允许处置原告；事故允许不罚结案。

现有 history 记录 CREATED、STARTED、COMPLETED、CLOSED；处罚沿用 PALACE_PUNISHMENT 并附来源案件 ID。人物履历按 personIds 自动显示。

## 8. 新增测试

**38 项全部通过：34 项业务测试 + 4 项 UI 测试。**

覆盖创建和幂等、五种真相、三类调查人、利益冲突和状态排除、能力复用、逐日/跳月/跳年、分数边界、公开视图隔离、旧存档迁移、第三天读档、处罚复用与原子结案、重复提交、错误处罚、诬告者处罚、事故无处罚结案、履历、调查中断、旧剧情、Phase 1 禁足及 StrictMode 交互。

## 9. 全量测试

最终运行 `npm test -- --run`：**324 项，317 通过、7 失败；55 个测试文件，53 通过、2 失败。**

7 项均为已知原有失败，本轮没有新增失败：

- src/App.test.tsx：导航旧文案、旧臣子对话、人物名册重复按钮、冷宫操作旧人物名、初始皇嗣婚配旧入口、国库旧文案，共 6 项。
- src/game/dialogueLibrary.test.ts：旧测试期望 consort-greeting，当前库实际首条是 consort-daily-palace-lanterns，共 1 项。

工作区其他任务也增加了测试，因此总数相较最初基线增加不全部来自本轮。未为消除这 7 项失败修改无关逻辑。

## 10. 编译与浏览器验证

- `npm run typecheck`：通过。
- `npm run build`：通过；保留现有大于 500 kB 的产物分块提醒。
- 实际 Chrome、390×844 视口、独立非持久化浏览器上下文：完整流程通过，无页面运行时异常。
- 浏览器仅初始化了用于测试的额外妃嫔，并控制随机值以稳定命中唯一剧情；案件创建、指派、推进、裁决均通过正式界面完成。
- 用实际 8 倍游戏时钟跨过三天，暂停并等待自动存档；重载核对剩余 5 天、真相、调查人和随机值完全一致。
- 通过设置中的正式跳月操作完成调查，打开内侍呈报，处罚陈清漪禁足 7 日，确认结案和唯一处罚履历；再次重载确认 CLOSED 保持，进入人物详情“履历”看到记录。
- 单独验证交泰殿新入口与宫中选秀对齐、处于其下方，可打开、关闭案件列表。

## 11. 已知限制

本轮未发现阻断 Phase 2 完整流程的问题。现有 7 项回归失败与构建体积提醒仍存在。问话仅为简单呈报确认，不产生新的调查信息；integrity 尚不影响调查结果。调查人失能后的重指派重新确定调查用时，但不会改变案件真相。

## 12. 未来预留

只预留 REOPENED 状态枚举，没有翻案入口或执行逻辑。truth/result 分离、案件来源 ID 和结果结构便于后续扩展；未实现 Evidence 实际搜证、CharacterMemory、PalaceFaction、PalaceAI、自动投毒栽赃、说谎、复杂审讯、手动搜查、皇帝性格或后宫环境系统。
