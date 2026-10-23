import shutil,tempfile,threading,unittest
from pathlib import Path
from unittest.mock import patch
import dual_boss as engine

class ShareTests(unittest.TestCase):
 def test_single_client_has_same_hash_resource_checks(self):
  row=dict(pid=1,path="C:/test/Them's Fightin' Herds.exe",base='0x1000')
  with patch.object(engine,'digest',side_effect=[next(iter(engine.PROFILES)),engine.RESOURCE_HASH]):
   result=engine.validate_clients([row],[1]);self.assertEqual(len(result),1);self.assertIn('entryGuard',result[0]['profile'])
  with patch.object(engine,'digest',return_value='UNKNOWN'):
   with self.assertRaisesRegex(ValueError,'Unsupported exact EXE'):engine.validate_clients([row],[1])
 def test_selection_limits(self):
  for pids in [[],[1,1],[1,2,3]]:
   with self.assertRaises(ValueError):engine.validate_clients([],pids)
 def exercise_host(self,count,mode=15):
  calls=[];events=[];done=threading.Event()
  class Script:
   def __init__(self):self.exports_sync=self
   def on(self,*args):pass
   def load(self):calls.append('load')
   def preflight(self):return dict(mode=mode)
   def install(self):calls.append('install')
   def enable(self):calls.append('enable')
   def shutdown(self):calls.append('shutdown')
  class Session:
   def on(self,*args):pass
   def create_script(self,source):
    self.assert_source=source
    if 'createNativeDualOleanderEntryGuard' not in source:raise AssertionError('Missing guard')
    return Script()
   def detach(self):calls.append('detach')
  rows=[dict(pid=901001+i,path='reviewed.exe',base='0x1000',profile=next(iter(engine.PROFILES.values()))) for i in range(count)]
  def record(event):
   events.append(event)
   if event.get('event')=='pair_enabled':done.set()
  with tempfile.TemporaryDirectory() as d:
   for f in engine.ROOT.glob('*.js'):shutil.copy2(f,Path(d)/f.name)
   with patch.object(engine,'ROOT',Path(d)),patch.object(engine,'discover',return_value=rows),patch.object(engine,'validate_clients',return_value=rows),patch('frida.attach',side_effect=lambda pid:Session()),patch('builtins.print'):
    code=engine.main(['--mod-session','--pids',*[str(r['pid']) for r in rows]],stop_event=done,event_callback=record)
  return code,calls,events
 def test_one_client_activation_and_stop_cleans_up(self):
  code,calls,events=self.exercise_host(1);self.assertEqual(code,0)
  for action in ['install','enable','shutdown','detach']:self.assertEqual(calls.count(action),1)
  self.assertFalse(next(e for e in events if e.get('event')=='pair_enabled')['remoteHandshake'])
 def test_two_client_activation_and_stop_cleans_both(self):
  code,calls,_=self.exercise_host(2);self.assertEqual(code,0)
  for action in ['install','enable','shutdown','detach']:self.assertEqual(calls.count(action),2)
 def test_midmatch_refuses_before_install(self):
  code,calls,events=self.exercise_host(1,mode=1);self.assertEqual(code,1)
  self.assertNotIn('install',calls);self.assertIn('detach',calls)
  self.assertTrue(any(e.get('event')=='host_error' for e in events))

if __name__=='__main__':unittest.main()
