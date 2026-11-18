"""Timed three-dimensional star shells projected onto the illustrated sky."""
import math
import ctypes as C
import numpy as np
from gpu import U,I

VERT='''
attribute vec2 corner;
attribute vec4 pigment;
attribute float edge;
varying vec4 color;
varying float lateral;
void main(){
 gl_Position=vec4(corner.x/600.-1.,1.-corner.y/337.5,0.,1.);
 color=pigment;lateral=edge;
}'''
FRAG='''
precision mediump float;
varying vec4 color;varying float lateral;
void main(){gl_FragColor=vec4(color.rgb,color.a*(1.-smoothstep(.14,1.,abs(lateral))));}'''
PALETTES=[
 [[1,.54,.19],[1,.80,.40],[1,.41,.16],[1,.91,.62]],
 [[1,.29,.29],[1,.53,.40],[.98,.23,.32],[1,.72,.57]],
 [[.28,.82,.88],[.55,.94,.94],[.50,.68,1.],[1,.83,.55]],
 [[1,.79,.53],[1,.9,.69],[.98,.56,.46],[1,.93,.77]]
]
# onset in clip seconds, centre, outer spread, pigment family, sphere form, burn time.
SHELLS=[
 (-.6,492,157,75,0,'chrys',2.7),(3.56,464,166,47,1,'ring',2.3),
 (7.53,883,178,169,0,'chrys',3.5),(8.53,346,139,89,2,'ring',3.2),
 (9.53,631,207,112,1,'peony',2.7),(10.55,980,205,80,0,'palm',3.2),
 (11.54,285,147,118,2,'chrys',3.3),(13.52,491,188,84,0,'ring',3.0),
 (15.54,290,139,66,0,'peony',2.6),(18.53,309,210,63,1,'palm',2.5),
 (20.52,239,145,65,1,'peony',3.1),(21.54,426,204,46,0,'ring',2.6),
 (23.54,931,197,95,1,'chrys',3.5),(25.53,739,167,71,2,'palm',2.8),
 (27.54,268,86,118,1,'chrys',3.2),(29.54,783,75,144,0,'palm',3.3),
 (31.53,288,213,120,0,'chrys',3.3),(32.54,511,126,78,2,'ring',3.),
 (34.99,325,190,151,1,'peony',3.4),(35.54,846,167,185,0,'willow',4.6),
 (36.55,640,90,108,2,'ring',3.5),(37.05,398,171,150,3,'chrys',3.7),
 (37.55,1009,247,85,1,'peony',2.6),(38.05,169,263,60,0,'palm',2.2)
]
class Shell:
    def __init__(self,spec,seed):
        self.t,self.x,self.y,self.rad,pal,self.form,self.life=spec
        rng=np.random.default_rng(seed)
        count={'ring':76,'palm':98,'peony':180,'chrys':245,'willow':265}[self.form]
        a=rng.uniform(0,2*np.pi,count)
        if self.form=='palm':a=np.round(a/.52)*.52+rng.normal(0,.028,count)
        if self.form=='ring':
            a=np.linspace(0,2*np.pi,count)+rng.normal(0,.012,count)
            xx=np.cos(a);yy=np.sin(a)*.80+.22*np.cos(a);rr=rng.uniform(.94,1.02,count)
        else:
            depth=rng.uniform(-.98,.98,count);ring=np.sqrt(1-depth*depth)
            xx=ring*np.cos(a);yy=ring*np.sin(a);rr=rng.uniform(.85,1.04,count)
            if self.form=='peony':rr*=rng.choice([.53,1.],count,p=[.28,.72])
        self.vel=np.stack([xx*rr,yy*rr*.91],axis=1)*self.rad
        self.die=self.life*rng.uniform(.61,1.1,count)
        self.phase=rng.uniform(0,6.28,count);self.freq=rng.uniform(11,24,count)
        self.size=rng.uniform(.64,1.43,count)*(1.12 if self.rad>120 else .82)
        self.color=np.array(PALETTES[pal])[rng.integers(0,4,count)]
        self.sway=rng.normal(0,2.,count);self.pos=np.array([self.x,self.y])
    def at(self,t):
        t=max(0,t);motion=(1-np.exp(-t*1.57))
        pts=self.pos+self.vel*motion
        pts[:,0]+=(self.sway+.48)*t*t + self.sway*.70*np.sin(t*2.7+self.phase)*t
        pts[:,1]+=(3.7 if self.form=='ring' else 5.7)*t*t
        return pts
    def stroke(self,brush,t,horiz):
        a=t-self.t
        if a<-.70 or a>self.life*1.1:return 0.
        if a<0:
            f=1+a/.70
            y=horiz+(self.y-horiz)*f**.70
            x=self.x+8*(1-f)+2*math.sin(f*7)
            brush.one((x,y),(x+2,y+10+8*(1-f)),1.45,(1,.75,.42),.76)
            return 0.
        pts=self.at(a);alp=np.clip((self.die-a)/(.53*self.die),0,1)
        tw=.64+.36*np.sin(self.phase+self.freq*a)**2
        alp*=tw*(.65+.35*np.exp(-a*1.9))
        tail=(.29+.15*a)*(2.65 if self.form=='willow' else 1.43)
        for i in range(7):
            p=pts if i==0 else self.at(a-tail*i/7)
            q=self.at(a-tail*(i+1)/7)
            brush.lines(p,q,self.size*(1.52-.115*i),self.color,alp*(1-.124*i)*.94)
            if i==0:
                brush.lines(p,q,self.size*4.9,self.color,alp*.16)
        q=pts.copy();q[:,1]+=.85
        brush.lines(pts,q,self.size*2.1,self.color*.51+.49,alp*.91)
        # Shattered vertical reflection. Its width and shimmer vary with depth.
        if horiz<615:
            k=np.arange(0,len(pts),3);s=pts[k]
            r=s.copy();r[:,1]=horiz+(horiz-s[:,1])*.63
            r[:,0]+=9*np.sin(r[:,1]*.21-t*4.)+4*np.sin(r[:,1]*.8+t*3.)
            q=r.copy();q[:,0]+=4+9*np.sin(self.phase[k]+a*2.)**2
            brush.lines(r,q,1.4+self.size[k],self.color[k],alp[k]*.34)
        return math.exp(-a*4.5)*min(1.,self.rad/110.)

