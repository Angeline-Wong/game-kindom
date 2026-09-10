import { describe, expect, it } from 'vitest';
import { createInitialGameState, migrateGameState } from './initialGameState';
import { killPerson, normalizePersonLife } from './person';
import { processHealth } from './health';
import { currentEvent, resolveEvent } from './simulation';

describe('royal death dialogue notices', () => {
  it.each(['CONSORT', 'DOWAGER', 'PRINCE', 'PRINCESS', 'NOBLE'] as const)('queues and acknowledges a %s death even though the person is dead', kind => {
    const state = createInitialGameState();
    state.events = [];
    state.people.empress.kind = kind;
    const dead = killPerson(state, 'empress', '疾病');
    const event = currentEvent(dead)!;
    expect(event.title).toContain('宗亲丧讯');
    expect(event.body).toContain(state.people.empress.name);
    expect(event.body).toContain('疾病');
    expect(event.body).toContain(`${state.people.empress.age}岁`);
    expect(event.choices.map(choice => choice.label)).toEqual(['悲痛欲绝', '前去追封', '朕知道了']);
    const resolved = resolveEvent(dead, event.id, 'acknowledge');
    expect(resolved.events[0].status).toBe('RESOLVED');
    const loaded = migrateGameState(JSON.parse(JSON.stringify(resolved)));
    expect(loaded.events.filter(e => e.id === event.id)).toHaveLength(1);
    expect(currentEvent(normalizePersonLife(loaded))).toBeUndefined();
  });

  it('persists multiple pending deaths and presents the next after acknowledgment', () => {
    const state = createInitialGameState();
    state.events = [];
    const dead = killPerson(killPerson(state, 'empress', '疾病'), 'empress-dowager', '疾病');
    const loaded = migrateGameState(JSON.parse(JSON.stringify(dead)));
    expect(loaded.events.filter(e => e.status === 'PENDING')).toHaveLength(2);
    const first = currentEvent(loaded)!;
    expect(currentEvent(resolveEvent(loaded, first.id))?.id).not.toBe(first.id);
    expect(normalizePersonLife(loaded).events).toEqual(loaded.events);
  });

  it('queues a notice from health settlement but does not replay historical deaths', () => {
    const state = createInitialGameState();
    state.events = [];
    state.people.empress.stats['健康'] = 0;
    expect(currentEvent(processHealth(state, state.clock))?.id).toBe('death-notice-empress');
    state.people.empress.status = 'DEAD';
    expect(normalizePersonLife(state).events).toHaveLength(0);
  });
});
