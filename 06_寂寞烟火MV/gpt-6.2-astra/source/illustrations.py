"""Original cel artwork for the coastal night train, in design-space units."""
import math
import re
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'_work'/'cels'
OUT.mkdir(exist_ok=True,parents=True)
INK='#172539'; DARK='#101e30'; NAVY='#23354a'
PAPER='#f3dfb5'; GOLD='#ffc383'

class Cel:
    def __init__(self,w,h,s=2):
        self.s=s;self.w=w;self.h=h
        self.im=Image.new('RGBA',(round(w*s),round(h*s)));self.d=ImageDraw.Draw(self.im)
    def points(self,pts):return [(round(x*self.s),round(y*self.s)) for x,y in pts]
    def poly(self,pts,col):self.d.polygon(self.points(pts),fill=col)
    def line(self,pts,col,width=1):
        self.d.line(self.points(pts),fill=col,width=max(1,round(width*self.s)),joint='curve')
    def box(self,x,y,x2,y2,col):self.d.rectangle(self.points([(x,y),(x2,y2)]),fill=col)
    def oval(self,x,y,x2,y2,col):self.d.ellipse(self.points([(x,y),(x2,y2)]),fill=col)
    def rr(self,x,y,x2,y2,r,col):
        self.d.rounded_rectangle(self.points([(x,y),(x2,y2)]),radius=int(r*self.s),fill=col)
    def path(self,data,col=None,stroke=None,width=1):
        tokens=re.findall(r'[MLQCZ]|-?\d*\.?\d+',data)
        j=0;pts=[];start=(0,0);cur=start
        while j<len(tokens):
            cmd=tokens[j];j+=1
            if cmd=='Z':pts.append(start);continue
            n={'M':1,'L':1,'Q':2,'C':3}[cmd];p=[]
            for _ in range(n):
                p.append((float(tokens[j]),float(tokens[j+1])));j+=2
            if cmd in ('M','L'):
                pts.append(p[0]);cur=p[0]
                if cmd=='M':start=cur
            else:
                a=cur
                dist=sum(math.dist(v,vv) for v,vv in zip([a]+p,p))
                steps=max(5,min(80,math.ceil(dist/4)))
                for k in range(1,steps+1):
                    t=k/steps;u=1-t
                    if cmd=='C':pt=tuple(u**3*a[i]+3*u*u*t*p[0][i]+3*u*t*t*p[1][i]+t**3*p[2][i] for i in (0,1))
                    else:pt=tuple(u*u*a[i]+2*t*u*p[0][i]+t*t*p[1][i] for i in (0,1))
                    pts.append(pt)
                cur=p[-1]
        if col:self.poly(pts,col)
        if stroke:self.line(pts,stroke,width)
    def txt(self,x,y,text,sz,col,font='NotoSerifSC-VF.ttf',anchor='lt'):
        f=ImageFont.truetype('C:/Windows/Fonts/'+font,round(sz*self.s))
        if font=='NotoSerifSC-VF.ttf':
            f.set_variation_by_axes([520 if sz>40 else 575])
        self.d.text((round(x*self.s),round(y*self.s)),text,font=f,fill=col,anchor=anchor)
    def save(self,name):
        self.im.save(OUT/(name+'.png'),compress_level=2)

