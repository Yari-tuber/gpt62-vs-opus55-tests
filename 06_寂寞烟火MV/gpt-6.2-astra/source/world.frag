precision highp float;
uniform sampler2D img;
uniform float time,horizon,variant,pan,bass;
varying vec2 uv;
float h(vec2 p){p=fract(p*vec2(.1031,.1030));p+=dot(p,p.yx+33.33);return fract((p.x+p.y)*p.x);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
vec3 sky(vec2 p){return texture2D(img,vec2(clamp(.055+.89*p.x+pan,0.,1.),1.-clamp(.035+.96*p.y,0.,1.))).rgb;}
void main(){
 float y=uv.y/horizon;
 vec3 col;
 if(y<=1.)col=sky(vec2(uv.x,y));
 else{
  float z=(uv.y-horizon)/(1.-horizon);
  float persp=1./(.067+z);
  vec2 water=vec2((uv.x-.5)*persp*9.+pan*17.,persp*5.1);
  float w1=n(water*vec2(1.3,4.2)+vec2(.21*time,time*.35));
  float w2=n(water*vec2(3.4,9.3)+vec2(-.35*time,.52*time));
  float waves=.62*w1+.38*w2;
  float longwave=sin(uv.x*13.+water.y*2.6+time*1.8+w1*2.);
  float sy=clamp(1.-1.47*z+.07*(waves-.5),0.,1.);
  vec3 reflected=sky(vec2(uv.x+.07*(waves-.5),sy));
  col=mix(reflected*vec3(.68,.79,.83),vec3(.067,.191,.253),.36+.23*z);
  col+=vec3(.074,.107,.124)*(waves-.46)*2.1;
  float blade=smoothstep(.56,.77,waves+.048*longwave);
  float glow=.28+.72*exp(-pow((uv.x-.25-.06*sin(water.y))/.23,2.));
  col+=mix(vec3(.14,.245,.27),vec3(.56,.38,.27),glow)*blade*glow*(.30+.46*z);
  if(variant>5.5 && variant<6.5){
   float silk=exp(-pow((uv.x-.43-.045*sin(water.y*.64))/.24,2.));
   col=mix(col,vec3(.082,.252,.294),.20);
   col+=vec3(.48,.225,.13)*silk*blade*(.50+.45*z);
  }
  col+=vec3(.16,.20,.21)*smoothstep(.68,.80,waves)*(.49+.3*bass);
  col=mix(col,vec3(.62,.62,.64),.15*exp(-z*90.));
 }
 gl_FragColor=vec4(col,1.);
}
