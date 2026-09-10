import { isPersonAlive } from './person';
import type { PersonKind, PersonLifeStatus, PersonRecord } from './gameState';
import { ageWithin } from './heirEducation';
import type { DialogueEffect, DialogueAction, DialogueParticipants, DialogueTrigger, PalaceEventType, EventSeverity } from './palaceTypes';

export interface DialogueChoice {
  id: string;
  label: string;
  reply: string;
  effects?: DialogueEffect[];
  action?: DialogueAction;
}

export interface DialogueTurn {
  speaker: string;
  text: string;
  choices: DialogueChoice[];
}

export interface DialogueScene {
  eventType?: PalaceEventType;
  severity?: EventSeverity;
  participants?: DialogueParticipants;
  trigger?: DialogueTrigger;
  weight?: number;
  cooldownDays?: number;
  id: string;
  kind: PersonKind;
  /** 开场白说话人；未指定时默认使用人物名。 */
  speaker?: string;
  text: string;
  choices: DialogueChoice[];
  followUp?: DialogueTurn;
  tags?: Array<'daily' | 'pregnant' | 'postpartum' | 'child' | 'adult' | 'study' | 'festival' | 'relationship' | 'palaceStrife' | 'rivalry' | 'extendable'>;
  /** 最低适龄（仅对 PRINCE / PRINCESS 生效）；缺省视为不限。 */
  minAge?: number;
  /** 最高适龄（仅对 PRINCE / PRINCESS 生效）；缺省视为不限。 */
  maxAge?: number;
}

type DialogueContext = Pick<PersonRecord, 'id' | 'kind' | 'name' | 'age' | 'status' | 'title' | 'rank' | 'children' | 'deathDate'>;

