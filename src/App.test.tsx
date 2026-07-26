import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App, { AttendantEventDialog, ConsortAwayDialog } from './App';
import { vi } from 'vitest';
import type { GameEvent } from './game/gameState';

describe('App shell', () => {
  it('uses the standard dialogue-choice UI for pregnancy notices', () => {
    const event: GameEvent = {
      id: 'pregnancy-notice',
      type: 'PREGNANCY_NOTICE',
      priority: 80,
      createdOn: { year: 3, month: 12, day: 7 },
      personIds: ['empress'],
      title: '内侍传言',
      body: '坤宁宫主殿传来消息，沈皇后已有喜脉，请陛下示下。',
      choices: [
        { id: 'rejoice', label: '大喜', result: '六宫同贺。' },
        { id: 'visit', label: '前去关怀', result: '亲往探视。' },
      ],
      status: 'PENDING',
    };
    render(<AttendantEventDialog event={event} onChoose={() => undefined} />);

    const dialog = screen.getByRole('dialog', { name: /沈皇后已有喜脉/ });
    expect(dialog.closest('.scene-dialogue-overlay')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '大喜' })).toHaveClass('choice-btn');
    expect(screen.getByRole('button', { name: '前去关怀' })).toHaveClass('choice-btn');
  });

  it('uses the standard choice dialogue when a consort is away from her residence', () => {
    const dismiss = vi.fn();
    const yangxin = vi.fn();
    const follow = vi.fn();
    render(<ConsortAwayDialog consortName="顾清漪" locationName="御花园" onDismiss={dismiss} onYangxin={yangxin} onFollow={follow} />);
    expect(screen.getByText('启禀陛下，顾清漪此刻去了御花园，尚未回宫。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '罢了' }));
    fireEvent.click(screen.getByRole('button', { name: '回养心殿' }));
    fireEvent.click(screen.getByRole('button', { name: '拜驾御花园' }));
    expect(dismiss).toHaveBeenCalledOnce();
    expect(yangxin).toHaveBeenCalledOnce();
    expect(follow).toHaveBeenCalledOnce();
  });

  it('renders the game title and the four V1 navigation destinations', () => {
    render(<App />);
    expect(screen.getByText('紫宸纪')).toBeInTheDocument();
    for (const label of ['前朝', '后宫', '国库', '更多']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('opens the supplied Yangxin Hall background from its visible map plaque', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '进入养心殿' }));

    expect(screen.getByRole('heading', { name: '养心殿' })).toBeInTheDocument();
    expect(screen.getByText('批阅奏折、召见大臣与休憩之所。')).toBeInTheDocument();
  });

  it('uses the visible palace plaques as the only overview map targets', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: '进入养心殿' })).toHaveTextContent('养心殿');
    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    expect(screen.getByRole('button', { name: '进入翊坤宫' })).toHaveTextContent('翊坤宫');
    expect(screen.getByRole('button', { name: '查看承乾宫' })).toHaveTextContent('承乾宫');
    expect(screen.getByRole('button', { name: '查看冷宫' })).toHaveTextContent('冷宫');
  });

  it('uses the reusable palace compound and its master-hall background for inner palaces', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '进入翊坤宫' }));
    expect(screen.getByRole('button', { name: '主殿' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '主殿' }));
    expect(screen.getByRole('heading', { name: '翊坤宫·主殿' })).toBeInTheDocument();
  });

  it('opens east and west side halls without exposing a rear-hall action', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '进入翊坤宫' }));
    expect(screen.queryByRole('button', { name: '后殿' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '东侧殿' }));
    expect(screen.getByRole('heading', { name: '翊坤宫·东侧殿' })).toBeInTheDocument();
  });

  it('returns from a third-level hall to its palace before returning to the map', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '进入翊坤宫' }));
    fireEvent.click(screen.getByRole('button', { name: '主殿' }));
    fireEvent.click(screen.getByRole('button', { name: '返回上级地图' }));
    expect(screen.getByRole('button', { name: '主殿' })).toBeInTheDocument();
  });

  it('records a completed scene dialogue and opens character actions', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(.2);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '查看文华殿' }));
    fireEvent.click(screen.getByRole('button', { name: /沈砚之/ }));
    expect(screen.getByText('臣已将本季经筵策问拟好，请陛下定夺题旨。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '立刻询问详情' }));
    expect(screen.getByRole('button', { name: '调任' })).toBeInTheDocument();
    random.mockRestore();
  });

  it('returns to character actions when a scene dialogue is skipped', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(.2);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '查看文华殿' }));
    fireEvent.click(screen.getByRole('button', { name: /沈砚之/ }));
    fireEvent.click(screen.getByRole('button', { name: '跳过' }));

    expect(screen.getByRole('button', { name: '调任' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '跳过' })).not.toBeInTheDocument();
    random.mockRestore();
  });

  it('usually opens character actions directly when a portrait is tapped', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(.8);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '查看文华殿' }));
    fireEvent.click(screen.getByRole('button', { name: /沈砚之/ }));
    expect(screen.getByRole('button', { name: '调任' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '跳过' })).not.toBeInTheDocument();
    random.mockRestore();
  });

  it('opens the new named front-court and inner-court scene backgrounds', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '查看会同馆' }));
    expect(screen.getByRole('heading', { name: '会同馆' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回上级地图' }));
    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '查看毓庆宫' }));
    expect(screen.getByRole('heading', { name: '毓庆宫' })).toBeInTheDocument();
  });

  it('places the empress dowager and imperial consort dowager in their own palaces', () => {
    const first = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '查看慈宁宫' }));
    expect(screen.getByRole('button', { name: /孝和太后/ })).toBeInTheDocument();
    first.unmount();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '查看寿康宫' }));
    expect(screen.getByRole('button', { name: /荣太妃/ })).toBeInTheDocument();
  });

  it('opens live minister, consort, and heir rosters from their assigned scenes', () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '进入养心殿' }));
    fireEvent.click(screen.getByRole('button', { name: '臣子列表' }));
    expect(screen.getByRole('heading', { name: '大臣名册' })).toBeInTheDocument();
    expect(screen.getByText('沈砚之')).toBeInTheDocument();
    const ministerRoster = screen.getByRole('dialog', { name: '大臣名册' });
    fireEvent.click(within(ministerRoster).getByRole('button', { name: /沈砚之/ }));
    fireEvent.click(within(ministerRoster).getByRole('button', { name: '人物详情' }));
    expect(screen.getByTitle('人物详情')).toBeInTheDocument();
    act(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'person-detail-close' } })));
    expect(screen.queryByTitle('人物详情')).not.toBeInTheDocument();
    unmount();

    const second = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '查看交泰殿' }));
    fireEvent.click(screen.getByRole('button', { name: '妃子列表' }));
    expect(screen.getByRole('heading', { name: '后宫名册' })).toBeInTheDocument();
    expect(screen.getByText('沈皇后')).toBeInTheDocument();
    second.unmount();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '查看毓庆宫' }));
    fireEvent.click(screen.getByRole('button', { name: '皇子列表' }));
    expect(screen.getByRole('heading', { name: '皇嗣名册' })).toBeInTheDocument();
    expect(screen.getByText('名册中暂无符合条件的人物')).toBeInTheDocument();
  });

  it('opens the Jiaotai Hall selection workflow and schedules it one month later', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '查看交泰殿' }));
    fireEvent.click(screen.getByRole('button', { name: '宫中选秀' }));
    expect(screen.getByRole('dialog', { name: '选秀筹办' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '颁令筹办' }));
    expect(screen.getByText(/永和3年11月18日开选/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '关闭选秀界面' }));
    fireEvent.click(screen.getByRole('button', { name: '宫中选秀' }));
    expect(screen.getByText('选秀已经在筹备中，定于永和3年11月18日开始，请陛下届时移驾交泰殿。')).toBeInTheDocument();
  });

  it('opens flip cards in Yangxin Hall and starts the favor animation after selection', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '进入养心殿' }));
    fireEvent.click(screen.getByRole('button', { name: '召幸翻牌' }));
    expect(screen.getByTitle('侍寝翻牌')).toBeInTheDocument();

    act(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'flip-card-close' } })));
    expect(screen.queryByTitle('侍寝翻牌')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '召幸翻牌' }));
    const flipFrame = screen.getByTitle('侍寝翻牌');
    expect(flipFrame.getAttribute('srcdoc')).toContain('"id":"empress"');
    act(() => window.dispatchEvent(new MessageEvent('message', { data: { type: 'flip-card-select', personId: 'empress' } })));
    expect(screen.queryByTitle('侍寝翻牌')).not.toBeInTheDocument();
    expect(screen.getByTitle('临幸过场')).toBeInTheDocument();
  });

  it('closes the accountability picker from its top-right close target', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(.8);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '查看文华殿' }));
    fireEvent.click(screen.getByRole('button', { name: /沈砚之/ }));
    fireEvent.click(screen.getByRole('button', { name: '问责' }));
    expect(screen.getByText('问责处置')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(screen.queryByText('问责处置')).not.toBeInTheDocument();
    random.mockRestore();
  });

  it('moves a punished consort into the cold palace with custody-only actions', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(.8);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '查看坤宁宫' }));
    fireEvent.click(screen.getByRole('button', { name: '主殿' }));
    fireEvent.click(screen.getByRole('button', { name: /沈皇后/ }));
    fireEvent.click(screen.getByRole('button', { name: '问责' }));
    fireEvent.click(screen.getByRole('button', { name: '打入冷宫' }));
    fireEvent.click(screen.getByRole('button', { name: '关闭消息' }));
    fireEvent.click(screen.getByRole('button', { name: '返回上级地图' }));
    fireEvent.click(screen.getByRole('button', { name: '返回上级地图' }));
    fireEvent.click(screen.getByRole('button', { name: '查看冷宫' }));
    fireEvent.click(screen.getByRole('button', { name: /沈皇后/ }));
    expect(screen.getByRole('button', { name: '探望' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '刺死' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '恢复' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '临幸' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '恢复' }));
    expect(screen.getByText('恢复位份')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '贵人' }));
    fireEvent.click(screen.getByRole('button', { name: '关闭消息' }));
    expect(screen.queryByRole('button', { name: /沈皇后/ })).not.toBeInTheDocument();
    random.mockRestore();
  });

  it('cycles the time control through eight-times speed', () => {
    render(<App />);
    const speed = screen.getByRole('button', { name: '切换时间速度' });
    fireEvent.click(speed);
    fireEvent.click(speed);
    fireEvent.click(speed);
    expect(speed).toHaveTextContent('8×');
  });

  it('reports that there is no marriageable royal heir at the start of a new game', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '查看毓庆宫' }));
    fireEvent.click(screen.getByRole('button', { name: '皇子婚配' }));
    expect(screen.getByText('当前没有年满十五岁且尚未婚配的皇嗣。')).toBeInTheDocument();
  });

  it('shows the treasury inventory under the shared fixed shell', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '国库' }));
    expect(screen.getByRole('heading', { name: '国库' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /黄金万两/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '增加数量' })).toBeInTheDocument();
  });
});
