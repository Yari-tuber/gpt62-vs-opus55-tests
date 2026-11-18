precision highp float;
varying vec2 uv;
uniform sampler2D img;
uniform float time,light,variant;
float h(vec2 p){vec3 q=fract(p.xyx*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
void main(){
 vec2 p=uv;
 vec3 c=texture2D(img,vec2(p.x,1.-p.y)).rgb;
 // Ink and stock: a fine print tooth fixed to the frame, plus a quiet moving grain.
 float gr=h(gl_FragCoord.xy);
 float fib=h(floor(gl_FragCoord.xy*vec2(.25,1.)));
 float flick=h(floor(gl_FragCoord.xy)+mod(floor(time*15.),89.)*19.);
 float l=dot(c,vec3(.24,.60,.16));
 c+=(.046*(gr-.5)+.015*(fib-.5)+.018*(flick-.5))*(.58+.65*sin(3.14159*clamp(l,0.,1.)));
 float vign=dot((p-.5)*vec2(.85,1.02),(p-.5)*vec2(.85,1.02));
 c*=1.-.30*vign;
 c=mix(c,c*vec3(.74,.79,.88),smoothstep(.79,.994,p.y)*.59);
 if(variant>6.5 && variant<7.5 && time>34.515){
  c=mix(c,vec3(.107,.133,.187),smoothstep(.73,1.,p.y)*.75);
 }
 c+=vec3(.024,.012,.003)*light;
 gl_FragColor=vec4(c,1.);
}
