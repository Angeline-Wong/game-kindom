import { useEffect, useState } from 'react';
import { formatClockTime, formatShichen } from '../game/clock';
import type { GameClock } from '../game/clock';
import type { useGameStore } from '../game/useGameStore';
import './Settings.css';

type Tab = 'sound' | 'reading' | 'save' | 'assist';
type SettingsData = {
  music: number; ambience: number; effects: number; quality: '流畅' | '精致' | '极致'; weather: boolean; powerSaving: boolean;
  textSpeed: '慢' | '适中' | '快'; autoPlay: boolean; attributeTips: boolean; confirmations: boolean; fontSize: '小' | '标准' | '大'; reduceBackdrop: boolean;
  highContrast: boolean; reduceMotion: boolean; longPressTips: boolean; tutorial: boolean;
};

const defaults: SettingsData = { music: 72, ambience: 65, effects: 80, quality: '精致', weather: true, powerSaving: false, textSpeed: '适中', autoPlay: false, attributeTips: true, confirmations: true, fontSize: '标准', reduceBackdrop: true, highContrast: false, reduceMotion: false, longPressTips: true, tutorial: true };
const key = 'zichen-settings-v1';
function loadSettings() { try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) ?? '{}') } as SettingsData; } catch { return defaults; } }

type SkipPeriod = 'MONTH' | 1 | 3 | 5;

