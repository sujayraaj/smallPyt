from __future__ import print_function
import math
import random
import os
import sys
class Vec(object):
	__slots__ = ('x', 'y','z')
	def __init__(self, x=0.0, y=0.0,z=0.0):
		self.x,self.y,self.z = x , y , z
	def __add__(self, v):
		return Vec(self.x+v.x,self.y+v.y,self.z+v.z)
	def __sub__(self, v):
		return Vec(self.x-v.x,self.y-v.y,self.z-v.z)
	def __mul__(self, c):
		return Vec(self.x*c,self.y*c,self.z*c)
	def __mod__(self, v):
		return Vec(self.y*v.z-self.z*v.y,self.z*v.x-self.x*v.z,self.x*v.y-self.y*v.x)
	def mult(self,v):
		return Vec(self.x*v.x,self.y*v.y,self.z*v.z)
	def norm(self):
		return self*(1.0/math.sqrt(self.x*self.x+self.y*self.y+self.z*self.z))
	def dot(self,v):
		return self.x*v.x+self.y*v.y+self.z*v.z
class Ray(object):
	__slots__= ('o','d')
	def __init__(self,o=Vec(),d=Vec()):
		self.o , self.d = o , d
class Refl_t:
	DIFF , SPEC , REFR = 1 , 2 , 3
class Sphere(object):
	__slots__=('rad','p','e','c','refl')
	def __init__(self,rad,p,e,c,refl):
		self.rad , self.p , self.e , self.c , self.refl = rad , p , e , c , refl
	def intersect(self,r):
		op = self.p - r.o
		eps = 1e-4
		b = op.dot(r.d)
		det = b*b - op.dot(op) + self.rad*self.rad
		if det < 0:
			return 0
		else:
			det = math.sqrt(det)
		return b-det if b-det > eps else ( b+det if b+det > eps else 0)
def clamp(x):
	return 0 if x < 0 else ( 1 if x > 1 else x)
def toInt(x):
	return int(pow(clamp(x),0.45454545)*255.0+0.5)
def intersect(SphList,r):
	t,inf = 1e20,1e20
	out=None
	for x in SphList:
		d=x.intersect(r)
		if d and d < t:
			t=d
			out=x
	return [out,t]
def radiance(r,depth,SphList):
	result = intersect(SphList,r)
	if result[0] is None:
		return Vec()
	obj , t = result[0] , result[1]
	x = r.o + r.d*t
	n=(x-obj.p).norm()
	nl= n if n.dot(r.d)<0 else (n*-1)
	f=obj.c
	p = f.x if (f.x > f.y and f.x > f.z) else ( f.y if (f.y>f.z) else f.z)
	depth+=1
	if depth > 5:
		if random.random() < p:
			f=f*(1.0/p)
		else:
			return obj.e
	if obj.refl is Refl_t.DIFF:
		r1 , r2 = 2*math.pi*random.random() , random.random()
		r2s=math.sqrt(r2)
		w=nl
		u= (Vec(0,1,0)%w) if math.fabs(w.x) > 0.1 else (Vec(1,0,0)%w)
		u= u.norm()
		v= w % u
		d = (u*math.cos(r1)*r2s + v*math.sin(r1)*r2s + w*math.sqrt(1-r2)).norm()
		return obj.e + f.mult(radiance(Ray(x,d),depth,SphList))
	elif obj.refl is Refl_t.SPEC:
		return obj.e +  f.mult(radiance(Ray(x,r.d-n*2*n.dot(r.d)),depth,SphList))
	else:
		reflRay =Ray(x, r.d-n*2*n.dot(r.d))
		into = n.dot(nl)>0
		nc, nt=1,1.5
		nnt=nc/nt if into else nt/nc
		ddn=r.d.dot(nl)
		cos2t=1-nnt*nnt*(1-ddn*ddn)
		if cos2t <0:
			return obj.e + f.mult(radiance(reflRay,depth,SphList));
		tdir = (r.d*nnt - n*((1 if into else -1)*(ddn*nnt+math.sqrt(cos2t)))).norm()
		a=nt-nc
		b=nt+nc
		R0=a*a/(b*b)
		c = 1-(-ddn if into else tdir.dot(n))
		Re=R0+(1-R0)*c*c*c*c*c
		Tr=1-Re
		P=.25+.5*Re
		RP=Re/P
		TP=Tr/(1-P)
		if depth>2:
			if random.random()<P:
				return obj.e + f.mult(radiance(reflRay,depth,SphList)*RP)
			else:
				return obj.e + f.mult(radiance(Ray(x,tdir),depth,SphList)*TP)
		else:
			return radiance(reflRay,depth,SphList)*Re+radiance(Ray(x,tdir),depth,SphList)*Tr
if __name__=='__main__':
	sph=[]
	sph.append(Sphere(1e5, Vec( 1e5+1,40.8,81.6), Vec(),Vec(.75,.25,.25),Refl_t.DIFF))
	sph.append(Sphere(1e5, Vec(-1e5+99,40.8,81.6),Vec(),Vec(.25,.25,.75),Refl_t.DIFF))
	sph.append(Sphere(1e5, Vec(50,40.8, 1e5),     Vec(),Vec(.75,.75,.75),Refl_t.DIFF))
	sph.append(Sphere(1e5, Vec(50,40.8,-1e5+170), Vec(),Vec(),Refl_t.DIFF))
 	sph.append(Sphere(1e5, Vec(50, 1e5, 81.6),    Vec(),Vec(.75,.75,.75),Refl_t.DIFF))
	sph.append(Sphere(1e5, Vec(50,-1e5+81.6,81.6),Vec(),Vec(.75,.75,.75),Refl_t.DIFF))
	sph.append(Sphere(16.5,Vec(27,16.5,47),       Vec(),Vec(1,1,1)*.999, Refl_t.SPEC))
	sph.append(Sphere(600, Vec(50,681.6-.27,81.6),Vec(12,12,12),  Vec(), Refl_t.DIFF))
	w , h , samps =512  , 384 , 16
	cam=Ray(Vec(50,52,295.6), Vec(0,-0.042612,-1).norm())
	cx=Vec(w*0.5135/h) 
	cy=(cx%cam.d).norm()*0.5135
	c=[]
	for iter in xrange(w*h):
		c.append(Vec())
	for y in xrange(h):
		print("\rRendering row ("+str(samps*4)+" spp) "+str(y),file=sys.stderr)
		for x in xrange(w):
			i=(h-y-1)*w+x
			for sy in xrange(2):
				for sx in xrange(2):
					r=Vec()
					for s in xrange(samps):
						r1=2*random.random()
						dx = math.sqrt(r1)-1 if r1<1 else 1-math.sqrt(2-r1)											
						r2=2*random.random()
						dy = math.sqrt(r2)-1 if r2<1 else 1-math.sqrt(2-r2)
						d= cx*(((sx+0.5+dx)/2.0+x)/w-0.5)+ cy*(((sy+0.5+dy)/2.0+y)/h-0.5)+ cam.d
	            				r = r + radiance(Ray(cam.o+d*140,d.norm()),0,sph)*(1.0/samps)
    					c[i] = c[i] + Vec(clamp(r.x),clamp(r.y),clamp(r.z))*.25;
	fid=os.open("im.ppm",os.O_WRONLY|os.O_CREAT)
	os.write(fid,"P3\n"+str(w)+" "+str(h)+"\n"+str(255)+"\n");
	for i in xrange(w*h):
		os.write(fid,str(toInt(c[i].x))+" "+str(toInt(c[i].y))+" "+str(toInt(c[i].z))+" ")
