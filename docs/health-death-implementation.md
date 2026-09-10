# 健康、疾病与永久死亡修复

## 根因

旧生产循环只判断独立孕期记录为 ACTIVE 且到达预产期，没有判断母亲存活。处死、自然死亡和欠俸死亡只覆盖人物 status，未终止孕期。生产随后无条件写入 REST，覆盖 DEAD，造成生子后复活。原每日年龄更新也没有排除死者。

## 核心规则与具体位置

- `src/game/person.ts`：统一 `isPersonAlive`、`killPerson` 和 `normalizePersonLife`。继续以 DEAD 为唯一生死状态，健康复用 `stats['健康']`，不增加 isAlive 或另一套可写健康状态。deathDate 和既有死亡履历用于修复损坏存档。
- `killPerson` 将健康归零，保存死亡日期/死因，清除疾病、休养、临幸及限制数据；ACTIVE 孕期转为不可执行的 LOST，保留历史。取消待临幸、相关待处理普通事件、待婚配、储君及协理六宫资格。重复死亡不重复记录履历。
- `src/game/simulation.ts`：逐日先排除死者成长，结算健康、自然死亡和欠俸，再调用独立 `processPregnancies`。生产要求母亲存在且存活、孕期有效且到期；直接调用同样修复脏数据。正常生产保留原有生育与休养行为。
- `src/App.tsx`：处死/刺死操作调用 killPerson；册封、改位、释放、临幸及旧事件等入口过滤死者。
- `src/game/health.ts`：参数集中于 HEALTH_RULES。健康为 0–100；80 以上健康、50–79 虚弱、30–49 生病、10–29 重病、低于 10 病危。疾病发生、恢复、恶化和低健康死亡按人物/日期生成稳定随机结果，读档不会重新抽签。孕期与拘禁不被疾病覆盖。妃子、皇子和公主均参与。
- `src/game/initialGameState.ts`：现有自动/手动读档均经过 migrateGameState，末尾统一修复健康、死亡与有效孕期。旧死亡状态、死亡日期及明确死亡履历优先于默认值。历史刺杀记录按受害者位置识别，不误伤皇帝或见证人。
- 健康与死亡使用现有履历，并关联皇帝以便玩家查看。详情页显示健康状态或已故/日期/死因，死者按钮禁用；名册继续维持原有隐藏死者设计。

## 本轮修改文件

以下仅列本轮实际修改，不把工作区原有其他未提交修改算入本轮：

- 新增：`src/game/person.ts`、`src/game/health.ts`、`src/game/health.test.ts`、`src/components/PersonHealth.test.tsx`、本文。
- 核心与迁移：`src/game/gameState.ts`、`src/game/simulation.ts`、`src/game/initialGameState.ts`、`src/game/economy.ts`、`src/game/royalMarriage.ts`。
- 行为及随机池：`src/game/consortGrowth.ts`、`src/game/crownPrince.ts`、`src/game/heirCare.ts`、`src/game/heirEducation.ts`、`src/game/dialogueLibrary.ts`、`src/game/palaceEffects.ts`、`src/game/palaceEvents.ts`、`src/game/palacePunishments.ts`、`src/game/residences.ts`、`src/game/civilExam.ts`、`src/game/courtSession.ts`。
- UI：`src/App.tsx`、`src/components/ApprovedPersonDetail.tsx`、`src/features/ScenePeople.tsx`、`src/features/PersonRoster.tsx`、`src/features/CivilExamination.tsx`、`src/features/RoyalMarriage.tsx`、`src/features/Treasury.tsx`。
- 既有测试：`src/game/simulation.test.ts` 的喜讯测试改用现有 withConsort 夹具，补上其事件指向但原先不存在的母亲；原断言全部保留。

## 新增测试（17 项）

1. 死亡母亲的到期异常孕期不能生产/复活。
2. 读档自动纠正死亡与有效孕期并存。
3–4. 妃子/皇子疾病恶化、恢复、归零死亡。
5–6. 妃子/皇子染病及完全恢复。
7. 健康归零先死亡，不恢复、不生产。
8. 刺杀取消孕期和待临幸，跨过预产期一年后仍死亡。
9. 死亡皇子不恢复、不成长、不接受教育。
10. 存档往返保持疾病与死亡，健康值限制范围。
11. 欠俸死亡立即执行孕期清理。
12. 直接生产拒绝死者和不存在的母亲，正常母亲仅生产一次。
13. 死亡皇嗣不能封爵、继承、对话、赴宴或执行旧生产事件选项。
14. 曾被覆盖为 REST 的历史死者在读档时纠正。
15. 怀孕与拘禁状态不被疾病处理覆盖。
16. 刺杀履历只识别受害者，不把见证者标为死亡。
17. 详情页显示已故、日期和死因，禁用残留临幸按钮。

## 验证结果

- `npm run typecheck`：通过。
- `npm test -- --run`：214 项，206 通过、8 失败；新增 17 项均通过。
- 修改前基线：197 项，189 通过、8 失败。前后失败名称逐项完全一致，无新增失败、未删除或跳过测试。
- 历史失败：`src/App.test.tsx` 6 项；`src/features/Settings.test.tsx` 1 项；`src/game/dialogueLibrary.test.ts` 1 项（低随机值选择的对话与旧预期不一致）。
- `npm run build`：通过，存在单包超过 500 KB 的体积提示。
- `git diff --check`：通过。
- 独立只读审查发现新疾病未限制日常外出，已补上妃子和皇嗣患病/低健康留在住处的限制；未发现其他重要遗漏。

基线、最终测试与构建输出分别保存在工作区 `.codex-health-baseline.log`、`.codex-health-final-tests.log`、`.codex-health-build.log`。

## 其他路径审查

欠俸死亡、自然死亡、婚配刺杀均已接入统一入口。皇嗣教育/封爵、待婚宴、旧生产事件奖励、随机对话和 UI 释放等路径已增加存活判断。现有新人物初始化仍可使用 NORMAL，普通逻辑不再有覆盖死者的生产路径。旧死亡履历可修复过去已经复活的存档人物；本轮不会追溯删除历史错误生成的孩子。

## 追封补充

`src/game/posthumousTitles.ts` 提供独立的 `grantPosthumousTitle()`，只接受已故妃嫔、皇子、公主和存在明确爵位层级的宗室成员。妃嫔复用 `consortRanks`，皇子/公主复用 `royalTitles`；选项只允许当前身后称号之上的级别，禁止活人、无效称号和降级追封。

追封只写入 `posthumousRank` 或 `posthumousTitle`、`posthumousGrantedAt` 和 `POSTHUMOUS_TITLE` 履历，不修改 `status`、健康、生前 rank/title、居所、宠爱、关系或当前名册统计。宗人府已故宗亲和冷宫名册复用 `PersonRoster` 与同一份 `GameState.people`，详情页仅给已故人物显示追封按钮，活人操作全部隐藏。读档迁移会保留追封字段及已故公主已有的固伦/和硕生前身份。

追封测试覆盖活人拒绝、死者妃嫔逐级追封、皇子/公主爵位、宗室明确爵位、禁止降级、重复履历、死亡状态与健康不变、当前后宫统计不变、冷宫/已故名册隔离、详情页追封弹窗和读档保持。
