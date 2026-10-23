import unittest
from unittest.mock import patch
import dual_boss

class PairTests(unittest.TestCase):
 def test_distinct_pids_required(self):
  with self.assertRaises(ValueError):dual_boss.validate_pair([], [1,1])
 def test_missing_process_rejected(self):
  with self.assertRaises(ValueError):dual_boss.validate_pair([], [1,2])
 def test_unknown_build_rejected(self):
  rows=[dict(pid=i,path="C:/test/Them's Fightin' Herds.exe",base='0x1000') for i in [1,2]]
  with patch.object(dual_boss,'digest',return_value='UNKNOWN'):
   with self.assertRaisesRegex(ValueError,'Unsupported exact EXE'):dual_boss.validate_pair(rows,[1,2])
 def test_resources_must_match(self):
  rows=[dict(pid=i,path="C:/test/Them's Fightin' Herds.exe",base='0x1000') for i in [1,2]]
  with patch.object(dual_boss,'digest',side_effect=[next(iter(dual_boss.PROFILES)), 'wrong']):
   with self.assertRaisesRegex(ValueError,'resource build mismatch'):dual_boss.validate_pair(rows,[1,2])
if __name__=='__main__':unittest.main()
