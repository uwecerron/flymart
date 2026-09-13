import bpy, json, math
from pathlib import Path
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
parts=[]
def ellipsoid(name,location,scale,color,rough=.5):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=location)
 o=bpy.context.object;o.name=name;o.scale=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);o.data.materials.append(m)
 parts.append((o,color,rough))
 return o
ellipsoid('abdomen',(0,12,13),(12,23,10),(.23,.15,.055))
ellipsoid('thorax',(0,-9,15),(13,14,12),(.30,.23,.095))
ellipsoid('head',(0,-26,15),(11,9,9),(.31,.23,.12))
for side in [-1,1]:
 ellipsoid('eye', (side*8,-29,18),(6,7,7),(.65,.045,.018),.24)
 wing=ellipsoid('wing'+str(side),(side*18,10,24),(12,28,.6),(.72,.86,.75),.2);wing.rotation_euler.z=side*-.38
 for i in range(3):
  a=(side*9,-14+i*11,12);b=(side*(22+i*3),-18+i*17,5);c=(side*(31+i*3),-12+i*20,1)
  for start,end in [(a,b),(b,c)]:
   from mathutils import Vector
   mid=(Vector(start)+Vector(end))/2; delta=Vector(end)-Vector(start)
   o=ellipsoid('leg',mid,(1,1,delta.length/2),(.16,.11,.045));o.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
 for i in range(2):
  ellipsoid('antenna',(side*(4+i*2),-35-i*3,16),(1.2,3,1.2),(.2,.12,.035))
# Mesh coordinates preserve Blender's XY plane for exact simulation input mapping.
bpy.context.view_layer.update()
out=[]
for o,color,rough in parts:
 o.data.calc_loop_triangles(); verts=[];normals=[]
 for t in o.data.loop_triangles:
  for index in t.vertices:
   v=o.data.vertices[index];p=o.matrix_world@v.co;n=o.matrix_world.to_3x3()@v.normal
   verts.extend(round(x,4) for x in p);normals.extend(round(x,4) for x in n.normalized())
 out.append(dict(name=o.name,positions=verts,normals=normals,color=color,roughness=rough))
root=Path('/Users/uwecerron/Desktop/flymart')
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/fly.blend'))
(root/'public/runtimes/flybrain-9191824-fm5/fly-mesh.json').write_text(json.dumps(out,separators=(',',':')))