export function SettingsPage({ store, pendingEvents, onSkipMonth, onSkipYears }: { store: ReturnType<typeof useGameStore>; clock: GameClock; pendingEvents: number; onSkipMonth: () => void; onSkipYears: (years: 1 | 3 | 5) => void }) {
  const [confirmation, setConfirmation] = useState<{ title: string; message: string; label: string; action: () => void } | null>(null);
  const [notice, setNotice] = useState('');
  const { gameState, setGameState, manualSaves, hydrated, busy } = store;
  const run = async (operation: () => Promise<void>, message: string) => {
    setConfirmation(null);
    try { await operation(); setNotice(message); } catch (error) { setNotice(error instanceof Error ? error.message : '存档操作失败，请重试'); }
  };
  const reset = () => setConfirmation({ title: '重置游戏', message: '重置后将清除当前游戏进度及全部存档，该操作无法撤销。', label: '继续', action: () => setConfirmation({ title: '重置游戏', message: '确认永久重置游戏？', label: '确认重置', action: () => { void run(store.resetGame, '游戏已重置'); } }) });
  const rate = (name: 'pregnancyRate' | 'maleBirthRate' | 'miscarriageRate' | 'postMiscarriageInfertilityRate' | 'twinRate', value: number) => setGameState(current => ({ ...current, gameSettings: { ...current.gameSettings, [name]: Math.max(0, Math.min(100, value)) } }));
  const [tab, setTab] = useState<Tab>('sound');
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const [skipPeriod, setSkipPeriod] = useState<SkipPeriod>(1);
  const [confirmSkip, setConfirmSkip] = useState(false);
  useEffect(() => { document.documentElement.classList.toggle('reduce-game-motion', settings.reduceMotion); return () => document.documentElement.classList.remove('reduce-game-motion'); }, [settings.reduceMotion]);
  const set = <K extends keyof SettingsData>(name: K, value: SettingsData[K]) => setSettings((current) => ({ ...current, [name]: value }));
  const save = () => { localStorage.setItem(key, JSON.stringify(settings)); setSaved(true); window.setTimeout(() => setSaved(false), 1500); };
  return <section className="settings-page" aria-label="游戏设置">
    <header className="settings-header"><small>紫宸纪事 · 御前设定</small><h2>游戏设置</h2><p>声画 · 阅读 · 存档 · 辅助</p><span>版本 0.1.0</span></header>
    <nav className="settings-tabs">{([['sound','声画'],['reading','阅读'],['save','存档'],['assist','辅助']] as [Tab,string][]).map(([id,label]) => <button className={tab === id ? 'active' : ''} key={id} onClick={() => setTab(id)}>{label}</button>)}</nav>
    <main className="settings-content">
      {tab === 'sound' && <><SettingsSection title="声音设置" note="宫乐与交互反馈"><RangeRow title="背景音乐" detail="场景宫乐音量" value={settings.music} onChange={(value) => set('music', value)} /><RangeRow title="环境音效" detail="风雨、宫铃与脚步" value={settings.ambience} onChange={(value) => set('ambience', value)} /><RangeRow title="交互音效" detail="按钮、圣旨与提示" value={settings.effects} onChange={(value) => set('effects', value)} /></SettingsSection><SettingsSection title="画面设置" note="适配当前设备"><ChoiceRow title="画面品质" detail="影响光影、粒子与人物清晰度" values={['流畅','精致','极致']} value={settings.quality} onChange={(value) => set('quality', value as SettingsData['quality'])} /><ToggleRow title="天气特效" detail="雨雪、落花与光尘动画" value={settings.weather} onChange={(value) => set('weather', value)} /><ToggleRow title="省电模式" detail="降低动态效果与刷新频率" value={settings.powerSaving} onChange={(value) => set('powerSaving', value)} /></SettingsSection></>}
      {tab === 'reading' && <><SettingsSection title="剧情阅读" note="对话显示习惯"><ChoiceRow title="文字速度" detail="调整剧情逐字显示速度" values={['慢','适中','快']} value={settings.textSpeed} onChange={(value) => set('textSpeed', value as SettingsData['textSpeed'])} /><ToggleRow title="自动播放" detail="剧情结束后自动进入下一句" value={settings.autoPlay} onChange={(value) => set('autoPlay', value)} /><ToggleRow title="属性变化提示" detail="显示“宠爱 +8”等结算结果" value={settings.attributeTips} onChange={(value) => set('attributeTips', value)} /><ToggleRow title="重大操作确认" detail="处置和时间跳过前再次询问" value={settings.confirmations} onChange={(value) => set('confirmations', value)} /></SettingsSection><SettingsSection title="界面显示" note="字号与信息密度"><ChoiceRow title="剧情字号" detail="只影响对话与事件文本" values={['小','标准','大']} value={settings.fontSize} onChange={(value) => set('fontSize', value as SettingsData['fontSize'])} /><ToggleRow title="简化动态背景" detail="弹窗开启时弱化场景动画" value={settings.reduceBackdrop} onChange={(value) => set('reduceBackdrop', value)} /></SettingsSection></>}
      {tab === 'save' && <>
        <SettingsSection title="存档管理" note="本机保存完整游戏进度">
          <div className="settings-save-card"><i>自</i><span><b>自动存档</b><small>最后保存时间：{store.lastSavedAt ? new Date(store.lastSavedAt).toLocaleString('zh-CN') : '暂无'}</small></span><em>{store.saveStatus}</em></div>
          {([1, 2] as const).map(slot => {
            const snapshot = manualSaves[slot - 1];
            const label = slot === 1 ? '存档一' : '存档二';
            const saveSlot = () => { void run(() => store.saveManual(slot), `${label}保存成功`); };
            return <div className="settings-save-card" key={slot}><i>{slot === 1 ? '壹' : '贰'}</i><span><b>{label}</b>{snapshot ? <><small>永和{snapshot.clock.year}年 {snapshot.clock.month}月{snapshot.clock.day}日</small><small>{formatShichen(snapshot.clock.minuteOfDay)} {formatClockTime(snapshot.clock.minuteOfDay)} · 皇帝{snapshot.people.emperor.age}岁</small><small>最后保存：{new Date(snapshot.updatedAt).toLocaleString('zh-CN')}</small></> : <small>空存档</small>}</span><div className="settings-save-actions"><button disabled={!hydrated || busy} onClick={() => snapshot ? setConfirmation({ title: '覆盖存档', message: `${label}已有记录，是否覆盖？`, label: '确认覆盖', action: saveSlot }) : saveSlot()}>保存</button><button disabled={!snapshot || !hydrated || busy} onClick={() => setConfirmation({ title: '读取存档', message: `读取${label}后，当前尚未保存的进度将丢失，是否继续？`, label: '确认回档', action: () => { void run(() => store.loadManual(slot), '回档成功'); } })}>回档</button></div></div>;
          })}
          <InfoRow title="待处理事件" detail="尚待内侍呈报的事件数量" value={`${pendingEvents}件`} />
        </SettingsSection>
        <SettingsSection title="危险操作" note="谨慎操作"><div className="settings-row"><RowCopy title="重置游戏" detail="清除当前游戏进度以及全部存档" /><button className="settings-danger" disabled={!hydrated || busy} onClick={reset}>重置游戏</button></div></SettingsSection>
      </>}
      {tab === 'assist' && <><SettingsSection title="时间工具栏" note="事件正常发生并累积"><div className="settings-time-tool"><p>选择需要跳过的时间。系统会逐日推进模拟，期间的生育、俸禄、选秀、科举及其他事件仍会照常结算并进入待办。</p><div>{([{ value: 'MONTH', label: '跳过1月' }, { value: 1, label: '跳过1年' }, { value: 3, label: '跳过3年' }, { value: 5, label: '跳过5年' }] as const).map((option) => <button className={skipPeriod === option.value ? 'active' : ''} key={String(option.value)} onClick={() => setSkipPeriod(option.value)}>{option.label}</button>)}</div><button className="settings-skip" onClick={() => settings.confirmations ? setConfirmSkip(true) : skipPeriod === 'MONTH' ? onSkipMonth() : onSkipYears(skipPeriod)}>执行时间跳过</button></div></SettingsSection>
        <SettingsSection title="游戏规则" note="调整后自动保存，随存档恢复">
          <ProbabilityRow title="孕率" detail="每次触发正常受孕判定时使用该概率。" value={gameState.gameSettings.pregnancyRate} disabled={!hydrated || busy} onChange={value => rate('pregnancyRate', value)} />
          <ProbabilityRow title="生男概率" detail="新生皇嗣的生男概率。" value={gameState.gameSettings.maleBirthRate} disabled={!hydrated || busy} onChange={value => rate('maleBirthRate', value)} />
          <InfoRow title="生女概率" detail="生女概率自动等于 100% - 生男概率。" value={`${100 - gameState.gameSettings.maleBirthRate}%`} />
          <ProbabilityRow title="流产概率" detail="按整个孕期的基础概率换算为每日流产风险。" value={gameState.gameSettings.miscarriageRate ?? 10} disabled={!hydrated || busy} onChange={value => rate('miscarriageRate', value)} />
          <ProbabilityRow title="流产后不孕概率" detail="每次流产后判定永久不孕，并受流产次数与健康影响。" value={gameState.gameSettings.postMiscarriageInfertilityRate ?? 5} disabled={!hydrated || busy} onChange={value => rate('postMiscarriageInfertilityRate', value)} />
          <ProbabilityRow title="双胞胎概率" detail="受孕时判定胎数，双胎会提高孕期与生产风险。" value={gameState.gameSettings.twinRate ?? 3} disabled={!hydrated || busy} onChange={value => rate('twinRate', value)} />
          <InfoRow title="单胎概率" detail="单胎概率自动等于 100% - 双胞胎概率。" value={`${100 - (gameState.gameSettings.twinRate ?? 3)}%`} />
        </SettingsSection>
        <SettingsSection title="辅助功能" note="阅读与操作支持"><ToggleRow title="高对比文字" detail="增强正文与背景的明暗差异" value={settings.highContrast} onChange={(value) => set('highContrast', value)} /><ToggleRow title="减少动态效果" detail="关闭摇晃、闪光与大幅转场" value={settings.reduceMotion} onChange={(value) => set('reduceMotion', value)} /><ToggleRow title="长按提示" detail="长按按钮显示用途说明" value={settings.longPressTips} onChange={(value) => set('longPressTips', value)} /><ToggleRow title="新手引导" detail="显示宫廷系统操作说明" value={settings.tutorial} onChange={(value) => set('tutorial', value)} /></SettingsSection></>}
    </main>
    {saved && <div className="settings-toast">设置已保存</div>}
    <footer className="settings-footer"><button onClick={() => setSettings(defaults)}>恢复默认</button><button className="primary" onClick={save}>保存设置</button></footer>
    {notice && <div className="settings-confirm" role="dialog" aria-label="操作结果"><section><p>{notice}</p><button onClick={() => setNotice('')}>知道了</button></section></div>}
    {confirmation && <div className="settings-confirm" role="dialog" aria-label={confirmation.title}><section><small>内侍请示</small><h3>{confirmation.title}</h3><p>{confirmation.message}</p><div><button onClick={() => setConfirmation(null)}>取消</button><button className="primary" disabled={busy} onClick={confirmation.action}>{confirmation.label}</button></div></section></div>}
    {confirmSkip && <div className="settings-confirm"><section><small>内侍请示</small><h3>确认跳过{skipPeriod === 'MONTH' ? '一月' : `${skipPeriod}年`}？</h3><p>时间将推进{skipPeriod === 'MONTH' ? '一个自然月' : `${skipPeriod}年`}。期间事件正常发生并累积，完成后由内侍逐一呈报。</p><div><button onClick={() => setConfirmSkip(false)}>暂不跳过</button><button className="primary" onClick={() => { setConfirmSkip(false); if (skipPeriod === 'MONTH') onSkipMonth(); else onSkipYears(skipPeriod); }}>确认跳过</button></div></section></div>}
  </section>;
}

