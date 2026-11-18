"""Render the original coastal railway film. No network or downloaded art."""
import os,sys,json,math,time,subprocess,argparse,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'source';WORK=ROOT/'_work'
WORK.mkdir(exist_ok=True)
for k in ('TEMP','TMP','TMPDIR','XDG_CACHE_HOME','NUMBA_CACHE_DIR'):os.environ[k]=str(WORK)
os.environ['CUDA_CACHE_DISABLE']='1'
sys.dont_write_bytecode=True
import numpy as np
from PIL import Image,ImageDraw
from gpu import GPU
from fireworks import Brush,Shell,SHELLS
import illustrations, coast, details, eye
from bisect import bisect_right

START=[0,7.515,11.515,15.515,20.008,23.515,27.515,31.515,36.515]
END=40.52
HORIZ=[.633,.735,.745,.58,.598,.616,.20,.768,.697]
NAMES=['window','viaduct','cape','carriage','hand','platform','boat','portrait','pier']
def sstep(a,b,x):
    u=min(1.,max(0.,(x-a)/(b-a)));return u*u*(3.-2.*u)
def remake():
    illustrations.portrait();illustrations.boat();illustrations.hands()
    coast.town();coast.train();coast.viaduct();coast.cape();coast.backdrop_frame()
    coast.carriage();coast.platform();coast.backfigure();coast.pier()
    details.lettering();details.landscape_details();eye.paint()

