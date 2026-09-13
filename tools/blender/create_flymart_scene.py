import bpy
import math
import os
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
ART_DIR = os.path.join(ROOT, "public", "art")
SOURCE_DIR = os.path.join(ROOT, "art", "blender")
os.makedirs(ART_DIR, exist_ok=True)
os.makedirs(SOURCE_DIR, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1000
scene.render.resolution_y = 820
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.render.image_settings.quality = 88
scene.render.filepath = os.path.join(ART_DIR, "flymart-neural-fly.webp")
scene.render.image_settings.color_management = "FOLLOW_SCENE"
scene.view_settings.look = "AgX - Medium High Contrast"


def material(name, color, metallic=0.0, roughness=0.4, emission=None, strength=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, alpha)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Alpha"].default_value = alpha
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        m.surface_render_method = "DITHERED"
    return m


INK = material("Chitin black", (0.025, 0.035, 0.02), metallic=0.35, roughness=0.22)
BODY = material("Iridescent body", (0.14, 0.20, 0.07), metallic=0.55, roughness=0.24)
LIME = material("FlyMart lime", (0.62, 1.0, 0.10), metallic=0.1, roughness=0.18, emission=(0.48, 1.0, 0.05), strength=5)
PINK = material("Brain hot pink", (1.0, 0.08, 0.28), metallic=0.05, roughness=0.22, emission=(1.0, 0.015, 0.18), strength=5)
CYAN = material("Arcade cyan", (0.05, 0.72, 1.0), metallic=0.1, roughness=0.18, emission=(0.02, 0.55, 1.0), strength=4)
EYE = material("Compound eyes", (0.95, 0.035, 0.04), metallic=0.65, roughness=0.13, emission=(0.8, 0.01, 0.01), strength=1.4)
WING = material("Holographic wings", (0.40, 0.75, 0.82), metallic=0.12, roughness=0.08, emission=(0.18, 0.48, 0.58), strength=0.5, alpha=0.42)
STEEL = material("Cabinet metal", (0.08, 0.10, 0.07), metallic=0.7, roughness=0.22)


def smooth(obj):
    if obj.type == "MESH":
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj


def uv(name, loc, scale, mat, segments=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=24, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return smooth(obj)


def cube(name, loc, scale, mat, bevel=0.12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Soft arcade edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
    return obj


def curve(name, points, mat, bevel=0.035, cyclic=False):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions = "3D"
    data.bevel_depth = bevel
    data.bevel_resolution = 4
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def look_at(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


# Neon arcade portal and cabinet silhouette.
curve("Neon portal", [(-3.45, 0.7, 0.0), (-3.45, 0.7, 5.3), (0, 0.7, 6.45), (3.45, 0.7, 5.3), (3.45, 0.7, 0.0)], LIME, 0.10)
curve("Inner portal", [(-2.95, 0.62, 0.1), (-2.95, 0.62, 5.0), (0, 0.62, 5.85), (2.95, 0.62, 5.0), (2.95, 0.62, 0.1)], CYAN, 0.025)
cube("Arcade plinth", (0, 0.85, -0.15), (3.75, 0.58, 0.24), STEEL, .18)
cube("Control deck", (0, -0.12, 0.45), (2.85, 0.72, 0.22), BODY, .16, (math.radians(-8), 0, 0))

# Joystick and two action buttons.
curve("Joystick", [(-1.7, -0.85, 0.58), (-1.7, -0.93, 1.15)], PINK, .09)
uv("Joystick ball", (-1.7, -0.93, 1.25), (.25, .25, .25), PINK)
for i, x in enumerate((1.15, 1.75)):
    uv(f"Action button {i+1}", (x, -0.83, 0.76), (.28, .28, .12), CYAN if i == 0 else LIME)

# Fly body and abdomen bands.
uv("Abdomen", (0, -0.55, 2.55), (1.0, 0.92, 1.75), BODY)
for z in (1.75, 2.28, 2.83):
    bpy.ops.mesh.primitive_torus_add(major_radius=.83, minor_radius=.095, major_segments=48, minor_segments=12, location=(0, -1.06, z), rotation=(math.radians(90), 0, 0))
    bpy.context.object.data.materials.append(INK)
uv("Thorax", (0, -0.72, 3.65), (1.18, 1.0, 1.1), INK)
uv("Head", (0, -1.05, 4.62), (1.06, .9, .92), BODY)

# Compound eyes.
for side in (-1, 1):
    eye = uv("Left eye" if side < 0 else "Right eye", (side * .67, -1.76, 4.68), (.54, .22, .61), EYE)
    eye.rotation_euler.y = side * math.radians(13)

# Brain lobes and neural web, intentionally visible above the head.
brain_nodes = [(-.52, -1.2, 5.13), (-.16, -1.3, 5.38), (.25, -1.28, 5.34), (.55, -1.18, 5.08), (0, -1.48, 5.02)]
for i, p in enumerate(brain_nodes):
    uv(f"Brain lobe {i+1}", p, (.39, .28, .36), PINK if i % 2 == 0 else LIME, 32)
for i, (a, b) in enumerate(((0,1),(1,2),(2,3),(0,4),(4,3),(1,4),(4,2))):
    curve(f"Synapse {i+1}", [brain_nodes[a], brain_nodes[b]], CYAN if i % 2 else LIME, .025)

# Wings as flattened luminous ellipsoids and bright veins.
for side in (-1, 1):
    wing = uv("Left wing" if side < 0 else "Right wing", (side * 1.65, .05, 4.05), (1.75, .18, .72), WING)
    wing.rotation_euler.y = side * math.radians(18)
    wing.rotation_euler.z = side * math.radians(-18)
    for j, dz in enumerate((-.24, 0, .24)):
        curve(f"Wing vein {side} {j}", [(side*.45, -.1, 4.0), (side*2.75, -.1, 4.1+dz)], CYAN, .018)

# Six lively legs and antennae.
leg_pairs = [((-0.6,-.75,3.2),(-2.0,-1.0,1.1),(-2.65,-1.1,.3)), ((-.7,-.65,2.7),(-1.4,-1.3,.8),(-1.65,-1.45,.05)), ((-.55,-.5,2.2),(-.8,-1.5,.65),(-.65,-1.65,.02))]
for idx, pts in enumerate(leg_pairs):
    curve(f"Left leg {idx}", pts, INK, .06)
    curve(f"Right leg {idx}", [(-x,y,z) for x,y,z in pts], INK, .06)
curve("Left antenna", [(-.3,-1.55,5.22),(-.7,-1.85,5.75),(-1.05,-1.82,5.95)], INK, .04)
curve("Right antenna", [(.3,-1.55,5.22),(.7,-1.85,5.75),(1.05,-1.82,5.95)], INK, .04)
uv("Antenna light L", (-1.05,-1.82,5.95), (.1,.1,.1), LIME, 24)
uv("Antenna light R", (1.05,-1.82,5.95), (.1,.1,.1), PINK, 24)

# Floating game pickups.
for i, (x, z, mat) in enumerate(((-3.0,4.1,PINK),(3.1,3.2,CYAN),(-2.7,1.75,LIME),(2.85,5.0,PINK))):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=.18, location=(x,-.6,z))
    bpy.context.object.name = f"Score pickup {i+1}"
    bpy.context.object.data.materials.append(mat)
    curve(f"Pickup orbit {i+1}", [(x-.25,-.55,z),(x,-.55,z+.3),(x+.25,-.55,z),(x,-.55,z-.3)], mat, .018, True)

# Camera and lighting.
bpy.ops.object.camera_add(location=(9.6, -16.5, 8.5))
camera = bpy.context.object
camera.data.lens = 58
look_at(camera, (0, -.35, 3.15))
scene.camera = camera

bpy.ops.object.light_add(type="AREA", location=(-4.5, -7, 8))
key = bpy.context.object
key.data.energy = 1150
key.data.shape = "DISK"
key.data.size = 5
key.data.color = (0.70, 1.0, 0.25)
look_at(key, (0, 0, 3))
bpy.ops.object.light_add(type="AREA", location=(5, -3, 5.5))
fill = bpy.context.object
fill.data.energy = 950
fill.data.size = 4
fill.data.color = (0.1, 0.55, 1.0)
look_at(fill, (0, 0, 3.4))
bpy.ops.object.light_add(type="POINT", location=(0, 1.5, 4.5))
bpy.context.object.data.energy = 900
bpy.context.object.data.color = (1.0, 0.05, 0.22)

scene.world.color = (0.002, 0.003, 0.002)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SOURCE_DIR, "flymart-arcade.blend"))
bpy.ops.render.render(write_still=True)
print(f"Rendered {scene.render.filepath}")
