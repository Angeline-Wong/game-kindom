export type SceneInteractionStatus = 'ACTIVE' | 'PARTIAL' | 'PLANNED';
export interface SceneInteraction {
  id: string;
  title: string;
  category: 'FRONT' | 'INNER' | 'PALACE';
  actions: string[];
  peopleKinds: string[];
  status: SceneInteractionStatus;
}

export const sceneInteractions: Record<string, SceneInteraction> = {
  taihe: { id: 'taihe', title: '太和殿', category: 'FRONT', actions: ['殿试', '金殿传胪', '册立大典', '凯旋朝贺'], peopleKinds: ['MINISTER', 'PRINCE'], status: 'ACTIVE' },
  'qianqing-gate': { id: 'qianqing-gate', title: '乾清门', category: 'FRONT', actions: ['每日朝会', '多方廷议', '交办调查', '容后再议', '朱批裁决', '朝班点卯'], peopleKinds: ['MINISTER', 'PRINCE'], status: 'ACTIVE' },
  'yangxin-base': { id: 'yangxin-base', title: '养心殿', category: 'FRONT', actions: ['批阅奏折', '召见', '休息', '临时决策'], peopleKinds: ['MINISTER'], status: 'PARTIAL' },
  military: { id: 'military', title: '军机处', category: 'FRONT', actions: ['军情议定', '密折', '任命军机'], peopleKinds: ['MINISTER'], status: 'PLANNED' },
  wumen: { id: 'wumen', title: '午门', category: 'FRONT', actions: ['接受朝拜', '凯旋', '献俘', '宣示'], peopleKinds: ['MINISTER'], status: 'PLANNED' },
  wenhua: { id: 'wenhua', title: '文华殿', category: 'FRONT', actions: ['奉旨开科', '乡试汇报', '会试考务', '御览试卷', '进士授官', '科举档案'], peopleKinds: ['MINISTER'], status: 'ACTIVE' },
  huitong: { id: 'huitong', title: '会同馆', category: 'FRONT', actions: ['接见使团', '朝贡', '外交谈判'], peopleKinds: ['MINISTER'], status: 'PLANNED' },
  household: { id: 'household', title: '内务府', category: 'FRONT', actions: ['预算分账', '调拨', '采购', '修缮'], peopleKinds: ['MINISTER'], status: 'PARTIAL' },
  clan: { id: 'clan', title: '宗人府', category: 'FRONT', actions: ['宗室谱牒', '爵位', '婚配', '宗室问责'], peopleKinds: ['PRINCE'], status: 'PLANNED' },
  study: { id: 'study', title: '御书房', category: 'FRONT', actions: ['读书', '研究国策', '召见学士', '亲拟殿试策问'], peopleKinds: ['MINISTER', 'PRINCE'], status: 'PARTIAL' },
  drill: { id: 'drill', title: '演武场', category: 'FRONT', actions: ['骑射', '比武', '禁军检阅'], peopleKinds: ['MINISTER', 'PRINCE'], status: 'PLANNED' },
  'inner-palace': { id: 'inner-palace', title: '东西六宫', category: 'PALACE', actions: ['进入主殿', '进入东西侧殿', '庭院人物互动'], peopleKinds: ['CONSORT'], status: 'ACTIVE' },
  kuning: { id: 'kuning', title: '坤宁宫', category: 'INNER', actions: ['皇后互动', '宫务', '祭祀', '册后'], peopleKinds: ['CONSORT'], status: 'PARTIAL' },
  'qianqing-palace': { id: 'qianqing-palace', title: '乾清宫', category: 'INNER', actions: ['家宴', '宗室召集', '皇室事务'], peopleKinds: ['CONSORT', 'PRINCE'], status: 'PLANNED' },
  jiaotai: { id: 'jiaotai', title: '交泰殿', category: 'INNER', actions: ['六宫账册', '协理六宫', '节庆仪式'], peopleKinds: ['CONSORT'], status: 'PLANNED' },
  garden: { id: 'garden', title: '御花园', category: 'INNER', actions: ['游赏', '偶遇', '季节事件', '闲聊'], peopleKinds: ['CONSORT', 'PRINCE'], status: 'PARTIAL' },
  'inner-study': { id: 'inner-study', title: '上书房', category: 'INNER', actions: ['课程', '考核', '名师', '伴读'], peopleKinds: ['PRINCE'], status: 'PLANNED' },
  'cold-palace': { id: 'cold-palace', title: '冷宫', category: 'INNER', actions: ['探视', '调查', '复位', '处置'], peopleKinds: ['CONSORT'], status: 'PLANNED' },
  medical: { id: 'medical', title: '太医院', category: 'INNER', actions: ['诊脉', '用药', '安胎', '生产'], peopleKinds: ['CONSORT', 'PRINCE'], status: 'PLANNED' },
  shoukang: { id: 'shoukang', title: '寿康宫', category: 'INNER', actions: ['请安', '长辈家宴', '太妃事务'], peopleKinds: ['CONSORT'], status: 'PLANNED' },
  kitchen: { id: 'kitchen', title: '御膳房', category: 'INNER', actions: ['传膳', '食材检查', '膳食事件'], peopleKinds: ['CONSORT'], status: 'PLANNED' },
  cining: { id: 'cining', title: '慈宁宫', category: 'INNER', actions: ['向太后请安', '六宫长辈事务', '家宴'], peopleKinds: ['CONSORT', 'PRINCE'], status: 'PLANNED' },
  xiefang: { id: 'xiefang', title: '撷芳殿', category: 'INNER', actions: ['皇嗣名册', '皇子婚配', '皇嗣照料', '健康', '启蒙', '指定养母'], peopleKinds: ['PRINCE'], status: 'PARTIAL' },
  yuqing: { id: 'yuqing', title: '毓庆宫', category: 'INNER', actions: ['选立太子', '改立太子', '储君培养', '监国', '封爵', '问责'], peopleKinds: ['PRINCE'], status: 'PARTIAL' },
};

export function getSceneInteraction(sceneId: string) {
  return sceneInteractions[sceneId];
}
