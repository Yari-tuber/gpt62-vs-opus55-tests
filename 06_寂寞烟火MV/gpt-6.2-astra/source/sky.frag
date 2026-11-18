precision highp float;
varying vec2 uv;
uniform float variant;
float h(vec2 p) {p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
float n(vec2 p){
 vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);
}
float fb(vec2 p){
 float a=.52,v=0.;
 for(int i=0;i<6;i++){v+=a*n(p);p=mat2(1.8,1.03,-1.03,1.8)*p+vec2(6.1,2.4);a*=.48;}
 return v;
}
void main(){
 vec2 p=uv;
 float v=variant;
 float dusk=(v<.5 || (v>2.5&&v<3.5))?1.:0.;
 float amber=(v>4.5&&v<6.5)?1.:0.;
 float cool=(v>1.5&&v<4.5)?1.:0.;
 vec3 zen=mix(vec3(.061,.110,.200),vec3(.095,.144,.233),dusk);
 vec3 mid=mix(vec3(.174,.290,.390),vec3(.295,.363,.484),dusk);
 vec3 rim=mix(vec3(.67,.54,.55),vec3(.96,.684,.508),dusk);
 rim=mix(rim,vec3(.932,.586,.491),amber*.78);
 mid=mix(mid,vec3(.129,.314,.407),cool*.65);
 if(v>.5&&v<1.5){zen=vec3(.073,.10,.205);mid=vec3(.29,.278,.435);rim=vec3(.963,.65,.52);}
 if(v>1.5&&v<2.5){zen=vec3(.048,.116,.224);mid=vec3(.123,.308,.412);rim=vec3(.69,.63,.65);}
 if(v>3.5&&v<4.5){zen=vec3(.17,.17,.29);mid=vec3(.413,.347,.437);rim=vec3(.92,.61,.465);}
 if(v>5.5&&v<6.5){mid=vec3(.15,.318,.39);rim=vec3(.92,.57,.465);}
 if(v>7.5){zen=vec3(.045,.074,.168);mid=vec3(.153,.193,.319);rim=vec3(.72,.44,.46);}
 vec3 col=mix(zen,mid,smoothstep(-.18,.85,p.y));
 col=mix(col,rim,pow(clamp(p.y,0.,1.),2.7)*.98);
 vec2 sun=vec2(.22+.13*sin(v*2.2),.86);
 col+=vec3(.145,.073,.044)*exp(-length((p-sun)*vec2(2.,2.9))*2.0);
 vec2 m=vec2(.228+.10*sin(v*3.82),.29+.09*cos(v*2.));
 vec2 d=(p-m)*vec2(1.65,1.);
 float rad=.038+.012*dusk;
 float disc=1.-smoothstep(rad-.0011,rad+.0011,length(d));
 float bite=smoothstep(rad-.0012,rad+.0012,length(d-vec2(.018,-.009)));
 col+=vec3(.16,.105,.067)*exp(-length(d)*24.);
 col=mix(col,vec3(1.,.858,.662),disc*bite*.93);
 // Sparse irregular stars and elongated, dust-like constellations beyond the clouds.
 vec2 starP=p*vec2(248.,151.);
 vec2 cell=floor(starP);float chance=h(cell+82.);
 vec2 off=vec2(h(cell+18.),h(cell+29.))*.7+.15;
 float st=length(fract(starP)-off);
 float glow=exp(-st*(12.+4.*chance))*smoothstep(.946,1.,chance);
 col+=vec3(.85,.83,.76)*glow*(1.-smoothstep(.42,.91,p.y));
 // Separate the bright, fine upper veil from the dense banks below.
 vec2 q=p+vec2(v*.79,0);
 float veil=fb(q*vec2(4.1,28.)+vec2(0.,2.*sin(p.x*3.8+v)));
 col=mix(col,mid+vec3(.132,.103,.113),smoothstep(.53,.78,veil)*.43);
 float bend=.055*sin(p.x*5.+v*1.9)+.04*sin(p.x*10.-v);
 vec2 cp=vec2(q.x*4.65,(p.y+bend)*13.);
 cp.y+=1.13*fb(q*vec2(3.,4.5));
 float billow=fb(cp);
 float bank=.54+(.047*sin(p.y*12.+v))-.056*p.y;
 float body=smoothstep(bank-.012,bank+.034,billow);
 float ink=smoothstep(bank+.015,bank+.17,billow);
 vec3 edge=mix(vec3(.397,.422,.517),vec3(.898,.657,.562),smoothstep(.25,1.,p.y));
 vec3 shadow=mix(vec3(.109,.192,.291),vec3(.465,.437,.484),p.y);
 vec3 cloud=mix(edge,shadow,ink*.94);
 if(v>7.5)cloud*=vec3(.79,.76,.90);
 col=mix(col,cloud,body*(.65+.21*p.y));
 float sliver=smoothstep(.58,.635,fb(q*vec2(5.,74.)+9.));
 col=mix(col,rim*.9,sliver*.27*smoothstep(.48,.93,p.y));
 // Distinct receding ridgelines form an atmospheric horizon.
 for(int i=0;i<4;i++){
   float k=float(i);float xx=p.x*(4.+k*.86)+v*1.56+k*3.1;
   float contour=.885+k*.030-.072*fb(vec2(xx,k+2.))-.015*n(vec2(xx*6.,k));
   vec3 c=mix(rim*.69+vec3(-.035,.003,.045),vec3(.177,.271,.338),k/3.);
   col=mix(col,c,smoothstep(contour-.001,contour+.001,p.y));
 }
 gl_FragColor=vec4(col,1.);
}
