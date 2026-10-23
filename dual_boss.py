"""Consenting mod sessions; identical native-input boss rules on both character sides."""
from pathlib import Path
import argparse,hashlib,json,msvcrt,os,subprocess,sys,tempfile,threading,time
from datetime import datetime

ROOT=Path(__file__).resolve().parent
VERSION='0.5.1'
PROFILES={
 '03E20EECE23F39FB1012061A5A7FF92F4B63DA23EB8EB641CF6EE379CBCE373D':dict(name='steam-reviewed',reset=0x1773720,update=0x189b7e0,flag=0x1780f40,scene=0x2b0d1e8,input=0x17617a0,inputReturn=0x1775825,make=0x3e3170,enqueue=0x1795980),
 '1D36C6CE32352C364E22F2B627C033C38AA660F84FF39ED0DFBB1B742AB8A5C6':dict(name='second-install-reviewed',reset=0x1773220,update=0x189b3f0,flag=0x1780a40,scene=0x2b0d208,input=0x17612a0,inputReturn=0x1775325,make=0x3e3140,enqueue=0x1795480),
}
RESOURCE_HASH='5C57D152125922C6D47E5E8F6680D88F3E8B65780F0EC574D78E812741C5CD0C'
for profile in PROFILES.values():
 profile['registry']=0x2fa6850 if profile['name']=='steam-reviewed' else 0x2fa6930
 profile['subtract']=0x18d4308 if profile['name']=='steam-reviewed' else 0x18d3f18
 profile['entryGuard']=0x1758798 if profile['name']=='steam-reviewed' else 0x1758298
def digest(path):
 with Path(path).open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest().upper()
def discover():
 query='''[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; @(Get-Process -Name "Them's Fightin' Herds" -ErrorAction SilentlyContinue | ForEach-Object { @{pid=$_.Id;path=$_.Path;base=('0x{0:x}' -f $_.MainModule.BaseAddress.ToInt64())} }) | ConvertTo-Json -Compress'''
 result=subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-Command',query],capture_output=True,encoding='utf-8',timeout=20,creationflags=subprocess.CREATE_NO_WINDOW)
 if result.returncode:raise RuntimeError('Process discovery failed')
 rows=json.loads(result.stdout or '[]');return [rows] if isinstance(rows,dict) else rows
def validate_clients(games,pids):
 if not 1<=len(pids)<=2 or len(set(pids))!=len(pids):raise ValueError('Select one game, or two different local test games')
 found={g['pid']:dict(g) for g in games}
 if any(pid not in found for pid in pids):raise ValueError('Selected process no longer exists')
 pair=[found[p] for p in pids]
 for g in pair:
  exe=Path(g['path']);h=digest(exe)
  if exe.name!="Them's Fightin' Herds.exe" or h not in PROFILES:raise ValueError('Unsupported exact EXE build: '+str(g['pid']))
  if digest(exe.parent/'data01'/'characters-foits.gfs')!=RESOURCE_HASH:raise ValueError('Character resource build mismatch')
  # Loose overrides can supersede package data. Do not silently trust them.
  overrides=[p for name in ['uni.foit','uni_charSelect.foit','velvet.foit','velvet_charSelect.foit'] for p in (exe.parent/'dev').rglob(name)]
  if overrides:raise ValueError('Loose character resource overrides found; inspect before testing')
  g.update(hash=h,profile=PROFILES[h])
 return pair

def validate_pair(games,pids):
 if len(pids)!=2 or len(set(pids))!=2:raise ValueError('Select two different PIDs')
 return validate_clients(games,pids)
