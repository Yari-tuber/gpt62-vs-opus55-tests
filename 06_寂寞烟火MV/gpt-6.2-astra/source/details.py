from illustrations import *
import json

def lettering():
    import numpy as np
    cues=json.loads((ROOT/'source'/'singing.json').read_text(encoding='utf8'))
    for i,cue in enumerate(cues):
        line=cue['line'];c=Cel(38*len(line)+12,52,2)
        for j,ch in enumerate(line):c.txt(25+38*j,27,ch,29,'#ffffff',anchor='mm')
        c.save('line%d'%i)
    c=Cel(330,116,2.2)
    for j,ch in enumerate('寂寞烟火'):c.txt(3+64*j,0,ch,57,'#f8e6cd')
    c.line([(5,85),(35,85)],'#f3bc94',1.1)
    for j,ch in enumerate('蓝心羽'):c.txt(45+j*21,75,ch,16,'#ffecd7')
    c.save('title')
    c=Cel(235,109,2)
    c.line([(31,0),(31,29)],'#37414b',2);c.line([(203,0),(203,29)],'#37414b',2)
    c.rr(3,26,231,103,3,'#313f4c');c.rr(7,30,227,97,2,'#c9c2aa')
    c.box(7,79,227,91,'#568485')
    for x in (13,220):
        c.oval(x-1,34,x+1,36,'#726c68');c.oval(x-1,92,x+1,94,'#726c68')
    c.txt(115,55,'汐  浦',29,'#314554',anchor='mm')
    c.txt(115,74,'S H I O U R A',6.8,'#556777',font='arial.ttf',anchor='mm')
    c.poly([(206,82),(211,85),(206,89)],'#ded4b7')
    c.save('sign')
    c=Cel(100,130,2)
    c.box(47,0,52,33,'#273b4a');c.oval(8,30,91,113,'#243c49');c.oval(12,34,87,109,'#89928e');c.oval(16,38,83,105,'#ecd8b3')
    for j in range(60):
        a=j*math.pi/30;r=31;ll=5 if j%5==0 else 1.8
        c.line([(50+(r-ll)*math.sin(a),71-(r-ll)*math.cos(a)),(50+r*math.sin(a),71-r*math.cos(a))],'#374655',1.35 if j%5==0 else .7)
    c.line([(49,70),(42,51)],'#3c4750',2.6);c.line([(49,72),(46,45)],'#3c4750',1.6)
    c.line([(50,71),(68,83)],'#b35e4f',.9);c.oval(47,68,53,74,'#625959')
    c.save('clock')

def landscape_details():
    c=Cel(250,700,1.8)
    c.poly([(106,20),(116,20),(129,700),(104,700)],'#344955')
    c.line([(115,26),(126,699)],'#907e75',2.4)
    c.poly([(44,83),(183,61),(184,68),(45,92)],'#394854')
    c.line([(51,89),(111,123),(166,71)],'#354b59',3)
    for x,y in [(50,79),(78,75),(141,65),(173,59)]:
        c.box(x-1.2,y-15,x+1.2,y,'#324656')
        for j in range(3):c.oval(x-4,y-14+3*j,x+4,y-11+3*j,'#a2a49b')
    for j in range(8):c.line([(107,158+j*68),(121,156+j*68)],'#172e40',2)
    c.save('pole')
    c=Cel(900,170,1.7);r=random.Random(244)
    for j in range(190):
        x=r.uniform(-40,912);y=r.uniform(130,185);l=r.uniform(20,99)*(1-.45*abs(x-500)/500)
        bend=r.uniform(4,33);w=r.uniform(.7,2.6)
        c.path(f'M {x} {y} Q {x+bend*.2} {y-l*.64} {x+bend} {y-l}',None,r.choice(['#233b49','#3e565e','#526d6e','#2e4757']),w)
        if j%3==0:
            xx=x+bend;yy=y-l
            for k in range(6):
                c.line([(xx+k*.85,yy-k*2.1),(xx+4+k*.85,yy-k*2.1-3)],'#879085',.9)
    c.save('grass')
    for j,col in enumerate(['#475964','#826c66','#556e70']):
        for phase in range(8):
            c=Cel(94,176,1.4);a=phase*math.pi/4
            step=math.sin(a)*16;bob=abs(math.cos(a))*1.5
            for k in [-1,1]:
                hip=(47+4*k,96+bob);knee=(46+k*step*.43,126+bob-2*max(0,k*math.cos(a)))
                toe=(47+k*step,156-max(0,k*math.cos(a))*7)
                shade='#2c3d48' if k==-1 else '#3f4c56'
                c.line([hip,knee,toe],shade,8);c.line([toe,(toe[0]-8,toe[1]+2)],'#303b47',5)
            c.path(f'M 42 {44+bob} Q 35 47 35 57 L 28 91 L 24 106 Q 46 112 66 107 L 61 58 Q 60 47 51 {43+bob} Z',col)
            c.path('M 38 52 Q 33 66 37 78 L 32 95',None,'#354956',3.5)
            c.path(f'M 36 {28+bob} Q 37 17 47 17 Q 60 18 59 32 L 56 42 L 49 47 L 40 44 L 38 38 L 33 36 Z','#ad9180')
            c.path(f'M 35 {31+bob} Q 32 19 44 15 Q 58 10 62 23 L 64 37 L 56 41 L 51 30 L 43 28 Z','#334552')
            if j==1:
                c.rr(18,95,37,117,3,'#785b53');c.line([(23,98),(24,90),(31,89),(33,98)],'#524b4b',1.3)
            c.save('walker%d_%d'%(j,phase))
if __name__=='__main__':
    lettering();landscape_details()