def portrait():
    c=Cel(580,640,2.5)
    # The silhouette is carried by the outer coat, the small upturned face and the bob.
    c.path('M 182 219 Q 194 257 171 285 L 204 326 L 273 286 Q 253 259 257 211 Z','#cc8772',INK,2)
    c.path('M 187 243 Q 208 252 238 224 Q 228 255 194 276 Z','#ac6660')
    c.path('M 182 270 Q 128 290 99 323 Q 78 355 68 428 L 46 640 L 401 640 Q 386 549 367 464 Q 362 404 338 355 Q 319 303 261 278 Z','#b65449',INK,3)
    c.path('M 123 310 Q 146 289 173 285 L 187 318 Q 152 335 125 382 Q 106 431 91 485 L 63 554 Q 73 417 88 367 Q 100 323 123 310 Z','#ec8463')
    c.path('M 263 286 Q 315 301 341 357 Q 367 430 368 479 L 346 504 L 309 488 Q 324 406 299 366 Z','#9b4a45')
    c.path('M 119 345 Q 131 315 188 294 L 175 331 L 113 390 Z','#f19971',INK,1.8)
    c.path('M 229 314 L 280 299 L 303 337 L 279 344 L 286 367 L 234 401 L 209 371 Z','#d86b54',INK,2)
    c.path('M 162 325 Q 132 376 128 436 Q 126 510 110 640',None,'#693f42',3)
    c.path('M 300 349 Q 329 374 329 423 Q 329 466 314 497 L 292 536 L 264 516 L 282 451 Q 291 417 282 393',None,'#683c40',3)
    c.path('M 274 461 Q 290 432 319 422 Q 299 443 291 481 Z','#924748')
    c.path('M 93 490 Q 139 502 163 505 L 205 477 L 221 490 L 160 531 L 88 520 Z','#a64a45',INK,1.6)
    c.path('M 68 589 L 106 595 L 107 600 L 67 596 Z','#e28263')
    c.path('M 97 378 Q 107 347 134 327',None,'#f8a77d',1.1)
    c.path('M 297 362 Q 322 386 321 408',None,'#d57e65',1.15)
    c.path('M 313 498 L 281 538 Q 275 545 253 547 L 211 544 Q 196 543 189 537 L 180 524 L 203 501 L 235 513 L 268 498 Z','#bd5d4e',INK,2)
    c.path('M 182 522 Q 193 506 202 500 L 217 508 L 201 543 L 190 538 Z','#96504a',INK,1.5)
    c.path('M 207 517 Q 194 509 178 507 L 158 499 Q 152 498 151 502 L 157 512 L 148 509 Q 143 510 146 515 L 159 527 L 188 534 L 197 536 Z','#edb795',INK,1.7)
    c.path('M 164 516 Q 175 521 186 522',None,'#c08672',1)
    c.path('M 220 537 Q 244 539 261 535',None,'#df8061',1.3)
    for x,y in [(141,406),(125,485),(115,567)]:
        c.path(f'M {x} {y} q'.replace(' q','')+f' Q {x+14} {y-5} {x+28} {y+1}',None,'#4c393c',4)
        c.rr(x+6,y-3,x+24,y+2,2,'#d7aa7b');c.line([(x+12,y-2),(x+11,y+3)],INK,1.6)
    for j in range(13):
        y=378+j*13;c.line([(86-j*.6,y),(83-j*.6,y+7)],'#f09a71',.65)
    # A heavy teal woven scarf with selvage, an offset stripe and tassels.
    c.path('M 170 261 Q 201 274 246 250 Q 266 247 282 263 L 297 289 Q 277 312 246 320 Q 210 340 171 318 Q 151 307 146 293 Q 153 272 170 261 Z','#507e80',INK,2.7)
    c.path('M 151 290 Q 180 317 217 303 Q 237 298 266 275 Q 244 312 207 319 Q 176 326 155 304 Z','#2e555e')
    c.path('M 181 272 Q 215 283 250 261',None,'#b5c4a8',2.1)
    c.path('M 161 283 Q 178 298 197 298',None,'#78a29a',2.4)
    c.path('M 254 300 Q 275 310 296 353 L 316 410 L 286 417 Q 274 365 239 322 Z','#467779',INK,2.2)
    for delta in (0,5,18):
        c.line([(281+delta*.22,384+delta),(307+delta*.22,377+delta)],'#a5b5a1',1.1)
    for j in range(10):
        x=285+j*3;y=415-j*.7;c.line([(x,y),(x+2,y+8+(j%3)*2)],'#427073',1.6)
    # Skin planes, nose, cupid's bow and chin are a single ink contour.
    c.path('M 91 91 Q 74 120 78 146 Q 82 160 70 178 Q 62 189 48 201 Q 44 206 52 209 L 65 214 Q 68 218 65 222 Q 63 225 70 227 Q 64 230 69 234 Q 76 237 78 245 Q 81 258 96 259 Q 125 258 160 247 Q 183 243 199 221 Q 225 190 230 139 L 216 76 Z','#f3c09e',INK,2.3)
    c.path('M 72 183 Q 66 201 61 206 L 53 204 Z','#ffe1b1')
    c.path('M 78 242 Q 93 250 128 243 Q 159 234 182 215 Q 179 230 165 242 Q 134 254 103 257 Q 85 260 80 249 Z','#d8967c')
    c.path('M 86 117 Q 117 115 150 132 L 158 168 Q 143 155 122 154 Q 103 148 78 153 Z','#db9e87')
    c.path('M 77 137 Q 93 124 120 130 L 137 134 Q 112 132 98 134 L 80 141 Z','#524044')
    c.path('M 78 154 Q 94 145 115 152 Q 102 164 85 164 Z','#f9dbc0',INK,1.2)
    c.oval(82,150,96,163,'#405361');c.oval(82,151,90,161,'#202e3c')
    c.oval(84,150,87,153,'#fff0c4');c.line([(89,161),(94,158)],'#c29972',1)
    c.path('M 75 151 Q 86 148 94 147 Q 106 146 119 152 Q 103 150 94 151 Q 83 153 78 157 Z','#2c303c')
    c.line([(81,153),(74,149)],'#38313b',1.7)
    c.path('M 57 207 Q 63 205 67 209',None,'#af7168',1.2)
    c.path('M 65 223 Q 73 221 79 221 Q 75 225 68 227 Z','#c47771')
    c.line([(65,226),(73,226),(79,224)],'#804f52',1.2)
    c.path('M 70 232 Q 75 235 80 230',None,'#ffcfac',1.3)
    # Uneven blush hatching follows the cheekbone.
    for j in range(11):
        x=91+3*j;y=175+2*math.sin(j*.43)
        c.line([(x,y),(x-1.7,y+4)],'#db9a86',.68)
    c.path('M 132 103 Q 103 129 59 140 Q 77 128 86 108 Q 68 128 49 128 Q 63 111 64 91 Q 72 49 106 24 Q 152 -3 201 12 Q 242 13 270 42 Q 307 76 302 124 Q 299 166 315 193 Q 333 226 377 226 Q 355 239 329 230 Q 365 262 425 244 Q 377 280 328 264 Q 349 286 382 284 Q 342 303 304 278 Q 303 291 315 300 Q 274 295 251 269 Q 253 290 263 300 Q 240 290 223 265 Q 205 238 207 217 Q 190 243 172 249 Q 185 226 178 209 Q 168 231 144 237 Q 165 203 153 183 Q 142 160 145 137 Q 131 165 114 174 Q 131 142 132 103 Z','#26374a',INK,2.6)
    c.path('M 74 88 Q 96 29 157 22 Q 202 16 240 42 Q 202 29 164 38 Q 115 44 74 88 Z','#536175')
    c.path('M 76 89 Q 125 44 173 43 Q 131 53 98 84 L 86 95 L 108 68 Z','#697484')
    c.path('M 176 47 Q 223 27 264 76 Q 283 101 280 143 Q 274 122 263 107 Q 253 69 226 58 Q 202 45 176 47 Z','#43566a')
    c.path('M 164 79 Q 158 106 158 144 Q 153 174 166 199 Q 171 218 156 230 Q 165 207 151 184 Q 140 165 146 132 Z','#394c61')
    c.path('M 218 159 Q 216 207 245 238 Q 266 264 291 269 Q 268 260 250 234 Q 220 198 222 172 Z','#425368')
    c.path('M 260 163 Q 266 207 311 230 Q 326 238 348 239 Q 321 244 296 230 Q 269 212 260 186 Z','#4c586a')
    c.path('M 234 221 Q 235 259 258 276',None,'#827573',1.3)
    c.path('M 63 118 Q 99 56 150 44',None,'#a89383',1.3)
    c.path('M 90 102 Q 114 57 161 48',None,'#777c83',1)
    c.path('M 113 91 Q 129 61 162 52',None,'#859199',.8)
    for j in range(10):
        c.path(f'M {199+j*4} {34+j*2} Q {259+j*3} {36+j*3} {272+j*2} {107+j*5}',None,'#33445a',.8)
    # Exposed ear, engraved inner contour, a little brass drop earring.
    c.path('M 163 160 Q 176 141 186 151 Q 198 165 185 184 Q 173 201 163 192 Q 159 186 163 178 Z','#daa28a',INK,1.6)
    c.path('M 167 170 Q 179 153 184 158 Q 188 165 183 170 Q 177 169 172 181',None,'#a96764',1.7)
    c.oval(167,188,172,193,'#ffdb91');c.line([(170,193),(169,202)],'#d99e63',1.4)
    c.oval(166.1,201,171.6,207.4,'#efb975')
    c.path('M 171 54 Q 183 110 153 168 Q 166 161 174 144 Q 197 98 182 63 Z','#26374a')
    c.path('M 49 129 Q 55 106 54 90 Q 57 48 105 25',None,'#655c63',1)
    c.path('M 195 15 Q 230 -1 258 16',None,'#645b67',1)
    c.path('M 57 111 Q 78 65 126 42',None,'#b19580',.7)
    c.path('M 107 116 Q 133 92 143 61',None,'#566577',.8)
    c.path('M 211 56 Q 249 72 261 116',None,'#617084',.9)
    c.path('M 286 194 Q 304 226 333 228',None,'#78818a',1.1)
    c.path('M 257 217 Q 267 242 297 253',None,'#667488',.8)
    c.save('girl')
    c=Cel(580,640,2.5)
    c.path('M 76 147 Q 100 141 119 151 L 122 161 Q 100 171 79 168 Z','#e7ad92')
    c.path('M 76 154 Q 93 164 118 152 Q 99 166 80 160 Z','#493c43')
    c.save('blink')
    # Long loose hair strands are a separate wind-animated cel.
    c=Cel(580,640,2)
    cols=['#26374a','#2e4051','#586374','#bd927c']
    for j in range(13):
        a=j/12; xx=345+j*8
        c.path(f'M {274+a*10} {158+a*54} C {293+a*11} {213+a*60} {345+a*70} {256+a*17} {xx+47} {222-28*math.sin(a*3)}',None,cols[j%4],.7+1.1*(1-a))
    c.save('strands')