const consortDialogues: DialogueScene[] = [
  {
    id: 'consort-daily-palace-lanterns', kind: 'CONSORT',
    text: '入夜之后，宫灯次第亮起，臣妾站在廊下看了许久。殿里虽然暖和，可总觉得夜色太静了。',
    tags: ['daily'],
    choices: [
      { id: 'stay-with-her', label: '陪她站一会儿', reply: '皇帝陪她在廊下看灯，宫灯映着人影，气氛渐渐柔和。' },
      { id: 'send-her-inside', label: '让她进殿歇息', reply: '皇帝嘱她夜里风凉，不必在殿外久立，随后也入殿闲坐。' },
    ],
  },
  {
    id: 'consort-daily-new-painting', kind: 'CONSORT',
    text: '臣妾今日新画了一幅折枝梅，只是笔墨还嫌生涩。陛下若是得空，可否替臣妾看看哪里还可再改？',
    tags: ['daily', 'relationship'],
    choices: [
      { id: 'point-out-details', label: '指点笔墨', reply: '皇帝指着画中枝桠与留白说了几句，妃嫔欣然记下。' },
      { id: 'praise-her-work', label: '先夸她用心', reply: '皇帝称赞她画得清逸，妃嫔脸上露出笑意。' },
    ],
  },
  {
    id: 'consort-daily-book-afternoon', kind: 'CONSORT',
    text: '午后窗下最适合读书，臣妾今日翻了几页旧词，忽然觉得前人写愁思写得太真切。',
    tags: ['daily'],
    choices: [
      { id: 'read-together', label: '一同翻几页', reply: '皇帝陪她读了几首旧词，殿内只闻翻书声。' },
      { id: 'talk-about-poetry', label: '和她聊几句', reply: '皇帝与她闲话词中意趣，她听得很是认真。' },
    ],
  },
  {
    id: 'consort-daily-tea-tasting', kind: 'CONSORT',
    text: '臣妾今日试着泡了一盏新茶，茶汤颜色虽好，只是滋味还不够稳。陛下要不要替臣妾品一品？',
    tags: ['daily'],
    choices: [
      { id: 'taste-with-her', label: '一同品茶', reply: '皇帝端杯尝了一口，与她说起水温与茶叶的火候。' },
      { id: 'encourage-her', label: '夸她手巧', reply: '皇帝称赞她有心学这些小事，她低头一笑。' },
    ],
  },
  {
    id: 'consort-daily-embroidery', kind: 'CONSORT',
    text: '臣妾正在绣一幅小屏风，花样是江南春水。只是针脚越到后面越慢，只怕要绣上好些日子。',
    tags: ['daily'],
    choices: [
      { id: 'watch-her-work', label: '看她刺绣', reply: '皇帝坐在一旁看她穿针引线，殿内安静了许久。' },
      { id: 'praise-patience', label: '赞她有耐心', reply: '皇帝说这样细致活最磨心性，妃嫔闻言一笑。' },
    ],
  },
  {
    id: 'consort-daily-garden-breeze', kind: 'CONSORT',
    text: '御花园这几日风很好，花也开得热闹。臣妾方才折了一小枝，想插在瓶里供陛下看看。',
    tags: ['daily'],
    choices: [
      { id: 'take-flower', label: '接过花枝', reply: '皇帝接过花枝，见她指尖还沾着一点花香。' },
      { id: 'walk-garden', label: '同去园中', reply: '皇帝陪她往园中走了走，春风拂过花树，景色正好。' },
    ],
  },
  {
    id: 'consort-daily-summer-heat', kind: 'CONSORT',
    text: '今日暑气有些重，臣妾命人备了冰酪，只是不敢多吃。陛下若不嫌凉，便尝一口吧。',
    tags: ['daily'],
    choices: [
      { id: 'eat-together', label: '一同吃冰酪', reply: '皇帝与她分食冰酪，殿内凉意渐渐压过暑气。' },
      { id: 'remind-moderate', label: '嘱她少吃些', reply: '皇帝提醒她夏日虽热，也不可贪凉太多。' },
    ],
  },
  {
    id: 'consort-daily-autumn-leaves', kind: 'CONSORT',
    text: '这几日秋意渐浓，窗外来往的落叶多了。臣妾捡了几片形状好看的，夹进了书里。',
    tags: ['daily'],
    choices: [
      { id: 'see-leaves', label: '取来看看', reply: '皇帝翻看她夹在书中的落叶，叶片纹路还很清晰。' },
      { id: 'talk-about-autumn', label: '闲话秋景', reply: '皇帝与她说起秋日景致，她安静听着，偶尔点头。' },
    ],
  },
  {
    id: 'consort-daily-women-visit', kind: 'CONSORT',
    text: '臣妾的一位旧识入宫探望，说了些宫外的闲话。听她说起市井人家的日子，倒也觉得新鲜。',
    tags: ['daily', 'relationship'],
    choices: [
      { id: 'ask-about-news', label: '问她详情', reply: '皇帝听她说起宫外见闻，倒也解了片刻政务之乏。' },
      { id: 'warn-propriety', label: '嘱她慎言', reply: '皇帝提醒她宫中与外间不同，闲话听听便好。' },
    ],
  },
  {
    id: 'consort-daily-forget-time', kind: 'CONSORT',
    text: '臣妾方才在殿里抄经，不知不觉竟到了这个时辰。听见陛下脚步声，才惊觉忘了时间。',
    tags: ['daily'],
    choices: [
      { id: 'ask-to-see', label: '看看她抄的经', reply: '皇帝拿起她抄好的几页经卷，字迹端正，墨迹还未全干。' },
      { id: 'let-her-rest', label: '让她先歇息', reply: '皇帝嘱她不必过于劳神，夜里也该早些安歇。' },
    ],
  },
  {
    id: 'consort-daily-small-gift', kind: 'CONSORT',
    text: '臣妾今日做了一个小香囊，香气不浓，只想着若陛下不嫌弃，便随身带着也好。',
    tags: ['daily', 'relationship'],
    choices: [
      { id: 'accept-gift', label: '欣然收下', reply: '皇帝收下香囊，妃嫔神色间多了几分欢喜。' },
      { id: 'praise-thought', label: '夸她有心', reply: '皇帝称赞她心思细致，她低头轻声谢恩。' },
    ],
  },
  {
    id: 'consort-daily-sleep-late', kind: 'CONSORT',
    text: '昨夜臣妾睡得晚了些，今晨起时头还有些发沉。想来是夜里思虑太多，反倒扰了眠。',
    tags: ['daily'],
    choices: [
      { id: 'send-sleep-aid', label: '命人安神', reply: '皇帝命宫人送来安神之物，嘱她今日不必强撑。' },
      { id: 'stay-quiet', label: '让她静养', reply: '皇帝让她先静卧片刻，自己只在外殿坐了一会儿。' },
    ],
  },
  {
    id: 'consort-daily-servant-care', kind: 'CONSORT',
    text: '臣妾身边的小宫女今日手脚有些笨，打翻了一盏茶。念她不是有心，臣妾便只说了几句。',
    tags: ['daily'],
    choices: [
      { id: 'agree-with-mercy', label: '宽待便好', reply: '皇帝说她处置得宜，宫人小错不必苛责太过。' },
      { id: 'remind-order', label: '也需立规矩', reply: '皇帝提醒她恩典之外，也要让宫人知道规矩。' },
    ],
  },
  {
    id: 'consort-daily-music-practice', kind: 'CONSORT',
    text: '臣妾这几日在学一支新曲，只是手指还不顺，弹到一半常常出错。陛下要不要听臣妾试弹一遍？',
    tags: ['daily'],
    choices: [
      { id: 'listen-once', label: '听她试弹', reply: '皇帝坐下来听她弹奏，虽有几处断续，却也清雅。' },
      { id: 'encourage-practice', label: '让她慢慢来', reply: '皇帝嘱她不必着急，学琴本就不是一日之功。' },
    ],
  },
  {
    id: 'consort-daily-window-rain', kind: 'CONSORT',
    text: '窗外的雨下了大半日，臣妾坐在窗前看雨，忽然想起从前未入宫时的一个雨天。',
    tags: ['daily', 'relationship'],
    choices: [
      { id: 'listen-to-memory', label: '听她说说', reply: '皇帝听她说起旧时雨天，殿内雨声更显得安静。' },
      { id: 'comfort-her', label: '温言宽慰', reply: '皇帝劝慰她往事虽远，如今也有如今的安稳。' },
    ],
  },
  {
    id: 'consort-daily-child-first-word', kind: 'CONSORT',
    text: '孩儿今日似乎又多会说了几个字，虽然还含糊不清，臣妾听了心里倒是欢喜得很。',
    tags: ['child'],
    choices: [
      { id: 'go-see-child', label: '去看看孩子', reply: '皇帝走近床边看了看孩儿，孩子正咿呀作声。' },
      { id: 'praise-mother', label: '夸她照料得好', reply: '皇帝说她把孩子照料得细心，她眉眼间满是笑意。' },
    ],
  },
  {
    id: 'consort-daily-child-play', kind: 'CONSORT',
    text: '孩儿方才在殿里追着一只蝴蝶跑，嬷嬷怕他摔着，跟在后面喘个不停。臣妾拦了几次，他也不肯听。',
    tags: ['child'],
    choices: [
      { id: 'play-with-child', label: '陪孩子玩一会儿', reply: '皇帝陪着孩儿追了几步，孩子笑得更欢了。' },
      { id: 'remind-safety', label: '嘱人看护好', reply: '皇帝让嬷嬷小心看护，孩子年幼贪玩，不能不留心。' },
    ],
  },
  {
    id: 'consort-daily-festival-lantern-prepare', kind: 'CONSORT',
    text: '节下宫里要备花灯，臣妾学着扎了一盏小兔灯，只是模样不如外面匠人做的精巧。',
    tags: ['festival'],
    choices: [
      { id: 'see-her-lantern', label: '看看兔灯', reply: '皇帝拿过兔灯细看，灯面上还留着她亲手画的小花纹。' },
      { id: 'praise-her-hands', label: '夸她手巧', reply: '皇帝说心意比工巧更难得，她笑着把灯收了起来。' },
    ],
  },
  {
    id: 'consort-daily-festival-gift', kind: 'CONSORT',
    text: '今日节下，臣妾备了些亲手做的小点心，想分给宫里的孩子们。只是不知这样合不合规矩。',
    tags: ['festival', 'child'],
    choices: [
      { id: 'allow-distribute', label: '准许她分发', reply: '皇帝说这点小事不必拘谨，孩子们也会欢喜。' },
      { id: 'remind-propriety', label: '嘱她分寸', reply: '皇帝提醒她施恩要自然，不必过分张扬。' },
    ],
  },
  {
    id: 'consort-daily-cat-visit', kind: 'CONSORT',
    text: '前儿御花园里的小狸奴又来了，蹲在臣妾窗阶下不肯走。臣妾让人给它喂了些吃食。',
    tags: ['daily'],
    choices: [
      { id: 'let-her-keep', label: '让她留下便是', reply: '皇帝说若是她喜欢，便让这只猫常来也无妨。' },
      { id: 'warn-clean', label: '嘱人打扫干净', reply: '皇帝提醒她猫虽可爱，也要让宫人留意殿内洁净。' },
    ],
  },
  {
    id: 'consort-daily-quiet-blessing', kind: 'CONSORT',
    text: '臣妾每日抄几页经，不为别的，只愿宫里少些风波，孩子们都能平安长大。',
    tags: ['daily', 'extendable'],
    choices: [
      { id: 'appreciate-her-wish', label: '赞许她心意', reply: '皇帝说这样的心思难得，愿她所愿成真。' },
      { id: 'sit-quietly', label: '陪她静一会儿', reply: '皇帝没有多说什么，只在殿中陪她坐了片刻。' },
    ],
  },
  {
    id: 'consort-lonely-lamp', kind: 'CONSORT',
    text: '殿中烛火摇曳，臣妾独坐良久。近来陛下甚少踏足此处，对着满室器物，只觉处处清冷。',
    tags: ['daily', 'rivalry'],
    choices: [
      { id: 'console-lonely', label: '温言抚慰', reply: '皇帝出言宽慰，妃嫔眉眼间的落寞稍稍散去。' },
      { id: 'promise-visit-soon', label: '许诺多来', reply: '皇帝许诺往后会常来走动，妃嫔屈膝谢恩。' },
    ],
  },
  {
    id: 'consort-sick-frail', kind: 'CONSORT',
    text: '臣妾近来总觉头目昏沉，太医开了方子，服药多日仍不见大好。身子这般模样，连侍奉陛下都力不从心。',
    tags: ['daily'],
    choices: [
      { id: 'order-more-doctor', label: '再召太医会诊', reply: '皇帝命太医院多名太医一同会诊，重新斟酌药方。' },
      { id: 'tell-rest', label: '安心静养', reply: '皇帝嘱她放下宫中琐事，只管安心休养，不必勉强侍驾。' },
    ],
  },
  {
    id: 'consort-family-decline', kind: 'CONSORT',
    text: '家中寄来密信，父兄在朝中遭人弹劾，门第眼看日渐衰败。臣妾身居宫中，却什么也做不了，心中惶惶不安。',
    tags: ['relationship'],
    choices: [
      { id: 'check-case', label: '派人核查案情', reply: '皇帝命人核实弹劾缘由，分辨虚实曲直。' },
      { id: 'warn-boundary', label: '告诫不可干政', reply: '皇帝劝慰她安分守己，外朝之事自有国法朝纲决断。' },
    ],
  },
  {
    id: 'consort-other-consort-birth', kind: 'CONSORT',
    text: '听闻另一位小主诞下皇子，六宫皆在庆贺。臣妾心中固然该道喜，可心底难免生出几分难言滋味。',
    tags: ['rivalry', 'relationship'],
    choices: [
      { id: 'enjoin-magnanimous', label: '劝她心胸豁达', reply: '皇帝开导她后宫当和乐，不必心生芥蒂。' },
      { id: 'send-gift-together', label: '命她一同送礼道贺', reply: '皇帝命她备一份贺礼前去道喜，成全六宫体面。' },
    ],
  },
  {
    id: 'consort-recommend-relative', kind: 'CONSORT',
    text: '臣妾族中有一位妹妹，品性温婉，如今正值芳华。臣妾斗胆，不知可否举荐她入宫伴驾？',
    tags: ['relationship'],
    choices: [
      { id: 'submit-to-selection', label: '归入选秀名册', reply: '皇帝命将其归入选秀，待礼部统一甄选。' },
      { id: 'refuse-recommend', label: '婉言回绝', reply: '皇帝告诉她选秀自有制度，不可私下举荐，请她理解。' },
    ],
  },
  {
    id: 'consort-palace-gossip-target', kind: 'CONSORT',
    text: '近日宫中人言纷纷，编造了好些关于臣妾的闲话，传得绘声绘色。臣妾未曾做过那些事，却百口莫辩。',
    tags: ['palaceStrife'],
    choices: [
      { id: 'punish-gossip', label: '追查流言源头', reply: '皇帝命内侍严查散播流言的宫人，加以惩治。' },
      { id: 'ignore-rumor', label: '清者自清', reply: '皇帝劝慰她不必为闲言损耗心神，日久是非自明。' },
    ],
  },
  {
    id: 'consort-cold-food-festival', kind: 'CONSORT',
    text: '寒食节至，宫中禁烟火。臣妾备了冷食与新柳，想请陛下过来小坐，聊一聊追思先人之事。',
    tags: ['festival'],
    choices: [
      { id: 'stay-cold-food', label: '入内小坐', reply: '皇帝入殿共食寒食，殿内气氛安静肃穆。' },
      { id: 'send-offering', label: '赐下祭祀供品', reply: '皇帝不便久留，命人送来祭祀用的供品以示体恤。' },
    ],
  },
  {
    id: 'consort-qixi-pray', kind: 'CONSORT',
    text: '七夕乞巧，臣妾在院中设下香案，向织女星祈愿。既盼手艺精进，也愿宫中少些风波。陛下可愿驻足一观？',
    tags: ['festival'],
    choices: [
      { id: 'watch-pray', label: '陪她乞巧', reply: '皇帝立于廊下，看她焚香拜月，夜色温柔。' },
      { id: 'gift-silk', label: '赏赐锦缎', reply: '皇帝赏赐上等锦缎，供她做乞巧之用。' },
    ],
  },
  {
    id: 'consort-double-ninth', kind: 'CONSORT',
    text: '重阳佳节，遍插茱萸。臣妾采了茱萸枝，想送给宫中各位姐妹，盼岁岁平安无灾。',
    tags: ['festival'],
    choices: [
      { id: 'support-distribute', label: '支持她分发', reply: '皇帝赞许这份心意，命宫人协助她分发茱萸。' },
      { id: 'remind-courtesy', label: '叮嘱恪守礼数', reply: '皇帝叮嘱她行事不可逾矩，顾及位份尊卑。' },
    ],
  },
  {
    id: 'consort-servant-misbehave', kind: 'CONSORT',
    text: '臣妾身边贴身宫女私下与外宫往来，今日被臣妾撞破。念在伺候多年，心中不忍重罚，却又不能纵容。',
    tags: ['palaceStrife', 'daily'],
    choices: [
      { id: 'transfer-servant', label: '调离宫中', reply: '皇帝裁定将这名宫女调离此处，另派别处当差。' },
      { id: 'severe-punish', label: '按宫规处置', reply: '皇帝告诫宫规不可轻废，应当依律惩戒以儆效尤。' },
    ],
  },
  {
    id: 'consort-dream-old-home', kind: 'CONSORT',
    text: '昨夜臣妾梦回旧时闺阁，见到家中庭院草木，醒来之后怅然许久。入宫之后，归期遥遥。',
    tags: ['daily', 'relationship'],
    choices: [
      { id: 'letter-home', label: '允她书信传家', reply: '皇帝准许她多多寄信回乡，慰藉思乡之情。' },
      { id: 'comfort-memory', label: '温言宽慰', reply: '皇帝耐心宽慰，深宫虽拘束，亦自有安稳之处。' },
    ],
  },
  {
    id: 'consort-fear-palace-fight', kind: 'CONSORT',
    text: '六宫风波不断，尔虞我诈层出不穷。臣妾每每看见争斗，心中便生出畏惧，只想远远避开这些是非。',
    tags: ['palaceStrife'],
    choices: [
      { id: 'protect-her', label: '朕会护你', reply: '皇帝许诺会护她周全，不必被迫卷入纷争。' },
      { id: 'teach-caution', label: '教她谨言慎行', reply: '皇帝教她少听闲话，谨言慎行便是自保之道。' },
    ],
  },
  {
    id: 'consort-want-retreat-buddha', kind: 'CONSORT',
    text: '臣妾厌倦了后宫纷扰，时常想着闭门礼佛，不问六宫俗事，只求内心安宁。',
    tags: ['daily', 'extendable'],
    choices: [
      { id: 'permit-buddha', label: '准许礼佛修行', reply: '皇帝准许她在宫内辟静室礼佛，不强迫她参与诸多宫宴应酬。' },
      { id: 'persuade-stay', label: '劝她不必避世', reply: '皇帝劝导她身在宫中，难以全然隔绝世事，但可寻得片刻清净。' },
    ],
  },
  {
    id: 'consort-child-disobedient', kind: 'CONSORT',
    text: '孩儿日渐长大，性子愈发顽劣，师傅规劝也不甚听从。臣妾严加管教，心中又怕管束太过伤了母子情分。',
    tags: ['child'],
    choices: [
      { id: 'joint-discipline', label: '帝妃一同管教', reply: '皇帝愿意与她一同训导皇嗣，严慈相济。' },
      { id: 'trust-tutor', label: '托付师傅严加教诲', reply: '皇帝嘱咐应当信任师傅教导，不可一味溺爱。' },
    ],
  },
  {
    id: 'consort-gift-rejected', kind: 'CONSORT',
    text: '臣妾精心备下礼物想去拜访另一位小主，礼物却被对方退回。臣妾不知究竟何处得罪了人，满心困惑。',
    tags: ['rivalry', 'relationship'],
    choices: [
      { id: 'inquire-reason', label: '派人打探缘由', reply: '皇帝命人悄悄打听退礼背后的缘由。' },
      { id: 'let-it-go', label: '不必强求往来', reply: '皇帝劝她不必强求交好，各安本分即可。' },
    ],
  },
  {
    id: 'consort-encounter-conflict', kind: 'CONSORT',
    text: '方才在御花园偶遇别的妃嫔，双方言语不和，险些起了争执。臣妾不愿当众失仪，只得先行退开，心中郁郁。',
    tags: ['palaceStrife', 'rivalry'],
    choices: [
      { id: 'call-both-talk', label: '召二人训诫', reply: '皇帝将二人一并传来，训诫后宫应当和睦相处。' },
      { id: 'console-after', label: '私下安抚', reply: '皇帝私下宽慰她，夸赞她顾全大体，不必置气。' },
    ],
  },
  {
    id: 'consort-catch-cold', kind: 'CONSORT',
    text: '昨夜开窗乘凉，不慎染了风寒，浑身酸痛咳嗽不止。臣妾不想将病气过给陛下，不敢近身侍奉。',
    tags: ['daily'],
    choices: [
      { id: 'send-physician', label: '遣太医诊治', reply: '皇帝即刻派遣太医前来诊治，叮嘱她安心隔离休养。' },
      { id: 'send-supplies', label: '赏赐药材补品', reply: '皇帝赏赐药材补品，命宫人好生伺候起居。' },
    ],
  },
  {
    id: 'consort-envy-common-life', kind: 'CONSORT',
    text: '臣妾偶尔听出宫归来的宫人说起民间寻常人家，夫妻朝夕相伴，烟火平淡。深宫荣华在身，却反倒羡慕那样的日子。',
    tags: ['daily', 'relationship'],
    choices: [
      { id: 'sympathize-feeling', label: '共情她心绪', reply: '皇帝理解她心中感慨，陪她闲话片刻消解愁绪。' },
      { id: 'remind-destiny', label: '诉说身不由己', reply: '皇帝叹息身在宫闱，各有宿命，各有得失。' },
    ],
  },
  {
    id: 'consort-urge-emperor-diligent', kind: 'CONSORT',
    text: '臣妾虽是妇人不该妄议朝政，可看见陛下夜夜批阅奏折到深夜，既心疼陛下劳苦，也愿陛下始终勤政清明。',
    tags: ['relationship'],
    choices: [
      { id: 'grateful-remind', label: '感念她挂念', reply: '皇帝感念她一片心意，答应会保重自身。' },
      { id: 'share-work-talk', label: '与她略说政务', reply: '皇帝简单说起朝局事务，与她闲谈片刻舒缓疲惫。' },
    ],
  },
  {
    id: 'consort-anonymous-parcel', kind: 'CONSORT',
    text: '今日宫中有匿名物件送入臣妾宫中，不知何人所赠，物件看着古怪，臣妾不敢擅自动用，特来禀报陛下。',
    tags: ['palaceStrife'],
    choices: [
      { id: 'examine-object', label: '拿来查验', reply: '皇帝命人将物件取来，交由太医院与内侍一同查验。' },
      { id: 'burn-directly', label: '直接焚毁', reply: '皇帝下令不必查验，直接焚毁此物，不许再议论。' },
    ],
  },
  {
    id: 'consort-greeting', kind: 'CONSORT',
    text: '臣妾今日抄经焚香，心里很是安宁。陛下若不嫌清静，便坐一会儿吧。', tags: ['daily', 'extendable'],
    choices: [
      { id: 'stay', label: '留下片刻', reply: '皇帝在她宫中坐了片刻，听她说起近日读的经书。' },
      { id: 'encourage', label: '宽慰几句', reply: '皇帝温言宽慰，妃嫔心情有所好转。' },
    ],
  },
  {
    id: 'consort-tea', kind: 'CONSORT',
    text: '新贡的春茶已经到了，臣妾命人留了一盏。茶不算名贵，却是今年头一遭的鲜味。', tags: ['daily'],
    choices: [
      { id: 'taste', label: '尝一尝', reply: '皇帝与她共品新茶，关系更显亲近。' },
      { id: 'gift-tea', label: '赏宫人', reply: '皇帝命人将好茶分赏六宫，妃嫔称颂圣意。' },
    ],
  },
  {
    id: 'consort-garden-rumor', kind: 'CONSORT',
    text: '臣妾今日在御花园听见几句闲话，似乎有人借着花宴打听宫中账册。此事要不要细查？', tags: ['relationship'],
    choices: [
      { id: 'investigate', label: '命人细查', reply: '皇帝命内侍暗中查访花宴来客，记下一桩待查线索。' },
      { id: 'keep-secret', label: '暂且按下', reply: '皇帝暂不声张，只让她留心身边往来。' },
    ],
  },
  {
    id: 'consort-letter', kind: 'CONSORT',
    text: '臣妾收到家中一封信，母亲病后已渐有起色，只是兄长在外任上似乎遇到了一点难处。', tags: ['relationship'],
    choices: [
      { id: 'ask-detail', label: '问清原委', reply: '皇帝问明外任详情，准许内务府酌情协助。' },
      { id: 'comfort', label: '好生宽慰', reply: '皇帝宽慰她安心侍奉，家中消息自会继续呈报。' },
    ],
  },
  {
    id: 'consort-moon', kind: 'CONSORT',
    text: '夜里月色很好，臣妾却不敢独自去看。若陛下得闲，愿陪臣妾在廊下坐坐。', tags: ['daily'],
    choices: [
      { id: 'watch-moon', label: '廊下赏月', reply: '皇帝陪她在廊下赏月，夜色与心绪都安静下来。' },
      { id: 'rest', label: '早些安歇', reply: '皇帝嘱她保重身子，命宫人早早熄灯。' },
    ],
  },
  {
    id: 'consort-needlework', kind: 'CONSORT',
    text: '臣妾替陛下绣了一方香囊，只是针脚还不够细密，不知陛下可愿收下？', tags: ['relationship'],
    choices: [
      { id: 'accept', label: '欣然收下', reply: '皇帝收下香囊，妃嫔欢喜，亲近有所增加。' },
      { id: 'praise', label: '夸她用心', reply: '皇帝称赞她用心，妃嫔将这句话记在心上。' },
    ],
  },
  {
    id: 'consort-festival', kind: 'CONSORT',
    text: '节下六宫都在备宴，臣妾想为宫中添一场小戏，不求铺张，只愿让姐妹们都松快些。', tags: ['festival'],
    choices: [
      { id: 'approve', label: '准她操办', reply: '皇帝准许她量力操办小宴，六宫节庆气氛更和乐。' },
      { id: 'save-cost', label: '从简为宜', reply: '皇帝命她从简筹备，将节省的银钱留作宫人赏赐。' },
    ],
  },
  {
    id: 'consort-six-palace', kind: 'CONSORT',
    text: '近来六宫琐事不少，臣妾愿替皇后分担，只怕自己阅历尚浅，反而误了规矩。', tags: ['relationship'],
    choices: [
      { id: 'entrust', label: '放心去做', reply: '皇帝勉励她谨守章程，准其协理部分宫务。' },
      { id: 'ask-empress', label: '先问皇后', reply: '皇帝让她先与皇后商议，避免六宫各自为政。' },
    ],
  },
  {
    id: 'consort-pregnant-care', kind: 'CONSORT',
    text: '太医说脉象已经稳了，臣妾本该高兴，却总怕一不小心惊动腹中孩子。', tags: ['pregnant'],
    choices: [
      { id: 'reassure', label: '安心养胎', reply: '皇帝命太医每日请脉，宽慰她不必忧惧。' },
      { id: 'share-worry', label: '朕听你说', reply: '皇帝耐心听她说完忧虑，妃嫔心绪渐渐平静。' },
    ],
  },
  {
    id: 'consort-pregnant-craving', kind: 'CONSORT',
    text: '臣妾这几日忽然想吃酸梅，又怕劳烦御膳房。若陛下允准，想请他们做一小碟。', tags: ['pregnant'],
    choices: [
      { id: 'allow', label: '即刻传膳', reply: '皇帝准御膳房照着她的口味备膳，并嘱咐不可过量。' },
      { id: 'ask-doctor', label: '先问太医', reply: '皇帝让太医先看饮食宜忌，再决定是否传膳。' },
    ],
  },
  {
    id: 'consort-pregnant-dream', kind: 'CONSORT',
    text: '臣妾昨夜梦见一盏灯落在水面，醒来后心里惴惴不安。太医说这是胎梦，臣妾却还是想听陛下一句。', tags: ['pregnant'],
    choices: [
      { id: 'auspicious', label: '定是吉兆', reply: '皇帝说梦中灯火象征祥瑞，她听后展颜。' },
      { id: 'no-omens', label: '莫信梦兆', reply: '皇帝劝她不必多想，只管安心养胎。' },
    ],
  },
  {
    id: 'consort-postpartum', kind: 'CONSORT',
    text: '孩子睡下了，臣妾才觉得身上乏得厉害。能平安把他生下来，已是上天垂怜。', tags: ['postpartum'],
    choices: [
      { id: 'praise-mother', label: '辛苦你了', reply: '皇帝亲口道谢，命她安心休养，不必急着理宫务。' },
      { id: 'see-child', label: '朕去看看', reply: '皇帝轻步看望新生皇嗣，母子关系与帝王喜悦都得到记录。' },
    ],
  },
  {
    id: 'consort-postpartum-name', kind: 'CONSORT',
    text: '臣妾想亲自为孩子抄一卷平安经，愿他一生少些风雨，多些安稳。', tags: ['postpartum', 'relationship'],
    choices: [
      { id: 'permit', label: '准你所愿', reply: '皇帝准她抄经祈福，并命宫人照料她的产后起居。' },
      { id: 'rest-first', label: '先养好身', reply: '皇帝劝她先养好身子，祈福之事不必急于一时。' },
    ],
  },
  {
    id: 'consort-child-education', kind: 'CONSORT',
    text: '孩子近来会认字了，虽然只会几笔，却日日追着师傅问。臣妾想让他多读些《孝经》。', tags: ['child'],
    choices: [
      { id: 'approve-study', label: '依你安排', reply: '皇帝准许先从孝经启蒙，记入皇嗣教养安排。' },
      { id: 'balance-play', label: '劳逸相济', reply: '皇帝嘱咐课业与玩乐并重，不许小小年纪便过于拘束。' },
    ],
  },
  {
    id: 'consort-jealousy', kind: 'CONSORT',
    text: '臣妾听说陛下近来常去别宫，本不该多问，只是心里难免有一点酸楚。', tags: ['relationship'],
    choices: [
      { id: 'explain', label: '耐心解释', reply: '皇帝向她说明近日日程，妃嫔的疑虑稍稍消解。' },
      { id: 'change-topic', label: '说些旁的', reply: '皇帝将话题转到她的起居，暂时避开六宫争宠。' },
    ],
  },
  {
    id: 'consort-poem', kind: 'CONSORT',
    text: '臣妾新得一句诗：“花影不随人意改。”不知陛下听来，是不是有些太伤春了？', tags: ['daily'],
    choices: [
      { id: 'continue-poem', label: '续上一句', reply: '皇帝为她续诗一句，她将诗稿珍重收好。' },
      { id: 'praise', label: '夸她有才', reply: '皇帝称赞她才思清丽，妃嫔心情明朗起来。' },
    ],
  },
  {
    id: 'consort-music', kind: 'CONSORT',
    text: '臣妾近来学了一支新曲，原是江南小令，今夜月色甚好，想为陛下抚琴一曲。', tags: ['daily'],
    choices: [
      { id: 'listen', label: '静听一曲', reply: '皇帝在月下听她抚琴，曲罢还索了一盏茶。' },
      { id: 'praise-talent', label: '赞她多才', reply: '皇帝赞她琴艺精进，她含笑谢恩。' },
    ],
  },
  {
    id: 'consort-rain-essay', kind: 'CONSORT',
    text: '今晨忽降骤雨，臣妾坐在窗前看了半日檐下水珠，竟起了几句拙词，写在笺上请陛下过目。', tags: ['daily'],
    choices: [
      { id: 'read', label: '取来一观', reply: '皇帝取来细看，称赞其清丽雅致。' },
      { id: 'comment', label: '与她和诗', reply: '皇帝提笔和了一首，妃嫔记下与诗稿一同收好。' },
    ],
  },
  {
    id: 'consort-cat', kind: 'CONSORT',
    text: '御花园里不知谁家走失的小猫，怯生生地蹲在花丛中。臣妾想把它抱回宫中养几日，不知陛下准不准？', tags: ['daily'],
    choices: [
      { id: 'allow', label: '准她收养', reply: '皇帝准许她留下小猫，叮嘱小心别让它跑进御膳房。' },
      { id: 'return', label: '送回原处', reply: '皇帝命人将小猫送回原处，妃嫔有些失落但仍应下。' },
    ],
  },
  {
    id: 'consort-brother', kind: 'CONSORT',
    text: '臣妾的兄长在外任上，似与同僚有些不睦。臣妾不敢妄议朝政，只是心里挂念。', tags: ['relationship'],
    choices: [
      { id: 'investigate', label: '命人过问', reply: '皇帝命内侍省了解详情，若无大过便从中调和。' },
      { id: 'teach', label: '教她安心', reply: '皇帝宽慰她朝中有章法，外任之事自有督抚把关。' },
    ],
  },
  {
    id: 'consort-mother-illness', kind: 'CONSORT',
    text: '家中来信说母亲染了时令小恙，已延医调养。臣妾想抄一卷经为母亲祈福，不知宫里可方便？', tags: ['relationship'],
    choices: [
      { id: 'permit', label: '准她抄经', reply: '皇帝准许她抄经祈福，并命人代为问候其母。' },
      { id: 'visit', label: '准她省亲', reply: '皇帝酌情准她短时省亲探望，她含泪谢恩。' },
    ],
  },
  {
    id: 'consort-friend-visit', kind: 'CONSORT',
    text: '臣妾闺中好友嫁入京中，她递了帖子想进宫一见。臣妾不知这请求是否逾矩，还请陛下示下。', tags: ['relationship'],
    choices: [
      { id: 'permit-meeting', label: '准她相见', reply: '皇帝准许她与故交小聚片刻，并命内侍妥善安排。' },
      { id: 'advise', label: '让她谨慎', reply: '皇帝提醒她宫中相见需注意分寸，避免落人口实。' },
    ],
  },
  {
    id: 'consort-precipice', kind: 'CONSORT',
    text: '臣妾昨夜梦见自己跌下悬崖，惊醒时冷汗湿透了衣裳。是否腹中孩儿有不安之兆？', tags: ['pregnant'],
    choices: [
      { id: 'send-doctor', label: '即传太医', reply: '皇帝立刻传太医为她请脉，确无大碍。' },
      { id: 'comfort', label: '温言宽慰', reply: '皇帝温言宽慰，梦中惊恐不作数，命人送安神汤来。' },
    ],
  },
  {
    id: 'consort-avoid-food', kind: 'CONSORT',
    text: '太医嘱咐这几日少吃寒凉之物，可臣妾就是馋那一碗冰碗酥山。若陛下准许，臣妾少用一些可好？', tags: ['pregnant'],
    choices: [
      { id: 'forbid', label: '依医嘱禁', reply: '皇帝劝她以孩子为重，冰食暂且放下。' },
      { id: 'gentle-deal', label: '准她用一点', reply: '皇帝准许她浅尝即止，并嘱宫人不可多用。' },
    ],
  },
  {
    id: 'consort-nickname', kind: 'CONSORT',
    text: '臣妾想给孩子先起个小名乳名，等大名定下再改也来得及。可臣妾想了几个都觉得俗，不知陛下可有中意的？', tags: ['pregnant'],
    choices: [
      { id: 'pick', label: '朕来起', reply: '皇帝沉吟片刻，给孩子取了一个寄托期望的小名。' },
      { id: 'leave', label: '让你定', reply: '皇帝让妃嫔先自己起一个，等满月再议大名。' },
    ],
  },
  {
    id: 'consort-postpartum-friend', kind: 'CONSORT',
    text: '臣妾月子里闷得慌，听闻从前一同入宫的小姐妹快要生产。臣妾想去探望，不知合不合规矩？', tags: ['postpartum', 'relationship'],
    choices: [
      { id: 'allow-visit', label: '派人代劳', reply: '皇帝准许她派人送礼物去，并让她安心将养。' },
      { id: 'forbid', label: '让她再歇', reply: '皇帝劝她身子未稳，探视之事容后再议。' },
    ],
  },
  {
    id: 'consort-postpartum-pediatrics', kind: 'CONSORT',
    text: '太医说孩子近日有些积食，臣妾心疼得不行，半夜里也守在旁边不敢合眼。', tags: ['postpartum'],
    choices: [
      { id: 'arrange-care', label: '派嬷嬷帮', reply: '皇帝命有经验的嬷嬷轮班照料，妃嫔稍得歇息。' },
      { id: 'comfort', label: '安慰她心', reply: '皇帝温言宽慰，小儿积食常见，不必过于担忧。' },
    ],
  },
  {
    id: 'consort-child-tear', kind: 'CONSORT',
    text: '孩子今日摔了一跤，哭了好半天才止住。臣妾把他抱在怀里哄着，心里又气又疼。', tags: ['child'],
    choices: [
      { id: 'check-injury', label: '传太医看', reply: '皇帝命太医检查孩子伤处，确认无大碍才放心。' },
      { id: 'soothe', label: '陪她哄', reply: '皇帝接过孩子逗弄片刻，孩子破涕为笑。' },
    ],
  },
  {
    id: 'consort-child-reading', kind: 'CONSORT',
    text: '孩子今日会念三字经了，臣妾高兴得多给了他一块糖。可师傅说糖吃多了坏牙，臣妾拿不定主意。', tags: ['child'],
    choices: [
      { id: 'praise-balance', label: '奖罚有度', reply: '皇帝赞许她的疼爱之心，并嘱咐以书代糖。' },
      { id: 'set-rule', label: '定下规矩', reply: '皇帝让她与师傅商量，定下奖赏的具体规矩。' },
    ],
  },
  {
    id: 'consort-jealousy-complaint', kind: 'CONSORT',
    text: '陛下这半月去别宫的日子多了，臣妾本不该多言，只是夜里独对灯花，难免落寞。', tags: ['rivalry'],
    choices: [
      { id: 'promise-visit', label: '答应近日留', reply: '皇帝答应近日多留片刻，并嘱宫人留意她的起居。' },
      { id: 'explain-busy', label: '解释公务', reply: '皇帝耐心解释近日差事繁忙，请她再忍耐些时日。' },
    ],
  },
  {
    id: 'consort-rival-petty', kind: 'CONSORT',
    text: '臣妾听闻李妃那边新绣的香囊花样新颖，臣妾便想：是否该去讨一只来瞧瞧？免得落于人后。', tags: ['rivalry'],
    choices: [
      { id: 'soothe', label: '不必挂怀', reply: '皇帝宽慰她各有各的好处，不必与人攀比。' },
      { id: 'gift-her', label: '赏她新样', reply: '皇帝让内务府给她也送一份新样香囊，她转忧为喜。' },
    ],
  },
  {
    id: 'consort-rival-petition', kind: 'CONSORT',
    text: '臣妾听宫人闲话，说李妃那边递了请安折子求见陛下。臣妾没别的意思，只是想知道陛下作何安排。', tags: ['rivalry'],
    choices: [
      { id: 'schedule', label: '公允轮次', reply: '皇帝答允按六宫轮次有序相见，请她放心。' },
      { id: 'refuse-other', label: '先留此处', reply: '皇帝答允今日先留在她这里，请她先安心。' },
    ],
  },
  {
    id: 'consort-faction-rumor', kind: 'CONSORT',
    text: '臣妾偶然听见几个宫人低声议论王贵妃的母亲在外头放贷敛财，这事不知真假，臣妾不敢乱传。', tags: ['palaceStrife'],
    choices: [
      { id: 'investigate', label: '暗中彻查', reply: '皇帝命亲信暗中彻查此事，告诫她不要声张。' },
      { id: 'warn-her', label: '提醒她勿传', reply: '皇帝命她守口如瓶，并告诫她不要与王贵妃正面交锋。' },
    ],
  },
  {
    id: 'consort-faction-medicine', kind: 'CONSORT',
    text: '臣妾无意中发现李妃私下让宫女煎药，那气味闻起来不寻常，又不敢当面质问。', tags: ['palaceStrife'],
    choices: [
      { id: 'sample', label: '取药验看', reply: '皇帝命太医院取少许样品化验，再做定夺。' },
      { id: 'distract', label: '暗中监视', reply: '皇帝命心腹暗中监视李妃的起居，先不惊动。' },
    ],
  },
  {
    id: 'consort-faction-photos', kind: 'CONSORT',
    text: '臣妾听说陈妃与王贵妃近来同进同出，似有结盟之势。臣妾本想置身事外，可若她们联手，后宫格局将改。', tags: ['palaceStrife'],
    choices: [
      { id: 'counter-faction', label: '从中制衡', reply: '皇帝让她设法接近其中一人，从内部化解。' },
      { id: 'leave-alone', label: '暂不理会', reply: '皇帝让她先静观其变，无实据不宜打草惊蛇。' },
    ],
  },
  {
    id: 'consort-faction-favor-curse', kind: 'CONSORT',
    text: '臣妾的小厨房里送来的燕窝，最近总有一股异味。臣妾不敢再用，可又怕惊动背后的人。', tags: ['palaceStrife'],
    choices: [
      { id: 'switch-source', label: '换膳房送', reply: '皇帝暗中将她的膳食改由御膳房直接送，秘密查验燕窝。' },
      { id: 'set-trap', label: '设套诱敌', reply: '皇帝命人暗中追查燕窝来源，揪出幕后之人。' },
    ],
  },
  {
    id: 'consort-festival-dragon', kind: 'CONSORT',
    text: '上元节将至，臣妾想给陛下亲手扎一只花灯，灯上写上"百福千祥"四个字。不知陛下可愿赏脸？', tags: ['festival'],
    choices: [
      { id: 'accept', label: '欣然期待', reply: '皇帝欣然期待，并嘱她早做准备。' },
      { id: 'join', label: '与她同制', reply: '皇帝答应与她一起动手扎花灯，共享上元之乐。' },
    ],
  },
  {
    id: 'consort-festival-midautumn', kind: 'CONSORT',
    text: '中秋将至，臣妾想请陛下在宫中设一小宴，只邀几位相熟的姐妹来坐坐，免得节下太冷清。', tags: ['festival'],
    choices: [
      { id: 'approve-banquet', label: '准她筹办', reply: '皇帝准许她筹办小宴，并嘱咐她从简不可逾制。' },
      { id: 'join-large', label: '改大宴', reply: '皇帝决定改作六宫大宴，让节庆气氛更浓。' },
    ],
  },
];

