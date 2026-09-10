import { isPersonAlive } from '../game/person';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, Landmark, ScrollText, X } from 'lucide-react';
import type { CivilExamCandidate, GameState } from '../game/gameState';
import { advanceCivilExamAtWenhua, canStartCivilExam, civilExamQuestions, civilExamReadyDateLabel, completePalaceExam, isCivilExamStageReady, proclaimCivilExam, setCivilExamQuestion, startCivilExam } from '../game/civilExam';

export type CivilExamVenue = 'wenhua' | 'study' | 'taihe';

interface CivilExaminationProps {
  state: GameState;
  venue: CivilExamVenue;
  onChange: (state: GameState) => void;
  onClose: () => void;
  onNotice: (message: string) => void;
}

const focusOptions = ['经义根基', '经世策论', '吏治民生', '河工漕运'];
const rankNames = ['状元', '榜眼', '探花'];

function CandidateCard({ candidate, badge, selected, onClick }: { candidate: CivilExamCandidate; badge?: string; selected?: boolean; onClick?: () => void }) {
  return <button type="button" className={`exam-candidate ${selected ? 'selected' : ''}`} onClick={onClick} disabled={!onClick}>
    <span className="exam-candidate-name"><b>{candidate.name}</b>{badge && <em>{badge}</em>}</span>
    <small>{candidate.origin} · {candidate.background} · {candidate.age}岁</small>
    <span className="exam-candidate-stats"><i>经义 {candidate.classics}</i><i>策论 {candidate.policy}</i><i>品行 {candidate.integrity}</i>{candidate.metropolitanScore != null && <i>会试 {candidate.metropolitanScore}</i>}</span>
  </button>;
}

