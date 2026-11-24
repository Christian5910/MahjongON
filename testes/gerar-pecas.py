#!/usr/bin/env python3
"""Gera pecas.svg (sprite com as 45 faces) a partir dos SVGs minificados do conjunto
"Riichi Mahjong Tiles" de FluffyStuff (CC0) e de desenhos próprios para flores e estações.
Uso: python3 gerar-pecas.py <pasta com os svgs minificados> <saida pecas.svg>
Os glifos (梅 蘭 菊 竹 春 夏 秋 冬 一 二 三 四) saem do Noto Serif CJK Bold (SIL OFL 1.1), convertidos em contornos."""
import re, sys, os, math
from fontTools.ttLib import TTCollection
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

pasta, saida = sys.argv[1], sys.argv[2]

# ---------- glifos ----------
_fonte = None
def fonte():
    global _fonte
    if _fonte is None:
        col = TTCollection('/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc')
        for f in col.fonts:
            nome = f['name'].getDebugName(1) or ''
            if 'JP' in nome:
                _fonte = f; break
        if _fonte is None: _fonte = col.fonts[0]
    return _fonte

def glifo(ch, x, y, tam, cor):
    f = fonte(); gs = f.getGlyphSet(); cmap = f.getBestCmap()
    nome = cmap[ord(ch)]
    s = tam / 1000.0
    pen = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
    # y do SVG cresce para baixo: espelha e põe a linha de base em y + 0.88*tam
    tp = TransformPen(pen, (s, 0, 0, -s, x, y + 0.88 * tam))
    gs[nome].draw(tp)
    return '<path fill="%s" d="%s"/>' % (cor, pen.getCommands())

PRETO, VERMELHO, AZUL, VERDE, VERDE2 = '#000', '#d71e1e', '#19328c', '#004900', '#2f8a2f'
MARROM, OURO, ROSA, ROXO, LARANJA = '#6b3f1d', '#e3a21a', '#c8325a', '#6a3d9a', '#d2691e'

def rot(cx, cy, r, ang):
    a = math.radians(ang); return cx + r * math.cos(a), cy + r * math.sin(a)

def flor5(cx, cy, r, cor, miolo):
    out = []
    for i in range(5):
        px, py = rot(cx, cy, r * 0.62, -90 + i * 72)
        out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (px, py, r * 0.5, cor))
    out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>' % (cx, cy, r * 0.26, miolo))
    for i in range(6):
        px, py = rot(cx, cy, r * 0.5, i * 60 + 15)
        out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff"/>' % (px, py, r * 0.06))
    return ''.join(out)

def ameixa():
    g = ['<path d="M70 330 C110 290 120 250 160 225 C200 200 210 170 245 120" fill="none" stroke="%s" stroke-width="12" stroke-linecap="round"/>' % MARROM,
         '<path d="M130 255 C140 230 135 205 150 180" fill="none" stroke="%s" stroke-width="8" stroke-linecap="round"/>' % MARROM,
         '<path d="M190 195 C205 215 225 225 245 225" fill="none" stroke="%s" stroke-width="7" stroke-linecap="round"/>' % MARROM]
    for (x, y, r) in [(120, 285, 30), (165, 220, 34), (150, 172, 28), (232, 130, 32), (238, 228, 26)]:
        g.append(flor5(x, y, r, ROSA, OURO))
    return ''.join(g)

def orquidea():
    g = []
    for d in ['M150 340 C100 300 70 230 60 150 C95 205 135 260 150 340 Z', 'M150 340 C175 280 215 215 255 160 C240 230 195 290 150 340 Z',
              'M150 340 C140 270 150 190 175 110 C180 190 170 270 150 340 Z']:
        g.append('<path d="%s" fill="%s"/>' % (d, VERDE2))
    g.append('<path d="M150 340 C140 300 130 250 135 200" fill="none" stroke="%s" stroke-width="5"/>' % VERDE)
    for (x, y) in [(135, 190), (162, 150), (118, 140)]:
        for i in range(5):
            px, py = rot(x, y, 24, -90 + i * 72)
            g.append('<ellipse cx="%.1f" cy="%.1f" rx="10" ry="18" transform="rotate(%d %.1f %.1f)" fill="%s"/>' % (px, py, i * 72, px, py, ROXO))
        g.append('<circle cx="%d" cy="%d" r="8" fill="%s"/>' % (x, y, OURO))
    return ''.join(g)