const princeDialogues: DialogueScene[] = [
  {
    id: 'prince-study', kind: 'PRINCE',
    text: '儿臣今日读到史书中几位先贤争论治水，觉得各有道理，想请父皇说说该如何取舍。', tags: ['study'], minAge: 13,
    choices: [
      { id: 'ask-reason', label: '先说你想法', reply: '皇帝让皇嗣先陈述见解，再从中点拨治国取舍。' },
      { id: 'explain', label: '细说一番', reply: '皇帝亲自讲解治水之道，皇嗣记下今日所学。' },
    ],
  },
  {
    id: 'prince-calligraphy', kind: 'PRINCE',
    text: '儿臣临了半日字，腕子还有些酸，可师傅说横平竖直最见心性。父皇看看这幅字可好？', tags: ['study'], minAge: 7,
    choices: [
      { id: 'praise-progress', label: '夸他有进步', reply: '皇帝指出笔画进步之处，皇嗣信心增加。' },
      { id: 'correct-stroke', label: '指出不足', reply: '皇帝指出一处运笔不足，皇嗣答应明日重练。' },
    ],
  },
  {
    id: 'prince-riding', kind: 'PRINCE',
    text: '儿臣今日在演武场学骑射，第一箭偏了半寸。师傅说不可急躁，儿臣却想再试一次。', tags: ['study'], minAge: 7,
    choices: [
      { id: 'allow-practice', label: '准你再试', reply: '皇帝准许他在侍卫看护下再练一轮，记入武课。' },
      { id: 'rest', label: '先歇一歇', reply: '皇帝让他先歇息，提醒习武贵在循序渐进。' },
    ],
  },
  {
    id: 'prince-mother', kind: 'PRINCE',
    text: '儿臣今日去给母妃请安，她说父皇政务繁忙。父皇近来是不是很累？', tags: ['relationship'], minAge: 4,
    choices: [
      { id: 'reassure-child', label: '说朕无妨', reply: '皇帝告诉皇嗣自己无妨，孩子安心不少。' },
      { id: 'ask-mother', label: '替朕问安', reply: '皇帝请皇嗣代为问候母妃，母子关系得到记录。' },
    ],
  },
  {
    id: 'prince-fear', kind: 'PRINCE',
    text: '儿臣听见宫人议论朝中争执，心里有些害怕。将来若遇到这样的事，儿臣该站在哪一边？', tags: ['relationship'], minAge: 13,
    choices: [
      { id: 'teach-justice', label: '教他守正', reply: '皇帝教导他以事实与百姓为先，不可只看一时亲疏。' },
      { id: 'keep-learning', label: '先读书吧', reply: '皇帝让他先读史明理，待年长后再议朝局。' },
    ],
  },
  {
    id: 'prince-garden', kind: 'PRINCE',
    text: '御花园的海棠开了，儿臣想带母妃去看，又怕耽误她的宫务。父皇觉得可行吗？', tags: ['daily'], minAge: 4,
    choices: [
      { id: 'permit-outing', label: '准你相邀', reply: '皇帝准许母子同游，并命侍卫随行护卫。' },
      { id: 'choose-rest', label: '改日再去', reply: '皇帝让他先问母妃是否得闲，不可强求。' },
    ],
  },
  {
    id: 'prince-festival', kind: 'PRINCE',
    text: '节宴上各位兄弟都要献艺，儿臣想朗诵一篇文章，不知会不会让父皇失望。', tags: ['festival'], minAge: 7,
    choices: [
      { id: 'encourage', label: '放手去做', reply: '皇帝鼓励他按自己的长处献艺，勿以输赢论心。' },
      { id: 'practice', label: '先练熟些', reply: '皇帝让他再练几遍，准备充分后再登席。' },
    ],
  },
  {
    id: 'prince-sibling', kind: 'PRINCE',
    text: '儿臣听说弟弟最近病了，想把自己的玉佩送给他压惊，可以吗？', tags: ['relationship'], minAge: 4,
    choices: [
      { id: 'allow-gift', label: '准你相赠', reply: '皇帝准许皇嗣赠物，并命太医继续照看年幼皇嗣。' },
      { id: 'visit-sibling', label: '亲自探望', reply: '皇帝让他亲自去探望弟弟，兄弟关系更加亲近。' },
    ],
  },
  {
    id: 'prince-question', kind: 'PRINCE',
    text: '师傅说为君者要先学会听不同的声音。可若人人都说得不一样，父皇如何判断谁是对的？', tags: ['study'], minAge: 13,
    choices: [
      { id: 'teach-evidence', label: '教他察证', reply: '皇帝教导他以证据、结果与民情相互印证。' },
      { id: 'ask-counter', label: '反问于他', reply: '皇帝反问几个实例，让皇嗣自己推演答案。' },
    ],
  },
  {
    id: 'prince-ambition', kind: 'PRINCE',
    text: '儿臣不愿只做一个循规蹈矩的人，也想有朝一日替父皇分忧。只是这话说出来，会不会太早？', tags: ['adult'], minAge: 13,
    choices: [
      { id: 'set-task', label: '交一件差事', reply: '皇帝交给他一件力所能及的差事，让他从实践中学习。' },
      { id: 'steady-heart', label: '先稳心性', reply: '皇帝提醒他志向可贵，却须先把学问与心性打牢。' },
    ],
  },
  {
    id: 'prince-marriage', kind: 'PRINCE',
    text: '近来宫人悄悄议论婚配之事，儿臣还未想好将来要与怎样的人相伴。父皇会替儿臣定夺吗？', tags: ['adult'], minAge: 13,
    choices: [
      { id: 'promise-choice', label: '听你心意', reply: '皇帝答应先听取皇嗣心意，再交礼部议配。' },
      { id: 'learn-ritual', label: '先学礼制', reply: '皇帝让他先了解婚配礼制，待成年后再正式议定。' },
    ],
  },
  {
    id: 'prince-crown', kind: 'PRINCE',
    text: '儿臣听见有人称赞兄长，也有人拿我们比较。儿臣不想与兄弟争，只想把自己的功课做好。', tags: ['relationship'], minAge: 13,
    choices: [
      { id: 'praise-peace', label: '难得谦和', reply: '皇帝赞许其不争之心，叮嘱兄弟之间当彼此成全。' },
      { id: 'teach-responsibility', label: '记住本分', reply: '皇帝提醒他守好本分，日后以才德和实绩自证。' },
    ],
  },
  {
    id: 'prince-book', kind: 'PRINCE',
    text: '儿臣在御书房发现一本旧舆图，标注了许多已经改道的河流。若父皇准许，儿臣想照着新旧舆图做一份比较。', tags: ['study'], minAge: 13,
    choices: [
      { id: 'approve-map', label: '准你研读', reply: '皇帝准许他研读旧舆图，并命文华殿找人协助校勘。' },
      { id: 'ask-teacher', label: '先问师傅', reply: '皇帝让他先请教师傅，确认舆图来源后再继续。' },
    ],
  },
  {
    id: 'prince-nightmare', kind: 'PRINCE',
    text: '儿臣昨夜梦见宫门落锁，醒来后总觉得胸口发闷。师傅说只是梦，儿臣还是想听父皇说一句。', tags: ['daily'], minAge: 4,
    choices: [
      { id: 'comfort-child', label: '不必多虑', reply: '皇帝安慰他梦境不作数，命人送来安神香囊。' },
      { id: 'ask-doctor', label: '传太医看', reply: '皇帝命太医看看是否真有不适，避免把小病拖重。' },
    ],
  },
  {
    id: 'prince-adult-duty', kind: 'PRINCE',
    text: '儿臣已过十五，想知道父皇准备何时让儿臣真正接触政务，也好不负宗室和百姓的期望。', tags: ['adult'], minAge: 15,
    choices: [
      { id: 'start-observe', label: '先随朝旁听', reply: '皇帝准其从旁听朝会开始，逐步熟悉政务。' },
      { id: 'focus-study', label: '再磨几年', reply: '皇帝让他再磨炼几年，先把经史与骑射基础打牢。' },
    ],
  },
  {
    id: 'prince-thanks', kind: 'PRINCE',
    text: '父皇今日亲自来问儿臣功课，儿臣很高兴。以后儿臣若有做得不好的地方，父皇尽管教训。', tags: ['relationship'], minAge: 4,
    choices: [
      { id: 'promise-care', label: '朕自会教你', reply: '皇帝应下约定，会继续关注皇嗣的功课与心性。' },
      { id: 'give-encouragement', label: '慢慢来吧', reply: '皇帝勉励他不必急于求成，稳稳长大便好。' },
    ],
  },
  {
    id: 'prince-brother-school', kind: 'PRINCE',
    text: '儿臣今日与二弟一同听师傅讲《论语》，二弟听得比儿臣还认真。父皇会不会觉得儿臣不够用功？',
    tags: ['relationship'], minAge: 7,
    choices: [
      { id: 'encourage-individual', label: '各有节奏', reply: '皇帝宽慰他各人所长不同，勉励他按部就班。' },
      { id: 'compare-help', label: '互相督促', reply: '皇帝让他与二弟互相督促，共同进步。' },
    ],
  },
  {
    id: 'prince-strife-watch', kind: 'PRINCE',
    text: '儿臣见母妃近来神色不安，似在为宫中某事忧心。儿臣想帮忙，可又怕问得太多反而添乱。',
    tags: ['relationship'], minAge: 13,
    choices: [
      { id: 'tell-truth', label: '告知实情', reply: '皇帝将六宫争端轻描淡写告诉他，让他宽心。' },
      { id: 'protect-child', label: '让他莫忧', reply: '皇帝嘱咐他专心学业，家中之事自有大人处置。' },
    ],
  },
  {
    id: 'prince-cup-question', kind: 'PRINCE',
    text: '儿臣读《战国策》读到"狡兔三窟"，便想问：父皇如今是只有一条路，还是早留了几条？',
    tags: ['study', 'adult'], minAge: 13,
    choices: [
      { id: 'teach-strategy', label: '讲权变之理', reply: '皇帝结合史实讲述权变之道，皇嗣听得入神。' },
      { id: 'ask-back', label: '反问他想', reply: '皇帝反问他自己怎么想，从旁点拨。' },
    ],
  },
  {
    id: 'prince-bow-skill', kind: 'PRINCE',
    text: '儿臣今日学射第二箭，已能正中红心。师傅说儿臣臂力尚弱，父皇可有指点？',
    tags: ['study'], minAge: 7,
    choices: [
      { id: 'teach-archery', label: '教他拉弓', reply: '皇帝亲自示范拉弓要领，皇嗣记下要点。' },
      { id: 'encourage-effort', label: '赞他用功', reply: '皇帝赞许他用功，嘱他循序渐进不可急躁。' },
    ],
  },
  {
    id: 'prince-travel-wish', kind: 'PRINCE',
    text: '儿臣只在京城见过山河。听说江南春天最美，父皇何时能让儿臣去见识一回？',
    tags: ['daily'], minAge: 13,
    choices: [
      { id: 'promise-travel', label: '答应带你', reply: '皇帝答应日后再议南巡时让他随行。' },
      { id: 'read-book', label: '先从书看', reply: '皇帝让他先从书本读起，待成年再出京。' },
    ],
  },
  {
    id: 'prince-adult-state', kind: 'PRINCE',
    text: '儿臣已近及冠，想请父皇告知：将来儿臣应当守土一方，还是留在京中辅政？',
    tags: ['adult'], minAge: 18,
    choices: [
      { id: 'state-purpose', label: '明言安排', reply: '皇帝将日后对他的期许说与他听，请他早做准备。' },
      { id: 'wait-see', label: '从旁观察', reply: '皇帝答允先让他历练一两年再正式定下。' },
    ],
  },
  {
    id: 'prince-friend-question', kind: 'PRINCE',
    text: '儿臣在詹事府交了几位伴读，他们之中有的出身名门，有的家道中落。儿臣与他们相处该有分别吗？',
    tags: ['study'], minAge: 13,
    choices: [
      { id: 'teach-equal', label: '一视同仁', reply: '皇帝教导他以品德相交，不可以门第论人。' },
      { id: 'keep-distance', label: '教他慎友', reply: '皇帝提醒他择友要慎重，但不必刻意亲疏。' },
    ],
  },
  {
    id: 'prince-festival-poem', kind: 'PRINCE',
    text: '元宵节将至，儿臣想为母妃抄一首旧诗，写在花灯上。不知父皇觉得选哪一首合适？',
    tags: ['festival'], minAge: 7,
    choices: [
      { id: 'recommend', label: '为他定诗', reply: '皇帝替他选了一首含蓄温情的旧诗，他欣然应下。' },
      { id: 'self-pick', label: '让他自选', reply: '皇帝让他自己挑选，只要情真意切便好。' },
    ],
  },
  {
    id: 'prince-mother-care', kind: 'PRINCE',
    text: '母妃近来身子有些不适，儿臣想亲自熬一碗汤给她，又怕厨房不允。父皇能否通融？',
    tags: ['relationship'], minAge: 7,
    choices: [
      { id: 'allow-cook', label: '准他下厨', reply: '皇帝准许皇嗣去小厨房亲手熬汤，并派嬷嬷帮衬。' },
      { id: 'suggest-doctor', label: '先传太医', reply: '皇帝先命太医为母妃请脉，再议熬汤之事。' },
    ],
  },
  {
    id: 'prince-stepping-down', kind: 'PRINCE',
    text: '儿臣听见有宫人私下议论储位之争。儿臣不愿卷入，只想老老实实做父皇的儿子。父皇可否告诉儿臣真相？',
    tags: ['adult'], minAge: 13,
    choices: [
      { id: 'reassure', label: '明示不会', reply: '皇帝答允储位之争未起，嘱他不必听信流言。' },
      { id: 'warn-careful', label: '教他谨慎', reply: '皇帝提醒他宫中言语当小心，亦不必过分忧虑。' },
    ],
  },
  {
    // PRINCE 0-1 襁褓：咿呀学语，伸手要父皇抱
    id: 'prince-infant-snuggle', kind: 'PRINCE',
    text: '小皇子躺在嬷嬷怀里咿呀作声，圆滚滚的眼睛只盯着父皇，伸出一双小手要抱。',
    tags: ['daily'], minAge: 0, maxAge: 1,
    choices: [
      { id: 'hold-child', label: '抱一会儿', reply: '皇帝将小皇子抱在怀里轻摇，片刻后孩子安静下来。' },
      { id: 'to-mother', label: '送回母妃', reply: '皇帝把孩子送回乳母，嘱她好生看顾。' },
    ],
  },
  {
    // PRINCE 0-1 襁褓：认父皇
    id: 'prince-infant-recognize', kind: 'PRINCE',
    text: '小皇子看见父皇走近，竟咧嘴一笑，伸出藕节般的胳膊，咿呀两声似乎在叫"父皇"。',
    tags: ['daily'], minAge: 0, maxAge: 1,
    choices: [
      { id: 'play-finger', label: '轻拨手指', reply: '皇帝伸出小指让小皇子握住，玩耍片刻后他不舍放手。' },
      { id: 'carry-around', label: '抱着走走', reply: '皇帝抱着小皇子在殿中走了一圈，逗得他咯咯直笑。' },
    ],
  },
  {
    // PRINCE 0-1 襁褓：奶娘喂哺
    id: 'prince-infant-feeder', kind: 'PRINCE',
    text: '乳母正喂小皇子喝奶。他吃了几口便停下望着父皇，眼珠乌黑乌黑的，似乎在看什么新鲜事。',
    tags: ['daily'], minAge: 0, maxAge: 1,
    choices: [
      { id: 'watch-feeding', label: '看顾片刻', reply: '皇帝坐到一旁看乳母喂哺，待孩子吃完方离开。' },
      { id: 'stroke-head', label: '摸头抚慰', reply: '皇帝伸手轻抚小皇子，孩子竟又含住乳汁安静下来。' },
    ],
  },
  {
    // PRINCE 0-1 襁褓：哭夜
    id: 'prince-infant-nightcry', kind: 'PRINCE',
    text: '夜半忽报小皇子啼哭不止，乳母抱哄许久仍不见效。他一见到父皇便止了泪，眼巴巴地望着。',
    tags: ['daily'], minAge: 0, maxAge: 1,
    choices: [
      { id: 'hold-and-walk', label: '抱着走动', reply: '皇帝将小皇子抱在怀中拍抚，在殿中慢慢走动，孩子渐入梦乡。' },
      { id: 'call-consort', label: '唤母妃来', reply: '皇帝命人传生母前来，由她哄睡小皇子。' },
    ],
  },
  {
    // PRINCE 2-3 幼童：开始说短句
    id: 'prince-toddler-talk', kind: 'PRINCE',
    text: '小皇嗣今日磕磕绊绊喊出一声"父皇——抱抱"，嬷嬷说这是他第一次连着说完两个词。',
    tags: ['daily'], minAge: 2, maxAge: 3,
    choices: [
      { id: 'cheer-up', label: '拍手叫好', reply: '皇帝蹲下与他平视，连连称赞，孩子高兴地又喊了好几声。' },
      { id: 'teach-sentence', label: '再教一句', reply: '皇帝慢慢教他念"父皇万安"，孩子跟着咿呀学舌半日。' },
    ],
  },
  {
    // PRINCE 2-3 幼童：玩小木马
    id: 'prince-toddler-horse', kind: 'PRINCE',
    text: '小皇嗣抱着父皇赐的小木马不撒手，非要嬷嬷带他在殿里"驾驾驾"地跑。',
    tags: ['daily'], minAge: 2, maxAge: 3,
    choices: [
      { id: 'play-with', label: '陪他玩耍', reply: '皇帝陪他玩了一会儿骑马，孩子嚷着"再来"，不肯收场。' },
      { id: 'to-mother-care', label: '交由嬷嬷', reply: '皇帝让嬷嬷领他去偏殿玩耍，自己回前朝批折。' },
    ],
  },
  {
    // PRINCE 2-3 幼童：御花园摔跤
    id: 'prince-toddler-stumble', kind: 'PRINCE',
    text: '小皇嗣在御花园跑时被石子绊了一跤，膝头蹭破了皮，咧着嘴却倔强不肯哭。',
    tags: ['daily'], minAge: 2, maxAge: 3,
    choices: [
      { id: 'lift-comfort', label: '抱起安慰', reply: '皇帝将他抱起哄了几声，孩子终究没忍住抽噎起来。' },
      { id: 'encourage-brave', label: '教他勇敢', reply: '皇帝蹲下帮他拍去尘土，告诉他男子汉不轻易落泪。孩子点点头。' },
    ],
  },
  {
    // PRINCE 2-3 幼童：数数
    id: 'prince-toddler-count', kind: 'PRINCE',
    text: '小皇嗣蹲在御花园数蚂蚁，"一、二……三……这个呢？"指着御沟里翻起肚皮的小鱼问父皇。',
    tags: ['daily'], minAge: 2, maxAge: 3,
    choices: [
      { id: 'teach-count', label: '教他数数', reply: '皇帝蹲下陪他一起数，孩子数到十便乱了顺序，却十分得意。' },
      { id: 'play-water', label: '改玩水漂', reply: '皇帝带他在御沟边丢了几片石子，孩子被水花逗得咯咯直笑。' },
    ],
  },
];

