import re

with open('src/game/dialogueLibrary.ts', 'r', encoding='utf-8') as f:
    text = f.read()

def count(full):
    pat = 'const ' + full + ': DialogueScene\\[\\] = \\['
    m = re.search(pat, text)
    if not m:
        return 0
    start = m.end()
    depth = 0
    i = start
    while i < len(text):
        ch = text[i]
        if ch == '[':
            depth += 1
        elif ch == ']':
            if depth == 0:
                break
            depth -= 1
        i += 1
    body = text[start:i]
    return len(re.findall(r"id: '[a-z][a-z0-9-]+', kind:", body))

for k in ['consort', 'prince', 'dowager', 'noble', 'princess', 'minister', 'eunuch', 'courtLady']:
    print(f'{k:12s} {count(k + "Dialogues"):3d}')