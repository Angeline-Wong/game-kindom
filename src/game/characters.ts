export type CharacterKind = 'emperor' | 'official' | 'consort';
export interface RadarAxis { label: string; value: number | null }
export interface Character { id: string; kind: CharacterKind; name: string; title: string; age: number; avatar: string; radar: RadarAxis[]; note: string }

export const demoEmperor: Character = { id: 'emperor', kind: 'emperor', name: '萧承曜', title: '大曜皇帝', age: 24, avatar: '曜', note: '永和三年，在位第三年', radar: [['文',72],['武',58],['政治',66],['民生',61],['魅力',78],['健康',83]].map(([label,value]) => ({ label: String(label), value: Number(value) })) };
export const demoOfficial: Character = { id: 'official', kind: 'official', name: '沈砚之', title: '户部尚书 · 正二品', age: 46, avatar: '沈', note: '江南沈氏，历任地方十二年。其家产尚未核清。', radar: [{label:'智慧',value:82},{label:'武略',value:28},{label:'野心',value:null},{label:'忠诚',value:71},{label:'派系影响',value:67},{label:'已知财富',value:54}] };
export const demoConsort: Character = { id: 'consort', kind: 'consort', name: '顾清漪', title: '宸贵妃 · 翊坤宫主位', age: 22, avatar: '顾', note: '仪态从容，近来常遣宫女前往太医院。', radar: [{label:'才情',value:88},{label:'礼仪',value:84},{label:'容貌',value:91},{label:'健康',value:69},{label:'野心',value:null},{label:'争宠',value:76}] };
export function getRadarAxes(character: Character) { return character.radar; }