const dowagerDialogues: DialogueScene[] = [
  {
    id: 'dowager-morning-greet', kind: 'DOWAGER',
    text: '皇帝今日早朝可还顺遂？哀家不等你来回话，又听见外头小黄门匆匆走动，便知朝中有事。',
    choices: [
      { id: 'brief', label: '简述朝事', reply: '皇帝将早朝要点简述一遍，太后点头不语。' },
      { id: 'no-detail', label: '不使母忧', reply: '皇帝宽慰母后说朝中并无大事，请她放心。' },
    ],
  },
  {
    id: 'dowager-heir-pressure', kind: 'DOWAGER',
    text: '哀家听闻皇后入宫已数年，膝下尚无皇孙。六宫事哀家本不愿多问，只是祖宗的社稷要紧。',
    choices: [
      { id: 'explain', label: '细禀缘由', reply: '皇帝禀明子嗣之事自有安排，请母后再宽宥些时日。' },
      { id: 'comfort', label: '请母后安心', reply: '皇帝恭敬应答，承诺会妥善安排子嗣之事。' },
    ],
  },
  {
    id: 'dowager-consort-advice', kind: 'DOWAGER',
    text: '哀家看李妃近来眉宇间藏着心事，做事又常越矩。你身为天子，宜早为之计，不可使六宫失序。',
    choices: [
      { id: 'investigate', label: '暗中留意', reply: '皇帝答应暗中留意李妃动向，遇不轨则严办。' },
      { id: 'warn-consort', label: '召她训话', reply: '皇帝答应私下召李妃训话，给她一个回头的机会。' },
    ],
  },
  {
    id: 'dowager-strife-warning', kind: 'DOWAGER',
    text: '哀家年轻时也见过六宫之争。如今陈妃与王贵妃走得近，哀家看在眼里，急在心头。你不可大意。',
    choices: [
      { id: 'plan', label: '已有成算', reply: '皇帝禀告母后已有分寸之策，请她暂勿声张。' },
      { id: 'ask-help', label: '请母后指点', reply: '皇帝恭请太后赐教，太后屏退左右，细细道来。' },
    ],
  },
  {
    id: 'dowager-minister-ill', kind: 'DOWAGER',
    text: '哀家听说太傅傅弘毅近来腿脚不便，他教过你读书，这事你不可忘了。得空也该遣人去问候一声。',
    choices: [
      { id: 'send-doctor', label: '派太医探', reply: '皇帝立刻派太医前往太傅府上，并赐药饵。' },
      { id: 'visit', label: '朕亲探之', reply: '皇帝决定改日亲自前往探望老师，以报教诲之恩。' },
    ],
  },
  {
    id: 'dowager-banquet-advice', kind: 'DOWAGER',
    text: '开春家宴将至，皇帝打算如何安排六宫座次？祖宗规矩不可废，但也不必过拘。',
    choices: [
      { id: 'custom-keep', label: '循旧制', reply: '皇帝答允依旧制排定座次，请母后放心。' },
      { id: 'new-idea', label: '稍作变通', reply: '皇帝禀告将稍作调整，请母后过目新方案。' },
    ],
  },
  {
    id: 'dowager-meditation', kind: 'DOWAGER',
    text: '哀家今日念了一卷《心经》，忽然想起你幼时在哀家膝上玩耍的情形。一晃多年过去了。',
    choices: [
      { id: 'recall', label: '共忆幼时', reply: '皇帝陪太后追忆幼年趣事，母子相对无言却温暖。' },
      { id: 'soothe', label: '温言宽慰', reply: '皇帝温言宽慰母后，说自己虽成年仍事事以母后为先。' },
    ],
  },
  {
    id: 'dowager-festival-ritual', kind: 'DOWAGER',
    text: '重阳将至，哀家想着要亲去太庙拈香祭祖。皇帝若得空，便陪哀家走一趟吧。',
    choices: [
      { id: 'promise-accompany', label: '朕陪母去', reply: '皇帝答允陪太后前往太庙，并命礼部安排仪程。' },
      { id: 'send-envoy', label: '遣代劳', reply: '皇帝因政务繁忙未能亲往，命皇长子代表陪祭。' },
    ],
  },
  {
    id: 'dowager-health', kind: 'DOWAGER',
    text: '哀家近来夜里咳得睡不着，太医开的方子见效甚慢。皇帝若得空，替哀家问问有没有更好的方子。',
    choices: [
      { id: 'call-doctor', label: '再传名医', reply: '皇帝命太医院荐一位擅长调理的名医来为太后诊治。' },
      { id: 'gifts', label: '赏参补身', reply: '皇帝赐太后上好人参若干，嘱宫人小心煎服。' },
    ],
  },
  {
    id: 'dowager-rumor', kind: 'DOWAGER',
    text: '外头有人传言寿康宫的荣太妃身子欠安，哀家与她多年未往来，不知是真是假。',
    choices: [
      { id: 'arrange-visit', label: '安排探视', reply: '皇帝命内侍代为前往寿康宫探视，并将情形回禀太后。' },
      { id: 'disregard', label: '暂不理会', reply: '皇帝答允若有实情定当禀告，请母后不必多虑。' },
    ],
  },
  {
    id: 'dowager-summer-cool', kind: 'DOWAGER',
    text: '夏日炎热，哀家寝殿里冰盆用得太勤，有些受寒。皇帝可有什么消暑的好法子？',
    choices: [
      { id: 'reduce-ice', label: '减冰加扇', reply: '皇帝命人减少冰盆，改以凉席、扇子助眠。' },
      { id: 'gift-fruit', label: '赐时鲜果', reply: '皇帝赐太后新鲜瓜果并凉茶，命宫人按时节饮食。' },
    ],
  },
  {
    id: 'dowager-prince-study', kind: 'DOWAGER',
    text: '大皇子近来功课如何？哀家总想着这孩子要多见些世面，光读书是不够的。',
    choices: [
      { id: 'tell-progress', label: '禀其学业', reply: '皇帝将大皇子近况细禀，太后听完频频点头。' },
      { id: 'more-practice', label: '再加历练', reply: '皇帝答允让大皇子随朝旁听，从实践中学习。' },
    ],
  },
  {
    id: 'dowager-blessing', kind: 'DOWAGER',
    text: '哀家今日拈香为皇帝祈福，愿社稷安稳、天下太平。这话本不必说出来，可做了才心安。',
    choices: [
      { id: 'thanks', label: '谢母厚爱', reply: '皇帝谢过母后一片慈心，母子情意更深。' },
      { id: 'pray-back', label: '为母祈寿', reply: '皇帝亦在心中默默为母后祈福，愿她安康长乐。' },
    ],
  },
  {
    id: 'dowager-tutor-question', kind: 'DOWAGER',
    text: '哀家听说礼部新侍郎裴景川为人迂阔，朝中颇有议论。皇帝用他可有深意？',
    choices: [
      { id: 'explain-strategy', label: '解释用人', reply: '皇帝将自己的用人之道细说，太后点头称善。' },
      { id: 'listen', label: '听母教诲', reply: '皇帝恭敬聆听太后评点用人，对其中忧虑一一记下。' },
    ],
  },
  {
    id: 'dowager-legacy', kind: 'DOWAGER',
    text: '哀家年迈，时常想起先帝在时与哀家共理后宫的情形。皇帝可愿听哀家说说从前的旧事？',
    choices: [
      { id: 'listen-legacy', label: '愿闻其详', reply: '皇帝静静听太后诉说先帝旧事，多有感触。' },
      { id: 'remind-rest', label: '请母歇息', reply: '皇帝劝母后不要久坐伤神，改日再来听她细说。' },
    ],
  },
  {
    id: 'dowager-prayer-temple', kind: 'DOWAGER',
    text: '城西报国寺的住持替哀家念了三日经，哀家想去添些香油钱，再替皇帝求一道平安符。',
    choices: [
      { id: 'donate', label: '赏银添油', reply: '皇帝命内库拨银两给报国寺，命人随太后去拈香。' },
      { id: 'bring-amulet', label: '求平安符', reply: '皇帝答允让住持亲制一道平安符，自己也戴在身侧。' },
    ],
  },
];
const nobleDialogues: DialogueScene[] = [
  {
    id: 'noble-memory', kind: 'NOBLE',
    text: '哀家在这寿康宫住了十几年，常常梦见先帝在时同去西苑看牡丹的日子。那时皇帝还小，常骑在先帝肩上。',
    choices: [
      { id: 'listen-memory', label: '陪她叙旧', reply: '皇帝陪太妃追忆先帝旧事，寿康宫里一时静谧。' },
      { id: 'comfort', label: '宽慰她心', reply: '皇帝温言宽慰太妃，请她保重身体。' },
    ],
  },
  {
    id: 'noble-recipe', kind: 'NOBLE',
    text: '哀家年轻时跟着御膳房学过一道桂花糖藕，如今做法传下来的人不多了。今日想吃，又懒得自己动手。',
    choices: [
      { id: 'order', label: '传膳房做', reply: '皇帝命御膳房按旧方做一份桂花糖藕，太妃喜上眉梢。' },
      { id: 'cook-together', label: '陪她同做', reply: '皇帝答允陪太妃一道亲手做这道小食，气氛甚为融洽。' },
    ],
  },
  {
    id: 'noble-faction-tip', kind: 'NOBLE',
    text: '哀家听宫人闲话，说李妃近来得了一匹苏绣贡品，未走六宫分例。这事皇帝可知晓？',
    choices: [
      { id: 'investigate-tip', label: '派人核查', reply: '皇帝命内务府核查贡品分例，必有疏漏之处。' },
      { id: 'thanks-tip', label: '谢她提醒', reply: '皇帝谢太妃提醒，并嘱内侍省多加留意分例发放。' },
    ],
  },
  {
    id: 'noble-rain-talk', kind: 'NOBLE',
    text: '今晨春雨淅沥，哀家在窗前绣花，忽然想起幼时家中母亲也是这样雨天绣花。皇帝今日可有空陪哀家坐坐？',
    choices: [
      { id: 'sit-talk', label: '陪她闲坐', reply: '皇帝陪太妃坐了半日，雨声与针线相伴。' },
      { id: 'busy', label: '改日再来', reply: '皇帝答允改日再来，太妃温言相送并无责怪。' },
    ],
  },
  {
    id: 'noble-prince-memory', kind: 'NOBLE',
    text: '哀家曾在先帝时见过皇长子出生时的情景，那孩子落地便啼声宏亮。皇帝若有添丁之喜，哀家想亲去看看。',
    choices: [
      { id: 'invite', label: '邀她同观', reply: '皇帝答允若添皇嗣必请太妃来观礼。' },
      { id: 'describe', label: '改日细述', reply: '皇帝请太妃先静养，改日将添丁之事向她细述。' },
    ],
  },
  {
    id: 'noble-thanks-visits', kind: 'NOBLE',
    text: '皇帝近来政务繁忙，仍抽空来寿康宫，哀家心中甚慰。寿康宫虽清静，却也因陛下来才多了些生气。',
    choices: [
      { id: 'promise-visit', label: '常来看望', reply: '皇帝答允会常来寿康宫坐坐，太妃露出慈祥的笑。' },
      { id: 'gift', label: '赐些衣料', reply: '皇帝命人赏太妃上等衣料，太妃连忙谢恩。' },
    ],
  },
  {
    id: 'noble-festival-cold', kind: 'NOBLE',
    text: '除夕将至，寿康宫里人少，哀家一人守着炭盆有些冷清。不知陛下可有空来陪哀家守岁？',
    choices: [
      { id: 'join-newyear', label: '陪她守岁', reply: '皇帝答允除夕陪太妃守岁，寿康宫里一时暖意融融。' },
      { id: 'send-companion', label: '派妃嫔陪', reply: '皇帝命皇后于除夕夜来寿康宫陪伴太妃。' },
    ],
  },
  {
    id: 'noble-rival-favor', kind: 'NOBLE',
    text: '哀家听说陛下近来常去李妃那边。哀家本不该多言，只是想起年轻时也曾被冷落的滋味，不免多嘴一句。',
    choices: [
      { id: 'explain', label: '解释缘由', reply: '皇帝向太妃说明近日安排，请她不必介怀。' },
      { id: 'promise-balance', label: '公允安排', reply: '皇帝答允会公允轮次，请太妃放心。' },
    ],
  },
  {
    id: 'noble-old-friend', kind: 'NOBLE',
    text: '哀家入宫前在京中有位手帕交，多年不见，听说她儿子刚中了举。皇帝若得空，可否代哀家送一封贺帖？',
    choices: [
      { id: 'send-greeting', label: '代她致意', reply: '皇帝答允代太妃送礼致意，并命内侍去办。' },
      { id: 'no-help', label: '婉拒她请', reply: '皇帝婉言推说此事不宜由宫中出面，请她改由自家致贺。' },
    ],
  },
  {
    id: 'noble-empress-visit', kind: 'NOBLE',
    text: '皇后昨日来寿康宫请安，言语间似有委屈。皇帝可知她近来心境如何？',
    choices: [
      { id: 'inquire', label: '问明缘由', reply: '皇帝答允去问皇后详情，请太妃先不声张。' },
      { id: 'care-empress', label: '亲自安抚', reply: '皇帝答允改日亲自去坤宁宫宽慰皇后。' },
    ],
  },
  {
    id: 'noble-bird-friend', kind: 'NOBLE',
    text: '哀家养的那只画眉今日飞走了。偌大寿康宫又少了一个伴。皇帝若得闲，可否陪哀家去御花园寻寻？',
    choices: [
      { id: 'search-bird', label: '陪她寻鸟', reply: '皇帝陪太妃在御花园寻了大半日，竟又寻到了那只画眉。' },
      { id: 'gift-new', label: '再送一只', reply: '皇帝答允让内务府再选一只温驯的画眉送来。' },
    ],
  },
  {
    id: 'noble-thanks-prince', kind: 'NOBLE',
    text: '大皇子前日来寿康宫请安，恭恭敬敬给哀家磕了头。哀家看他越来越懂礼数，心里很是喜欢。',
    choices: [
      { id: 'tell-thanks', label: '替他高兴', reply: '皇帝谢太妃夸赞，并说会督促大皇子不骄不躁。' },
      { id: 'gift-prince', label: '赏他一物', reply: '皇帝命人取一方好砚赐予大皇子，以谢太妃美意。' },
    ],
  },
];
const princessDialogues: DialogueScene[] = [
  {
    id: 'princess-calligraphy', kind: 'PRINCESS',
    text: '父皇，女儿今日临了一幅《孝经》，想请父皇品评。师傅说女儿横平竖直尚可，只是撇捺仍欠火候。',
    tags: ['study'], minAge: 7,
    choices: [
      { id: 'praise', label: '夸她进步', reply: '皇帝指出进步之处，公主露出自信的笑。' },
      { id: 'correct', label: '指出不足', reply: '皇帝指点她撇捺运笔，公主记下明日重练。' },
    ],
  },
  {
    id: 'princess-music', kind: 'PRINCESS',
    text: '女儿新学了《阳关三叠》，愿为父皇弹上一曲，听听可还过得去。',
    tags: ['study', 'daily'], minAge: 10,
    choices: [
      { id: 'listen', label: '听她一曲', reply: '皇帝静静听她弹完一曲，称赞琴音清雅。' },
      { id: 'teach', label: '指点指法', reply: '皇帝指出指法一二处不足，公主虚心受教。' },
    ],
  },
  {
    id: 'princess-ritual', kind: 'PRINCESS',
    text: '女儿跟随嬷嬷学了祭礼的规制。嬷嬷说女儿行走坐卧还不够端庄，父皇可否指点一二？',
    tags: ['study'], minAge: 7,
    choices: [
      { id: 'teach-etiquette', label: '教她仪态', reply: '皇帝教她行走坐卧的礼仪，公主认真记下。' },
      { id: 'encourage', label: '宽慰她心', reply: '皇帝温言宽慰，礼仪非一日可成，不必急于求好。' },
    ],
  },
  {
    id: 'princess-festival-lantern', kind: 'PRINCESS',
    text: '元宵将至，女儿想亲手扎一盏花灯，送给父皇挂在御书房。不知父皇可喜欢？',
    tags: ['festival'], minAge: 7,
    choices: [
      { id: 'accept', label: '欣然收下', reply: '皇帝欣然期待，并嘱宫人协助她备料。' },
      { id: 'join', label: '与她同做', reply: '皇帝答允陪她一同扎花灯，气氛甚为融洽。' },
    ],
  },
  {
    id: 'princess-birthday', kind: 'PRINCESS',
    text: '女儿生辰将至，不敢大办。可又盼着父皇能来看一眼。不知父皇可得空？',
    tags: ['daily', 'relationship'], minAge: 4,
    choices: [
      { id: 'promise-come', label: '朕必亲至', reply: '皇帝答允生辰那日亲至寿宁宫看望公主。' },
      { id: 'send-gift', label: '先行赐礼', reply: '皇帝命人先送生辰礼物至公主宫中，请她稍候。' },
    ],
  },
  {
    id: 'princess-mother-talk', kind: 'PRINCESS',
    text: '女儿见母妃近来神色不安，问她她又不愿说。女儿心里挂念，可否请父皇开解？',
    tags: ['relationship'], minAge: 7,
    choices: [
      { id: 'comfort', label: '为她宽心', reply: '皇帝答允私下宽慰母妃，请公主安心读书。' },
      { id: 'ask-detail', label: '问明缘由', reply: '皇帝让公主先回宫，自己去坤宁宫问明详情。' },
    ],
  },
  {
    id: 'princess-pet-cat', kind: 'PRINCESS',
    text: '女儿在御花园捡到一只受伤的小雀，已替它包扎。女儿想养几日，等它飞得动了再放。不知父皇可准？',
    tags: ['daily'], minAge: 4,
    choices: [
      { id: 'allow-keep', label: '准她养伤', reply: '皇帝准许公主照料伤雀几日，并嘱宫人协助。' },
      { id: 'suggest-release', label: '劝她早放', reply: '皇帝提醒她野禽养久难放归，让她照料几日便放回。' },
    ],
  },
  {
    id: 'princess-marriage', kind: 'PRINCESS',
    text: '女儿在宫中偶闻宫人议及婚配之事，心下有些忐忑。女儿不愿离开父皇远嫁。',
    tags: ['relationship'], minAge: 13,
    choices: [
      { id: 'comfort-child', label: '朕自有安排', reply: '皇帝温言宽慰，承诺会依公主心意妥善考虑。' },
      { id: 'explain-ritual', label: '讲解婚制', reply: '皇帝向她讲解宗室婚配之礼，请她安心长大。' },
    ],
  },
  {
    id: 'princess-brother-ill', kind: 'PRINCESS',
    text: '皇兄今日有些不适，女儿去看望他，又怕打扰他养病。女儿想送一束亲手采的花给他，可好？',
    tags: ['relationship'], minAge: 4,
    choices: [
      { id: 'allow', label: '准她送花', reply: '皇帝准许公主送花探望皇兄，并嘱她轻手轻脚。' },
      { id: 'wait', label: '劝她稍候', reply: '皇帝让她等皇兄好些再去，先写封信表达心意。' },
    ],
  },
  {
    id: 'princess-poem', kind: 'PRINCESS',
    text: '女儿读诗读到「春风又绿江南岸」，心想若能去江南一游，亲眼看一看春风绿了江南是什么样。',
    tags: ['daily'], minAge: 13,
    choices: [
      { id: 'promise', label: '答应日后带', reply: '皇帝答允日后再议南巡时带她同行，先好好读书。' },
      { id: 'recommend-book', label: '让她先读', reply: '皇帝为她推荐几本写江南风物的书，先从文字游江南。' },
    ],
  },
  {
    id: 'princess-friend-court-lady', kind: 'PRINCESS',
    text: '女儿在宫中结交了一位宫女姐姐，常陪女儿说话。可嬷嬷说她身份低微，不宜过从甚密。',
    tags: ['relationship'], minAge: 7,
    choices: [
      { id: 'allow', label: '让她自处', reply: '皇帝让她自行把握分寸，嘱咐以礼相待即可。' },
      { id: 'caution', label: '教她适度', reply: '皇帝提醒她宫中关系复杂，对宫女应保持礼貌但不宜深交。' },
    ],
  },
  {
    id: 'princess-festival-sacrifice', kind: 'PRINCESS',
    text: '祭礼将至，女儿愿随母后前往太庙陪祭。女儿已熟记跪拜之礼，可否请父皇准许？',
    tags: ['festival'], minAge: 13,
    choices: [
      { id: 'permit', label: '准她陪祭', reply: '皇帝准许公主随母后陪祭，并嘱嬷嬷随行指导。' },
      { id: 'observe-first', label: '让她先学', reply: '皇帝让她先在宫中演习一遍祭礼，再决定可否陪祭。' },
    ],
  },
  {
    // PRINCESS 0-1 襁褓：要抱
    id: 'princess-infant-snuggle', kind: 'PRINCESS',
    text: '小公主在嬷嬷怀中只哭不停，一见父皇便伸出一双小手，要父皇抱抱才肯安静。',
    tags: ['daily'], minAge: 0, maxAge: 1,
    choices: [
      { id: 'lift', label: '把她抱起', reply: '皇帝将小公主轻轻抱起，她竟立刻止了哭，在父皇怀里安静下来。' },
      { id: 'to-mother', label: '送到母妃处', reply: '皇帝命乳母将孩子送回生母宫中，由她抱哄。' },
    ],
  },
  {
    // PRINCESS 0-1 襁褓：咯咯笑
    id: 'princess-infant-laugh', kind: 'PRINCESS',
    text: '小公主盯着殿中悬挂的彩穗发笑，两只小手不停朝那边挥，嬷嬷说这是头一回见她笑得这样响。',
    tags: ['daily'], minAge: 0, maxAge: 1,
    choices: [
      { id: 'swing', label: '轻轻摆动彩穗', reply: '皇帝轻轻晃动彩穗，小公主笑得前仰后合，嬷嬷也笑。' },
      { id: 'photo', label: '命人画下', reply: '皇帝命内侍将此刻画下，作日后公主及笄之礼时赏看。' },
    ],
  },
  {
    // PRINCESS 0-1 襁褓：喂哺
    id: 'princess-infant-feed', kind: 'PRINCESS',
    text: '乳母正喂小公主米糊。她吃了两口便停下来，睁着一双乌黑的眼睛望着父皇，似乎在辨认来人。',
    tags: ['daily'], minAge: 0, maxAge: 1,
    choices: [
      { id: 'coax-feed', label: '哄她再吃', reply: '皇帝伸手轻碰小公主下巴，引她继续张嘴吃米糊。' },
      { id: 'call-consort', label: '召母妃来', reply: '皇帝传生母前来，由她抱着喂哺，孩子闻见母亲气味安分许多。' },
    ],
  },
  {
    // PRINCESS 0-1 襁褓：夜色安睡
    id: 'princess-infant-sleep', kind: 'PRINCESS',
    text: '小公主攥着父皇的衣角安睡，小脸上还挂着方才的笑意。嬷嬷说一定要父皇坐镇才肯闭眼。',
    tags: ['daily'], minAge: 0, maxAge: 1,
    choices: [
      { id: 'stay', label: '坐着守她', reply: '皇帝在床侧坐着轻拍，直至小公主沉睡方离去。' },
      { id: 'hand-over', label: '交嬷嬷守夜', reply: '皇帝将衣角轻轻抽出，命嬷嬷哄她入眠。' },
    ],
  },
  {
    // PRINCESS 2-3 幼童：念小诗
    id: 'princess-toddler-poem', kind: 'PRINCESS',
    text: '小公主跟着嬷嬷念「鹅鹅鹅」，念到「曲项向天歌」时把"歌"念成了"咯"，逗得一屋子人都笑。',
    tags: ['daily'], minAge: 2, maxAge: 3,
    choices: [
      { id: 'correct-gently', label: '柔声纠正', reply: '皇帝蹲下教她重念那一个字，小公主认真嘟嘴再念一遍，虽仍带奶音却对了一半。' },
      { id: 'laugh-together', label: '陪她笑一会儿', reply: '皇帝也不禁笑出声来，孩子见父皇笑了，反倒更得意地反复念起。' },
    ],
  },
  {
    // PRINCESS 2-3 幼童：摘花
    id: 'princess-toddler-flower', kind: 'PRINCESS',
    text: '小公主踮着脚从花圃里摘了一朵山茶，捧着跑到父皇跟前「送父皇！」花瓣在她手心已皱了几片。',
    tags: ['daily'], minAge: 2, maxAge: 3,
    choices: [
      { id: 'accept', label: '收下戴襟前', reply: '皇帝笑着把花别在襟前，又夸她几句。小公主高兴得直跺脚。' },
      { id: 'teach-care', label: '教她护花', reply: '皇帝蹲下告诉她，花摘下便谢得早；下次想送，便折纸花吧。' },
    ],
  },
  {
    // PRINCESS 2-3 幼童：看御膳房
    id: 'princess-toddler-cook', kind: 'PRINCESS',
    text: '小公主偷偷溜去御膳房看师傅切菜，被油烟味呛得直揉眼睛，还嘴硬说「我以后也要会切菜」。',
    tags: ['daily'], minAge: 2, maxAge: 3,
    choices: [
      { id: 'bring-back', label: '领回寝宫', reply: '皇帝抱起她回寝宫，让宫女给她擦脸。' },
      { id: 'let-watch', label: '许她远远看', reply: '皇帝让嬷嬷把小公主抱到一旁，仍能见到师傅切菜的热闹场面。' },
    ],
  },
  {
    // PRINCESS 2-3 幼童：要新衣裳
    id: 'princess-toddler-dress', kind: 'PRINCESS',
    text: '小公主哭闹着要穿宫中新绣的鹅黄襦裙。嬷嬷劝了几遍无果，只得抱她来见父皇。',
    tags: ['daily'], minAge: 2, maxAge: 3,
    choices: [
      { id: 'promise-tomorrow', label: '答应明日穿', reply: '皇帝抱她到妆镜前玩了一会儿，许她明日先穿——她点了点头，倒也乖巧睡下。' },
      { id: 'strict-no', label: '温言拒绝', reply: '皇帝告诉她今日穿的青衫已经绣好，先穿一日。小公主撅着嘴想想，点头应下。' },
    ],
  },
];
const ministerDialogues: DialogueScene[] = [
  {
    id: 'minister-morning-report', kind: 'MINISTER',
    text: '臣今日早朝有三事奏陈：京畿仓储已满可暂缓征购；河工告竣请遣使验收；礼部呈请秋祭典仪规格。',
    tags: ['study', 'daily'],
    choices: [
      { id: 'approve-all', label: '一一准奏', reply: '皇帝依次准奏，命各部依议施行。' },
      { id: 'review-one', label: '挑出细问', reply: '皇帝就其中一事细问，臣子据实作答。' },
    ],
  },
  {
    id: 'minister-flood-report', kind: 'MINISTER',
    text: '臣接黄州急报：今夏江水暴涨，沿岸三县田庐受损。巡抚请旨拨银赈济，数目尚需户部核算。',
    tags: ['study'],
    choices: [
      { id: 'relief', label: '速拨赈银', reply: '皇帝命户部即日核算，先拨二十万两解急。' },
      { id: 'verify', label: '先核实情', reply: '皇帝命钦差先行核灾，确数后再行赈济。' },
    ],
  },
  {
    id: 'minister-budget', kind: 'MINISTER',
    text: '户部核算本季用度，较去年多出两成，主要因西北军需与河工银两。臣请旨：明年是否量入为出。',
    tags: ['study'],
    choices: [
      { id: 'cut-spending', label: '裁减冗费', reply: '皇帝命户部逐项审视，裁冗费、保要务。' },
      { id: 'keep-budget', label: '照原额拨', reply: '皇帝命户部照原额拨付，但严核成效。' },
    ],
  },
  {
    id: 'minister-merit', kind: 'MINISTER',
    text: '今岁京察已毕，臣呈上考绩单：其中有四人卓异当荐，六人平常当勉，三人不谨当黜。',
    tags: ['study'],
    choices: [
      { id: 'approve-merit', label: '依议施行', reply: '皇帝准奏，命吏部依考绩单升黜。' },
      { id: 'ask-special', label: '单问其三', reply: '皇帝对黜落三人细问其过，依律再核。' },
    ],
  },
  {
    id: 'minister-law-case', kind: 'MINISTER',
    text: '刑部呈上一案：京中富商欠粮商银两不还，屡调不止。粮商请旨勾通州府追缴。此事涉及朝中关系，请陛下圣裁。',
    tags: ['study'],
    choices: [
      { id: 'by-rule', label: '依律裁断', reply: '皇帝命刑部按律审断，富商若有不法当治罪。' },
      { id: 'investigate', label: '先查虚实', reply: '皇帝命御史台暗中查访，再依实情论处。' },
    ],
  },
  {
    id: 'minister-festival-arrange', kind: 'MINISTER',
    text: '礼部呈请元宵灯会规制：京中大街设灯三百架，费用由户部拨银八千两。臣请旨定夺。',
    tags: ['festival'],
    choices: [
      { id: 'approve', label: '准予举办', reply: '皇帝准奏，并嘱礼部务求与民同乐。' },
      { id: 'reduce', label: '减灯从简', reply: '皇帝命减少半数灯架，将节省银两留作赈济。' },
    ],
  },
  {
    id: 'minister-army', kind: 'MINISTER',
    text: '西北军报：边关将士戍守已满两年，请旨轮换。兵部议定可分批回京休整三月。',
    tags: ['study'],
    choices: [
      { id: 'rotate', label: '准予轮换', reply: '皇帝准奏，命兵部按议轮换，勿扰边防。' },
      { id: 'extend', label: '暂缓轮换', reply: '皇帝命兵部再议，秋后再行轮换不迟。' },
    ],
  },
  {
    id: 'minister-school', kind: 'MINISTER',
    text: '国子监呈报：本季入学名册已定，新增监生八十人，其中蒙童二十。请旨定夺名额。',
    tags: ['study'],
    choices: [
      { id: 'approve-num', label: '准予录取', reply: '皇帝准奏，并嘱祭酒严考课业。' },
      { id: 'strict', label: '从严甄选', reply: '皇帝命国子监复试，未达者黜落。' },
    ],
  },
  {
    id: 'minister-petition', kind: 'MINISTER',
    text: '通政司呈上百官本章，臣已按轻重分类。其中有三本关乎民困，请陛下优先御览。',
    tags: ['study', 'daily'],
    choices: [
      { id: 'read-now', label: '立刻披阅', reply: '皇帝命呈上三本章疏，逐一刻时批答。' },
      { id: 'prioritize', label: '交六部议', reply: '皇帝命将三本分别交相关部议覆，再作定夺。' },
    ],
  },
  {
    id: 'minister-local-famine', kind: 'MINISTER',
    text: '山东呈报：今秋旱情初现，粮价渐升。臣请旨：是先开仓平粜，还是暂观其势。',
    tags: ['study'],
    choices: [
      { id: 'open-granary', label: '开仓平粜', reply: '皇帝命山东先开常平仓平粜，并酌情减赋。' },
      { id: 'wait', label: '暂观其势', reply: '皇帝命密切观望，待秋后再议赈济。' },
    ],
  },
  {
    id: 'minister-diplomacy', kind: 'MINISTER',
    text: '礼部呈报：北朝遣使来朝纳贡。臣已拟接待规制，请陛下过目，并定朝见日。',
    tags: ['festival', 'study'],
    choices: [
      { id: 'approve-receive', label: '准予接待', reply: '皇帝准奏，命礼部择吉日朝见，赏赐从优。' },
      { id: 'cautious', label: '礼数从简', reply: '皇帝命礼部按寻常规格接待，不可过示恩宠。' },
    ],
  },
  {
    id: 'minister-complaint', kind: 'MINISTER',
    text: '御史台呈报：有官吏私受商贾馈赠，请旨御史台查办。臣请先调离其职再问罪。',
    tags: ['study'],
    choices: [
      { id: 'remove', label: '即行调离', reply: '皇帝准奏，命先调离再行查办，避免闻风逃脱。' },
      { id: 'secret-check', label: '暗中查访', reply: '皇帝命御史台暗中收集证据，一并查办。' },
    ],
  },
  {
    id: 'minister-religion', kind: 'MINISTER',
    text: '礼部呈请：京城新修太庙告竣，请旨选定祭日。臣以为宜在冬至后择吉日行大祭。',
    tags: ['festival'],
    choices: [
      { id: 'fix-day', label: '择吉举行', reply: '皇帝命礼部择冬至后吉日大祭，自己将亲祭。' },
      { id: 'wait', label: '容后再议', reply: '皇帝命礼部暂缓，待宗人府会签后再议。' },
    ],
  },
  {
    id: 'minister-conflict', kind: 'MINISTER',
    text: '两部意见相左：户部主张减税以安民，兵部主张加税以充边防。两人争执不下，请陛下圣裁。',
    tags: ['study'],
    choices: [
      { id: 'compromise', label: '两全之策', reply: '皇帝命两部会商，从冗费与商税中筹措军需。' },
      { id: 'side-budget', label: '偏户部议', reply: '皇帝命以减税为先，军费另从他项调拨。' },
    ],
  },
  {
    id: 'minister-construction', kind: 'MINISTER',
    text: '工部呈报：京师外城排水沟渠年久失修，今秋雨季恐有水患。请旨拨银二十万两修缮。',
    tags: ['study'],
    choices: [
      { id: 'approve-fund', label: '拨银兴修', reply: '皇帝命户部拨银二十万两，工部限期修缮。' },
      { id: 'partial', label: '先修要段', reply: '皇帝命先修紧要段，余下分三年缓修。' },
    ],
  },
  {
    id: 'minister-strife-tip', kind: 'MINISTER',
    text: '臣闻朝中有结党之议，但尚未见实证。臣不敢妄言，只请陛下留意。',
    tags: ['study', 'relationship'],
    choices: [
      { id: 'investigate', label: '命其密查', reply: '皇帝命臣子暗中观察，遇实证即奏。' },
      { id: 'restrain', label: '训诫朝堂', reply: '皇帝借朝会之机训诫百官不得结党。' },
    ],
  },
  {
    id: 'minister-thanks', kind: 'MINISTER',
    text: '陛下前日擢臣于翰林，臣感激涕零，愿鞠躬尽瘁以报皇恩。',
    tags: ['relationship'],
    choices: [
      { id: 'encourage', label: '勉励一番', reply: '皇帝勉励他勤勉供职，勿负圣意。' },
      { id: 'remind', label: '教他谨慎', reply: '皇帝提醒他高位更需谨慎，不可恃才傲物。' },
    ],
  },
  {
    id: 'minister-critic', kind: 'MINISTER',
    text: '臣冒死进言：今岁选秀耗费颇巨，民间已有怨声。臣请陛下量入为出，缩减规模。',
    tags: ['study', 'relationship'],
    choices: [
      { id: 'accept', label: '采纳谏言', reply: '皇帝纳谏，命礼部缩减今年选秀规模。' },
      { id: 'defend', label: '为政申辩', reply: '皇帝说明此次选秀已有节制，请臣再议。' },
    ],
  },
  {
    id: 'minister-family', kind: 'MINISTER',
    text: '臣有一事请旨：臣老母年迈，欲请假三月回乡侍奉。臣手头公务已托付同僚，请陛下恩准。',
    tags: ['relationship'],
    choices: [
      { id: 'permit', label: '准假三月', reply: '皇帝准假三月，并赐银两以助盘缠。' },
      { id: 'half', label: '给假一月', reply: '皇帝准假一月，命其速回以免误公。' },
    ],
  },
  {
    id: 'minister-emperor-thanks', kind: 'MINISTER',
    text: '陛下圣明烛照，臣等能逢此君，是臣之幸。请陛下受臣一拜。',
    tags: ['relationship'],
    choices: [
      { id: 'praise', label: '赞他勤勉', reply: '皇帝赞许他勤勉供职，君臣相得。' },
      { id: 'caution', label: '教他勿骄', reply: '皇帝教他勿因一时宠信而生骄气。' },
    ],
  },
];
const eunuchDialogues: DialogueScene[] = [
  {
    id: 'eunuch-morning-relay', kind: 'EUNUCH',
    text: '奴婢按例呈报：今早御膳房、尚衣局、内务府三处无事呈报，请陛下示下是否照常点卯。',
    tags: ['daily'],
    choices: [
      { id: 'as-usual', label: '照常点卯', reply: '皇帝点头，内侍退下传旨。' },
      { id: 'inspect', label: '亲往巡看', reply: '皇帝起驾亲自往内务府巡看，内侍随行。' },
    ],
  },
  {
    id: 'eunuch-convey', kind: 'EUNUCH',
    text: '启禀陛下：坤宁宫递来一封口信，皇后娘娘请陛下得空时往用晚膳。无他事，请陛下示下。',
    tags: ['daily', 'relationship'],
    choices: [
      { id: 'promise', label: '答应前往', reply: '皇帝答允，内侍即去回禀。' },
      { id: 'delay', label: '改日再去', reply: '皇帝嘱内侍告以今日有政务，请皇后先用膳。' },
    ],
  },
  {
    id: 'eunuch-palace-news', kind: 'EUNUCH',
    text: '奴婢今日巡看时见坤宁宫侧门换了一批守卫，似有加强之意。不知是否有人传谕，奴婢特来请旨。',
    tags: ['study'],
    choices: [
      { id: 'check', label: '细问缘由', reply: '皇帝命内侍查清缘由，再报上来。' },
      { id: 'ignore', label: '暂不理会', reply: '皇帝示意不必大惊小怪，留意即可。' },
    ],
  },
  {
    id: 'eunuch-festival', kind: 'EUNUCH',
    text: '启禀陛下：除夕宴已备齐，请陛下过目菜式单子。御膳房依祖制拟了二十四道菜，请圣裁。',
    tags: ['festival'],
    choices: [
      { id: 'approve-menu', label: '照单备办', reply: '皇帝准奏，命按单子备办。' },
      { id: 'simplify', label: '减去冗余', reply: '皇帝命减去其中八道，将余下分赏宫人。' },
    ],
  },
  {
    id: 'eunuch-attire', kind: 'EUNUCH',
    text: '启禀陛下：今日尚衣局呈上春服三套，请陛下试穿定夺。奴婢已在御书房备好。',
    tags: ['daily'],
    choices: [
      { id: 'try-all', label: '一一试穿', reply: '皇帝逐一试穿，最后选了一套留用。' },
      { id: 'keep-old', label: '穿旧的罢', reply: '皇帝命尚衣局暂留，春日再换不迟。' },
    ],
  },
  {
    id: 'eunuch-petition', kind: 'EUNUCH',
    text: '启禀陛下：都察院递来密本一封，臣不敢私启，敬呈陛下御览。',
    tags: ['study'],
    choices: [
      { id: 'open', label: '当场披阅', reply: '皇帝当场拆阅，神色凝重。' },
      { id: 'private', label: '退回密室', reply: '皇帝命内侍退回密室详阅。' },
    ],
  },
  {
    id: 'eunuch-sick', kind: 'EUNUCH',
    text: '启禀陛下：御膳房总管身子不爽，已请太医看过。御膳房暂由副总管代理，请旨定夺。',
    tags: ['daily'],
    choices: [
      { id: 'send-doctor', label: '再派名医', reply: '皇帝命太医院遣一位名医复诊，并赐补品。' },
      { id: 'replace', label: '派员代管', reply: '皇帝准副总管代管一段时日，待总管痊愈。' },
    ],
  },
  {
    id: 'eunuch-favor', kind: 'EUNUCH',
    text: '奴婢在宫中服侍多年，深蒙圣恩。今日得见陛下，斗胆进一言：近日天气转冷，请陛下添衣。',
    tags: ['relationship'],
    choices: [
      { id: 'thank', label: '谢他提醒', reply: '皇帝谢内侍提醒，命尚衣局添衣。' },
      { id: 'reward', label: '赏他一物', reply: '皇帝赏内侍一件小物，他叩谢退下。' },
    ],
  },
  {
    id: 'eunuch-route', kind: 'EUNUCH',
    text: '启禀陛下：今日车驾拟由东华门入，至养心殿下轿。途中已肃清，可保驾安稳。',
    tags: ['daily'],
    choices: [
      { id: 'approve-route', label: '依议而行', reply: '皇帝准奏，命依议而行。' },
      { id: 'change-route', label: '改走他路', reply: '皇帝命改走西华门，以免拥堵。' },
    ],
  },
  {
    id: 'eunuch-prince-tip', kind: 'EUNUCH',
    text: '启禀陛下：大皇子今日在詹事府读书，比往日多用一个时辰，似在勤补什么课业。',
    tags: ['study', 'relationship'],
    choices: [
      { id: 'praise', label: '赞其用功', reply: '皇帝欣慰，命内侍带话赞许。' },
      { id: 'no-worry', label: '不必过问', reply: '皇帝示意不必过度关注，让其自然成长。' },
    ],
  },
  {
    id: 'eunuch-broken', kind: 'EUNUCH',
    text: '启禀陛下：昨夜慈宁宫外院有一盏宫灯坠落，已命人换新。奴婢特来请旨，是否需追究看守之责。',
    tags: ['daily'],
    choices: [
      { id: 'forgive', label: '不必深究', reply: '皇帝示意不必追究，训诫看守一次即可。' },
      { id: 'investigate', label: '命人细查', reply: '皇帝命细查是否有人为疏失。' },
    ],
  },
  {
    id: 'eunuch-strife-tip', kind: 'EUNUCH',
    text: '启禀陛下：奴婢近日听闻寿康宫与慈宁宫两处宫人偶有口角，似因一桩旧事。奴婢不敢隐瞒，特来禀告。',
    tags: ['study'],
    choices: [
      { id: 'mediate', label: '命人调和', reply: '皇帝命内侍从中调和，请两处宫人各退一步。' },
      { id: 'caution', label: '观察后再议', reply: '皇帝示意暂不理会，留意即可。' },
    ],
  },
];
const courtLadyDialogues: DialogueScene[] = [
  {
    id: 'courtlady-meal-prep', kind: 'COURT_LADY',
    text: '陛下万安。小主今日进得香些，午膳用了两碗粥并一碟小菜。奴婢特来报喜，请陛下安心。',
    tags: ['daily'],
    choices: [
      { id: 'praise', label: '甚好', reply: '皇帝点头，嘱她照看好小主起居。' },
      { id: 'gift', label: '赏她一物', reply: '皇帝赏了宫女一匹布，宫女叩谢。' },
    ],
  },
  {
    id: 'courtlady-clothes', kind: 'COURT_LADY',
    text: '启禀陛下：小主昨日吩咐的春衫已裁好，请陛下过目样式。小主说想请陛下赐个字，绣在襟上。',
    tags: ['daily', 'relationship'],
    choices: [
      { id: 'write', label: '当场挥毫', reply: '皇帝亲笔写下一字赐下，小主将它作足。' },
      { id: 'decline', label: '让她自绣', reply: '皇帝让她自己选字，不必由他代劳。' },
    ],
  },
  {
    id: 'courtlady-festival-prep', kind: 'COURT_LADY',
    text: '启禀陛下：小主让奴婢呈上亲手包的艾草香囊。端午将至，请陛下笑纳。',
    tags: ['festival'],
    choices: [
      { id: 'accept', label: '欣然收下', reply: '皇帝收下香囊，并嘱宫女转达谢意。' },
      { id: 'praise', label: '赞她手艺', reply: '皇帝赞她手工细致，让她转告小主。' },
    ],
  },
  {
    id: 'courtlady-pet', kind: 'COURT_LADY',
    text: '启禀陛下：小主养的那只小狸奴今日精神很好，在廊下扑蝶扑了一下午。小主说若陛下得空，可来瞧瞧它。',
    tags: ['daily', 'relationship'],
    choices: [
      { id: 'visit', label: '改日去看', reply: '皇帝答应改日去瞧它，并嘱宫女照看好小主别受凉。' },
      { id: 'no-visit', label: '让她自玩', reply: '皇帝让她自去玩，不必扰他。' },
    ],
  },
  {
    id: 'courtlady-master-tired', kind: 'COURT_LADY',
    text: '启禀陛下：小主昨夜为抄一卷经文熬到子时，今晨起迟了些。奴婢斗胆禀告，请陛下知晓。',
    tags: ['daily', 'relationship'],
    choices: [
      { id: 'rest', label: '让她歇息', reply: '皇帝命她今日不必请安，多睡片刻。' },
      { id: 'no-worry', label: '不必多虑', reply: '皇帝示意不必过虑，让小主自行安排。' },
    ],
  },
  {
    id: 'courtlady-palace-observe', kind: 'COURT_LADY',
    text: '启禀陛下：奴婢昨日路过御花园时，瞧见王贵妃身边的宫女与一位生面孔的女官说话，神情似有几分鬼祟。',
    tags: ['palaceStrife', 'study'],
    choices: [
      { id: 'investigate', label: '命人细查', reply: '皇帝命内侍暗查那位女官来历，不得声张。' },
      { id: 'ignore', label: '不必理会', reply: '皇帝示意不必疑神疑鬼，留意即可。' },
    ],
  },
  {
    id: 'courtlady-rival-tip', kind: 'COURT_LADY',
    text: '启禀陛下：小主听闻陛下近日常往李妃宫中，心下有些不安。奴婢不敢妄言，特来如实禀告。',
    tags: ['rivalry'],
    choices: [
      { id: 'comfort', label: '让她安心', reply: '皇帝命宫女转告小主，近日不过顺道探望，请她安心。' },
      { id: 'explain', label: '容后面告', reply: '皇帝示意改日亲自去小主处说明。' },
    ],
  },
  {
    id: 'courtlady-friend-news', kind: 'COURT_LADY',
    text: '启禀陛下：小主今日收到闺中好友一封信，读完面露忧色。奴婢未敢问，特来禀告陛下。',
    tags: ['relationship'],
    choices: [
      { id: 'go-see', label: '亲自去问', reply: '皇帝亲往小主处问明缘由。' },
      { id: 'no-intervene', label: '让她自处', reply: '皇帝示意不必过度介入，由她自己处理。' },
    ],
  },
  {
    id: 'courtlady-skill', kind: 'COURT_LADY',
    text: '启禀陛下：奴婢新学了一道小点心，请陛下品鉴，若可口便回去教小主也尝尝。',
    tags: ['daily'],
    choices: [
      { id: 'taste', label: '尝一块', reply: '皇帝尝了一块，点头称好。' },
      { id: 'thank', label: '谢她一番', reply: '皇帝谢她一片心意，并赏她一件小物。' },
    ],
  },
  {
    id: 'courtlady-spring-outing', kind: 'COURT_LADY',
    text: '启禀陛下：小主说春日晴好，想去踏青并亲手采几枝桃花插瓶。不知陛下可得空一同前往？',
    tags: ['daily', 'festival'],
    choices: [
      { id: 'join', label: '陪她同去', reply: '皇帝答应随她同去，命侍卫随行。' },
      { id: 'no-go', label: '让她自去', reply: '皇帝让她自去，并嘱宫人小心伺候。' },
    ],
  },
];