function SettingsSection({ title, note, children }: { title: string; note: string; children: React.ReactNode }) { return <section className="settings-section"><header><b>{title}</b><small>{note}</small></header>{children}</section>; }
function RowCopy({ title, detail }: { title: string; detail: string }) { return <span><b>{title}</b><small>{detail}</small></span>; }
function ToggleRow({ title, detail, value, onChange }: { title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) { return <div className="settings-row"><RowCopy title={title} detail={detail} /><button aria-label={title} aria-pressed={value} className={`settings-switch ${value ? 'on' : ''}`} onClick={() => onChange(!value)} /></div>; }
function ChoiceRow({ title, detail, values, value, onChange }: { title: string; detail: string; values: string[]; value: string; onChange: (value: string) => void }) { return <div className="settings-row"><RowCopy title={title} detail={detail} /><div className="settings-choice">{values.map((item) => <button className={item === value ? 'active' : ''} key={item} onClick={() => onChange(item)}>{item}</button>)}</div></div>; }
function RangeRow({ title, detail, value, onChange }: { title: string; detail: string; value: number; onChange: (value: number) => void }) { return <label className="settings-row settings-range"><RowCopy title={title} detail={detail} /><input aria-label={title} type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--setting-value': `${value}%` } as React.CSSProperties} /><em>{value}</em></label>; }
function InfoRow({ title, detail, value }: { title: string; detail: string; value: string }) { return <div className="settings-row"><RowCopy title={title} detail={detail} /><em>{value}</em></div>; }

function ProbabilityRow({ title, detail, value, disabled, onChange }: { title: string; detail: string; value: number; disabled: boolean; onChange: (value: number) => void }) {
  return <div className="settings-row"><RowCopy title={title} detail={detail} /><div className="settings-probability"><button aria-label={`降低${title}`} disabled={disabled || value <= 0} onClick={() => onChange(value - 5)}>−</button><span>{value}%</span><button aria-label={`提高${title}`} disabled={disabled || value >= 100} onClick={() => onChange(value + 5)}>+</button></div></div>;
}
