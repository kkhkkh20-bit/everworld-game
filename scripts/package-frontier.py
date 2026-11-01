"""Bundle the local game as one offline HTML; no build dependencies required."""
import base64
import json
import sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent

def data(name):
    path = root / 'assets' / 'frontier' / name
    mime = 'image/svg+xml' if path.suffix == '.svg' else 'image/png'
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode()

html = (root / 'frontier.html').read_text()
html = html.replace('<link rel="stylesheet" href="frontier.css">', '<style>' + (root / 'frontier.css').read_text() + '</style>')
engine = (root / 'js/frontier-engine.js').read_text()
ui = (root / 'js/frontier-ui.js').read_text()
ui = ui.replace("images[name].src='assets/frontier/'+name+'.png'", 'images[name].src=' + json.dumps({n:data(n+'.png') for n in ['town', 'people', 'farm']}) + '[name]')
ui = ui.replace("const icon=id=>'assets/frontier/'+(id==='farm'?'wheat':id==='smith'?'anvil':'village')+'.svg';", 'const icon=id=>('+json.dumps({k:data(v+'.svg') for k,v in [('farm','wheat'),('smith','anvil'),('home','village'),('market','village')]})+')[id];')
html = html.replace('<script src="js/frontier-engine.js"></script><script src="js/frontier-ui.js"></script>', '<script>'+engine+'</script><script>'+ui+'</script>')
html = html.replace('assets/frontier/village.svg', data('village.svg')).replace('href="frontier.html"', 'href="#"').replace('href="index.html?classic=1"', 'href="https://kkhkkh20-bit.github.io/everworld-game/?classic=1"').replace('href="THIRD_PARTY_ASSETS.md"', 'href="https://github.com/kkhkkh20-bit/everworld-game/blob/main/THIRD_PARTY_ASSETS.md"')
out = Path(sys.argv[1]) if len(sys.argv)>1 else root / 'dist' / '새벽숲.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
print(str(out), out.stat().st_size, 'bytes')