def boat():
    c=Cel(360,165,3)
    c.path('M 7 58 L 98 83 L 176 13 L 228 67 L 349 37 L 278 125 L 137 147 L 55 117 Z','#e0b991',INK,1.8)
    c.poly([(7,58),(136,106),(137,147),(55,117)],'#c58f75')
    c.poly([(7,58),(112,80),(136,106)],'#f0d4a4')
    c.poly([(176,13),(167,94),(98,88)],'#ffe7b4')
    c.poly([(176,13),(228,67),(167,94)],'#d6a583')
    c.poly([(136,106),(349,37),(278,125),(137,147)],'#efd3a4')
    c.poly([(136,106),(349,37),(273,91)],'#ffedbd')
    c.line([(13,61),(136,107),(345,39)],'#fff1cc',2)
    c.line([(137,111),(139,143)],'#a37e70',.9)
    c.line([(148,137),(260,113)],'#d6ae8a',.8)
    # Broken indigo ruling and a faded vermilion postmark on the folded ticket.
    for j in range(3):
        c.line([(155,118+j*3),(208,103+j*3)],'#a99a8d',.65)
    c.d.arc(c.points([(238,71),(268,103)]),184,430,fill='#c58067',width=3)
    for j in range(4):
        c.line([(250+j*3,86-j),(253+j*3,92-j)],'#c48c75',.9)
    c.save('boat')

