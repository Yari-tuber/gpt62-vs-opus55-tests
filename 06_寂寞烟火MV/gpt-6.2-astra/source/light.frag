precision highp float;
varying vec2 uv;
uniform float time,mode,amount;
uniform vec2 center;
float h(vec2 p){vec3 q=fract(p.xyx*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){
 vec2 p=uv;vec3 c=vec3(1.,.79,.56);float a=0.;
 if(mode<.5){
  vec2 d=(p-center)*vec2(1.7778,1.);
  a=.23*exp(-length(d)*12.)+.18*exp(-length(d)*50.);
 }else if(mode<1.5){
  vec2 d=p-center;
  float slope=-.13+.13*sin(time*.75);
  float axis=d.y-d.x*slope;
  float width=.003+abs(d.x)*.07;
  a=exp(-pow(axis/width,2.))*exp(-abs(d.x)*3.4)*(.17+.075*cos(time*.9));
  a+=.61*exp(-length(d*vec2(1.78,1.))*65.);
 }else if(mode<2.5){
  // Passing panes of light seen on the train glazing.
  float axis=p.x+p.y*.22-.12*sin(time*.29);
  a=.055*exp(-pow((axis-.35)/.06,2.))+.032*exp(-pow((axis-.47)/.015,2.));
  c=vec3(.75,.86,.89);
 }else if(mode<3.5){
  vec2 z=(uv+vec2(time*.006,-time*.011))*vec2(24.,12.);
  vec2 j=floor(z);vec2 f=fract(z)-vec2(h(j+71.),h(j+4.));
  f.x*=1.15;
  float b=h(j+81.);
  a=exp(-dot(f,f)*(230.+800.*b))*smoothstep(.70,.98,b)*(.22+.20*sin(time+b*17.));
 }else{
  a=1.;c=vec3(.055,.081,.12);
 }
 gl_FragColor=vec4(c,a*amount);
}
