import bpy
import math
import os
import random
from mathutils import Vector

random.seed(29)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
ART_DIR = os.path.join(ROOT, "public", "art")
SOURCE_DIR = os.path.join(ROOT, "art", "blender")
os.makedirs(ART_DIR, exist_ok=True)
os.makedirs(SOURCE_DIR, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.quality = 90
scene.view_settings.look = "AgX - Medium High Contrast"


def mat(name, color, metallic=0.0, rough=.42, emission=None, strength=0, alpha=1):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Alpha"].default_value = alpha
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        m.surface_render_method = "DITHERED"
    return m


def eye_mat():
    m = mat("Faceted ruby compound eye", (.34, .008, .012), metallic=.45, rough=.24)
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    vor = nodes.new("ShaderNodeTexVoronoi")
    vor.voronoi_dimensions = "3D"
    vor.feature = "DISTANCE_TO_EDGE"
    vor.inputs["Scale"].default_value = 32
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .22
    bump.inputs["Distance"].default_value = .045
    links.new(vor.outputs["Distance"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


CHITIN = mat("Warm umber chitin", (.105, .047, .018), metallic=.15, rough=.3)
THORAX = mat("Iridescent thorax", (.11, .13, .045), metallic=.34, rough=.23)
AMBER = mat("Amber abdomen", (.32, .13, .025), metallic=.2, rough=.29)
BLACK = mat("Black abdominal bands", (.012, .009, .006), metallic=.2, rough=.31)
EYE = eye_mat()
WING = mat("Translucent wing membrane", (.54, .73, .68), metallic=.03, rough=.16, alpha=.27)
VEIN = mat("Wing veins", (.11, .075, .035), rough=.48)
HAIR = mat("Golden bristles", (.24, .13, .04), rough=.65)
LIME = mat("Neural lime", (.56, 1, .08), rough=.15, emission=(.46, 1, .025), strength=5)
CYAN = mat("Neural cyan", (.03, .65, 1), rough=.15, emission=(.01, .5, 1), strength=5)
PINK = mat("Neural pink", (1, .05, .24), rough=.15, emission=(1, .01, .12), strength=4)


def smooth(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def sphere(name, loc, scale, material, seg=64):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=32, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return smooth(obj)


def curve(name, points, material, radius=.022, cyclic=False):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = radius
    data.bevel_resolution = 3
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points)-1)
    for p, co in zip(spline.bezier_points, points):
        p.co = co
        p.handle_left_type = "AUTO"
        p.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def look(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z", "Y").to_euler()


# Anatomical body: one wing pair, six legs, antennae, segmented abdomen.
thorax = sphere("Thorax", (0, 0, 2.6), (.96, 1.08, .85), THORAX)
head = sphere("Head", (0, -1.12, 2.91), (.82, .72, .69), CHITIN)
for side in (-1, 1):
    eye = sphere("Compound eye L" if side < 0 else "Compound eye R", (side*.56, -1.61, 3.02), (.47, .29, .5), EYE)
    eye.rotation_euler.y = side*math.radians(8)

segments = [
    ((0,.78,2.51),(.82,.58,.68),AMBER),
    ((0,1.28,2.42),(.75,.55,.62),BLACK),
    ((0,1.73,2.33),(.66,.5,.54),AMBER),
    ((0,2.10,2.25),(.52,.42,.43),BLACK),
    ((0,2.39,2.18),(.34,.31,.31),AMBER),
]
for i,(loc,scale,material) in enumerate(segments): sphere(f"Abdomen segment {i+1}",loc,scale,material,48)

# One pair of veined wings.
for side in (-1,1):
    wing = sphere("Left wing" if side<0 else "Right wing", (side*1.52,.47,3.10),(1.72,.78,.095),WING)
    wing.rotation_euler.z = side*math.radians(-18)
    wing.rotation_euler.x = math.radians(10)
    base = (side*.48,.02,3.05)
    tip = (side*2.85,.76,3.18)
    curve(f"Wing main vein {side}",[base,tip],VEIN,.025)
    for j,(dy,dz) in enumerate(((-.42,-.20),(-.12,.05),(.25,.22),(.48,-.02))):
        curve(f"Wing branch {side}-{j}",[base,(side*1.55,.45+dy,3.08+dz),(side*2.55,.72+dy*.45,3.13+dz*.35)],VEIN,.014)

# Segmented legs.
leg_sets = [
    [(-.58,-.62,2.55),(-1.30,-1.2,1.52),(-1.94,-1.62,.46),(-2.34,-1.62,.12)],
    [(-.70,.02,2.42),(-1.55,.18,1.32),(-2.18,-.05,.28),(-2.55,-.18,.11)],
    [(-.58,.55,2.32),(-1.17,1.22,1.20),(-1.57,1.68,.25),(-1.91,1.77,.10)],
]
for i,points in enumerate(leg_sets):
    curve(f"Left leg {i+1}",points,CHITIN,.045)
    curve(f"Right leg {i+1}",[(-x,y,z) for x,y,z in points],CHITIN,.045)
    for side in (-1,1):
        joint=points[1]
        sphere(f"Leg joint {i}-{side}",(side*abs(joint[0]),joint[1],joint[2]),(.09,.09,.09),CHITIN,24)

# Antennae and mouthparts.
for side in (-1,1):
    curve(f"Antenna {side}",[(side*.22,-1.59,3.43),(side*.42,-2.03,3.68),(side*.61,-2.18,3.57)],CHITIN,.026)
    sphere(f"Antenna tip {side}",(side*.61,-2.18,3.57),(.08,.08,.08),BLACK,24)
curve("Proboscis",[(0,-1.72,2.66),(0,-2.04,2.45),(0,-1.92,2.26)],CHITIN,.045)

# Fine bristles concentrated on thorax and abdomen.
for i in range(54):
    angle=random.uniform(0,math.tau)
    z=random.uniform(2.05,3.25)
    radial=.77 if z<2.5 else .87
    x=math.cos(angle)*radial
    y=math.sin(angle)*radial*.85 + (.35 if z<2.5 else 0)
    start=(x,y,z)
    direction=Vector((x,y*.7,z-2.55)).normalized()
    length=random.uniform(.10,.24)
    end=Vector(start)+direction*length
    curve(f"Bristle {i}",[start,end],HAIR,.008)

# Brain/connectome graph floating above the head.
brain_nodes=[(-.38,-1.42,3.38),(-.12,-1.51,3.60),(.20,-1.50,3.57),(.43,-1.42,3.36),(0,-1.63,3.30)]
for i,p in enumerate(brain_nodes): sphere(f"Neural node {i}",p,(.10,.10,.10),PINK if i in (0,3) else LIME,20)
for i,(a,b) in enumerate(((0,1),(1,2),(2,3),(0,4),(4,3),(1,4),(4,2))): curve(f"Neural path {i}",[brain_nodes[a],brain_nodes[b]],CYAN if i%2 else LIME,.018)

# Data graph orbit and sample nodes.
orbit=[(-3.0,-.1,1.2),(-2.6,.3,3.9),(-.6,.9,4.65),(1.8,.5,4.25),(3.1,-.1,2.2),(2.4,.2,.65)]
curve("Connectome orbit",orbit,CYAN,.018,True)
for i,p in enumerate(orbit): sphere(f"Orbit node {i}",p,(.07,.07,.07),LIME if i%2 else CYAN,20)
for i in range(10):
    x=-3.25+i*.7
    h=.35+random.random()*1.25
    curve(f"Activity spike {i}",[(x,1.0,.05),(x,1.0,h)],PINK if i%3==0 else LIME,.018)

# Lighting.
for loc,energy,size,color in [((-4,-6,7),1450,5,(1.0,.68,.34)),((5,-3,5.5),1200,4,(.13,.65,1.0)),((0,4,5),900,3,(.55,1.0,.18))]:
    bpy.ops.object.light_add(type="AREA",location=loc)
    light=bpy.context.object
    light.data.energy=energy
    light.data.shape="DISK"
    light.data.size=size
    light.data.color=color
    look(light,(0,0,2.5))
scene.world.color=(.002,.002,.001)

bpy.ops.object.camera_add(location=(8.9,-12.8,6.6))
camera=bpy.context.object
camera.data.lens=63
look(camera,(0,.05,2.35))
scene.camera=camera
scene.render.filepath=os.path.join(ART_DIR,"fruit-fly-macro.webp")
bpy.ops.render.render(write_still=True)

# Orthographic-like side specimen for cabinets and graph panels.
camera.location=(9.8,-.8,4.2)
camera.data.lens=72
look(camera,(0,.3,2.4))
scene.render.filepath=os.path.join(ART_DIR,"fruit-fly-connectome.webp")
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE_DIR,"fruit-fly-connectome.blend"))
bpy.ops.render.render(write_still=True)
print("Rendered photoreal fruit-fly macro and connectome views")