function contextMatches(scene: DialogueScene, person: DialogueContext) {
  if (scene.kind !== person.kind) return false;
  if (scene.tags?.includes('pregnant') && person.status !== 'PREGNANT') return false;
  if (scene.tags?.includes('postpartum') && person.status !== 'REST') return false;
  if (scene.tags?.includes('child') && person.children.length === 0) return false;
  if (scene.tags?.includes('adult') && person.age < 15) return false;
  // 皇子/皇女的对话按 minAge / maxAge 裁剪；其他 kind 不受年龄区间限制。
  if ((scene.kind === 'PRINCE' || scene.kind === 'PRINCESS') && !ageWithin(person.age, scene.minAge, scene.maxAge)) return false;
  return true;
}

function interpolate(text: string, person: DialogueContext) {
  return text.replaceAll('{name}', person.name).replaceAll('{title}', person.rank ?? person.title);
}

function followUpFor(scene: DialogueScene, person: DialogueContext): DialogueTurn {
  const tagSet = scene.tags ?? [];
  const extendable = tagSet.includes('extendable');
  const text = (() => {
    switch (scene.kind) {
      case 'CONSORT':
        if (extendable) return '妃嫔含笑应下，似乎还有一件放在心里的小事，想趁此机会向陛下说来。';
        if (tagSet.includes('pregnant')) return '妃嫔轻抚小腹，安静听完，点头谢恩。';
        if (tagSet.includes('postpartum')) return '妃嫔听见陛下亲口关切，眼中泛起暖意，便不再多说。';
        if (tagSet.includes('palaceStrife')) return '妃嫔神色微动，似已明白，便不再多言。';
        if (tagSet.includes('rivalry')) return '妃嫔面色稍霁，欠身谢恩。';
        return '妃嫔欠身谢恩。';
      case 'PRINCE':
        return tagSet.includes('adult')
          ? '皇嗣认真点头，行礼告退。'
          : '皇嗣见父皇再无他话，行礼退下。';
      case 'PRINCESS':
        return extendable ? '公主抬起头来，眨眨眼等着父皇的下一句。' : '公主行礼告退。';
      case 'DOWAGER':
        return extendable ? '太后慢条斯理地端起茶盏，似乎还有未尽之语。' : '太后颔首不语，示意皇帝退下。';
      case 'NOBLE':
        return extendable ? '太妃喟叹一声，目光穿过窗棂望向远处。' : '太妃欠身行礼，送皇帝出殿。';
      case 'MINISTER':
        return extendable ? '臣子整理衣袖，欲言又止，最终只欠身谢恩。' : '臣子再拜，告退而出。';
      case 'EUNUCH':
        return extendable ? '内侍垂首低眉，又往前半步，仿佛还有一句要禀。' : '内侍悄然退下。';
      case 'COURT_LADY':
        return extendable ? '宫女忙又福了一福，眼睛却偷偷瞥向陛下。' : '宫女悄然退下。';
      default:
        return extendable ? `${person.name}默默低下头，等着陛下的下一句话。` : `${person.name}欠身告退。`;
    }
  })();
  const choices = (() => {
    if (scene.kind === 'CONSORT') {
      if (extendable) {
        return [
          { id: `${scene.id}-continue`, label: '再叙片刻', reply: `皇帝又与${person.name}说了几句，气氛仍暖。` },
          { id: `${scene.id}-rest`, label: '今日到此', reply: `皇帝嘱${person.name}早些安歇，今日闲谈便到此为止。` },
        ];
      }
      return [{ id: `${scene.id}-rest`, label: '今日到此', reply: `皇帝向${person.name}颔首，今日闲谈便到此为止。` }];
    }
    if (scene.kind === 'PRINCE') {
      if (extendable) {
        return [
          { id: `${scene.id}-teach`, label: '再教一句', reply: `皇帝再教${person.name}一句，皇嗣郑重记在心中。` },
          { id: `${scene.id}-close`, label: '改日再谈', reply: `皇帝让${person.name}改日再来，皇嗣行礼告退。` },
        ];
      }
      return [{ id: `${scene.id}-close`, label: '改日再谈', reply: `皇帝让${person.name}改日再来，皇嗣行礼告退。` }];
    }
    if (scene.kind === 'PRINCESS') {
      if (extendable) {
        return [
          { id: `${scene.id}-continue`, label: '再陪她说', reply: `皇帝多留了一刻，公主露出少见的小女儿神态。` },
          { id: `${scene.id}-leave`, label: '改日再叙', reply: `皇帝让${person.name}回宫歇息，公主行礼告退。` },
        ];
      }
      return [{ id: `${scene.id}-leave`, label: '回宫歇息', reply: `皇帝让${person.name}回宫歇息，公主行礼告退。` }];
    }
    if (scene.kind === 'DOWAGER') {
      if (extendable) {
        return [
          { id: `${scene.id}-listen`, label: '听她说完', reply: `皇帝静静听太后说完，点头应下。` },
          { id: `${scene.id}-excuse`, label: '容儿缓议', reply: `皇帝以政务繁忙为由告退，太后不再追问。` },
        ];
      }
      return [{ id: `${scene.id}-excuse`, label: '朕告退', reply: `皇帝起身告退，太后颔首不语。` }];
    }
    if (scene.kind === 'NOBLE') {
      if (extendable) {
        return [
          { id: `${scene.id}-comfort`, label: '好生宽慰', reply: `皇帝陪${person.name}说了几句，太妃神情稍缓。` },
          { id: `${scene.id}-leave`, label: '改日再来', reply: `皇帝嘱${person.name}保重身体，太妃欠身相送。` },
        ];
      }
      return [{ id: `${scene.id}-leave`, label: '朕告辞', reply: `皇帝起身告退，太妃欠身行礼。` }];
    }
    if (scene.kind === 'MINISTER') {
      if (extendable) {
        return [
          { id: `${scene.id}-more`, label: '继续奏对', reply: `皇帝又听${person.name}奏陈数事，意见一一记录。` },
          { id: `${scene.id}-dismiss`, label: '准卿所奏', reply: `皇帝准奏，命${person.name}依议施行。` },
        ];
      }
      return [{ id: `${scene.id}-dismiss`, label: '朕知道了', reply: `皇帝示意${person.name}依议施行，臣子再拜告退。` }];
    }
    if (scene.kind === 'EUNUCH') {
      if (extendable) {
        return [
          { id: `${scene.id}-continue`, label: '听他禀完', reply: `皇帝点头，命内侍继续留意。` },
          { id: `${scene.id}-reward`, label: '赏他一物', reply: `皇帝赏了内侍一件小物，他叩谢退下。` },
        ];
      }
      return [{ id: `${scene.id}-continue`, label: '朕知道了', reply: `皇帝点头示意，内侍悄然退下。` }];
    }
    if (extendable) {
      return [
        { id: `${scene.id}-ask`, label: '再问一句', reply: `皇帝又向${person.name}问了几句，她一一低声回答。` },
        { id: `${scene.id}-dismiss`, label: '知悉了', reply: `皇帝让她退下，${person.name}悄然告退。` },
      ];
    }
    return [{ id: `${scene.id}-dismiss`, label: '朕知道了', reply: `皇帝点头示意，${person.name}悄然告退。` }];
  })();
  return { speaker: person.name, text, choices };
}
export function dialogueLibraryFor(kind: PersonKind) {
  switch (kind) {
    case 'CONSORT': return consortDialogues;
    case 'PRINCE': return princeDialogues;
    case 'DOWAGER': return dowagerDialogues;
    case 'NOBLE': return nobleDialogues;
    case 'PRINCESS': return princessDialogues;
    case 'MINISTER': return ministerDialogues;
    case 'EUNUCH': return eunuchDialogues;
    case 'COURT_LADY': return courtLadyDialogues;
    default: return [];
  }
}

