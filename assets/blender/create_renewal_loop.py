"""Original Substition brand sculpture. Run with Blender --background --python this_file."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public/images/renewal-loop.png"
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 96
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 6
scene.cycles.transparent_max_bounces = 6
scene.render.threads_mode = "FIXED"
scene.render.threads = 3
scene.render.resolution_x = 960
scene.render.resolution_y = 960
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.render.filepath = str(OUTPUT)
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"

world = bpy.data.worlds.new("Soft mint studio")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.79, 0.89, 0.84, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.48

def material(name, color, metallic, roughness, coat=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Metallic"].default_value = metallic
    p.inputs["Roughness"].default_value = roughness
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Coat Roughness"].default_value = 0.14
    return mat

jade = material("Glazed jade ceramic", (0.12, 0.58, 0.39), 0.38, 0.235, 0.5)
silver = material("Brushed liquid silver", (0.79, 0.85, 0.83), 0.94, 0.16, 0.25)
peach = material("Warm peach porcelain", (1.0, 0.48, 0.31), 0.14, 0.27, 0.4)

# A bespoke softly organic ring, gently undulating in depth.
verts, faces = [], []
u_count, v_count = 144, 48
for i in range(u_count):
    u = math.tau * i / u_count
    major = 1.24 + 0.055 * math.cos(3 * u)
    tube = 0.355 + 0.025 * math.sin(u + 0.6)
    for j in range(v_count):
        v = math.tau * j / v_count
        radius = major + tube * math.cos(v)
        verts.append((radius * math.cos(u), radius * math.sin(u), tube * math.sin(v) + 0.09 * math.sin(2 * u)))
for i in range(u_count):
    for j in range(v_count):
        faces.append((i*v_count+j, ((i+1)%u_count)*v_count+j,
                      ((i+1)%u_count)*v_count+(j+1)%v_count, i*v_count+(j+1)%v_count))
mesh = bpy.data.meshes.new("Organic continuous loop mesh")
mesh.from_pydata(verts, [], faces)
mesh.update()
loop = bpy.data.objects.new("Substition renewal loop", mesh)
scene.collection.objects.link(loop)
loop.location = (-0.11, 0.12, 0.7)
loop.rotation_euler = (math.radians(73), math.radians(-18), math.radians(-28))
loop.scale = (1.08, 1.0, 1.0)
loop.data.materials.append(jade)
for face in mesh.polygons:
    face.use_smooth = True

bpy.ops.mesh.primitive_torus_add(major_segments=112, minor_segments=32,
    location=(1.15, -0.37, 1.27), major_radius=0.64, minor_radius=0.105,
    rotation=(math.radians(66), math.radians(33), math.radians(-19)))
ring = bpy.context.object
ring.name = "Floating silver companion ring"
ring.data.materials.append(silver)
for face in ring.data.polygons:
    face.use_smooth = True

bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=40, radius=0.335,
    location=(-1.3, -0.25, 2.2))
orb = bpy.context.object
orb.name = "Peach delight orb"
orb.data.materials.append(peach)
for face in orb.data.polygons:
    face.use_smooth = True

# Transparent shadow catcher preserves the render's soft grounding on any pale surface.
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.9))
floor = bpy.context.object
floor.name = "Transparent studio shadow catcher"
floor.is_shadow_catcher = True
floor.data.materials.append(material("Shadow surface", (0.84, 0.92, 0.88), 0, 0.8))

def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()

def area(name, location, power, size, color, target=(0, 0, 0.8), shape="DISK", size_y=None):
    light = bpy.data.lights.new(name, "AREA")
    light.energy = power
    light.shape = shape
    light.size = size
    light.color = color
    if size_y is not None:
        light.size_y = size_y
    obj = bpy.data.objects.new(name, light)
    scene.collection.objects.link(obj)
    obj.location = location
    aim(obj, target)
    return obj

area("Large softbox upper left", (-4.5, -4, 7), 1000, 5, (0.91, 1, 0.96))
area("Long warm edge highlight", (4, 1.2, 5), 1350, 3, (1, 0.88, 0.76), shape="RECTANGLE", size_y=5)
area("Front reflection card", (1, -5, 2.8), 430, 3, (0.86, 0.95, 1))
area("Mint rim", (-3, 4, 2.8), 850, 3, (0.65, 1, 0.8))

camera_data = bpy.data.cameras.new("Sculpture portrait camera")
camera = bpy.data.objects.new("Sculpture portrait camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (4.5, -8, 4.0)
aim(camera, (0, 0, 0.8))
camera_data.type = "ORTHO"
camera_data.ortho_scale = 4.75
camera_data.lens = 60
scene.camera = camera
scene.render.image_settings.compression = 30
scene["Artwork"] = "Substition — continuous renewal, thoughtful control"
scene["Creator"] = "Original procedural Blender scene, made for Substition"
scene["License"] = "Project-owned original illustration; no third-party geometry or textures"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "assets/blender/renewal-loop.blend"))
bpy.ops.render.render(write_still=True)
