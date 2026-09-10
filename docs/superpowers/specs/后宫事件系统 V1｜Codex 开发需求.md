# 后宫事件系统 V1 开发需求

## 一、开发目标

当前人物剧情系统主要为：

剧情文本 → 玩家选择 → 显示 reply

本次需要将其升级为：

**剧情事件 → 玩家选择 → 属性变化 / 人物关系变化 / 特殊操作 → 可能生成后续事件**

重点支持以下玩法：

1. 日常互动
2. 感情互动
3. 吃醋争宠
4. 妃嫔告状
5. 妃嫔纠纷
6. 宫规处罚
7. 重大案件
8. 调查案件
9. 调查完成后的裁决
10. 后续连锁事件

注意：

现有 DialogueScene 数据和已有剧情不能整体删除或重写。

要求采用“向后兼容”方式升级。

没有填写新字段的旧剧情仍然必须正常运行。

---

# 二、系统核心设计

后宫剧情以后分为两层：

## 第一层：剧情标签 tags

继续保留目前：

```ts
daily
pregnant
postpartum
child
adult
study
festival
relationship
palaceStrife
rivalry
extendable
```

tags 主要用于：

- 内容检索
- 剧情随机池
- 人物状态过滤
- UI分类
- 剧情生成条件

不要删除。

---

## 第二层：eventType

新增真正决定玩法行为的：

```ts
export type DialogueEventType =
  | 'DAILY'
  | 'EMOTION'
  | 'RIVALRY'
  | 'COMPLAINT'
  | 'DISPUTE'
  | 'VIOLATION'
  | 'CASE'
  | 'FAMILY'
  | 'CHILD'
  | 'FESTIVAL';
```

解释：

```text
DAILY
普通日常交流。

EMOTION
感情、思念、孤独、邀宠等。

RIVALRY
吃醋、攀比、争宠，但没有正式指控别人。

COMPLAINT
妃嫔明确向皇帝告状。

DISPUTE
两个或以上妃嫔发生矛盾。

VIOLATION
已经基本确定存在宫规违规行为。

CASE
事实尚不明确、性质严重，需要调查。

FAMILY
妃嫔娘家、外戚相关事件。

CHILD
皇嗣相关事件。

FESTIVAL
节庆剧情。
```

---

# 三、事件严重度

新增：

```ts
export type EventSeverity =
  | 'TRIVIAL'
  | 'MINOR'
  | 'MEDIUM'
  | 'SERIOUS'
  | 'CRITICAL';
```

含义：

### TRIVIAL

普通口角、吃醋、失礼。

通常无需正式处罚。

---

### MINOR

轻微违规。

例如：

- 请安失仪
- 宫人冲撞
- 私下争吵
- 小范围散播闲话
- 争抢物品

可以：

- 训诫
- 罚俸
- 短期禁足

---

### MEDIUM

明显宫规问题。

例如：

- 多次挑衅
- 恶意造谣
- 私相授受
- 收买宫人
- 越制
- 故意羞辱妃嫔

可以：

- 罚俸
- 禁足
- 降低待遇
- 较长禁足

---

### SERIOUS

严重宫斗行为。

例如：

- 栽赃
- 偷盗御赐物
- 下药
- 收买御膳房
- 针对皇嗣
- 严重贪墨

需要优先调查。

---

### CRITICAL

极严重案件。

例如：

- 谋害皇嗣
- 投毒
- 巫蛊
- 谋害皇帝
- 大规模贪腐
- 与外廷势力勾结

原则上进入案件系统。

---

# 四、DialogueChoice 数据结构升级

现有：

```ts
export interface DialogueChoice {
  id: string;
  label: string;
  reply: string;
}
```

改为：

```ts
export interface DialogueChoice {
  id: string;
  label: string;
  reply: string;

  effects?: DialogueEffects[];

  action?: DialogueAction;

  nextSceneId?: string;

  closeAfterReply?: boolean;
}
```

---

# 五、通用数值效果系统

不要只设计：

```ts
favor?: number
```

建议做通用 effect。

```ts
export type DialogueEffectType =
  | 'FAVOR'
  | 'MOOD'
  | 'JEALOUSY'
  | 'PRESTIGE'
  | 'FEAR'
  | 'RESENTMENT'
  | 'RELATIONSHIP';
```

```ts
export interface DialogueEffects {
  type: DialogueEffectType;

  value: number;

  target:
    | 'SPEAKER'
    | 'ACCUSED'
    | 'VICTIM'
    | 'OTHER'
    | 'CUSTOM';

  targetId?: string;
}
```

例如：

```ts
effects: [
  {
    type: 'FAVOR',
    value: 3,
    target: 'SPEAKER'
  },
  {
    type: 'MOOD',
    value: 4,
    target: 'SPEAKER'
  }
]
```

---

# 六、妃嫔新增状态

如果 PersonRecord 中已经存在类似属性，则直接复用。

建议妃嫔至少支持：

```ts
favor: number;
mood: number;
jealousy: number;
prestige: number;
fear: number;
resentment: number;
```

