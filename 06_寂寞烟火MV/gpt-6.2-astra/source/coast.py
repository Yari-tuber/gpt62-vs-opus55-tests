"""Paint the railway, lighthouse and station plates from geometric primitives."""
from illustrations import *

def town():
    c=Cel(1600,220,1.5);r=random.Random(132)
    for layer in range(3):
        x=-20
        base=[80,125,172][layer]
        while x<1600:
            w=r.randint(7,34)*(1+layer*.25);h=r.randint(9,33)+layer*2
            y=base-9*math.sin(x/145)-12*math.sin(x/76)-h
            side=['#536778','#43576a','#314758'][layer];front=['#696f79','#576977','#43596a'][layer]
            c.poly([(x,y+2),(x+w*.73,y-1),(x+w,y+3),(x+w,base+30),(x,base+30)],front)
            c.poly([(x+w*.73,y-1),(x+w,y+3),(x+w,base+30),(x+w*.73,base+30)],side)
            if r.random()<.28:
                c.box(x+w*.1,y-6,x+w*.5,y,front);c.line([(x+w*.63,y),(x+w*.63,y-11)],side,.7)
            for a in range(2,int(w*.68),5):
                for b in range(5,h,6):
                    if r.random()<.34:
                        c.box(x+a,y+b,x+a+r.choice([1.2,2.4]),y+b+1.3,r.choice(['#a88377','#eab185','#f9cf94','#788e94']))
            x+=w-1
    c.path('M 0 168 Q 190 156 356 171 Q 550 184 669 164 Q 900 151 1120 172 Q 1210 190 1441 164 L 1600 166 L 1600 221 L 0 221 Z','#324b5c')
    for i in range(900):
        x=r.randrange(1600);y=r.randrange(172,207);c.line([(x,y),(x+r.uniform(.6,7),y)],r.choice(['#68808a','#4d6473','#f2bc8f','#3e5b69']),.62)
    # Harbour cranes and sloping warehouses break the apartment-block silhouette.
    for cx,cy,size in [(247,48,.85),(330,67,.72),(710,42,1.05),(1036,53,.76)]:
        cc='#455c6b'
        c.poly([(cx-3*size,cy+42*size),(cx+2*size,cy-1*size),(cx+7*size,cy+42*size)],cc)
        c.line([(cx-13*size,cy+2*size),(cx+48*size,cy-14*size),(cx+5*size,cy-7*size),(cx-13*size,cy+2*size)],cc,1.45*size)
        c.line([(cx+44*size,cy-13*size),(cx+44*size,cy+6*size)],cc,.8)
        c.box(cx-6*size,cy-1*size,cx+7*size,cy+4*size,cc)
    for cx in range(52,1550,115):
        y=r.randrange(126,148)
        c.poly([(cx,y),(cx+16,y-9),(cx+58,y-8),(cx+71,y+1),(cx+71,y+17),(cx,y+17)],'#4d6370')
        c.line([(cx-2,y),(cx+16,y-9),(cx+58,y-8)],'#819194',1.6)
        for j in range(4):c.box(cx+9+j*14,y+5,cx+13+j*14,y+7,'#d9af82')
    # An irregular, tapering headland, ending in open water.
    import numpy as np
    ar=np.array(c.im)
    yy,xx=np.ogrid[:ar.shape[0],:ar.shape[1]]
    x=xx/c.s;y=yy/c.s
    end=np.clip((1600-x)/325,0,1);end=end*end*(3-2*end)
    upper=174-(192+9*np.sin(x*.07))*end
    bottom=176+27*end+3*np.sin(x*.021)+1.5*np.sin(x*.089)
    ar[:,:,3]=(ar[:,:,3]*np.clip((y-upper)/1.2,0,1)*np.clip((bottom-y)/2,0,1)*np.clip((1600-x)/43,0,1)).astype('uint8')
    c.im=Image.fromarray(ar);c.save('town')

