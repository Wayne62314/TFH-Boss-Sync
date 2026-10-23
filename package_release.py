"""Collect runtime notices and create a clean distributable; no logs or game data."""
from pathlib import Path
import hashlib,importlib.metadata,shutil,sys,zipfile
root=Path(__file__).resolve().parent
bundle=root/'dist/TFH-Boss-Sync'
for name in ['README.md','README.zh-CN.md','MOVES.en.md','MOVES.zh-CN.md','THIRD_PARTY_NOTICES.txt']:
 shutil.copy2(root/name,bundle/name)
licenses=bundle/'licenses';licenses.mkdir(exist_ok=True)
shutil.copy2(Path(sys.base_prefix)/'LICENSE.txt',licenses/'Python-LICENSE.txt')
for name in ['frida','pyinstaller']:
 dist=importlib.metadata.distribution(name);count=0
 for item in dist.files or []:
  if item.name.upper().startswith(('LICENSE','COPYING','NOTICE','AUTHORS')):
   source=Path(dist.locate_file(item))
   if source.is_file():
    target=licenses/name/str(item);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target);count+=1
 if not count:raise RuntimeError('Missing runtime license: '+name)
extra=root/'third_party';
if extra.exists():shutil.copytree(extra,licenses/'additional',dirs_exist_ok=True)
release=root/'release';release.mkdir(exist_ok=True)
archive=release/'TFH-Boss-Sync-v0.5.0-windows-x64.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted(bundle.rglob('*')):
  if f.is_file() and 'logs' not in f.relative_to(bundle).parts:z.write(f,Path(bundle.name)/f.relative_to(bundle))
checksum=hashlib.sha256(archive.read_bytes()).hexdigest()
# Generated metadata, not a source edit.
(release/'SHA256SUMS.txt').write_text(checksum+'  '+archive.name+'\n',encoding='ascii')
print('Packaged',archive.name,archive.stat().st_size,'bytes; SHA256',checksum)
