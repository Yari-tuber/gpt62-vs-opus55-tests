/* Shared modelling tools for the miniature. Coordinates are forward, up, and port. */
'use strict';
const Atelier = (() => {
  const T=THREE, TAU=Math.PI*2, up=new T.Vector3(0,1,0);
  const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
  const vector=p=>p.isVector3?p:v(...p);
  const materials=new Map();
  function paint(color,roughness=.64,metalness=0){
    const key=[color,roughness,metalness].join('/');
    if(!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({color,roughness,metalness}));
    return materials.get(key);
  }
  function group(parent){
    const g=new T.Group(); if(parent)parent.add(g); return g;
  }
  function mesh(parent,geometry,material,x=0,y=0,z=0){
    const m=new T.Mesh(geometry,typeof material==='string'?paint(material):material);
    m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  const ball=new T.SphereGeometry(1,32,22),boxGeometry=new T.BoxGeometry(1,1,1);
  function oval(p,x,y,z,rx,ry,rz,m){const o=mesh(p,ball,m,x,y,z);o.scale.set(rx,ry,rz);return o}
  function box(p,x,y,z,w,h,d,m){const o=mesh(p,boxGeometry,m,x,y,z);o.scale.set(w,h,d);return o}
  const rods=new Map();
  function between(o,a,b){
    a=vector(a);b=vector(b);const d=b.clone().sub(a);o.position.copy(a).lerp(b,.5);
    o.scale.y=Math.max(.00001,d.length());o.quaternion.setFromUnitVectors(up,d.normalize());return o;
  }
  function rod(p,a,b,r,m,rEnd=r,sides=12){
    const id=[r,rEnd,sides].join('/');
    if(!rods.has(id))rods.set(id,new T.CylinderGeometry(rEnd,r,1,sides));
    return between(mesh(p,rods.get(id),m),a,b);
  }
  function ring(p,x,y,z,r,t,m,segments=64,arc=TAU){
    return mesh(p,new T.TorusGeometry(r,t,10,segments,arc),m,x,y,z);
  }
  function curve(p,points,r,m,segments=26,sides=8){
    const path=new T.CatmullRomCurve3(points.map(vector));
    return mesh(p,new T.TubeGeometry(path,segments,r,sides,false),m);
  }
  // Variable elliptical sections swept along a spline. The two section radii are
  // interpolated independently to sculpt the bill, throat, feathers and hull.
  function sculpt(p,rows,m,steps=42,sides=28){
    const centers=new T.CatmullRomCurve3(rows.map(([x,y,, ,z=0])=>v(x,y,z)),false,'catmullrom',.42);
    const sizes=new T.CatmullRomCurve3(rows.map((s,i)=>v(s[2],s[3],i)),false,'catmullrom',.32);
    const pos=[],idx=[];
    for(let j=0;j<=steps;j++){
      const t=j/steps,c=centers.getPoint(t),d=centers.getTangent(t),r=sizes.getPoint(t);
      const n=v(-d.y,d.x,0).normalize(),b=d.clone().cross(n).normalize();
      for(let k=0;k<sides;k++){
        const a=TAU*k/sides;
        const pt=c.clone().addScaledVector(n,Math.max(.001,r.x)*Math.cos(a)).addScaledVector(b,Math.max(.001,r.y)*Math.sin(a));pos.push(pt.x,pt.y,pt.z);
        if(j<steps){const h=j*sides+k,next=j*sides+(k+1)%sides;idx.push(h,next,h+sides,next,next+sides,h+sides)}
      }
    }
    for(let k=1;k<sides-1;k++){idx.push(0,k+1,k,steps*sides,steps*sides+k,steps*sides+k+1)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return mesh(p,g,m);
  }
  function slab(p,outline,bottom,top,m,bevel=.03){
    const s=new T.Shape();outline.forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth:top-bottom,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:1});g.rotateX(-Math.PI/2);
    return mesh(p,g,m,0,bottom,0);
  }
  function random(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296}}
  function canvasTexture(w,h,draw){
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
  }
  const shade=canvasTexture(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(13,53,47,.72)');g.addColorStop(.42,'rgba(19,65,52,.38)');g.addColorStop(1,'rgba(19,65,52,0)');c.fillStyle=g;c.fillRect(0,0,w,h)});
  function shadow(p,x,y,z,w,d,opacity){
    const o=mesh(p,new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:shade,transparent:true,opacity,depthWrite:false}),x,y,z);o.rotation.x=-Math.PI/2;o.receiveShadow=o.castShadow=false;return o;
  }
  function batch(root){
    root.updateWorldMatrix(true,true);
    const buckets=new Map(),inv=root.matrixWorld.clone().invert();
    root.traverse(o=>{
      if(!o.isMesh||Array.isArray(o.material)||o.material.transparent)return;
      const key=[o.material.uuid,o.castShadow,o.receiveShadow].join('/');
      if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);
    });
    for(const items of buckets.values()){
      if(items.length<2)continue;
      const arrays={position:[],normal:[],uv:[]};
      for(const item of items){
        const src=item.geometry,g=src.index?src.toNonIndexed():src.clone();
        g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,item.matrixWorld));
        for(const name of Object.keys(arrays)){
          const a=g.getAttribute(name);if(a)arrays[name].push(a.array);else arrays[name].push(new Float32Array(g.getAttribute('position').count*(name==='uv'?2:3)));
        }
        g.dispose();item.removeFromParent();
      }
      const geometry=new T.BufferGeometry();
      for(const [name,parts] of Object.entries(arrays)){
        const all=new Float32Array(parts.reduce((n,a)=>n+a.length,0));let offset=0;
        for(const part of parts){all.set(part,offset);offset+=part.length}
        geometry.setAttribute(name,new T.BufferAttribute(all,name==='uv'?2:3));
      }
      const result=mesh(root,geometry,items[0].material);result.castShadow=items[0].castShadow;result.receiveShadow=items[0].receiveShadow;
    }
  }
  const drive={chainring:.204,sprocket:.092,wheelRadius:.695,tyreMetres:.352,modelScale:1.08};
  return {T,v,TAU,paint,group,mesh,oval,box,rod,between,ring,curve,sculpt,slab,random,canvasTexture,shadow,batch,drive};
})();