def crisantemo():
    g = []
    cx, cy = 150, 215
    for anel, (n, rr, rx, ry, cor) in enumerate([(18, 70, 12, 38, OURO), (14, 48, 10, 30, '#f0b93a'), (10, 28, 8, 20, LARANJA)]):
        for i in range(n):
            a = i * 360 / n + anel * 9
            px, py = rot(cx, cy, rr, a)
            g.append('<ellipse cx="%.1f" cy="%.1f" rx="%d" ry="%d" transform="rotate(%.1f %.1f %.1f)" fill="%s" stroke="#fff" stroke-width="2"/>' % (px, py, rx, ry, a + 90, px, py, cor))
    g.append('<circle cx="%d" cy="%d" r="14" fill="%s"/>' % (cx, cy, VERMELHO))
    g.append('<path d="M150 285 C150 310 140 330 120 345" fill="none" stroke="%s" stroke-width="7" stroke-linecap="round"/>' % VERDE)
    g.append('<path d="M142 318 C120 300 100 305 90 320 C110 330 130 330 142 318 Z" fill="%s"/>' % VERDE2)
    return ''.join(g)

def bambu():
    g = []
    for x in (95, 150, 205):
        g.append('<rect x="%d" y="70" width="18" height="270" rx="6" fill="%s"/>' % (x, VERDE2))
        for y in (115, 175, 235, 295):
            g.append('<rect x="%d" y="%d" width="24" height="8" rx="3" fill="%s"/>' % (x - 3, y, VERDE))
        g.append('<rect x="%d" y="70" width="5" height="270" rx="2" fill="#8ccf8c" opacity=".6"/>' % (x + 3))
    for (x, y, a) in [(113, 150, -35), (168, 120, 30), (223, 190, -25), (95, 235, 205), (150, 260, 160)]:
        g.append('<path d="M0 0 C25 -14 55 -10 70 0 C50 12 20 12 0 0 Z" transform="translate(%d %d) rotate(%d)" fill="%s"/>' % (x, y, a, VERDE))
    return ''.join(g)

def broto():
    g = ['<path d="M150 345 C150 300 148 260 150 215" fill="none" stroke="%s" stroke-width="9" stroke-linecap="round"/>' % VERDE,
         '<path d="M150 235 C105 245 70 215 62 170 C110 165 145 190 150 235 Z" fill="%s"/>' % VERDE2,
         '<path d="M150 235 C195 245 230 215 238 170 C190 165 155 190 150 235 Z" fill="%s"/>' % VERDE2,
         '<path d="M150 235 C140 190 150 150 150 110 C160 150 165 195 150 235 Z" fill="%s"/>' % VERDE,
         '<path d="M100 345 C125 335 175 335 200 345" fill="none" stroke="%s" stroke-width="8" stroke-linecap="round"/>' % MARROM]
    g.append(flor5(150, 100, 26, ROSA, OURO))
    return ''.join(g)

def sol():
    g = []
    cx, cy = 150, 215
    for i in range(16):
        a = i * 22.5
        x1, y1 = rot(cx, cy, 62, a); x2, y2 = rot(cx, cy, 98 if i % 2 == 0 else 84, a)
        g.append('<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-width="%d" stroke-linecap="round"/>' % (x1, y1, x2, y2, VERMELHO, 9 if i % 2 == 0 else 6))
    g.append('<circle cx="%d" cy="%d" r="52" fill="%s"/>' % (cx, cy, VERMELHO))
    g.append('<circle cx="%d" cy="%d" r="36" fill="%s"/>' % (cx, cy, OURO))
    return ''.join(g)

