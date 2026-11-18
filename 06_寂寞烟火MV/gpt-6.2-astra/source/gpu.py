"""Small offscreen GLES renderer. Pixel coordinates use a 1200 x 675 artboard."""
import os
import ctypes as C
from pathlib import Path
import numpy as np
from PIL import Image

P,I,U,F=C.c_void_p,C.c_int,C.c_uint,C.c_float
UP,IP=C.POINTER(U),C.POINTER(I)
S=C.c_char_p
VERT='''
attribute vec2 corner;
uniform vec4 rect, screen;
uniform float rotation;
varying vec2 uv;
void main(){
 uv=corner;
 vec2 p=(corner-.5)*rect.zw;
 float c=cos(rotation),s=sin(rotation);
 p=vec2(p.x*c-p.y*s,p.x*s+p.y*c)+rect.xy+rect.zw*.5;
 gl_Position=vec4(p.x/600.-1.,1.-p.y/337.5,0.,1.);
}'''
def bind(lib,name,restype,*types):
    fn=getattr(lib,name);fn.restype=restype;fn.argtypes=types
    return fn
def ints(*a):return (I*len(a))(*a)
class GPU:
    def __init__(self,w=1920,h=1080):
        self.w,self.h=w,h
        candidates=[os.environ.get('ANGLE_DIR',''), 'F:/AI-Tools/PiDesktop','C:/Program Files/NVIDIA Corporation/NVIDIA app/CEF']
        folder=next(Path(p) for p in candidates if (Path(p)/'libEGL.dll').is_file())
        self.dllpath=os.add_dll_directory(str(folder))
        egl=C.WinDLL(str(folder/'libEGL.dll'))
        gl=C.WinDLL(str(folder/'libGLESv2.dll'))
        d=bind(egl,'eglGetDisplay',P,P)(None)
        assert bind(egl,'eglInitialize',U,P,IP,IP)(d,None,None),'EGL initialization'
        cfg=P(); n=I()
        a=ints(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038)
        assert bind(egl,'eglChooseConfig',U,P,IP,C.POINTER(P),I,IP)(d,a,C.byref(cfg),1,C.byref(n)) and n.value
        surf=bind(egl,'eglCreatePbufferSurface',P,P,P,IP)(d,cfg,ints(0x3057,w,0x3056,h,0x3038))
        ctx=bind(egl,'eglCreateContext',P,P,P,P,IP)(d,cfg,None,ints(0x3098,2,0x3038))
        assert bind(egl,'eglMakeCurrent',U,P,P,P,P)(d,surf,surf,ctx)
        self.context=(egl,gl,d,surf,ctx)
        signatures={
          'GetString':(S,U),'Viewport':(None,I,I,I,I),'Enable':(None,U),'Disable':(None,U),
          'BlendFunc':(None,U,U),'GenTextures':(None,I,UP),'BindTexture':(None,U,U),'ActiveTexture':(None,U,),
          'TexParameteri':(None,U,U,I),'TexImage2D':(None,U,I,I,I,I,I,U,U,P),
          'CreateShader':(U,U),'ShaderSource':(None,U,I,C.POINTER(S),IP),'CompileShader':(None,U),
          'GetShaderiv':(None,U,U,IP),'GetShaderInfoLog':(None,U,I,IP,P),'CreateProgram':(U,),
          'AttachShader':(None,U,U),'BindAttribLocation':(None,U,U,S),'LinkProgram':(None,U),
          'GetProgramiv':(None,U,U,IP),'GetProgramInfoLog':(None,U,I,IP,P),'UseProgram':(None,U),
          'GetUniformLocation':(I,U,S),'Uniform1f':(None,I,F),'Uniform2f':(None,I,F,F),
          'Uniform4f':(None,I,F,F,F,F),'Uniform1i':(None,I,I),'GenBuffers':(None,I,UP),
          'BindBuffer':(None,U,U),'BufferData':(None,U,C.c_ssize_t,P,U),'EnableVertexAttribArray':(None,U,),
          'VertexAttribPointer':(None,U,I,U,U,I,P),'DrawArrays':(None,U,I,I),
          'ReadPixels':(None,I,I,I,I,U,U,P),'CopyTexSubImage2D':(None,U,I,I,I,I,I,I,I),
        }
        for key,args in signatures.items():setattr(self,key,bind(gl,'gl'+key,*args))
        print(self.GetString(0x1F01).decode(),flush=True)
        self.Viewport(0,0,w,h)
        buf=U();self.GenBuffers(1,C.byref(buf));self.BindBuffer(0x8892,buf)
        data=np.array([0,0,1,0,0,1,1,1],np.float32)
        self.BufferData(0x8892,data.nbytes,data.ctypes.data,0x88E4)
        self.EnableVertexAttribArray(0);self.VertexAttribPointer(0,2,0x1406,0,0,None)
        self.uniforms={};self.textures={}
        self.pixels=np.empty((h,w,4),np.uint8)
    def program(self,frag,vert=VERT):
        prog=self.CreateProgram()
        for stage,code in [(0x8B31,vert),(0x8B30,frag)]:
            sh=self.CreateShader(stage);src=S(code.encode());self.ShaderSource(sh,1,C.byref(src),None)
            self.CompileShader(sh); ok=I();self.GetShaderiv(sh,0x8B81,C.byref(ok))
            if not ok.value:
                log=C.create_string_buffer(8192);self.GetShaderInfoLog(sh,8192,None,log);raise RuntimeError(log.value)
            self.AttachShader(prog,sh)
        self.BindAttribLocation(prog,0,b'corner');self.LinkProgram(prog);ok=I()
        self.GetProgramiv(prog,0x8B82,C.byref(ok))
        if not ok.value:
            log=C.create_string_buffer(8192);self.GetProgramInfoLog(prog,8192,None,log);raise RuntimeError(log.value)
        return prog
    def texture(self,name,im=None,size=None):
        tex=U();self.GenTextures(1,C.byref(tex));self.BindTexture(3553,tex)
        for p,v in [(0x2801,9729),(0x2800,9729),(0x2802,33071),(0x2803,33071)]:self.TexParameteri(3553,p,v)
        if im is not None:
            arr=np.ascontiguousarray(im.convert('RGBA'));h,w=arr.shape[:2];ptr=arr.ctypes.data
        else:w,h=size;ptr=None
        self.TexImage2D(3553,0,0x1908,w,h,0,0x1908,0x1401,ptr)
        self.textures[name]=tex.value
    def loc(self,p,n):
        if (p,n) not in self.uniforms:self.uniforms[p,n]=self.GetUniformLocation(p,n.encode())
        return self.uniforms[p,n]
    def draw(self,p,rect=(0,0,1200,675),rot=0,tex=None,blend=True,**kw):
        if blend:self.Enable(0xBE2);self.BlendFunc(0x302,0x303)
        else:self.Disable(0xBE2)
        self.UseProgram(p);self.Uniform4f(self.loc(p,'rect'),*rect);self.Uniform1f(self.loc(p,'rotation'),rot)
        if tex is not None:
            self.ActiveTexture(0x84C0);self.BindTexture(3553,self.textures[tex]);self.Uniform1i(self.loc(p,'img'),0)
        for k,v in kw.items():
            loc=self.loc(p,k)
            if isinstance(v,(tuple,list)):getattr(self,'Uniform%df'%len(v))(loc,*v)
            else:self.Uniform1f(loc,v)
        self.DrawArrays(5,0,4)
    def read(self):
        self.ReadPixels(0,0,self.w,self.h,0x1908,0x1401,self.pixels.ctypes.data)
        return self.pixels
if __name__=='__main__':
    g=GPU();p=g.program('precision highp float;varying vec2 uv;void main(){gl_FragColor=vec4(uv,0.4,1.);}')
    g.draw(p);print(g.read()[0,0])