建议范围统一：

```text
favor       0~100
mood        0~100
jealousy    0~100
prestige    0~100
fear        0~100
resentment  0~100
```

任何修改都必须 clamp：

```ts
Math.max(0, Math.min(100, value))
```

---

# 七、属性含义

## 宠爱 favor

代表皇帝对该妃嫔的感情和宠幸程度。

日常剧情主要增加这个属性。

---

## 心情 mood

代表人物当前情绪。

未来可以影响：

- 生病概率
- 对话内容
- 主动事件
- 争宠概率

---

## 嫉妒 jealousy

代表因为其他妃嫔受宠产生的不满。

嫉妒高时增加：

- 吃醋剧情
- 告状剧情
- 争宠剧情
- 宫斗行为

发生概率。

---

## 威望 prestige

代表其在后宫中的地位和影响力。

不是位份。

高位份不等于一定高威望。

---

## 畏惧 fear

代表妃嫔对皇帝以及宫规的畏惧。

处罚会增加。

---

## 怨恨 resentment

代表长期积累的不满。

过高后未来可以用于：

- 黑化
- 报复
- 栽赃
- 联盟
- 冷落皇帝
- 谋害

V1只记录数值，不需要立即实现复杂黑化系统。

---

# 八、妃嫔之间的关系

建议增加人物关系表。

不要直接塞很多字段进 PersonRecord。

例如：

```ts
export interface CharacterRelationship {
  personAId: string;
  personBId: string;

  affinity: number;
}
```

范围：

```text
-100 ~ 100
```

解释：

```text
80~100  极亲密
40~79   友好
10~39   略有好感
-9~9    普通
-10~-39 不睦
-40~-79 敌对
-80~-100 仇敌
```

未来事件触发大量依靠这个值。

---

# 九、DialogueAction

新增：

```ts
export type DialogueActionType =
  | 'NONE'
  | 'OPEN_PUNISHMENT'
  | 'START_CASE'
  | 'OPEN_INVESTIGATOR_SELECT'
  | 'SUMMON_CHARACTER'
  | 'REWARD'
  | 'SET_FLAG';
```

```ts
export interface DialogueAction {
  type: DialogueActionType;

  target?:
    | 'SPEAKER'
    | 'ACCUSED'
    | 'VICTIM'
    | 'CUSTOM';

  targetId?: string;

  caseTemplateId?: string;

  flag?: string;
}
```

---

# 十、DialogueScene 最终推荐结构

```ts
export interface DialogueScene {
  id: string;

  kind: PersonKind;

  speaker?: string;

  text: string;

  choices: DialogueChoice[];

  followUp?: DialogueTurn;

  tags?: Array<
    | 'daily'
    | 'pregnant'
    | 'postpartum'
    | 'child'
    | 'adult'
    | 'study'
    | 'festival'
    | 'relationship'
    | 'palaceStrife'
    | 'rivalry'
    | 'extendable'
  >;

  minAge?: number;

  maxAge?: number;

  // ===== 新增 =====

  eventType?: DialogueEventType;

  severity?: EventSeverity;

  participants?: DialogueParticipants;

  caseConfig?: DialogueCaseConfig;

  trigger?: DialogueTriggerConfig;

  cooldownDays?: number;
}
```

注意：

全部新字段尽可能 optional。

保证现有剧情正常运行。

---

# 十一、参与人物 participants

告状、宫斗以后不能只有 speaker。

新增：

```ts
export interface DialogueParticipants {
  complainantId?: string;

  accusedId?: string;

  victimId?: string;

  relatedPersonIds?: string[];
}
```

但是剧情库不能硬编码：

```text
李妃
王贵妃
```

如果这些名字并非固定NPC。

应该由事件生成阶段动态选择真实人物。

文本允许模板变量：

```text
{{speaker}}
{{accused}}
{{victim}}
```

例如：

```ts
text:
  '臣妾今日经过御花园，{{accused}}见了臣妾竟未依礼问安。臣妾本不愿计较，只怕长此以往坏了宫中规矩。'
```

渲染阶段替换真实名字。

---

# 十二、日常剧情规则

DAILY 是最低成本、高频剧情。

目标：

让玩家和人物互动，并缓慢提高宠爱。

示例：

```ts
{
  id: 'consort-daily-tea-v2',

  kind: 'CONSORT',

  eventType: 'DAILY',

  severity: 'TRIVIAL',

  tags: ['daily'],

  text: '臣妾今日新泡了一盏茶，陛下可愿尝尝？',

  choices: [
    {
      id: 'drink',
      label: '陪她饮茶',
      reply: '皇帝留下与她共饮一盏。',

      effects: [
        {
          type: 'FAVOR',
          value: 2,
          target: 'SPEAKER'
        },
        {
          type: 'MOOD',
          value: 3,
          target: 'SPEAKER'
        }
      ]
    },

    {
      id: 'busy',
      label: '今日还有政务',
      reply: '皇帝稍坐片刻便起身离去。',

      effects: [
        {
          type: 'FAVOR',
          value: 1,
          target: 'SPEAKER'
        }
      ]
    }
  ]
}
```

