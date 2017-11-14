var file = require("fs");
class Vec {
    constructor(x=0.0,y=0.0,z=0.0){
        this.x = x, this.y = y, this.z = z;
    }
    valueOf(){
        return `${parseInt(this.x)} ${parseInt(this.y)} ${parseInt(this.z)} `;
    }
    add(v){
        return new Vec(v.x+this.x,v.y+this.y,v.z+this.z);
    }
    sub(v){
        return new Vec(this.x-v.x,this.y-v.y,this.z-v.z);
    }
    mul(c){
        return new Vec(this.x*c,this.y*c,this.z*c);
    }
    mod(v) {
        return new Vec(this.y*v.z-this.z*v.y,this.z*v.x-this.x*v.z,this.x*v.y-this.y*v.x);
    }
    mult(v){
        return new Vec(this.x*v.x,this.y*v.y,this.z*v.z)
    }
    norm(){
        const sqrt = Math.sqrt( (this.x*this.x)+(this.y*this.y)+(this.z*this.z) );
        return this.mul(1.0/sqrt);
    }
    dot(v){
        return this.x*v.x+this.y*v.y+this.z*v.z
    }
}
class Ray {
    constructor(o = new Vec(0,0,0), d = new Vec(0,0,0)){
        this.o = o, this.d = d;
    }
}
const REFL_T = {DIFF:1 , SPEC:2 , REFR:3};
class Sphere {
    constructor(rad,p,e,c,refl){
        [this.rad,this.p,this.e,this.c,this.refl] = [rad,p,e,c,refl];
    }
    intersect(r){
        let op = this.p.sub(r.o);
        let eps = 1e-4;
        let b = op.dot(r.d);
        let det = (b*b) - op.dot(op) + (this.rad*this.rad);
        if(det < 0 ) return 0;
        det = Math.sqrt(det);
        return (b-det) > eps ?  b-det :  (b+det) > eps ? b+det : 0;
    }
}
const clamp = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
const toInt = (x) => Math.trunc(Math.pow(clamp(x),0.45454545)*255.0+0.5);
const intersectList = (sphList,r) => {
    return sphList.reduce((acc,curr)=>{
        const d  = curr.intersect(r);
        if(d && d < acc[1]){
            return [curr,d]
        }
        return acc;
    },[null,1e17]);
}
function radiance(r,olddepth,SphList){
    let depth = olddepth;
    const result = intersectList(SphList,r);
    if( result[0] === null ) {
        return new Vec(0,0,0);
    }
    let [obj,t] = result;
    let x = r.o.add(r.d.mul(t));
    let n = (x.sub(obj.p)).norm();
    let nl = n.dot(r.d) < 0 ? n : n.mul(-1);
    let f = obj.c;
    p = (f.x > f.y && f.x > f.z) ? f.x : (f.y > f.z) ? f.y : f.z;
    depth+=1;
    if(depth > 5) {
        if( Math.random() < p) {
            f = f.mul(1.0/p);
        } else {
            return obj.e;
        }
    }
    switch (obj.refl) {
        case REFL_T.SPEC: 
            return obj.e.add(f.mult(radiance( new Ray(x,r.d.sub(n.mul(2).mul(n.dot(r.d)))),depth,SphList)));
        case REFL_T.DIFF:
            const random1 = 2*(Math.PI)*(Math.random());
            const random2 = Math.random();
            const random2sqrt = Math.sqrt(random2);
            let w = nl;
            let u = Math.abs(w.x) > 0.1 ?  new Vec(0,1,0).mod(w) : new Vec(1,0,0).mod(w);
            u = u.norm();
            let v = w.mod(u);
            let ucos =  u.mul(Math.cos(random1)*random2sqrt);
            let vsin = v.mul(Math.sin(random1)*random2sqrt);
            let wsqr = w.mul(Math.sqrt(1.0-random2));
            let d = ucos.add(vsin).add(wsqr);
            d = d.norm();
            return obj.e.add(f.mult(radiance(new Ray(x,d),depth,SphList)));
    }
}



const sph = [];
sph.push(new Sphere(1e5, new Vec( 1e5+1,40.8,81.6), new Vec(0,0,0),new Vec(.75,.25,.25),REFL_T.DIFF));
sph.push(new Sphere(1e5, new Vec(-1e5+99,40.8,81.6),new Vec(0,0,0),new Vec(.25,.25,.75),REFL_T.DIFF));
sph.push(new Sphere(1e5, new Vec(50,40.8, 1e5),     new Vec(0,0,0),new Vec(.75,.75,.75),REFL_T.DIFF));
sph.push(new Sphere(1e5, new Vec(50,40.8,-1e5+170), new Vec(0,0,0),new Vec(0,0,0),REFL_T.DIFF));
 sph.push(new Sphere(1e5, new Vec(50, 1e5, 81.6),    new Vec(0,0,0),new Vec(.75,.75,.75),REFL_T.DIFF));
sph.push(new Sphere(1e5, new Vec(50,-1e5+81.6,81.6),new Vec(12,12,12),new Vec(.75,.75,.75),REFL_T.DIFF));
sph.push(new Sphere(16.5,new Vec(27,16.5,47),       new Vec(0,0,0),new Vec(0.999,0.999,0.999), REFL_T.SPEC));
sph.push(new Sphere(600, new Vec(50,681.6-.27,81.6),new Vec(12,12,12),  new Vec(0,0,0), REFL_T.DIFF));
let [w , h , samps] =[1024  , 768 , 4];
let cam= new Ray(new Vec(50,52,295.6), new Vec(0,-0.042612,-1).norm());
let cx=new Vec(w*(0.5135/h));
let cy=(cx.mod(cam.d)).norm().mul(0.5135);
let c=[]
for( let iter = 0 ; iter < w*h;iter++){
    c.push(new Vec(0,0,0));
}
    for( let y = 0 ; y < h ; y++ ) {
        console.log(`Rendering row ${samps*4} spp ${y}`);
        for( let x = 0; x < w ; x++){
            let i = ( h-y-1)*w + x;
            for( let sy = 0 ; sy  < 2 ; sy++) {
                for( let sx = 0; sx < 2; sx++) {
                    let r = new Vec(0,0,0);
                    for( let s =0;s<samps;s++){
                        const random1 = 2*Math.random();
                        const dx = random1 < 1 ?  Math.sqrt(random1) - 1 : 1 - Math.sqrt(2-random1);
                        const random2 = 2*Math.random();
                        const dy = random2 < 1 ?  Math.sqrt(random2) - 1 : 1 - Math.sqrt(2-random2);
                        let cxmul  = cx.mul((((sx+0.5+dx)/2.0+x)/w-0.5));
                        let cymul = cy.mul(((sy+0.5+dy)/2.0+y)/h-0.5);
                        let d  = cxmul.add(cymul).add(cam.d);
                        r = r.add(radiance(new Ray(cam.o.add(d.mul(140)),d.norm()),0,sph).mul(1.0/samps));
                        c[i] = c[i].add(new Vec(clamp(r.x),clamp(r.y),clamp(r.z))).mul(0.25);
                    }
                }
            }
        }
    }

    var stream = file.createWriteStream("my_file.ppm");
    stream.once('open', function(fd) {
        stream.write("P3\n"+(w)+" "+(h)+"\n"+(255)+"\n");
        
        for( let i = 0 ; i < w*h;i++){
            stream.write(`${toInt(c[i].x)} ${toInt(c[i].y)} ${toInt(c[i].z)} `);
        }
        stream.end();
    });
      
