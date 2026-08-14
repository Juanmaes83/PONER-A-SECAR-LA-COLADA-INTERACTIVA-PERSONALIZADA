import * as THREE from 'three';
import { createShapeMask, resolveSurfaceSize, backingColor } from './surface-shapes.js';

const DETAIL = { draft:[12,16], standard:[20,28], fine:[28,38] };
export class ClothCard {
  constructor(media, options={}) {
    this.media=media; this.options={...options};
    const size=resolveSurfaceSize(media,options.surfaceShape,options.surfaceAspect,options.surfaceWidth??2.05);
    this.width=size.width; this.height=size.height; this.detail=options.meshDetail??'standard';
    this.stiffness=options.stiffness??0.92; this.weight=options.weight??2.1; this.springBack=options.springBack??0.35; this.wind=options.wind??0.28;
    this.border=options.border??0.06; this.threadRelief=options.threadRelief??0.35; this.threadScale=options.threadScale??1.05; this.sheen=options.sheen??0; this.printGloss=options.printGloss??0.08;
    this.backingEnabled=options.backing!==false; this.backingType=options.backingType??'paper'; this.penumbra=options.penumbra??22; this.shadowDepth=options.shadowDepth??0.13; this.shadowEnabled=options.shadowEnabled!==false;
    this.drag=0.93; this.time=Math.random()*10; this.grabbed=-1; this.grabTarget=new THREE.Vector3(); this.slideVelocity=0;
    this.anchorCount=Number(options.clips??2); this.anchorActive=Array.from({length:this.anchorCount},()=>true);
    const [cols,rows]=DETAIL[this.detail]||DETAIL.standard; this.cols=cols; this.rows=rows; this.count=(cols+1)*(rows+1); this.anchorColumns=this.computeAnchorColumns();
    this.group=new THREE.Group(); this.group.userData.clothCard=this;
    this.geometry=new THREE.PlaneGeometry(this.width,this.height,cols,rows); this.geometry.translate(0,-this.height/2,0);
    this.shapeMask=createShapeMask(options.surfaceShape??'rectangle',options.shapeIntensity??0.5);
    this.material=new THREE.MeshStandardMaterial({map:media.texture,alphaMap:this.shapeMask,transparent:true,alphaTest:0.16,side:options.doubleSided===false?THREE.FrontSide:THREE.DoubleSide,roughness:THREE.MathUtils.clamp(0.92-this.printGloss*0.65-this.sheen*0.25,0.12,0.98),metalness:0});
    this.mesh=new THREE.Mesh(this.geometry,this.material); this.mesh.castShadow=false; this.mesh.receiveShadow=false; this.mesh.userData.clothCard=this; this.group.add(this.mesh);
    this.backingMesh=new THREE.Mesh(new THREE.PlaneGeometry(this.width+this.border*2,this.height+this.border*2),new THREE.MeshStandardMaterial({color:backingColor(this.backingType),alphaMap:this.shapeMask,transparent:true,opacity:this.backingType==='transparent'?0.2:1,alphaTest:0.12,roughness:this.backingType==='canvas'?0.95:0.88,side:THREE.DoubleSide}));
    this.backingMesh.position.set(0,-this.height/2,-(0.02+(options.thickness??0.02))); this.backingMesh.visible=this.backingEnabled; this.group.add(this.backingMesh);
    this.shadowMesh=new THREE.Mesh(new THREE.PlaneGeometry(this.width*1.02,this.height*1.02),new THREE.MeshBasicMaterial({color:0x000000,alphaMap:this.shapeMask,transparent:true,opacity:this.shadowDepth*0.46,depthWrite:false}));
    this.shadowMesh.position.set(0.1,-this.height/2-0.08,-0.22); this.shadowMesh.scale.set(1+this.penumbra*0.0035,1+this.penumbra*0.0035,1); this.shadowMesh.visible=this.shadowEnabled; this.group.add(this.shadowMesh);
    this.forge=new THREE.Mesh(new THREE.RingGeometry(0.055,0.085,48),new THREE.MeshStandardMaterial({color:0xffb563,emissive:0xff7a22,emissiveIntensity:options.forgeGlow??0.7,transparent:true,opacity:0.92,side:THREE.DoubleSide}));
    this.forge.position.set(this.width*0.31,-this.height*0.22,0.035); this.forge.visible=Boolean(options.forgeEnabled); this.forge.scale.setScalar((options.forgeSize??0.15)/0.15); this.group.add(this.forge);
    this.p=new Float32Array(this.count*3); this.old=new Float32Array(this.count*3); this.rest=new Float32Array(this.count*3); this.constraints=[]; this.initParticles(); this.initConstraints();
  }
  index(x,y){return y*(this.cols+1)+x;}
  computeAnchorColumns(){const cols=[];for(let i=0;i<this.anchorCount;i++){const t=this.anchorCount===1?0.5:i/(this.anchorCount-1);cols.push(Math.round(THREE.MathUtils.lerp(this.cols*0.32,this.cols*0.68,t)));}return cols;}
  initParticles(){const pos=this.geometry.attributes.position.array;for(let i=0;i<this.count;i++){const j=i*3;this.p[j]=this.old[j]=this.rest[j]=pos[j];this.p[j+1]=this.old[j+1]=this.rest[j+1]=pos[j+1];this.p[j+2]=this.old[j+2]=this.rest[j+2]=pos[j+2];}}
  addConstraint(a,b,factor=1){const ai=a*3,bi=b*3;const dx=this.p[ai]-this.p[bi],dy=this.p[ai+1]-this.p[bi+1],dz=this.p[ai+2]-this.p[bi+2];this.constraints.push([a,b,Math.hypot(dx,dy,dz),factor]);}
  initConstraints(){for(let y=0;y<=this.rows;y++){for(let x=0;x<=this.cols;x++){const i=this.index(x,y);if(x<this.cols)this.addConstraint(i,this.index(x+1,y),1);if(y<this.rows)this.addConstraint(i,this.index(x,y+1),1);if(x<this.cols&&y<this.rows){this.addConstraint(i,this.index(x+1,y+1),0.92);this.addConstraint(this.index(x+1,y),this.index(x,y+1),0.92);}if(x<this.cols-1)this.addConstraint(i,this.index(x+2,y),0.42);if(y<this.rows-1)this.addConstraint(i,this.index(x,y+2),0.42);}}}
  isPinned(i){const y=Math.floor(i/(this.cols+1));if(y!==0)return false;const x=i%(this.cols+1);return this.anchorColumns.some((col,anchorIndex)=>this.anchorActive[anchorIndex]&&Math.abs(col-x)<=1);}
  releaseAnchor(index){if(index<0||index>=this.anchorActive.length||!this.anchorActive[index])return false;this.anchorActive[index]=false;return true;}
  resetAnchors(){this.anchorActive.fill(true);this.p.set(this.rest);this.old.set(this.rest);this.grabbed=-1;}
  get activeAnchors(){return this.anchorActive.filter(Boolean).length;}
  setPhysics(values){for(const key of ['stiffness','weight','springBack','wind','threadRelief','threadScale','sheen','printGloss','penumbra','shadowDepth'])if(values[key]!=null)this[key]=values[key];if(values.backing!=null){this.backingEnabled=Boolean(values.backing);this.backingMesh.visible=this.backingEnabled;}if(values.shadowEnabled!=null){this.shadowEnabled=Boolean(values.shadowEnabled);this.shadowMesh.visible=this.shadowEnabled;}this.material.roughness=THREE.MathUtils.clamp(0.92-this.printGloss*0.65-this.sheen*0.25,0.12,0.98);this.shadowMesh.material.opacity=this.shadowDepth*0.46;const s=1+this.penumbra*0.0035;this.shadowMesh.scale.set(s,s,1);}
  setForge(enabled,size=0.15,glow=0.7){this.forge.visible=enabled;this.forge.scale.setScalar(size/0.15);this.forge.material.emissiveIntensity=glow;}
  grabFromUv(uv){if(!uv)return-1;const x=Math.round(THREE.MathUtils.clamp(uv.x,0,1)*this.cols);const y=Math.max(1,Math.round((1-THREE.MathUtils.clamp(uv.y,0,1))*this.rows));this.grabbed=this.index(x,y);return this.grabbed;}
  release(){this.grabbed=-1;}
  update(dt,elapsed,slideVelocity=0){const fixedDt=Math.min(dt,1/30);this.time+=fixedDt;this.slideVelocity+=(slideVelocity-this.slideVelocity)*Math.min(1,fixedDt*8);const droppedBoost=this.activeAnchors===0?4.8:1;const gravity=-0.00026*this.weight*droppedBoost*(fixedDt*60)**2;const inertial=THREE.MathUtils.clamp(-this.slideVelocity*0.0038,-0.018,0.018);
    for(let i=0;i<this.count;i++){if(this.isPinned(i))continue;const j=i*3;const vx=(this.p[j]-this.old[j])*this.drag,vy=(this.p[j+1]-this.old[j+1])*this.drag,vz=(this.p[j+2]-this.old[j+2])*this.drag;this.old[j]=this.p[j];this.old[j+1]=this.p[j+1];this.old[j+2]=this.p[j+2];const phase=this.p[j]*(2.2+this.threadScale)+this.p[j+1]*1.3+elapsed*1.7;const breeze=Math.sin(phase)*0.00115*this.wind;const weave=Math.sin(phase*2.17+elapsed*0.8)*0.00045*this.wind*(1+this.threadRelief);this.p[j]+=vx+inertial;this.p[j+1]+=vy+gravity;this.p[j+2]+=vz+breeze+weave;if(this.activeAnchors>0){const spring=this.springBack*0.0025;this.p[j+2]+=(this.rest[j+2]-this.p[j+2])*spring;}}
    if(this.grabbed>=0){const j=this.grabbed*3;this.p[j]+=(this.grabTarget.x-this.p[j])*0.36;this.p[j+1]+=(this.grabTarget.y-this.p[j+1])*0.36;this.p[j+2]+=(this.grabTarget.z-this.p[j+2])*0.36;}
    const iterations=this.activeAnchors===0?6:9;for(let k=0;k<iterations;k++){for(const[a,b,restLength,factor]of this.constraints){const ai=a*3,bi=b*3;let dx=this.p[ai]-this.p[bi],dy=this.p[ai+1]-this.p[bi+1],dz=this.p[ai+2]-this.p[bi+2];const dist=Math.hypot(dx,dy,dz)||1;const correction=((dist-restLength)/dist)*0.5*this.stiffness*factor;dx*=correction;dy*=correction;dz*=correction;if(!this.isPinned(a)&&a!==this.grabbed){this.p[ai]-=dx;this.p[ai+1]-=dy;this.p[ai+2]-=dz;}if(!this.isPinned(b)&&b!==this.grabbed){this.p[bi]+=dx;this.p[bi+1]+=dy;this.p[bi+2]+=dz;}}
      for(let anchorIndex=0;anchorIndex<this.anchorColumns.length;anchorIndex++){if(!this.anchorActive[anchorIndex])continue;const col=this.anchorColumns[anchorIndex];for(let x=Math.max(0,col-1);x<=Math.min(this.cols,col+1);x++){const i=this.index(x,0)*3;this.p[i]=this.rest[i];this.p[i+1]=this.rest[i+1];this.p[i+2]=0;}}}
    const out=this.geometry.attributes.position.array;out.set(this.p);this.geometry.attributes.position.needsUpdate=true;this.geometry.computeVertexNormals();}
  dispose(){this.geometry.dispose();this.material.dispose();this.shapeMask.dispose();for(const mesh of [this.backingMesh,this.shadowMesh,this.forge]){mesh.geometry.dispose();mesh.material.dispose();}}
}