---

# 十三、日常数值建议

V1控制数值增长速度。

普通互动：

```text
普通回应      宠爱 +1
较好回应      宠爱 +2
明显偏爱      宠爱 +3
非常宠溺      宠爱 +4~5
冷淡          0 / -1
训斥          -2~-5
```

单次普通随机剧情不要动辄 +10。

否则宠爱会很快失去意义。

---

# 十四、RIVALRY 吃醋事件

RIVALRY不是正式案件。

例如：

```text
臣妾听闻陛下近日常去另一位妹妹那里，
心里难免有些酸楚。
```

玩家：

```text
温言安慰

公允解释

偏袒她

斥责善妒
```

建议：

### 温言安慰

```text
宠爱 +2
嫉妒 -4
心情 +3
```

### 公允解释

```text
嫉妒 -2
心情 +1
```

### 偏袒她

```text
宠爱 +4
嫉妒 -6

另外一位妃嫔：
宠爱感知下降 / 关系下降
```

### 斥责善妒

```text
宠爱 -3
嫉妒 +2
畏惧 +3
怨恨 +2
```

---

# 十五、争宠事件触发逻辑

不要完全随机。

建议根据人物状态增加权重。

伪代码：

```ts
function getRivalryWeight(consort: PersonRecord) {
  let weight = 1;

  weight += consort.jealousy / 20;
  weight += consort.resentment / 30;

  if (consort.favor >= 60) {
    weight += 1;
  }

  return weight;
}
```

未来可以增加 personality。

V1无需特别复杂。

---

# 十六、COMPLAINT 告状系统

这是本次重点。

告状必须至少包含：

```ts
participants: {
  complainantId,
  accusedId
}
```

例如：

```text
淑妃：

臣妾今日去御花园，
陈贵人见臣妾竟未行礼。

臣妾本不愿计较，
只是宫里的规矩若人人都不守，
以后怕是要乱了。
```

玩家第一层选择：

```text
替她做主

召对方问话

此事作罢
```

其中：

### 替她做主

进入：

```text
OPEN_PUNISHMENT
```

### 召对方问话

可以：

```text
nextSceneId
```

进入第二段对质剧情。

### 此事作罢

直接影响告状者情绪。

---

# 十七、告状不要默认是真的

案件事件必须允许存在：

```ts
truthType
```

新增：

```ts
export type EventTruthType =
  | 'TRUE'
  | 'FALSE'
  | 'EXAGGERATED'
  | 'MUTUAL'
  | 'UNKNOWN';
```

解释：

### TRUE

被告确实干了。

### FALSE

纯粹诬告。

### EXAGGERATED

确有其事，但是原告夸大。

### MUTUAL

双方都有问题。

### UNKNOWN

生成事件时不预设结果。

主要留给以后高级案件系统。

---

# 十八、普通小事可以直接处罚

例如：

```text
御花园失仪
争执
宫人违规
轻微越制
```

这些不强制调查。

玩家可以：

```text
不予追究

训诫

罚俸

禁足
```

---

# 十九、处罚系统

建立独立公共组件。

建议：

```ts
export type PunishmentType =
  | 'WARNING'
  | 'FINE_1_MONTH'
  | 'FINE_3_MONTHS'
  | 'GROUNDING_3_DAYS'
  | 'GROUNDING_7_DAYS'
  | 'GROUNDING_30_DAYS'
  | 'DEMOTION'
  | 'COLD_PALACE';
```

---

# 二十、处罚数据不要硬编码进UI

创建：

```ts
export interface PunishmentDefinition {
  id: PunishmentType;

  name: string;

  minSeverity: EventSeverity;

  favorChange: number;

  prestigeChange: number;

  fearChange: number;

  resentmentChange: number;

  groundingDays?: number;

  rankChange?: number;
}
```

例如：

```ts
export const punishmentDefinitions = {
  WARNING: {
    id: 'WARNING',
    name: '训诫',

    minSeverity: 'TRIVIAL',

    favorChange: -2,
    prestigeChange: 0,
    fearChange: 2,
    resentmentChange: 1
  },

  FINE_1_MONTH: {
    id: 'FINE_1_MONTH',
    name: '罚俸一月',

    minSeverity: 'MINOR',

    favorChange: -3,
    prestigeChange: -1,
    fearChange: 3,
    resentmentChange: 2
  },

  GROUNDING_7_DAYS: {
    id: 'GROUNDING_7_DAYS',
    name: '禁足七日',

    minSeverity: 'MINOR',

    favorChange: -5,
    prestigeChange: -2,
    fearChange: 5,
    resentmentChange: 4,

    groundingDays: 7
  }
};
```

---

# 二十一、处罚UI

点击“处罚”后不要直接执行。

打开底部抽屉 / 弹窗：

