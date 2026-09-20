#!/usr/bin/env python3
"""Validate planning integrity, never claim the game is implemented."""
import copy
import hashlib
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    path = ROOT / name
    assert path.is_file(), f"Missing file: {name}"
    return path.read_text()

def graph_errors(tickets, requirements):
    errors = []
    ids = [t['id'] for t in tickets]
    if len(ids) != len(set(ids)):
        errors.append('duplicate ticket ID')
    known = set(ids)
    req_ids = {r['id'] for r in requirements}
    covered = set()
    by_id = {t['id']: t for t in tickets}
    for t in tickets:
        if not t.get('criteria') or len(t['criteria']) < 4:
            errors.append(f"ticket {t['id']} lacks acceptance criteria")
        for dep in t['depends']:
            if dep not in known:
                errors.append(f"ticket {t['id']} missing dependency {dep}")
            elif dep >= t['id']:
                errors.append(f"ticket {t['id']} not in dependency order")
        for req in t['requirements']:
            if req not in req_ids:
                errors.append(f"unknown requirement {req}")
            covered.add(req)
    for req in sorted(req_ids - covered):
        errors.append(f"uncovered requirement {req}")
    visiting, done = set(), set()
    def visit(node):
        if node in visiting:
            errors.append('dependency cycle')
            return
        if node in done or node not in by_id:
            return
        visiting.add(node)
        for dep in by_id[node]['depends']:
            visit(dep)
        visiting.remove(node)
        done.add(node)
    for node in ids:
        visit(node)
    return errors

def load():
    return json.loads(read('docs/requirements.json')), json.loads(read('docs/tickets.json'))['tickets']

def requirements():
    reqs, tickets = load()
    assert len(reqs) == 25, f'Confirmed decision ledger changed: {len(reqs)}'
    assert len({r['id'] for r in reqs}) == len(reqs)
    spec_text = read('.scratch/cats/spec.md')
    for r in reqs:
        assert r['id'] in spec_text, f"Spec missing {r['id']}"
        assert r['title'] and r['decision']
    assert not graph_errors(tickets, reqs), graph_errors(tickets, reqs)
    print(f'PASS requirements: {len(reqs)} decisions covered')

def spec():
    text = read('.scratch/cats/spec.md')
    for heading in ['Problem Statement', 'Solution', 'User Stories', 'Implementation Decisions', 'Testing Decisions', 'Out of Scope', 'Further Notes']:
        assert re.search(r'^#{2,3} '+re.escape(heading)+r'\s*$', text, re.M), heading
    stories = re.findall(r'^\d+\. As an? .+', text, re.M)
    assert len(stories) >= 40, f'Insufficient user-story coverage: {len(stories)}'
    for story in stories:
        assert ', I want ' in story and ', so that ' in story, f'Story format: {story}'
    for phrase in ['Moo-Moo', 'proposed', 'eight', 'ghost', 'free-build']:
        assert phrase.lower() in text.lower(), phrase
    assert 'approved-direction.png' in text
    for name in ['docs/architecture.md', 'docs/contracts.md', 'docs/adr/0001-simulation-and-saves.md']:
        assert len(read(name)) > 500
    print(f'PASS spec: {len(stories)} user stories and required sections')

def tickets():
    reqs, data = load()
    errors = graph_errors(data, reqs)
    assert not errors, errors
    files = list((ROOT / '.scratch/cats/issues').glob('*.md'))
    assert len(files) == len(data), 'Manifest/file mismatch'
    for t in data:
        name = f".scratch/cats/issues/{t['id']:02d}-{t['slug']}.md"
        text = read(name)
        for marker in ['**What to build:**', '**Blocked by:**', '**Status:** ready-for-agent', '## Acceptance criteria', '## Verification', 'independent blind review']:
            assert marker.lower() in text.lower(), f'{name}: {marker}'
        for criterion in t['criteria']:
            assert criterion in text, f'{name}: manifest criterion missing'
        assert len(re.findall(r'^- \[ \]', text, re.M)) >= len(t['criteria'])
    print(f'PASS tickets: {len(data)} files; {sum(len(t["depends"]) for t in data)} acyclic prerequisite edges')

def handoff():
    _, data = load()
    plan = read('docs/superpowers/plans/2026-09-20-cats.md')
    for t in data:
        assert f"### Task {t['id']:02d}: {t['title']}" in plan
        assert f"tests/e2e/{t['slug']}.spec.ts" in plan
    for name in ['README.md', 'START-HERE.md', 'PROGRESS.md', 'docs/ticket-index.md', 'docs/decision-map.md', 'docs/art/README.md']:
        assert len(read(name)) > 200
    image = ROOT / 'docs/art/approved-direction.png'
    assert image.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
    expected_hash = read('docs/art/approved-direction.sha256').split()[0]
    assert hashlib.sha256(image.read_bytes()).hexdigest() == expected_hash, 'Approved picture changed'
    assert 'approved-direction.png' in plan and 'approved-direction.png' in read('README.md')
    assert 'No particular model' in plan
    for name in ['README.md', 'START-HERE.md', 'docs/ticket-index.md', 'docs/superpowers/plans/2026-09-20-cats.md', '.scratch/cats/spec.md']:
        for link in re.findall(r'\]\(([^)]+)\)', read(name)):
            if '://' in link or link.startswith('#'):
                continue
            target = (ROOT / name).parent / link.split('#')[0]
            assert target.exists(), f'Broken link in {name}: {link}'
    print(f'PASS handoff: {len(data)} task plans; exact approved picture; local links resolve')

def self_test():
    reqs, data = load()
    assert not graph_errors(data, reqs)
    cases = []
    broken = copy.deepcopy(data); broken.append(copy.deepcopy(broken[0])); cases.append(broken)
    broken = copy.deepcopy(data); broken[1]['depends'] = [999]; cases.append(broken)
    broken = copy.deepcopy(data); broken[0]['depends'] = [2]; cases.append(broken)
    broken = copy.deepcopy(data)
    for t in broken: t['requirements'] = [r for r in t['requirements'] if r != 'R25']
    cases.append(broken)
    broken = copy.deepcopy(data); broken[0]['criteria'] = []; cases.append(broken)
    broken = copy.deepcopy(data); broken[0]['requirements'].append('R999'); cases.append(broken)
    assert all(graph_errors(c, reqs) for c in cases), 'Validator accepted a broken manifest'
    print(f'PASS self-test: {len(cases)} malformed manifests rejected')

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'all'
    functions = {'requirements': requirements, 'spec': spec, 'tickets': tickets, 'handoff': handoff, 'self-test': self_test}
    try:
        if mode == 'all':
            for fn in functions.values(): fn()
            print('PASS all: planning integrity only; no game implementation claimed')
        else:
            functions[mode]()
    except (AssertionError, KeyError, ValueError) as exc:
        print(f'FAIL {mode}: {exc}', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