export function CivilExaminationPanel({ state, venue, onChange, onClose, onNotice }: CivilExaminationProps) {
  const exam = state.civilExam;
  const stageReady = isCivilExamStageReady(exam, state.clock);
  const readyDate = civilExamReadyDateLabel(exam);
  const waitingMessage = `科举事务正在依制筹备，预计${readyDate || '稍后'}办妥。届时内侍将前来禀报，并请陛下移驾办理。`;
  const ministers = useMemo(() => Object.values(state.people).filter((person) => person.kind === 'MINISTER' && isPersonAlive(person)), [state.people]);
  const [focus, setFocus] = useState(focusOptions[1]);
  const [examinerId, setExaminerId] = useState(ministers[0]?.id ?? '');
  const [rankedIds, setRankedIds] = useState<string[]>([]);

  useEffect(() => setRankedIds([]), [exam?.id, exam?.status]);

  const apply = (next: GameState, message: string, close = false) => {
    onChange(next);
    onNotice(message);
    if (close) onClose();
  };

  const renderWenhua = () => {
    if (canStartCivilExam(state)) return <>
      <section className="exam-intro"><Landmark /><h3>奉旨开科</h3><p>文华殿统筹乡试名录、会试考务、阅卷取士与进士授官。本科结束后三年方可再次开科。</p></section>
      <label className="exam-field"><span>本科侧重</span><select value={focus} onChange={(event) => setFocus(event.target.value)}>{focusOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="exam-field"><span>会试主考</span><select value={examinerId} onChange={(event) => setExaminerId(event.target.value)}>{ministers.map((person) => <option key={person.id} value={person.id}>{person.rank} · {person.office ?? person.title} · {person.name}</option>)}</select></label>
      <button className="exam-primary" disabled={!examinerId} onClick={() => apply(startCivilExam(state, focus, examinerId), '开科旨意已下，各省依制举行乡试；约一月后中式名录送抵京城。')}>颁旨开科</button>
    </>;
    if (!exam) return <Empty message="当前没有正在办理的科举。" />;
    if (!stageReady) return <Empty icon={<ScrollText />} title="科举筹备中" message={waitingMessage} />;
    if (exam.status === 'PROVINCIAL_RESULTS') return <><Stage title="乡试汇报" copy={`各省共荐送${exam.candidates.length}名举人入京，籍贯、门第与初试成绩已经造册。`} /><div className="exam-list">{exam.candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} />)}</div><button className="exam-primary" onClick={() => apply(advanceCivilExamAtWenhua(state), '乡试名录御览完毕，准诸举人入京会试。')}>准入会试</button></>;
    if (exam.status === 'METROPOLITAN_READY') return <><Stage title="举行会试" copy={`主考官${state.people[exam.chiefExaminerId]?.name ?? ''}已经锁院，试卷将糊名誊录后送阅。`} /><button className="exam-primary" onClick={() => apply(advanceCivilExamAtWenhua(state), '会试已经结束，十二份试卷糊名送入阅卷房。')}>开闱会试</button></>;
    if (exam.status === 'GRADING') return <><Stage title="御览试卷" copy="会试成绩已核定。皇帝御览后取前六名为贡士，等候御书房亲拟殿试策问。" /><div className="exam-list compact">{[...exam.candidates].sort((a, b) => (b.metropolitanScore ?? 0) - (a.metropolitanScore ?? 0)).map((candidate, index) => <CandidateCard key={candidate.id} candidate={candidate} badge={index < 6 ? `贡士第${index + 1}` : undefined} />)}</div><button className="exam-primary" onClick={() => apply(advanceCivilExamAtWenhua(state), '会试阅卷完毕，已取六名贡士。请移驾御书房拟定殿试策问。')}>钦定贡士</button></>;
    if (exam.status === 'WAITING_QUESTION') return <Empty icon={<BookOpen />} title="等候御题" message="六名贡士已经取定，请移驾御书房拟定殿试策问。" />;
    if (!stageReady && (exam.status === 'PALACE_EXAM_READY' || exam.status === 'PROCLAMATION_READY')) return <Empty icon={<Landmark />} title="太和殿礼仪筹备中" message={waitingMessage} />;
    if (exam.status === 'PALACE_EXAM_READY') return <Empty icon={<Landmark />} title="贡士候试" message="策问已定，六名贡士正候太和殿殿试。" />;
    if (exam.status === 'PROCLAMATION_READY') return <Empty icon={<ScrollText />} title="等候传胪" message="一甲名次已经钦定，请移驾太和殿举行金殿传胪。" />;
    if (exam.status === 'APPOINTMENT_READY') return <><Stage title="进士授官" copy="金殿传胪已毕。依名次授翰林院修撰、编修、庶吉士及候补知县，人物将正式加入本朝臣子库。" /><div className="exam-list compact">{exam.candidates.filter((candidate) => candidate.finalRank).sort((a, b) => (a.finalRank === '状元' ? 0 : a.finalRank === '榜眼' ? 1 : a.finalRank === '探花' ? 2 : 3) - (b.finalRank === '状元' ? 0 : b.finalRank === '榜眼' ? 1 : b.finalRank === '探花' ? 2 : 3)).map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} badge={candidate.finalRank} />)}</div><button className="exam-primary" onClick={() => apply(advanceCivilExamAtWenhua(state), '新科进士已经授官，正式加入臣子名册。')}>颁旨授官</button></>;
    return <><Stage title={`${exam.cycleYear}年科举档案`} copy={`本科侧重${exam.focus}，共录取${exam.candidates.length}名进士，已经授官入仕。`} /><div className="exam-list compact">{exam.candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} badge={candidate.finalRank} />)}</div></>;
  };

  const renderStudy = () => {
    if (!exam || exam.status !== 'WAITING_QUESTION') return <Empty icon={<BookOpen />} title="御书房拟题" message="会试阅卷结束、贡士取定后，方可在此亲拟殿试策问。" />;
    if (!stageReady) return <Empty icon={<BookOpen />} title="殿试拟题筹备中" message={waitingMessage} />;
    return <><Stage title="亲拟殿试策问" copy="策问决定本届进士的考核方向，定题后贡士将移入太和殿候试。" /><div className="exam-question-list">{civilExamQuestions().map((question) => <button key={question} onClick={() => apply(setCivilExamQuestion(state, question), `殿试策问已定：“${question}”请移驾太和殿举行殿试。`, true)}>{question}</button>)}</div></>;
  };

  const renderTaihe = () => {
    if (!exam) return <Empty icon={<Landmark />} title="太和殿殿试" message="文华殿开科并完成会试后，贡士方可入殿应试。" />;
    if (!stageReady && (exam.status === 'PALACE_EXAM_READY' || exam.status === 'PROCLAMATION_READY')) return <Empty icon={<Landmark />} title="太和殿礼仪筹备中" message={waitingMessage} />;
    if (exam.status === 'PALACE_EXAM_READY') {
      const finalists = exam.topCandidateIds.map((id) => exam.candidates.find((candidate) => candidate.id === id)).filter((item): item is CivilExamCandidate => Boolean(item));
      const toggle = (id: string) => setRankedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current);
      return <><Stage title="太和殿殿试" copy={`策问：“${exam.question}”请选择三名贡士，依点击顺序钦定状元、榜眼、探花。`} /><div className="exam-rank-slots">{rankNames.map((rank, index) => <span key={rank}><b>{rank}</b>{exam.candidates.find((candidate) => candidate.id === rankedIds[index])?.name ?? '待定'}</span>)}</div><div className="exam-list">{finalists.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} selected={rankedIds.includes(candidate.id)} badge={rankedIds.includes(candidate.id) ? rankNames[rankedIds.indexOf(candidate.id)] : undefined} onClick={() => toggle(candidate.id)} />)}</div><button className="exam-primary" disabled={rankedIds.length !== 3} onClick={() => apply(completePalaceExam(state, rankedIds), '殿试名次已经钦定，太和殿将举行金殿传胪。')}>钦定一甲</button></>;
    }
    if (exam.status === 'PROCLAMATION_READY') return <><Stage title="金殿传胪" copy="礼部已经核定榜次，鸣赞官将在太和殿依次唱名。" /><div className="exam-proclamation">{exam.topCandidateIds.map((id, index) => { const candidate = exam.candidates.find((item) => item.id === id); return <span key={id}><b>{rankNames[index]}</b>{candidate?.name}</span>; })}</div><button className="exam-primary" onClick={() => apply(proclaimCivilExam(state), '金殿传胪礼成，请回文华殿为新科进士授官。', true)}>金殿传胪</button></>;
    return <Empty icon={<Landmark />} title="太和殿殿试" message="当前科举阶段尚不需要在太和殿办理。" />;
  };

  return <div className="royal-marriage-overlay exam-overlay" role="dialog" aria-modal="true" aria-label="科举事务">
    <section className="royal-marriage-panel exam-panel">
      <header><div><small>{venue === 'wenhua' ? '文华殿' : venue === 'study' ? '御书房' : '太和殿'}</small><h2>科举取士</h2></div><button aria-label="关闭科举面板" onClick={onClose}><X /></button></header>
      <main className="exam-content">{venue === 'wenhua' ? renderWenhua() : venue === 'study' ? renderStudy() : renderTaihe()}</main>
    </section>
  </div>;
}

function Stage({ title, copy }: { title: string; copy: string }) {
  return <section className="exam-stage-copy"><span><Check /></span><div><h3>{title}</h3><p>{copy}</p></div></section>;
}

function Empty({ icon, title = '科举事务', message }: { icon?: React.ReactNode; title?: string; message: string }) {
  return <section className="exam-empty">{icon ?? <ScrollText />}<h3>{title}</h3><p>{message}</p></section>;
}