```text
──────────────
     处置陈贵人
──────────────

事件：
御花园失仪

性质：
轻微宫规事件

[不予追究]

[训诫]

[罚俸一月]

[禁足三日]

[禁足七日]

──────────────
```

点击具体处罚后显示二次确认：

```text
确定将陈贵人禁足七日？

宠爱 -5
威望 -2
畏惧 +5

禁足期间无法侍寝
```

---

# 二十二、允许玩家越级处罚

不要禁止。

因为玩家扮演的是皇帝。

但是如果处罚明显超过事件严重度，则触发：

```text
OVER_PUNISHMENT
```

例如小小失仪直接降位。

产生：

```text
被处罚妃嫔：
怨恨 +10

六宫：
畏惧 +3

皇帝：
可选增加“严苛/暴虐”隐藏记录
```

V1如果没有皇帝性格系统，可以暂时只修改：

```text
resentment
fear
```

---

# 二十三、处罚不足

反过来：

重大违规却完全不处罚。

可以触发：

```text
UNDER_PUNISHMENT
```

结果：

```text
被偏袒人物：
宠爱 +3

原告：
怨恨 +5

其他妃嫔：
对皇帝公正感下降
```

V1可先只影响相关人物。

---

# 二十四、处罚记录

非常重要。

创建：

```ts
export interface PalacePunishmentRecord {
  id: string;

  day: number;

  targetId: string;

  eventId?: string;

  caseId?: string;

  punishment: PunishmentType;

  reason: string;

  severity: EventSeverity;
}
```

以后人物履历里可以直接显示：

```text
景和十二年三月
因宫中失仪，被训诫。

景和十三年五月
因散播流言，被禁足七日。
```

这会非常适合你现在的人物详情“履历”系统。

---

# 二十五、CASE 案件系统

严重事件不立即定罪。

进入：

```text
案件
```

例如：

```text
安嫔糕点异常案
```

---

# 二十六、案件数据结构

```ts
export type PalaceCaseStatus =
  | 'PENDING'
  | 'INVESTIGATING'
  | 'COMPLETED'
  | 'CLOSED';
```

```ts
export interface PalaceCase {
  id: string;

  templateId?: string;

  title: string;

  description: string;

  severity: EventSeverity;

  status: PalaceCaseStatus;

  createdDay: number;

  complainantId?: string;

  victimId?: string;

  accusedIds: string[];

  truth: PalaceCaseTruth;

  investigator?: PalaceInvestigator;

  investigationProgress: number;

  investigationDaysRemaining?: number;

  result?: PalaceCaseResult;

  relatedDialogueId?: string;
}
```

---

# 二十七、案件真相

玩家不可直接看到。

例如：

```ts
export interface PalaceCaseTruth {
  culpritIds: string[];

  truthType:
    | 'TRUE'
    | 'FALSE_ACCUSATION'
    | 'PARTIAL'
    | 'ACCIDENT'
    | 'UNKNOWN';

  difficulty: number;
}
```

difficulty：

```text
0~100
```

---

# 二十八、V1调查模式

第一版不要做手动搜证。

采用：

```text
指派调查人
↓
经过若干游戏日
↓
产生调查结果
↓
玩家裁决
```

---

# 二十九、调查人类型

```ts
export type InvestigatorType =
  | 'NEIWUFU'
  | 'EMPRESS'
  | 'CONSORT'
  | 'EUNUCH'
  | 'IMPERIAL_PHYSICIAN';
```

第一版至少实现：

```text
内务府

皇后

指定妃嫔
```

---

# 三十、调查人选择页面

重大剧情选择：

```text
命人彻查
```

进入：

```text
──────────────
      指派调查
──────────────

安嫔糕点异常案

案件难度：
★★★

预计调查时间：
3～7日


官方机构

[ 内务府 ]
查案能力：★★★★
公正程度：★★★★


后宫

[ 皇后 ]
能力：★★★
威望：★★★★★


[ 淑妃 ]
能力：★★★★
与安嫔关系：不睦

──────────────
```

---

# 三十一、调查能力

建议暂时使用统一：

```ts
investigationAbility: number
```

范围：

```text
0~100
```

如果目前 PersonRecord 没有这个字段：

可以先根据已有属性动态生成。

如果已有：

```text
intelligence
ability
management
```

等类似属性，则尽量复用。

不要为了这个系统重复造类似属性。

---

# 三十二、内务府

可以作为默认调查机构。

配置：

```text
能力：70
公正：85
速度：普通
```

特点：

稳定。

---

# 三十三、皇后调查

能力建议由：

```text
人物能力
威望
```

共同决定。

优势：

管理后宫合理。

风险：

如果嫌疑人与皇后关系很好，有小概率偏袒。

---

# 三十四、妃嫔调查

玩家可以指派特定妃嫔查案。

这是未来最好玩的部分之一。

成功率根据：

```text
调查能力
智谋
威望
案件难度
```

而且要受到关系影响。

例如：

调查者和嫌疑人是仇敌。

可能：

```text
栽赃概率增加
```

