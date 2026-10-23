"""Build clean delivery zips from already-built files; no external publication."""
from pathlib import Path
import zipfile, hashlib
root=Path(__file__).resolve().parent.parent
out=root.parent/'deliverables';out.mkdir(exist_ok=True)
def pack(name,base,prefix,extra=()):
    dest=out/name
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(base.rglob('*')):
            if p.is_file() and not any(part in ('.git','node_modules','__pycache__') for part in p.parts):z.write(p, str(Path(prefix)/p.relative_to(base)))
        for p,arc in extra:z.write(p,str(Path(prefix)/arc))
    print(dest, dest.stat().st_size, hashlib.sha256(dest.read_bytes()).hexdigest())
pack('zheyigou-browser-and-source.zip',root,'zheyigou')
pack('zheyigou-wechat-project.zip',root/'wechat','zheyigou-wechat',[(root/'docs/WECHAT.md','README.md')])