class Movie:
    def __init__(self,w,h):
        self.g=g=GPU(w,h)
        self.prog={n:g.program((SRC/(n+'.frag')).read_text()) for n in ['sky','world','art','light','finish']}
        self.brush=Brush(g)
        self.music=json.loads((SRC/'music.json').read_text());self.cues=json.loads((SRC/'singing.json').read_text(encoding='utf8'))
        self.cues[-1]['ends'][-1]=38.54 # sustained vowel and breath tail on the isolated vocal
        self.sizes={}
        for file in sorted((WORK/'cels').glob('*.png')):
            with Image.open(file) as im:
                g.texture(file.stem,im)
                self.sizes[file.stem]=im.size
        for n in range(len(START)):
            g.draw(self.prog['sky'],variant=n,blend=False)
            g.texture('sky%d'%n,size=(w,h))
            g.CopyTexSubImage2D(3553,0,0,0,0,0,w,h)
        g.texture('frame',size=(w,h))
        self.shells=[Shell(s,k+83) for k,s in enumerate(SHELLS)]
    def art(self,name,x,y,w,h=None,alpha=1.,rot=0.,mode=0.,wind=0.,tint=(1,1,1,1),highlight=0.,light=0.):
        if alpha<=0:return
        if h is None:
            iw,ih=self.sizes[name];h=w*ih/iw
        self.g.draw(self.prog['art'],(x,y,w,h),rot,tex=name,alpha=alpha,time=self.t,mode=mode,wind=wind,tint=tint,highlight=highlight,light=light)
    def fx(self,mode,amount=1.,center=(.5,.5)):
        self.g.draw(self.prog['light'],mode=mode,amount=amount,center=center,time=self.t)
    def line(self,a,b,w,col,alpha):
        self.brush.one(a,b,w,col,alpha)
    def cables(self,y,speed=90,offset=0,alpha=.8):
        t=self.t
        for j in range(3):
            xx=np.linspace(-65,1265,91)
            phase=((xx+t*speed+offset)/760)%1
            yy=y+j*13+47*(phase*(1-phase)*4.)+xx*.0008*j
            a=np.stack([xx[:-1],yy[:-1]],axis=1);b=np.stack([xx[1:],yy[1:]],axis=1)
            self.brush.lines(a,b,np.array([.55+.13*j]),np.array([[.16,.219,.275]]),np.array([alpha]))
        self.brush.flush(False)
    def birds(self,t,x,y,size=1.,count=4):
        for i in range(count):
            px=x+i*32*size+9*math.sin(i*2.1)+t*12;py=y+i*9*size+math.cos(i*2.)*13
            phase=t*4.4+i;dy=(math.sin(phase)*4.5-1)*size
            self.line((px-6*size,py+dy),(px,py),.82*size,(.12,.21,.28),.84)
            self.line((px,py),(px+6*size,py+dy*.69),.85*size,(.12,.21,.28),.84)
        self.brush.flush(False)
    def girl(self,x,y,s,alpha=1.,light=0.):
        t=self.t;rot=.005*math.sin(t*.9)
        y=y+1.05*s*math.sin(t*1.57)
        self.art('girl',x,y,580*s,640*s,alpha,rot,wind=.88,light=light)
        self.art('strands',x,y,580*s,640*s,alpha,rot,wind=2.6,light=light)
        blink=max([0.]+[1-sstep(.036,.112,abs(t-z)) for z in (2.75,6.51,31.68,34.08)])
        self.art('blink',x,y,580*s,640*s,alpha*blink,rot)
    def village(self,y,scale,travel=0,alpha=1.):
        self.art('town',-40-travel,y,1600*scale,220*scale,alpha)
    def wake(self,x,y,r,t):
        for i in range(5):
            phase=(t*.27+i/5)%1;rr=r*(.26+phase)
            a=np.linspace(.10,math.pi*.91,68)
            for k in [0,1]:
                x1=x+np.cos(a+k*math.pi)*rr; y1=y+np.sin(a+k*math.pi)*rr*.113+np.sin(a*7+t)*.8
                p=np.stack((x1,y1),axis=1)
                self.brush.lines(p[:-1],p[1:],np.array([.9+.5*phase]),np.array([[.74,.78,.73]]),np.array([.39*(1-phase)]))
        self.brush.flush(False)
    def frame(self,t,captions=True):
        self.t=t;g=self.g
        idx=max(0,bisect_right(START,t)-1);u=t-START[idx];h=HORIZ[idx]*675
        bass=self.music['bass'][min(len(self.music['bass'])-1,round(t*100))]
        pan=.014*math.sin(idx*1.4)+(.006 if idx==0 else .0025)*u
        if idx==1:pan-=.01*u
        g.draw(self.prog['world'],tex='sky%d'%idx,blend=False,time=t,horizon=HORIZ[idx],variant=idx,pan=pan,bass=bass)
        flash=0
        for s in self.shells:
            # Each setup sees the shells launched in its own field of view.
            if s.t<START[idx]-(1.12 if idx==8 else .71):continue
            if idx<len(START)-1 and s.t>=START[idx+1]:continue
            flash+=s.stroke(self.brush,t,h)
        self.brush.flush()
        active=[s for s in self.shells if 0<=t-s.t<.65 and s.t>=START[idx]-.71]
        for s in active:self.fx(0,math.exp(-(t-s.t)*5.4)*1.55,(s.x/1200,s.y/675))
        if idx==0:
            self.village(h-90,.47,2.5*u,.91)
            self.cables(66,85,90,.55)
            # Near poles run faster than the town through the moving window.
            for off in [0,920]:
                px=1120-((u*183+off+96)%1840)
                self.art('pole',px,-30,128,516,.85)
            self.art('window',-24-u*.9,-19-u*.2,1250+u*2,705+u)
            self.fx(2,.89)
            self.girl(697-u*4.1,97-u*1.55,.99+u*.012,light=.73+flash)
            self.fx(3,.48)
        elif idx==1:
            self.village(h-113,.61,25+u*9,.82)
            self.birds(u,95,285,.84,5)
            self.art('train',-632+u*174,354,1044,93.6,light=.47+flash)
            self.art('viaduct',-124-u*16,416,1510,260)
            self.cables(294,32,-23,.64)
            self.art('grass',-92-u*24,546,1130,196,.93,wind=.5)
        elif idx==2:
            scale=1.25+.025*u;x=578-u*8;y=h-331*scale
            self.birds(u,522,210,.72,4)
            self.fx(1,1.06,((x+293*scale)/1200,(y+87*scale)/675))
            self.art('cape',x,y,580*scale,360*scale,light=flash+.36)
            self.art('grass',-430-u*13,588,1120,212,.92)
        elif idx==3:
            self.village(h-80,.43,8*u)
            self.art('pole',1050-((u*325+510)%1350),-37,98,455,.76)
            self.art('carriage',-17-u*6,-8-u*2.5,1237+u*12,695+u*6.75)
            self.fx(2,1.2);self.fx(3,.57)
        elif idx==4:
            self.village(h-62,.34,0,.55)
            lift=7*math.sin(.3+u*.53)
            self.art('hand',420-3*u,229-lift,825+4*u,487+u*2.3,rot=-.025+.006*math.sin(u),light=.8)
            self.art('boat',500-3*u,190-lift-8*sstep(2.25,3.45,u),310+3*u,rot=-.072+.007*math.sin(u),light=.43)
            self.fx(3,.73)
        elif idx==5:
            self.village(h-90,.50,0,.85)
            self.art('train',330+u*105,321,719,64.5,.95)
            self.art('platform',-5,0,1210,677)
            self.art('sign',130,92,160,74)
            self.art('clock',463,138,55,72)
            self.art('back',635-u*1.8,261,140,297,wind=1.1,light=.46+flash)
            for j,(px,py,sc,sp) in enumerate([(584,353,.66,18),(835,355,.74,-27),(362,368,.94,-42),(195,374,1.28,45),(1012,350,1.57,-62)]):
                phase=int((u*8.5+j*1.7)%8)
                self.art('walker%d_%d'%(j%3,phase),px+sp*u,py,94*sc,176*sc,alpha=.98)
            self.fx(3,.43)
        elif idx==6:
            self.village(h-43,.23,-85,.64)
            xx=418+28*u;yy=277+3*math.sin(u*2.5);wid=320-u*3;hh=wid*165/360
            rot=-.041+.021*math.sin(u*2.13)
            self.wake(xx+wid*.52,yy+hh*.82,199+u*4,t)
            self.art('boat',xx+2,yy+hh*.81,wid,hh*.74,.50,-rot,mode=2,tint=(.72,.82,.83,1))
            self.art('boat',xx,yy,wid,hh,rot=rot,light=.6+flash)
            self.art('grass',848-u*14,515,1110,203,.87)
        elif idx==7:
            self.village(h-79,.44,0,.55)
            if t<34.517:
                self.fx(0,1.2,(.26,.37))
                self.girl(452-15*u,-70-12*u,1.64+.055*u,light=1.7+flash*1.5)
            else:
                age=t-34.517;s=1.+age*.018;ox=-8-age*4;oy=-age*4
                self.art('eye',ox,oy,1200*s,675*s,light=.7+flash)
                for j,at in enumerate([34.58,35.15,35.55]):
                    age2=t-at
                    if age2<0:continue
                    xx=ox+[269,296,247][j]*s; yy=oy+[319,291,311][j]*s
                    for k in range(25):
                        angle=k*2.39996+j*.44;spread=(1-math.exp(-2.6*age2))*(13+14*(.5+.5*math.sin(k*32.1)))
                        cx=math.cos(angle)*spread;cy=math.sin(angle)*spread*.88
                        self.line((xx+cx*.67,yy+cy*.67+age2**2*2.3),(xx+cx,yy+cy+age2**2*2.7),.96,[(1,.75,.44),(.64,.88,1),(1,.56,.4)][j],math.exp(-age2*1.18)*.89)
                self.brush.flush()
            self.fx(3,.55)
        else:
            self.village(h-46,.26,0,.58)
            self.art('cape',810+u*1.3,h-110,200,124,.83)
            self.art('pier',-30+u*1.4,0,1233,675)
            self.art('back',548+u*.8,408,56,119,wind=1.5,light=.65+flash)
            self.art('boat',700+u*4,548+1.2*math.sin(t*2.),24,11,alpha=.86,rot=.03*math.sin(t))
            self.art('grass',-477+u*.8,576,1030,180,.85)
            self.birds(u,917,359,.55,3)
        # Capture scene color before the final paper pass; titles stay crisp.
        g.BindTexture(3553,g.textures['frame'])
        g.CopyTexSubImage2D(3553,0,0,0,0,0,g.w,g.h)
        g.draw(self.prog['finish'],tex='frame',blend=False,time=t,light=flash,variant=idx)
        if idx==0:
            alpha=(1-sstep(3.55,4.53,t))*(.40+.60*sstep(0,.54,t))
            self.art('title',123+u*1.2,190-u*.63,314,110,alpha*.97)
        if captions:self.caption(t)
        if t>39.83:self.fx(4,.76*sstep(39.83,40.52,t))
    def caption(self,t):
        for i,cue in enumerate(self.cues):
            on=cue['starts'];end=cue['ends'][-1]
            start=on[0]-.055;stop=end+.20
            if i+1<len(self.cues):stop=min(stop,self.cues[i+1]['starts'][0]-.09)
            if not start<=t<stop:continue
            alpha=sstep(start,start+.12,t)*(1.-sstep(stop-.15,stop,t))
            j=max(0,bisect_right(on,t)-1)
            # Fill by the measured syllable starts, including sustained vowels.
            frac=min(1.,max(0.,(t-on[j])/max(.09,cue['ends'][j]-on[j])))
            w=38*len(on)+12;left=600-w/2
            progress=(6+(j+frac)*38)/w
            name='line%d'%i
            self.art(name,left+.45,585.2,w,52,alpha*.67,mode=3,highlight=1./w)
            self.art(name,left,584,w,52,alpha,mode=1,highlight=progress)
            return