调查者和嫌疑人非常亲密。

可能：

```text
包庇概率增加
```

V1先预留接口。

不用马上实现复杂栽赃。

---

# 三十五、调查时间

建议：

```ts
days =
  baseDays
  + difficultyModifier
  - investigatorSpeedModifier
```

V1简单做：

```text
轻微案件 2~3日
普通案件 3~5日
严重案件 5~8日
重大案件 7~12日
```

---

# 三十六、每日推进案件

游戏每日结算时增加：

```ts
processPalaceCases(gameState)
```

逻辑：

```ts
for (const palaceCase of activeCases) {

  if (palaceCase.status !== 'INVESTIGATING') {
    continue;
  }

  palaceCase.investigationDaysRemaining--;

  if (palaceCase.investigationDaysRemaining <= 0) {

    resolveInvestigation(palaceCase);
  }
}
```

---

# 三十七、调查结果

调查结果不要永远100%正确。

返回：

```ts
export interface PalaceCaseResult {
  confidence: number;

  suspectedIds: string[];

  conclusion:
    | 'CULPRIT_FOUND'
    | 'INSUFFICIENT_EVIDENCE'
    | 'FALSE_ACCUSATION_FOUND'
    | 'ACCIDENT'
    | 'INCONCLUSIVE';

  summary: string;
}
```

---

# 三十八、案件调查完成提醒

调查结束后加入待处理事件。

例如：

```text
【内务府呈报】

安嫔糕点异常案已有结果。

[查看案情]
```

玩家不用必须当天处理。

案件页面可以保留：

```text
待裁决
```

---

# 三十九、调查结果界面

例如：

```text
━━━━━━━━━━━━
    调查结果
━━━━━━━━━━━━

安嫔糕点异常案

负责：
内务府

调查用时：
5日

━━━━━━━━━━━━

查明：

糕点来自御膳房。

负责送膳的小宫女
曾私下收取银钱。

银钱最终来源
指向陈贵人宫中。

━━━━━━━━━━━━

调查可信度：
较高

[召陈贵人问话]

[继续深查]

[直接处罚]

[暂且搁置]
```

---

# 四十、调查成功率

第一版简单公式即可。

例如：

```ts
successScore =
  investigatorAbility
  + random(-20, 20)
  - caseDifficulty;
```

例如：

```text
>= 20
完整查明

0 ~ 19
查到部分线索

-20 ~ -1
证据不足

<-20
调查失败
```

后面再慢慢增加人物关系干扰。

---

# 四十一、案件最终裁决

案件调查结束后玩家依然拥有最终决定权。

例如查明陈贵人有罪。

玩家依然可以：

```text
训诫

罚俸

禁足

降位

不予追究
```

这体现：

**调查负责告诉玩家真相。**

**皇帝负责决定怎么处理。**

不要让系统自动处罚。

---

# 四十二、冤案机制

如果：

```text
truth = FALSE_ACCUSATION
```

但玩家一开始直接处罚被告。

允许这样做。

记录：

```ts
wrongfulJudgment: true
```

以后如果案件真相曝光：

产生：

```text
旧案翻出
```

例如：

```text
当初御花园盗簪一事，
如今发现真正下手之人另有其人。
```

被冤枉者：

```text
怨恨增加
```

诬告者：

可以重新处罚。

V1可只做数据记录。

剧情以后再扩展。

---

# 四十三、事件链

增加：

```ts
nextSceneId?: string
```

支持：

```text
剧情A
↓
剧情B
↓
案件
↓
调查
↓
剧情C
```

例如：

```text
宫女发现异常药材

↓

调查药材

↓

查到宫女

↓

宫女招供

↓

指向某妃

↓

召妃嫔问话

↓

最终处罚
```

这就是未来宫斗剧情的基础。

---

# 四十四、不要让所有事件一次发生完

后宫事件需要有时间感。

例如：

第1天：

```text
发现异常燕窝
```

第2天：

```text
指派内务府调查
```

第6天：

```text
调查结束
```

第7天：

```text
召嫌疑人问话
```

第8天：

```text
最终处罚
```

这样比一段对话里全部讲完强很多。

---

# 四十五、事件冷却

DialogueScene 新增：

```ts
cooldownDays?: number;
```

避免：

今天妃嫔抱怨冷落。

明天又抱怨。

后天又抱怨。

默认建议：

```text
DAILY       5
EMOTION     10
RIVALRY     15
COMPLAINT   20
CASE        60
```

只是默认值。

剧情可以覆盖。

---

# 四十六、人物状态影响剧情选择

未来选择剧情时增加条件。

第一版建议至少支持：

```ts
export interface DialogueTriggerConfig {
  minFavor?: number;

  maxFavor?: number;

  minJealousy?: number;

  minResentment?: number;

  minPrestige?: number;

  requireChildren?: boolean;

  requirePregnant?: boolean;
}
```

例如：

吃醋剧情：

```ts
trigger: {
  minJealousy: 30
}
```

怨恨剧情：