def main(argv=None,stop_event=None,event_callback=None):
 parser=argparse.ArgumentParser(description='TFH Boss Sync: Oleander and Velvet')
 parser.add_argument('--list',action='store_true');parser.add_argument('--pids',type=int,nargs='+')
 parser.add_argument('--mod-session',action='store_true',help='All participants consent and run this same release')
 parser.add_argument('--local-pair-test',action='store_true',help='Confirm both selected clients are your controlled test pair')
 parser.add_argument('--self-test',action='store_true');args=parser.parse_args(argv)
 import frida
 resources=Path(getattr(sys,'_MEIPASS',ROOT))
 source='\n'.join((resources/n).read_text(encoding='utf-8') for n in ['boss-policy.js','velvet-balance-policy.js','oleander-balance-policy.js','oleander-input.js','oleander-damage.js','oleander-entry-guard.js','velvet-input.js','boss-hook.js'])
 if args.self_test:
  assert len(PROFILES)==2 and all(s in source for s in ['dualBossEligible','oleanderBalanceStep','createNativeDualOleander','velvetBalanceStep']) and callable(frida.attach)
  print('PASS: dual-client source/runtime available; no attach or game writes');return 0
 games=discover()
 if args.list:
  print(json.dumps(games,ensure_ascii=False,indent=2));return 0
 if not args.local_pair_test and not args.mod_session:raise ValueError('Confirm a consenting --mod-session or --local-pair-test')
 if args.pids is None:
  if not 1<=len(games)<=2:raise ValueError('Start one game, or two local test games')
  args.pids=[g['pid'] for g in games]
 pair=(validate_pair if args.local_pair_test else validate_clients)(games,args.pids)
 done=stop_event if stop_event is not None else threading.Event();sessions=[];scripts=[];locks=[];code=0;log_lock=threading.Lock()
 home=Path(sys.executable).resolve().parent if getattr(sys,'frozen',False) else ROOT
 logdir=home/'logs';logdir.mkdir(exist_ok=True)
 with (logdir/('boss-sync-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.jsonl')).open('x',encoding='utf-8') as log:
  def record(value):
   text=json.dumps(value,ensure_ascii=False)
   with log_lock:
    log.write(text+'\n');log.flush()
    if sys.stdout:print(text,flush=True)
   if event_callback:event_callback(value)
  try:
   for g in sorted(pair,key=lambda g:g['pid']):
    lock=(Path(tempfile.gettempdir())/f"tfhmod-huggles-{g['pid']}.lock").open('a+b');locks.append(lock)
    if os.fstat(lock.fileno()).st_size==0:lock.write(b'0');lock.flush()
    lock.seek(0);msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
   for g in pair:
    s=frida.attach(g['pid']);sessions.append(s)
    s.on('detached',lambda *a:done.set())
    sc=s.create_script(source.replace('__BASE__',g['base']).replace('__PROFILE__',json.dumps(g['profile'])))
    scripts.append(sc)
    def message(m,data,pid=g['pid']):
     record({'pid':pid,'message':m})
     if m.get('type')=='error' or m.get('payload',{}).get('event')=='fault':done.set()
    sc.on('message',message);sc.load();state=sc.exports_sync.preflight();record({'preflight':state,'path':g['path']})
    if state['mode'] not in [None,15]:raise RuntimeError('Both games must be at main menu before activation; no mid-match attachment')
   for sc in scripts:sc.exports_sync.install()
   if done.is_set():raise RuntimeError('Pair lost before activation')
   for sc in scripts:sc.exports_sync.enable()
   record({'event':'pair_enabled','pids':args.pids,'version':VERSION,'remoteHandshake':False})
   elapsed=0
   while not done.wait(1):
    elapsed+=1
    if elapsed%5==0:
     for g,sc in zip(pair,scripts):record({'event':'snapshot','pid':g['pid'],'status':sc.exports_sync.status()})
  except KeyboardInterrupt:pass
  except Exception as e:record({'event':'host_error','message':str(e)});code=1
  finally:
   for sc in scripts:
    try:sc.exports_sync.shutdown()
    except Exception:pass
   for s in sessions:
    try:s.detach()
    except Exception:pass
   for lock in locks:lock.close()
   record({'event':'stopped','restartGames':True})
 return code
if __name__=='__main__':
 try:raise SystemExit(main())
 except Exception as e:print('REFUSED: '+str(e),flush=True);raise SystemExit(1)
