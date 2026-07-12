import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App shell', () => {
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

  it('runs scene dialogue before exposing character actions', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '查看文华殿' }));
    fireEvent.click(screen.getByRole('button', { name: /沈砚之/ }));
    expect(screen.getByText('臣已将本季经筵策问拟好，请陛下定夺题旨。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '立刻询问详情' }));
    expect(screen.getByRole('button', { name: '调任' })).toBeInTheDocument();
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

  it('shows the treasury inventory under the shared fixed shell', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '国库' }));
    expect(screen.getByRole('heading', { name: '国库' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /黄金万两/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '增加数量' })).toBeInTheDocument();
  });
});