def hands():
    c=Cel(610,360,2.5)
    c.path('M 611 252 Q 555 233 515 211 Q 477 184 458 161 Q 437 135 418 128 L 342 99 Q 320 91 306 83 L 271 62 Q 260 57 255 63 Q 253 72 267 85 L 298 108 L 253 89 L 191 57 Q 178 50 172 57 Q 168 65 183 77 L 226 109 L 185 91 L 120 57 Q 108 52 102 58 Q 100 67 115 79 L 178 124 Q 204 143 227 155 Q 251 171 271 185 Q 300 210 332 218 Q 369 227 398 244 L 487 331 L 610 359 Z','#efbb96',INK,2.3)
    c.path('M 116 77 Q 175 126 227 153 Q 269 189 306 204 Q 344 221 376 224 Q 344 210 321 192 Q 298 189 263 166 Q 204 124 172 112 Z','#d99b80')
    c.path('M 192 78 Q 217 98 246 111 L 291 130',None,'#b67769',1.8)
    c.path('M 268 85 Q 308 115 349 124',None,'#c38875',1.6)
    c.path('M 401 164 Q 383 153 371 145 L 334 112 Q 324 102 317 104 Q 308 106 313 117 L 345 165 Q 355 182 370 188',None,'#be8170',2.2)
    c.path('M 459 174 Q 486 204 518 220 L 487 281 L 441 261 L 406 231 Q 442 216 459 174 Z','#567b80',INK,2)
    c.path('M 478 177 Q 514 202 556 220 L 611 237 L 610 359 L 503 344 L 445 293 Q 460 276 466 240 Q 480 208 478 177 Z','#c56450',INK,2.3)
    c.path('M 479 179 Q 514 199 560 219 L 610 236 L 610 251 Q 547 227 484 197 Z','#f08e66')
    c.path('M 448 294 Q 464 278 478 244',None,'#864a45',2.3)
    c.save('hand')

if __name__=='__main__':
    portrait();boat();hands()
