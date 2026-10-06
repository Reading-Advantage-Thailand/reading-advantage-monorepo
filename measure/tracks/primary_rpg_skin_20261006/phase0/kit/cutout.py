"""Key the Forge studio grey (174,179,186) out of a view render: flood from the borders through
neutral light pixels; the soft shadow becomes semi-transparent black. Writes RGBA in place."""
import sys
from collections import deque
from PIL import Image
BG=(174,179,186); BGL=sum(BG)/3
def cut(path):
    im=Image.open(path).convert('RGBA'); w,h=im.size; px=im.load()
    seen=bytearray(w*h); q=deque()
    def ok(x,y):
        r,g,b,a=px[x,y]
        if a==0: return True
        l=(r+g+b)/3
        return abs(r-g)<12 and abs(g-b)<12 and abs(r-b)<18 and 95<=l<=BGL+6
    for x in range(w):
        for y in (0,h-1):
            if ok(x,y): q.append((x,y)); seen[y*w+x]=1
    for y in range(h):
        for x in (0,w-1):
            if ok(x,y) and not seen[y*w+x]: q.append((x,y)); seen[y*w+x]=1
    while q:
        x,y=q.popleft()
        for nx,ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1)):
            if 0<=nx<w and 0<=ny<h and not seen[ny*w+nx] and ok(nx,ny):
                seen[ny*w+nx]=1; q.append((nx,ny))
    n=0
    for y in range(h):
        for x in range(w):
            if seen[y*w+x]:
                r,g,b,a=px[x,y]; l=(r+g+b)/3
                d=(BGL-l)/BGL
                alpha=0 if d<0.03 else int(min(0.55,d*1.4)*255)
                px[x,y]=(0,0,0,alpha); n+=1
    im.save(path); return n/(w*h)
for p in sys.argv[1:]:
    print(f"{cut(p):.2f} {p.split('/')[-1]}")
