#!/usr/bin/env python3
"""Idempotently publish the authorized Cats plan. Never close an issue."""
import json
from pathlib import Path
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
REPO = 'russellcainiv/cats'
BASE = f'https://github.com/{REPO}'

def command(args):
    result = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError((result.stdout + result.stderr)[-1800:])
    return result.stdout

def api(path, *args):
    return json.loads(command(['gh', 'api', path, *args]))

def existing():
    return {i['title']: i for i in api(f'repos/{REPO}/issues?state=all&per_page=100') if 'pull_request' not in i}

def specs():
    manifest = json.loads((ROOT/'docs/tickets.json').read_text())['tickets']
    result = [{'key':'spec','title':'Cats — complete game specification and implementation roadmap','body':'.scratch/cats/publish/spec.md','labels':['kind:spec','ready-for-agent','priority:high','area:simulation','area:building','area:art','area:platform','area:ux','area:content']}]
    for t in manifest:
        n=t['id']; area='area:simulation'
        if n in [1,3,29,32]: area='area:platform'
        if n in [7,8,9,10]: area='area:building'
        if n in [15,16,24]: area='area:content'
        if n in [26,28]: area='area:ux'
        if n==27: area='area:art'
        if n in [30,31]: area='area:qa'
        result.append({'key':f'task-{n:02d}','title':f"[Cats {n:02d}] {t['title']}",'body':f".scratch/cats/publish/{n:02d}-{t['slug']}.md",'labels':['kind:feature','ready-for-agent',area,'priority:high' if n in [1,3,19,21,29,31,32] else 'priority:normal']})
    result.append({'key':'map','title':'Cats — decisions to validate during implementation','body':'.scratch/cats/publish/map.md','labels':['wayfinder:map','needs-info','priority:normal']})
    for slug,title,kind in [('01-recipient','Personalize the gift using her real cats','grilling'),('02-balance','Validate the fixed lifespan and household economy','prototype'),('03-phone-art','Approve the playable phone composition','prototype')]:
        result.append({'key':slug,'title':title,'body':f'.scratch/cats/decisions/{slug}.md','labels':['wayfinder:'+kind,'needs-info','priority:normal']})
    return result

def create():
    found=existing()
    for item in specs():
        if item['title'] in found:
            print('exists',item['key'],found[item['title']]['number'],flush=True)
            continue
        args=['/opt/homebrew/bin/gh-axi','issue','create','--repo',REPO,'--title',item['title'],'--body-file',item['body']]
        for label in item['labels']: args += ['--label',label]
        command(args)
        print('created',item['key'],flush=True)
        time.sleep(1)

def registry():
    found=existing(); mapping={}
    for item in specs():
        issue=found.get(item['title'])
        if not issue: raise RuntimeError('Missing '+item['key'])
        mapping[item['key']]={'number':issue['number'],'id':issue['id'],'url':issue['html_url'],'title':issue['title']}
    return {'repository':BASE,'github':mapping}

def relations():
    mapping=registry()['github']
    data=json.loads((ROOT/'docs/tickets.json').read_text())['tickets']
    for parent_key,children in [('spec',[f'task-{t["id"]:02d}' for t in data]),('map',['01-recipient','02-balance','03-phone-art'])]:
        parent=mapping[parent_key]
        old={i['id'] for i in api(f'repos/{REPO}/issues/{parent["number"]}/sub_issues?per_page=100')}
        for key in children:
            child=mapping[key]
            if child['id'] not in old:
                api(f'repos/{REPO}/issues/{parent["number"]}/sub_issues','-X','POST','-F',f'sub_issue_id={child["id"]}')
                time.sleep(1)
        print('children verified',parent_key,len(children),flush=True)
    for t in data:
        issue=mapping[f'task-{t["id"]:02d}']
        old={i['id'] for i in api(f'repos/{REPO}/issues/{issue["number"]}/dependencies/blocked_by?per_page=100')}
        for dep in t['depends']:
            source=mapping[f'task-{dep:02d}']
            if source['id'] not in old:
                api(f'repos/{REPO}/issues/{issue["number"]}/dependencies/blocked_by','-X','POST','-F',f'issue_id={source["id"]}')
                time.sleep(1)
        print('dependencies verified',t['id'],len(t['depends']),flush=True)

def verify():
    found=existing(); mapping=registry()['github']; data=json.loads((ROOT/'docs/tickets.json').read_text())['tickets']
    for item in specs():
        issue=found[item['title']]
        labels={l['name'] for l in issue['labels']}
        assert set(item['labels']) <= labels, ('labels', item['key'])
        assert issue['state']=='open', ('premature closure',item['key'])
        assert issue['body'].strip() == (ROOT/item['body']).read_text().strip(), ('body drift',item['key'])
    for parent_key,children in [('spec',[f'task-{t["id"]:02d}' for t in data]),('map',['01-recipient','02-balance','03-phone-art'])]:
        observed={i['id'] for i in api(f'repos/{REPO}/issues/{mapping[parent_key]["number"]}/sub_issues?per_page=100')}
        expected={mapping[key]['id'] for key in children}
        assert observed == expected, ('children',parent_key,observed,expected)
    for t in data:
        issue=mapping[f'task-{t["id"]:02d}']
        observed={i['id'] for i in api(f'repos/{REPO}/issues/{issue["number"]}/dependencies/blocked_by?per_page=100')}
        expected={mapping[f'task-{n:02d}']['id'] for n in t['depends']}
        assert observed == expected, ('dependencies',t['id'],observed,expected)
    print(f'PASS GitHub: {len(specs())} open issues; exact bodies; all labels; 35 sub-issue links; {sum(len(t["depends"]) for t in data)} native dependency edges')

if __name__=='__main__':
    mode=sys.argv[1]
    if mode=='registry': print(json.dumps(registry(),indent=2))
    else: {'create':create,'relations':relations,'verify':verify}[mode]()
