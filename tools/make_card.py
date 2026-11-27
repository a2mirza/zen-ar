"""Rebuild zen-card.png (the card texture every scene uses) from the high-res source art.
usage: python3 tools/make_card.py [assets/source/zen-card-platinum.png]
Output: 640 px wide portrait RGBA with rounded corners (radius 5.5% of width), written to the repo root."""
import os, sys
from PIL import Image, ImageDraw
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets', 'source', 'zen-card-platinum.png')
im = Image.open(src).convert('RGBA')
if im.width > im.height: im = im.rotate(90, expand=True)          # cards stand upright (portrait)
bb = im.getchannel('A').getbbox();  im = im.crop(bb) if bb else im
W = 640; im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=round(W * .055), fill=255)
a = Image.composite(im.getchannel('A'), Image.new('L', im.size, 0), m); im.putalpha(a)
im.save(os.path.join(ROOT, 'zen-card.png'), optimize=True); print('zen-card.png', im.size)