```ts
trigger: {
  minResentment: 50
}
```

---

# 四十七、剧情随机权重

建议不要所有剧情等概率。

新增：

```ts
weight?: number;
```

默认：

```ts
weight = 1
```

以后可以动态计算：

```ts
finalWeight =
  baseWeight *
  characterConditionModifier *
  relationshipModifier;
```

---

# 四十八、事件生成器

建议建立：

```ts
generatePalaceEvent()
```

流程：

```text
选择人物
↓
根据人物状态得到适合事件类型
↓
从符合条件的 DialogueScene 中筛选
↓
应用 cooldown
↓
按 weight 抽取
↓
动态选择相关人物
↓
渲染模板变量
↓
弹出剧情
```

---

# 四十九、动态选择争宠对象

RIVALRY / COMPLAINT 不建议永远固定人名。

例如：

```ts
function selectRival(
  speakerId: string,
  state: GameState
): PersonRecord | undefined
```

优先选择：

```text
近期受宠高的人

与speaker关系差的人

位份相近的人

最近被临幸的人
```

---

# 五十、剧情中的人物名字模板

实现：

```ts
renderDialogueTemplate(text, context)
```

支持：

```text
{{speaker}}
{{accused}}
{{victim}}
{{empress}}
```

例如：

```text
臣妾听闻{{accused}}近来时常蒙召，
心中虽知道不该计较，
却还是有些难过。
```

---

# 五十一、现有剧情迁移策略

非常重要：

不要要求一次给全部旧剧情补齐新结构。

分三阶段。

---

## 阶段1

保证旧数据：

```ts
{
  id,
  kind,
  text,
  tags,
  choices
}
```

全部继续运行。

---

## 阶段2

优先升级：

```text
CONSORT剧情
```

尤其：

```text
daily
relationship
rivalry
palaceStrife
```

---

## 阶段3

以后慢慢将旧剧情增加：

```text
eventType
effects
severity
trigger
action
```

---

# 五十二、旧tags映射建议

如果旧剧情没有 eventType：

系统自动推断。

例如：

```ts
function inferEventType(scene: DialogueScene): DialogueEventType {

  if (scene.tags?.includes('palaceStrife')) {
    return 'DISPUTE';
  }

  if (scene.tags?.includes('rivalry')) {
    return 'RIVALRY';
  }

  if (scene.tags?.includes('festival')) {
    return 'FESTIVAL';
  }

  if (scene.tags?.includes('child')) {
    return 'CHILD';
  }

  if (scene.tags?.includes('relationship')) {
    return 'EMOTION';
  }

  return 'DAILY';
}
```

注意：

只是 fallback。

新剧情应明确填写 eventType。

---

# 五十三、现有剧情改造例1

原：

```ts
{
  id: 'consort-tea',
  kind: 'CONSORT',

  text:
    '新贡的春茶已经到了，臣妾命人留了一盏。',

  tags: ['daily'],

  choices: [
    {
      id: 'taste',
      label: '尝一尝',
      reply: '皇帝与她共品新茶，关系更显亲近。'
    }
  ]
}
```

改：

```ts
{
  id: 'consort-tea',

  kind: 'CONSORT',

  eventType: 'DAILY',

  severity: 'TRIVIAL',

  text:
    '新贡的春茶已经到了，臣妾命人留了一盏。',

  tags: ['daily'],

  choices: [
    {
      id: 'taste',

      label: '尝一尝',

      reply:
        '皇帝与她共品新茶，关系更显亲近。',

      effects: [
        {
          type: 'FAVOR',
          value: 2,
          target: 'SPEAKER'
        },

        {
          type: 'MOOD',
          value: 2,
          target: 'SPEAKER'
        }
      ]
    }
  ]
}
```

---

# 五十四、现有剧情改造例2：吃醋

原有类似：

```text
陛下近来常去别宫，
臣妾心里难免酸楚。
```

改：

```ts
{
  id: 'consort-jealousy',

  kind: 'CONSORT',

  eventType: 'RIVALRY',

  severity: 'TRIVIAL',

  tags: ['relationship', 'rivalry'],

  trigger: {
    minJealousy: 25
  },

  choices: [
    {
      id: 'comfort',

      label: '温言安慰',

      reply:
        '皇帝温言安慰，她心里的酸楚稍稍散去。',

      effects: [
        {
          type: 'FAVOR',
          value: 2,
          target: 'SPEAKER'
        },

        {
          type: 'JEALOUSY',
          value: -4,
          target: 'SPEAKER'
        },

        {
          type: 'MOOD',
          value: 3,
          target: 'SPEAKER'
        }
      ]
    },

    {
      id: 'rebuke',

      label: '斥她善妒',

      reply:
        '皇帝语气渐冷，告诫她不可因一时得失扰乱六宫。',

      effects: [
        {
          type: 'FAVOR',
          value: -3,
          target: 'SPEAKER'
        },

        {
          type: 'FEAR',
          value: 3,
          target: 'SPEAKER'
        },

        {
          type: 'RESENTMENT',
          value: 2,
          target: 'SPEAKER'
        }
      ]
    }
  ]
}
```

