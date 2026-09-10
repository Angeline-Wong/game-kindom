import { it, expect } from 'vitest';
import { buildDialogueHistory } from './dialogueHistory';
it('adds favor and study gains to prince conversation while keeping relationship gains', () => {
 const input = {record:{kind:'PRINCE' as const,name:'萧景安',sex:'MALE' as const,traits:[]},opening:{text:'谈论课业',reply:'皇帝指点课业。'}};
 const result = buildDialogueHistory(input);
 expect(result.effects).toEqual(expect.arrayContaining([{label:'宠爱',value:3},{label:'勤奋',value:1},{label:'文学',value:1},{label:'亲近',value:2}]));
 expect(buildDialogueHistory({...input,skipped:true}).effects).not.toContainEqual({label:'宠爱',value:3});
});