export function availableDialoguesFor(person: DialogueContext) {
  if (!isPersonAlive(person)) return [];
  return dialogueLibraryFor(person.kind).filter((scene) => contextMatches(scene, person));
}

/** Select one story without making React renders mutate the game state. */
export function pickDialogueForPerson(person: DialogueContext, random = Math.random()): DialogueScene | undefined {
  const available = availableDialoguesFor(person);
  if (!available.length) return undefined;
  const index = random < 0.25 ? 0 : Math.min(available.length - 1, 1 + Math.floor(((random - 0.25) / 0.75) * (available.length - 1)));
  const scene = available[index];
  const followUp = followUpFor(scene, person);
  return { ...scene, text: interpolate(scene.text, person), choices: scene.choices.map((choice) => ({ ...choice, reply: interpolate(choice.reply, person) })), followUp: { ...followUp, text: interpolate(followUp.text, person), choices: followUp.choices.map((choice) => ({ ...choice, reply: interpolate(choice.reply, person) })) } };
}

export function dialogueCounts() {
  return {
    consort: consortDialogues.length,
    prince: princeDialogues.length,
    dowager: dowagerDialogues.length,
    noble: nobleDialogues.length,
    princess: princessDialogues.length,
    minister: ministerDialogues.length,
    eunuch: eunuchDialogues.length,
    courtLady: courtLadyDialogues.length,
  };
}