class Brush:
    def __init__(self,g):
        self.g=g;self.p=g.program(FRAG,VERT)
        # Bind the two extra vertex channels, relinking before first use.
        g.BindAttribLocation(self.p,1,b'pigment');g.BindAttribLocation(self.p,2,b'edge');g.LinkProgram(self.p)
        b=U();g.GenBuffers(1,C.byref(b));self.buf=b.value
        self.quad=I();get=g.context[1].glGetIntegerv;get(0x8894,C.byref(self.quad))
        self.data=[]
    def one(self,a,b,w,col,opacity):
        self.lines(np.asarray([a],float),np.asarray([b],float),np.array([w]),np.asarray([col]),np.array([opacity]))
    def lines(self,a,b,w,col,opacity):
        diff=b-a
        leng=np.maximum(.18,np.hypot(diff[:,0],diff[:,1]))
        nn=np.stack([-diff[:,1]/leng,diff[:,0]/leng],axis=1)*np.asarray(w).reshape(-1,1)
        corners=np.stack((a-nn,a+nn,b-nn,b+nn),axis=1)
        v=np.empty((len(a),4,7),np.float32)
        v[:,:,:2]=corners;v[:,:,2:5]=np.asarray(col).reshape(-1,1,3)
        v[:,:,5]=np.asarray(opacity).reshape(-1,1);v[:,:,6]=[-1,1,-1,1]
        self.data.append(v[:,[0,1,2,2,1,3],:].reshape(-1,7))
    def flush(self,add=True):
        if not self.data:return
        v=np.ascontiguousarray(np.concatenate(self.data));self.data.clear();g=self.g
        g.UseProgram(self.p);g.Enable(0xBE2);g.BlendFunc(0x302,1 if add else 0x303)
        g.BindBuffer(0x8892,self.buf);g.BufferData(0x8892,v.nbytes,v.ctypes.data,0x88E0)
        for i,(size,offset) in enumerate([(2,0),(4,8),(1,24)]):
            g.EnableVertexAttribArray(i);g.VertexAttribPointer(i,size,0x1406,0,28,C.c_void_p(offset))
        g.DrawArrays(4,0,len(v))
        g.context[1].glDisableVertexAttribArray(1);g.context[1].glDisableVertexAttribArray(2)
        g.BindBuffer(0x8892,self.quad.value);g.VertexAttribPointer(0,2,0x1406,0,0,None)