---

# 五十五、告状剧情例子

```ts
{
  id: 'consort-complaint-no-greeting',

  kind: 'CONSORT',

  eventType: 'COMPLAINT',

  severity: 'MINOR',

  tags: ['palaceStrife', 'rivalry'],

  text:
    '臣妾今日在御花园遇见{{accused}}，她见了臣妾竟连礼都未行。臣妾自己倒不打紧，只怕长此以往坏了宫里的规矩。',

  participants: {
    complainantId: '{{speakerId}}',
    accusedId: '{{dynamic}}'
  },

  choices: [
    {
      id: 'punish',

      label: '替她做主',

      reply:
        '皇帝决定亲自处置此事。',

      effects: [
        {
          type: 'FAVOR',
          value: 3,
          target: 'SPEAKER'
        }
      ],

      action: {
        type: 'OPEN_PUNISHMENT',
        target: 'ACCUSED'
      }
    },

    {
      id: 'ask-other',

      label: '召她来问话',

      reply:
        '皇帝命人将对方传来，当面对质。',

      nextSceneId:
        'consort-complaint-no-greeting-confront'
    },

    {
      id: 'ignore',

      label: '不必计较',

      reply:
        '皇帝认为不过小事，让她不必放在心上。',

      effects: [
        {
          type: 'FAVOR',
          value: -2,
          target: 'SPEAKER'
        },

        {
          type: 'RESENTMENT',
          value: 2,
          target: 'SPEAKER'
        }
      ]
    }
  ]
}
```

---

# 五十六、重大案件示例

```ts
{
  id: 'consort-case-abnormal-food',

  kind: 'CONSORT',

  eventType: 'CASE',

  severity: 'SERIOUS',

  tags: ['palaceStrife'],

  text:
    '臣妾这几日所用的燕窝总有一股异味，今日宫女觉得不对，便没有再端上来。臣妾不敢擅自处置，只能来请陛下做主。',

  choices: [
    {
      id: 'investigate',

      label: '命人彻查',

      reply:
        '皇帝决定暂不惊动旁人，先查清燕窝究竟从何而来。',

      action: {
        type: 'START_CASE',
        caseTemplateId:
          'case-abnormal-food'
      }
    },

    {
      id: 'change-food',

      label: '换掉便是',

      reply:
        '皇帝命人换了供给，此事暂时没有继续深究。'
    }
  ]
}
```

---

# 五十七、案件模板

建议单独：

```ts
export interface PalaceCaseTemplate {
  id: string;

  title: string;

  severity: EventSeverity;

  baseDifficulty: number;

  minInvestigationDays: number;

  maxInvestigationDays: number;

  possibleTruths: PalaceCaseTruthTemplate[];
}
```

不要把所有随机真相都写死在 DialogueScene。

---

# 五十八、案例

```ts
const abnormalFoodCase: PalaceCaseTemplate = {

  id: 'case-abnormal-food',

  title: '膳食异常',

  severity: 'SERIOUS',

  baseDifficulty: 55,

  minInvestigationDays: 3,

  maxInvestigationDays: 7,

  possibleTruths: [
    {
      type: 'ACCIDENT',
      weight: 30
    },

    {
      type: 'TRUE',
      weight: 45
    },

    {
      type: 'FALSE_ACCUSATION',
      weight: 15
    },

    {
      type: 'UNKNOWN',
      weight: 10
    }
  ]
};
```

---

# 五十九、UI架构

后宫剧情仍然使用目前现有对话界面。

不要把普通日常做成复杂事件页面。

只有出现：

```text
OPEN_PUNISHMENT
START_CASE
OPEN_INVESTIGATOR_SELECT
```

时才打开特殊UI。

这样不会破坏目前的竖屏剧情体验。

---

# 六十、玩家看到的属性反馈

普通剧情选择完成后：

建议在 reply 下方出现轻量提示：

```text
宠爱 +2
心情 +3
```

持续约1.5秒。

不要弹独立弹窗。

---

# 六十一、处罚反馈

处罚这种重大操作需要明显提示：

```text
陈贵人被禁足七日

宠爱 -5
威望 -2
畏惧 +5
```

并记入履历。

---

# 六十二、案件入口

建议主界面以后增加：

```text
奏报 / 待办
```

或者后宫页面增加：

```text
宫中事务
```

显示：

```text
调查中 2

待裁决 1
```

V1如果不想增加新主页面，可以先放到后宫页面。

---

# 六十三、人物详情页面联动

以后人物详情的“履历”里展示：

```text
受宠

晋封

怀孕

生产

处罚

禁足

案件

调查

被冤

复宠
```

所以本次所有处罚和案件都尽量写入历史记录。

---

# 六十四、存档兼容

这是硬要求。

旧存档没有：

```text
jealousy
prestige
fear
resentment
palaceCases
relationships
```

必须自动补默认值。