def train():
    c=Cel(1450,130,1.7);r=random.Random(54)
    for j in range(5):
        x=10+286*j
        c.rr(x,32,x+279,102,6,'#293b48');c.rr(x+1,30,x+278,91,9,'#cebfa8')
        c.path(f'M {x+4} 38 Q {x+7} 28 {x+23} 27 L {x+255} 27 Q {x+274} 27 {x+277} 36 Z','#6a8690',INK,1.3)
        c.box(x+3,44,x+276,72,'#9c514a')
        c.box(x+2,73,x+277,76,'#e4ac88')
        c.box(x+2,86,x+277,94,'#a95c53')
        for off in [18,70,112,154,196,242]:
            ww=20 if off in (18,242) else 33
            c.rr(x+off,47,x+off+ww,66,2.6,'#384852')
            c.rr(x+off+2,49,x+off+ww-2,64,1.4,'#f2c795')
            c.box(x+off+4,50,x+off+ww-3,52,'#ffe4ad')
            c.box(x+off+ww//2,48,x+off+ww//2+1.5,65,'#846b65')
            if r.random()<.8:
                xx=x+off+ww*.72;c.oval(xx-2,55,xx+2,60,'#736b69');c.oval(xx-4,59,xx+3,65,'#736b69')
            if off in (18,242):
                c.line([(x+off-4,89),(x+off-4,43),(x+off+ww+4,43),(x+off+ww+4,90)],'#675e60',1)
            else:c.line([(x+off,68),(x+off+ww,68)],'#d2a080',1.1)
        for off in (44,214):
            c.rr(x+off-13,94,x+off+23,104,4,'#2e3b48')
            for dx in (-5,14):
                c.oval(x+off+dx-6,96,x+off+dx+6,108,'#202f40');c.oval(x+off+dx-2,99,x+off+dx+2,103,'#68747b')
        c.rr(x+83,24,x+125,28,2,'#465f70');c.rr(x+152,23,x+197,28,2,'#465f70')
        for off in range(92,121,4):c.line([(x+off,24),(x+off-1,28)],'#8c9898',1)
        c.line([(x+7,80),(x+272,80)],'#f7d8b0',1)
        c.box(x+278,50,x+285,85,'#283b4b')
        for off in [279,282]:c.line([(x+off,51),(x+off,83)],'#786b68',1.5)
    x=1414;c.path(f'M {x} 32 Q 1431 32 1437 45 L 1446 70 L 1446 91 L 1437 96 L {x} 95 Z','#cbbba2',INK,1.5)
    c.poly([(1420,44),(1436,46),(1441,60),(1421,60)],'#314d60')
    c.box(1418,74,1446,79,'#b86556');c.oval(1438,66,1445,71,'#ffedb2');c.save('train')

def viaduct():
    c=Cel(1600,275,1.6)
    c.box(0,19,1600,42,'#273d4d');c.box(0,18,1600,21,'#a5a3a0')
    c.box(0,23,1600,26,'#597486');c.box(0,34,1600,37,'#72909a')
    for x in range(-70,1700,125):
        c.path(f'M {x} 40 L {x+125} 40 L {x+125} 265 L {x+107} 265 L {x+105} 124 Q {x+106} 65 {x+66} 62 Q {x+28} 60 {x+22} 120 L {x+19} 265 L {x} 265 Z','#3d5262')
        c.path(f'M {x+13} 264 L {x+15} 122 Q {x+18} 60 {x+63} 55 Q {x+106} 52 {x+114} 118 L {x+116} 265',None,'#79818a',3)
        c.path(f'M {x+25} 96 Q {x+39} 52 {x+76} 62 Q {x+100} 67 {x+105} 87',None,'#253b4c',3)
        for y in range(70,265,20):
            c.line([(x+2,y),(x+13,y)],'#546d79',1.2)
        for k in range(5):
            xx=x+25*k;c.line([(xx,18),(xx,6)],'#2c4458',1.35)
        c.line([(x,6),(x+125,6)],'#a49891',1.3)
    c.save('viaduct')

def cape():
    c=Cel(580,360,2);r=random.Random(25)
    c.path('M 0 324 Q 26 310 71 309 L 116 291 L 166 282 L 205 247 Q 232 229 257 228 L 312 224 L 346 235 Q 384 237 414 259 L 465 271 L 493 295 L 557 313 L 579 336 L 513 342 L 367 337 L 299 348 L 113 344 L 48 338 L 0 343 Z','#465567',INK,2)
    for i in range(65):
        x=r.uniform(55,525);top=243+abs(x-300)*.30+r.random()*24;y=r.uniform(min(top,325),332)
        w=r.uniform(5,28);c.poly([(x,y),(x+w*.4,y-r.uniform(3,9)),(x+w,y+1),(x+w*.65,y+4)],r.choice(['#63717a','#566775','#374c60','#8d827e']))
    c.path('M 239 241 L 285 109 L 305 109 L 310 235 Z','#dcc2a1',INK,2)
    # The tapered, striped masonry shaft sits on a stone apron.
    c.poly([(240,241),(266,237),(296,107),(287,109)],'#edcfaa')
    c.poly([(285,235),(310,235),(305,110),(298,109)],'#a89b92')
    c.poly([(263,170),(308,167),(309,189),(255,193)],'#bf6656')
    c.poly([(291,168),(308,167),(309,189),(287,190)],'#955257')
    c.poly([(281,113),(308,113),(307,125),(277,126)],'#c07964')
    c.path('M 264 110 L 266 103 L 314 100 L 315 106 L 306 114 L 278 116 Z','#435264',INK,1.4)
    c.poly([(276,100),(280,75),(302,73),(309,101)],'#edbc79')
    c.poly([(279,98),(282,78),(289,78),(286,99)],'#fff0b7')
    c.poly([(292,97),(293,77),(299,77),(302,97)],'#ffdb90')
    for x in [278,286,298,305]:c.line([(x,100),(x-1 if x>290 else x+3,76)],'#3b4956',1.8)
    c.path('M 273 76 L 283 66 Q 288 61 293 60 L 295 55 L 297 61 Q 309 68 312 73 L 313 75 Z','#a56358',INK,1.3)
    c.line([(294,60),(294,51)],'#4e5561',1.3)
    for x in range(266,316,7):c.line([(x,105),(x,90)],'#384955',1)
    c.line([(265,92),(315,89)],'#525864',1.6)
    for x,y in [(290,148),(281,205)]:
        c.rr(x-3,y-7,x+2,y,1,'#485767');c.line([(x-3,y+1),(x+2,y+1)],'#e4be9e',1)
    c.poly([(189,240),(193,216),(234,212),(250,223),(248,236)],'#ad9989')
    c.poly([(187,216),(200,203),(231,202),(242,213)],'#955752')
    for x in (200,214,229):c.box(x,218,x+4,224,'#efbc84')
    c.save('cape')

def backdrop_frame():
    c=Cel(1200,675,1.6)
    c.box(0,0,1200,675,'#263346')
    c.rr(42,28,1113,552,52,'#6b7178');c.rr(48,34,1106,545,47,'#323f4c')
    c.rr(55,41,1099,538,42,'#bcb3a2');c.rr(59,45,1095,534,39,(0,0,0,0))
    c.path('M 0 549 L 1200 541 L 1200 574 L 0 584 Z','#67707a')
    c.path('M 0 555 L 1200 548',None,'#b6a697',1.5)
    c.path('M 0 585 L 1200 576 L 1200 675 L 0 675 Z','#334353')
    for y in (602,608,651):c.line([(0,y),(1200,y-9)],'#465466',1.2)
    c.line([(97,32),(1030,32)],'#d0aa90',1.3)
    for x in (25,1133,1164):
        c.line([(x,0),(x,530)],'#4e5a68',1.1)
    # Window catches, rivets and scuffed interior paint.
    for x in [182,568,934]:
        c.rr(x,532,x+42,541,3,'#212f41');c.rr(x+3,532,x+36,536,2,'#b1a797')
    r=random.Random(64)
    for _ in range(220):
        x=r.randrange(1200);y=r.randrange(580,675);c.line([(x,y),(x+r.uniform(1,13),y-.7)],'#53606b',.45)
    c.save('window')

def carriage():
    c=Cel(1200,675,1.6)
    c.box(0,0,1200,675,'#314452')
    c.poly([(0,0),(1200,0),(838,157),(553,159)],'#8b8c8a')
    for x in [-380,27,398,765,1080,1530]:
        vx=688+(x-688)*.28;c.line([(x,0),(vx,156)],'#57636e',2)
    c.poly([(355,0),(518,0),(646,125),(607,125)],'#485663')
    c.poly([(376,0),(490,0),(643,119),(614,119)],'#ffdab1')
    c.poly([(386,0),(467,0),(637,119),(622,119)],'#ffedcb')
    c.poly([(0,5),(549,159),(546,385),(0,487)],'#9e9b92')
    c.poly([(0,52),(548,192),(548,370),(0,467)],'#4a5e68')
    # Transparent perspective cutouts for the actual moving coast beyond the glass.
    for a,b in [(-25,230),(248,398),(410,487),(494,531),(536,545)]:
        def top(x):return 63+.25*x
        def bot(x):return 454-.164*x
        c.poly([(a,top(a)),(b,top(b)),(b,bot(b)),(a,bot(a))],(0,0,0,0))
        c.line([(a,bot(a)+2),(b,bot(b)+2)],'#c9bb9e',2.4)
    c.poly([(0,481),(548,381),(549,400),(0,530)],'#465a66')
    c.poly([(0,527),(549,399),(550,484),(0,675)],'#283c49')
    c.poly([(820,158),(1200,0),(1200,675),(816,442)],'#757e80')
    for a,b in [(865,925),(948,1020),(1048,1200)]:
        c.poly([(a,207-(a-820)*.28),(b,207-(b-820)*.28),(b,329+(b-820)*.12),(a,329+(a-820)*.12)],'#284755')
        c.line([(a,329+(a-820)*.12),(b,329+(b-820)*.12)],'#d9b99c',2.2)
    c.box(548,157,822,445,'#788887');c.rr(626,173,753,433,5,'#465b68')
    c.rr(639,184,738,429,5,'#91a09c');c.rr(650,200,727,294,8,'#244557')
    c.line([(644,304),(733,304)],'#c6b89f',2.2);c.box(725,310,729,334,'#344954')
    c.poly([(548,444),(819,444),(1200,675),(0,675)],'#6d7273')
    for x in [-160,160,500,823,1230]:
        c.line([(x,675),(687+(x-687)*.20,445)],'#a39280',1.1)
    # Rows of nubby upholstered seats, split into a shell and piping.
    for side in (1,-1):
        for scale in [.23,.34,.52,.8,1.22]:
            if side==1:x=688+(770-688)*scale*3.7
            else:x=688-(688-511)*scale*3.7
            y=379+scale*139;ww=142*scale;hh=147*scale
            pts=[(x-ww,y-hh),(x+ww*.58,y-hh*.92),(x+ww*.8,y),(x-ww*.95,y+hh*.3)]
            c.poly(pts,'#243947');c.line(pts+[pts[0]],'#192e3d',max(1,3*scale))
            c.poly([(x-ww*.98,y-hh*.97),(x+ww*.55,y-hh*.89),(x+ww*.59,y-hh*.62),(x-ww*.98,y-hh*.7)],'#aa7267')
            c.line([(x-ww*.94,y-hh*.95),(x+ww*.55,y-hh*.87)],'#e3b490',max(1,2*scale))
            for k in range(6):c.line([(x-ww*.87,y-hh*(.53-k*.11)),(x+ww*.43,y-hh*(.49-k*.09))],'#3a5360',max(.5,1*scale))
    # Luggage rail and hanging leather handles.
    c.line([(0,22),(569,175)],'#e3c4a4',3.4)
    for x in [65,195,307,402,472,519]:
        s=(560-x)/480;y=24+x*.27
        c.line([(x,y),(x-2*s,y+34*s)],'#886d60',3*s)
        c.path(f'M {x-2*s} {y+31*s} Q {x-18*s} {y+48*s} {x-11*s} {y+54*s} Q {x} {y+62*s} {x+9*s} {y+52*s} Q {x+12*s} {y+47*s} {x-2*s} {y+31*s}',None,'#e8c7a1',2.9*s)
    c.save('carriage')

def platform():
    c=Cel(1200,675,1.65);r=random.Random(88)
    # Left-to-right receding canopy and platform edge share one vanishing point.
    c.poly([(0,0),(779,0),(906,224),(894,230),(0,100)],'#344653')
    c.poly([(0,40),(0,88),(895,227),(871,215)],'#7a7574')
    c.poly([(0,81),(0,101),(896,233),(896,226)],'#263847')
    for x in [-340,-100,85,272,424,550,659,744]:
        c.line([(x,0),(900+(x-900)*.34,174)],'#52606b',2)
    for z in [1,.64,.41,.26,.16,.10,.061]:
        x=898-850*z;y=233-134*z;bot=380+261*z;w=8*z+1
        c.box(x-w*1.4,y,x+w*1.4,bot,'#243947');c.box(x-w*1.3,y,x-w*.5,bot,'#997e73')
        c.line([(x,y+51*z),(x+75*z,y+9*z)],'#394857',4*z+1)
        c.line([(x,y+49*z),(x-52*z,y-7*z)],'#394857',4*z+1)
        lx=x+80*z;ly=y-7*z
        c.line([(lx,ly),(lx,ly+16*z)],'#273e4d',1+z)
        c.oval(lx-18*z,ly+12*z,lx+18*z,ly+20*z,'#f5c897')
        c.line([(lx-12*z,ly+20*z),(lx+14*z,ly+20*z)],'#fff0bf',2*z)
    c.poly([(0,495),(901,360),(1200,400),(1200,675),(0,675)],'#4a5863')
    c.poly([(0,507),(902,363),(1200,400),(1200,406),(901,368),(0,524)],'#b9a48a')
    c.poly([(0,533),(902,370),(1200,408),(1200,410),(899,372),(0,541)],'#b67b62')
    for k in range(9):
        q=(k+1)/9;y=388+320*q*q;c.line([(0,y),(1200,y-28*q)],'#677079',1+q)
    for x in [-1550,-500,-122,235,627,1168,1660]:
        c.line([(900,367),(x,675)],'#344b58',1.2)
    for k in range(350):
        x=r.uniform(0,1200);y=r.uniform(440,675)
        if y>510-x*.1:c.line([(x,y),(x+r.uniform(1,11),y)],'#6c7276',.65)
    c.save('platform')

def backfigure():
    c=Cel(165,350,2.5)
    c.path('M 65 209 L 99 209 L 100 258 L 95 320 L 79 321 L 73 260 L 63 264 L 61 318 L 46 318 L 44 264 L 39 222 Z','#364554',INK,2)
    c.path('M 45 312 L 62 313 L 62 331 Q 53 337 34 333 L 35 326 Z','#473c41',INK,2)
    c.path('M 80 315 L 96 315 L 101 327 L 100 333 L 77 331 Z','#493e43',INK,2)
    c.path('M 63 79 Q 45 85 34 102 L 24 165 L 30 177 L 29 224 Q 62 239 112 226 L 105 162 L 113 175 L 123 169 L 113 125 Q 106 96 94 84 Z','#ca6853',INK,2)
    c.path('M 47 99 Q 39 117 35 161 L 42 176 L 39 213',None,'#e89068',2)
    c.path('M 93 103 L 99 164 L 106 206',None,'#844b48',2)
    c.path('M 42 222 Q 78 232 110 222',None,'#e4926c',1.5)
    c.path('M 48 78 Q 69 73 89 74 L 100 89 Q 89 105 58 100 L 44 89 Z','#64918e',INK,2)
    c.path('M 87 95 Q 114 99 134 87 L 155 84 L 141 99 Q 110 114 87 104 Z','#6a9993',INK,1.2)
    c.path('M 46 32 Q 55 9 79 13 Q 103 15 106 44 Q 103 70 119 82 Q 101 86 91 77 L 93 85 Q 65 96 44 79 Q 52 72 47 62 L 40 65 Q 47 53 46 32 Z','#28394b',INK,2)
    c.path('M 48 40 Q 54 16 77 18 Q 92 18 98 30 Q 71 16 48 40 Z','#576173')
    c.save('back')

def pier():
    c=Cel(1200,675,1.6);r=random.Random(36)
    c.path('M 0 675 L 0 628 L 119 603 L 238 593 L 306 567 L 427 552 L 505 533 L 604 520 L 652 522 L 671 532 L 655 546 L 534 561 L 454 582 L 405 602 L 287 624 L 209 656 L 160 675 Z','#293f50',INK,1.5)
    c.path('M 0 628 L 125 598 L 219 589 L 303 562 L 422 546 L 503 527 L 608 515 L 648 517 L 658 523 L 511 540 L 429 560 L 312 577 L 228 602 L 118 615 L 0 645 Z','#768184')
    for _ in range(170):
        x=r.uniform(0,648);y=625-.165*x+r.uniform(0,19);c.line([(x,y),(x+r.uniform(2,10),y-1)],'#506373',.9)
    for x,y in [(87,610),(235,578),(390,548),(514,525)]:
        c.rr(x-3,y-13,x+4,y+1,2,'#273c4c');c.oval(x-4,y-15,x+5,y-12,'#ad9e89')
    c.save('pier')
if __name__=='__main__':
    town();train();viaduct();cape();backdrop_frame();carriage();platform();backfigure();pier()
