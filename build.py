"""Stage Girofy's existing public site as static assets for the Sites Worker."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "public"
FILES = (
    "index.html", "software-sob-medida.html", "sistemas-internos.html",
    "aplicativos-empresariais.html", "plataformas-digitais.html",
    "automacao-integracoes.html", "sites-para-empresas.html",
    "guia-escolher-software.html", "criacao-de-sites-para-empresas.html",
    "projeto.html", "styles.css", "ads-landing.css", "app.js", "pages.js",
    "projeto.js", "config.js", "brand-boot.js", "brand-loading.js",
    "robots.txt", "sitemap.xml", "llms.txt", "_headers", "favicon.png"
)

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)
for name in FILES:
    shutil.copy2(ROOT / name, OUT / name)
shutil.copytree(ROOT / "assets", OUT / "assets")
print(f"Ativos públicos preparados em {OUT}")
