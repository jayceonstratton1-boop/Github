"""Build sip-and-co.html: a single-file copy of site/ (styles, script and images inlined) for previewing or sharing."""
import base64
import re
from pathlib import Path

site = Path(__file__).parent / "site"
html = (site / "index.html").read_text()
html = html.replace('<link rel="stylesheet" href="styles.css">', "<style>\n" + (site / "styles.css").read_text() + "</style>")
html = html.replace('<script src="script.js"></script>', "<script>\n" + (site / "script.js").read_text() + "</script>")


def inline(match):
    path = site / match.group(2)
    mime = "image/png" if path.suffix == ".png" else "image/jpeg"
    return f'{match.group(1)}="data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"'


html = re.sub(r'(src|href)="(images/[^"]+)"', inline, html)
(Path(__file__).parent / "sip-and-co.html").write_text(html)
