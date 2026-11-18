precision highp float;
varying vec2 uv;
uniform sampler2D img;
uniform float alpha,time,mode,wind,highlight,light;
uniform vec4 tint;
void main(){
 vec2 p=uv;
 if(mode>1.5 && mode<2.5){
  p.y=1.-p.y;
  p.x+=.025*sin(uv.y*51.-time*3.2)+.012*sin(uv.y*106.+time*4.);
 }
 if(wind!=0.){
  float w=smoothstep(.32,.86,p.x)*(1.-smoothstep(.44,.53,p.y))*smoothstep(.09,.27,p.y);
  p.y+=wind*w*(.009*sin(time*2.8+p.x*10.)+.0035*sin(time*4.2-p.x*7.));
  p.x+=wind*w*.0035*sin(time*2.5+p.x*8.);
 }
 vec4 c=texture2D(img,p);
 if(mode>2.5){
  vec2 off=vec2(highlight,.022);
  float edge=max(max(texture2D(img,p+off).a,texture2D(img,p-off).a),
                 max(texture2D(img,p+vec2(off.x,-off.y)).a,texture2D(img,p+vec2(-off.x,off.y)).a));
  c=vec4(vec3(.09,.10,.14),max(edge,c.a));
 }
 if(mode>1.5 && mode<2.5){c.a*=pow(1.-uv.y,1.4)*(.35+.65*smoothstep(-.6,.55,sin(uv.y*195.+time*1.7)));}
 if(mode>.5 && mode<1.5){
  float active=1.-smoothstep(highlight-.028,highlight+.012,p.x);
  c.rgb=mix(vec3(.895,.86,.806),vec3(1.,.88,.675),active);
 }
 c.rgb*=tint.rgb;
 c.rgb+=vec3(.13,.073,.033)*light*max(0.,.65-uv.x);
 gl_FragColor=vec4(c.rgb,c.a*alpha);
}