def main():
    p=argparse.ArgumentParser();p.add_argument('--preview',action='store_true');p.add_argument('--rebuild',action='store_true');a=p.parse_args()
    if a.rebuild or not (WORK/'cels'/'eye.png').exists():remake()
    if a.preview:
        m=Movie(960,540);out=Image.new('RGB',(1440,900),'#121c28');d=ImageDraw.Draw(out)
        for i,t in enumerate([1.55,8.28,12.37,17.19,21.31,25.65,29.32,33.12,37.96]):
            m.frame(t);im=Image.fromarray(m.g.read()[::-1]).convert('RGB');im.save(WORK/('shot-%d.jpg'%i),quality=93)
            out.paste(im.resize((480,270),Image.Resampling.LANCZOS),((i%3)*480,(i//3)*300))
            d.text(((i%3)*480+9,(i//3)*300+275),'%05.2f   %s'%(t,NAMES[i]),fill='#ced8d8')
        out.save(WORK/'storyboard.jpg',quality=94);return
    m=Movie(1920,1080)
    cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1920x1080','-framerate','60','-i','pipe:0','-i',str(ROOT/'song.mp3'),'-map','0:v','-map','1:a','-vf','vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p','-c:v','h264_nvenc','-preset','p6','-tune','hq','-rc','vbr','-cq','17','-b:v','16M','-maxrate','38M','-bufsize','48M','-spatial-aq','1','-color_primaries','bt709','-colorspace','bt709','-color_trc','bt709','-color_range','tv','-c:a','aac','-b:a','320k','-ar','44100','-movflags','+faststart','-metadata','title=寂寞烟火','-metadata','artist=蓝心羽',str(WORK/'render.mp4')]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,bufsize=4*1024*1024)
    started=time.perf_counter()
    try:
        for i in range(round(END*60)):
            m.frame(i/60);proc.stdin.write(memoryview(m.g.read()).cast('B'))
            if i%180==0:print('frame %d / 2431   %.1fs elapsed'%(i,time.perf_counter()-started),flush=True)
    finally:
        proc.stdin.close();ret=proc.wait()
    if ret:raise RuntimeError('ffmpeg failed %s'%ret)
    (WORK/'render.mp4').replace(ROOT/'mv.mp4')
if __name__=='__main__':main()