def folha():
    g = ['<path d="M150 335 L150 160" stroke="%s" stroke-width="7" stroke-linecap="round"/>' % MARROM,
         '<path d="M150 90 L178 135 L228 125 L205 175 L248 205 L195 220 L205 265 L160 250 L150 300 L140 250 L95 265 L105 220 L52 205 L95 175 L72 125 L122 135 Z" fill="%s" stroke="%s" stroke-width="4" stroke-linejoin="round"/>' % (LARANJA, VERMELHO)]
    for a in (-60, -30, 0, 30, 60):
        x, y = rot(150, 245, 105, -90 + a)
        g.append('<path d="M150 245 L%.1f %.1f" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % (x, y, VERMELHO))
    return ''.join(g)

def neve():
    g = []
    cx, cy = 150, 215
    for i in range(6):
        a = i * 60
        x2, y2 = rot(cx, cy, 100, a)
        g.append('<path d="M%d %d L%.1f %.1f" stroke="%s" stroke-width="9" stroke-linecap="round"/>' % (cx, cy, x2, y2, AZUL))
        for r in (45, 70):
            bx, by = rot(cx, cy, r, a)
            for s in (-1, 1):
                ex, ey = rot(bx, by, 24 if r == 45 else 18, a + 55 * s)
                g.append('<path d="M%.1f %.1f L%.1f %.1f" stroke="%s" stroke-width="6" stroke-linecap="round"/>' % (bx, by, ex, ey, AZUL))
    g.append('<circle cx="%d" cy="%d" r="11" fill="%s"/>' % (cx, cy, AZUL))
    return ''.join(g)

FLORES = [('梅', '一', ameixa, VERMELHO), ('蘭', '二', orquidea, VERMELHO), ('菊', '三', crisantemo, VERMELHO), ('竹', '四', bambu, VERMELHO),
          ('春', '一', broto, AZUL), ('夏', '二', sol, AZUL), ('秋', '三', folha, AZUL), ('冬', '四', neve, AZUL)]

def desenho_flor(nome, numero, fn, cor_num):
    return (glifo(nome, 36, 44, 78, PRETO) + fn() + glifo(numero, 196, 280, 70, cor_num))

# ---------- faces do Fluffy ----------
def idsRef(s):
    return set(re.findall(r'href="#([^"]+)"', s)) | set(re.findall(r'url\(#([^)]+)\)', s))

def limpar(arq, pref):
    s = open(arq, encoding='utf-8').read()
    m = re.search(r'<svg[^>]*>(.*)</svg>\s*$', s, re.S)
    corpo = m.group(1) if m else ''
    ref = idsRef(corpo)
    def troca(mm):
        i = mm.group(1)
        return ' id="%s%s"' % (pref, i) if i in ref else ''
    corpo = re.sub(r' id="([^"]+)"', troca, corpo)
    corpo = re.sub(r'href="#([^"]+)"', lambda mm: 'href="#%s%s"' % (pref, mm.group(1)), corpo)
    corpo = re.sub(r'url\(#([^)]+)\)', lambda mm: 'url(#%s%s)' % (pref, mm.group(1)), corpo)
    return corpo.replace('xlink:href', 'href')

mapa = {}
for n in range(1, 10):
    mapa['t-m%d' % n] = 'Man%d.svg' % n; mapa['t-p%d' % n] = 'Pin%d.svg' % n; mapa['t-s%d' % n] = 'Sou%d.svg' % n
mapa['t-m0'] = 'Man5-Dora.svg'; mapa['t-p0'] = 'Pin5-Dora.svg'; mapa['t-s0'] = 'Sou5-Dora.svg'
for i, nome in enumerate(['Ton', 'Nan', 'Shaa', 'Pei', 'Haku', 'Hatsu', 'Chun']): mapa['t-z%d' % (i + 1)] = nome + '.svg'

partes = ['<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true">']
for sid, arq in mapa.items():
    corpo = limpar(os.path.join(pasta, arq), sid + '-')
    partes.append('<symbol id="%s" viewBox="0 0 300 400">%s</symbol>' % (sid, corpo))
# dragão branco: o conjunto original deixa a peça em branco; só acrescento a moldura fina que o identifica
partes[[i for i, x in enumerate(partes) if x.startswith('<symbol id="t-z5"')][0]] = '<symbol id="t-z5" viewBox="0 0 300 400"><rect x="48" y="62" width="204" height="276" rx="14" fill="none" stroke="#19328c" stroke-width="10"/></symbol>'
for i, (nome, num, fn, cor) in enumerate(FLORES):
    partes.append('<symbol id="t-f%d" viewBox="0 0 300 400">%s</symbol>' % (i + 1, desenho_flor(nome, num, fn, cor)))
partes.append('</svg>')
open(saida, 'w', encoding='utf-8').write(''.join(partes))
print('símbolos:', len(mapa) + len(FLORES), 'bytes:', os.path.getsize(saida))
