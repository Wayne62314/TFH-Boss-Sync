"""Verify archive contents and isolated portable startup without attaching to games."""
from pathlib import Path
import os,subprocess,tempfile,zipfile
root=Path(__file__).resolve().parent
archive=root/'release/TFH-Boss-Sync-v0.5.1-windows-x64.zip'
with tempfile.TemporaryDirectory(prefix='TFH share 验证 ') as d,zipfile.ZipFile(archive) as z:
 names=z.namelist()
 if z.testzip() is not None:raise RuntimeError('Archive CRC failure')
 for name in names:
  parts=Path(name).parts
  if '..' in parts or Path(name).is_absolute() or 'logs' in parts:raise RuntimeError('Unexpected archive path')
  if name.endswith(('.gfs','.foit','.lua','.jsonl')):raise RuntimeError('Unexpected game data/log')
 z.extractall(d)
 folder=Path(d)/'TFH-Boss-Sync';exe=folder/'TFH-Boss-Sync.exe'
 for name in ['README.md','README.zh-CN.md','MOVES.en.md','MOVES.zh-CN.md','_internal/oleander-entry-guard.js','licenses/Python-LICENSE.txt']:
  if not (folder/name).is_file():raise RuntimeError('Missing '+name)
 env=dict(os.environ);env.pop('PYTHONHOME',None);env.pop('PYTHONPATH',None)
 env['PATH']=str(Path(os.environ['SystemRoot'])/'System32')+';'+os.environ['SystemRoot']
 for arg in ['--self-test','--ui-self-test']:
  result=subprocess.run([str(exe),arg],cwd=folder,env=env,timeout=45,creationflags=subprocess.CREATE_NO_WINDOW)
  if result.returncode:raise RuntimeError('Isolated portable startup failed: '+arg)
print('PASS: archive CRC, no game data/logs, required files, Unicode/spaced extraction path, isolated runtime and bilingual UI smoke checks; no game attach')