例如：

```ts
function migrateGameState(state: GameState) {

  state.people.forEach(person => {

    person.jealousy ??= 0;
    person.prestige ??= 0;
    person.fear ??= 0;
    person.resentment ??= 0;

  });

  state.palaceCases ??= [];

  state.characterRelationships ??= [];

  state.punishmentRecords ??= [];

  return state;
}
```

绝对不能因为字段缺失导致旧存档无法进入。

---

# 六十五、代码模块建议

不要全部塞进 dialogue 文件。

建议拆：

```text
dialogues.ts
```

继续保存剧情数据。

新增：

```text
palaceEvents.ts
```

负责：

```text
事件类型
事件选择
事件随机
trigger
cooldown
```

新增：

```text
dialogueEffects.ts
```

负责：

```text
属性变化
关系变化
```

新增：

```text
palacePunishment.ts
```

负责：

```text
处罚配置
处罚执行
处罚记录
禁足
```

新增：

```text
palaceCases.ts
```

负责：

```text
案件创建
调查
时间推进
结案
```

新增：

```text
palaceRelationships.ts
```

负责：

```text
人物关系
关系修改
关系读取
```

---

# 六十六、开发优先级

## P0 第一阶段必须完成

```text
eventType

severity

effects

宠爱变化

心情

嫉妒

怨恨

处罚系统

禁足状态

处罚记录

旧存档迁移
```

---

## P1 第二阶段

```text
COMPLAINT

动态被告

人物关系

案件创建

内务府调查

调查倒计时

调查结果

案件裁决
```

---

## P2

```text
皇后调查

指定妃嫔调查

调查能力

调查偏袒

调查栽赃

假证据

翻案

复杂事件链
```

---

# 六十七、V1明确暂时不做

第一阶段不要为了“完整”把项目做炸。

以下暂时不要实现：

```text
玩家手动搜索房间

逐条收集证据

证人审讯小游戏

复杂推理小游戏

数十种刑罚

死亡刑罚

完整派系AI

复杂阴谋树

妃嫔自主下毒AI

动态生成案件全文
```

先把：

```text
事件 → 调查 → 时间 → 结果 → 处罚
```

这一条循环跑通。

---

# 六十八、验收标准

开发完成后至少能够实现以下体验。

### 测试1 日常

进入妃嫔剧情：

```text
陪她赏月
```

点击后：

```text
宠爱 +2
心情 +2
```

重新打开人物详情，数值已经保存。

---

### 测试2 吃醋

嫉妒达到条件。

触发：

```text
陛下近日怎么总去别宫……
```

安慰：

```text
宠爱增加
嫉妒下降
```

训斥：

```text
宠爱下降
畏惧增加
怨恨增加
```

---

### 测试3 告状

淑妃：

```text
陈贵人今日对臣妾失礼。
```

选择：

```text
替她做主
```

打开处罚面板。

点击：

```text
禁足七日
```

陈贵人进入：

```text
groundedUntilDay
```

七日内：

不能侍寝。

人物履历出现：

```text
因宫中失仪，被禁足七日。
```

---

### 测试4 案件

妃嫔：

```text
燕窝有异常气味。
```

选择：

```text
命人彻查
```

出现：

```text
指派调查
```

选择：

```text
内务府
```

案件进入：

```text
调查中
剩余5日
```

游戏推进5日。

弹出：

```text
内务府呈报调查结果
```

点击：

```text
查看
```

能够看到结果。

然后玩家：

```text
处罚 / 不处罚
```

案件变为：

```text
CLOSED
```

---

# 六十九、最重要的设计原则

以后后宫剧情不要再理解为：

```text
一段随机文字。
```

它应该理解为：

```text
人物状态
↓
触发事件
↓
玩家决策
↓
人物状态变化
↓
产生新的关系
↓
形成未来剧情条件
```

最终目标：

```text
日常
↓
宠爱差距
↓
嫉妒
↓
争宠
↓
告状
↓
矛盾升级
↓
案件
↓
调查
↓
处罚
↓
怨恨 / 畏惧 / 关系改变
↓
下一轮事件
```

玩家看到的是剧情。

底层实际运行的是人物关系和状态系统。

---

# 七十、Codex实施要求

请先阅读项目中现有：

```text
DialogueScene
DialogueChoice
PersonRecord
GameState
剧情选择执行逻辑
时间推进逻辑
人物履历逻辑
侍寝/临幸资格判断
存档加载逻辑
```

再开始修改。

优先复用项目当前的数据结构与工具函数。

不要在未检查已有字段的情况下创建重复属性。

不要删除现有剧情。

不要大规模重构无关功能。

每完成一个阶段保证项目可以正常编译运行。

优先保证：

```text
旧剧情可用
旧存档可用
当前人物详情可用
当前临幸系统不被破坏
```

第一阶段完成后，先用：

```text
3条日常
2条吃醋
2条告状
1条案件
```

作为测试数据跑通完整链路。

确认系统稳定之后，再批量迁移现有剧情库。