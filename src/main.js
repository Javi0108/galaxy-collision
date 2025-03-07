import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as GUI from 'lil-gui'

const gui = new GUI.GUI()

/**
 * Base
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const parameters = {
  count: 700,
  size: 0.01,
  radius: 1,
  branches: 6,
  spin: 3,
  randomness: 0.3,
  randomnessPower: 5,
  insideColor: "#ff6030",
  outsideColor: "#1b3984",
};

// Canvas
const canvas = document.getElementById("container");

// Scene
const scene = new THREE.Scene();

// Physics world
const world = new CANNON.World();
world.gravity.set(0, 0, 0); // Sin gravedad global

scene.fog = new THREE.Fog("#000000", 15, 20);

const defaultMaterial = new CANNON.Material("default");
world.defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.1,
    restitution: 0.5,
  }
);
world.broadphase = new CANNON.SAPBroadphase(world);

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer();
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvas.appendChild(renderer.domElement)

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(0, 0, 1.5);
scene.add(camera);

/**
 * Orbital Controls
 */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/**
 * Asteroid
 */
const asteroidGeometry = new THREE.SphereGeometry(0.05, 32, 32)
const asteroidMaterial = new THREE.MeshBasicMaterial({ color: 0x6d6d6d })
const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial)
scene.add(asteroid)

const asteroidShape = new CANNON.Sphere(0.15)
const asteroidBody = new CANNON.Body({
  mass: 50,
  shape: asteroidShape,
  position: new CANNON.Vec3(5, 0, 0),
  material: defaultMaterial
})
world.addBody(asteroidBody)

const debugObject = {}

/**
 * Galaxy
 */
let geometry = null;
let material = null;
let points = null;
let particleBodies = [];

debugObject.generateGalaxy = () => {
  if (points !== null) {
    geometry.dispose();
    material.dispose();
    particleBodies = []
    scene.remove(points);
  }

  /**
   * Geometry
   */
  geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);

  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);

  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;
    const radius = Math.random() * parameters.radius;
    const spinAngle = radius * parameters.spin;
    const branchAngle =
      ((i % parameters.branches) / parameters.branches) * Math.PI * 2;
    const randomX =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;
    const randomY =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;
    const randomZ =
      Math.pow(Math.random(), parameters.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      parameters.randomness *
      radius;

    const px = Math.cos(branchAngle + spinAngle) * radius + randomX;
    const py = randomY;
    const pz = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    positions[i3] = px;
    positions[i3 + 1] = py;
    positions[i3 + 2] = pz;

    // Color
    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);
    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    // Física de partículas
    const particleShape = new CANNON.Box(new CANNON.Vec3(0.01, 0.01, 0));
    const particleBody = new CANNON.Body({
      mass: 1,
      shape: particleShape,
      position: new CANNON.Vec3(px, py, pz),
    });

    world.addBody(particleBody);
    particleBodies.push(particleBody);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  /**
   * Material
   */
  material = new THREE.PointsMaterial({
    size: parameters.size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  /**
   * Points
   */
  points = new THREE.Points(geometry, material);
  scene.add(points);
};

// Generar galaxia inicial
debugObject.generateGalaxy();

debugObject.reset = () => {
  asteroidBody.position.set(5, 0, 0);
  asteroidBody.velocity.set(0, 0, 0); // Resetear la velocidad
  asteroidBody.angularVelocity.set(0, 0, 0); // Resetear la rotación
  debugObject.generateGalaxy()
}
gui.add(debugObject, "reset")

window.addEventListener('resize', () =>
  {
      // Update sizes
      sizes.width = window.innerWidth
      sizes.height = window.innerHeight
  
      // Update camera
      camera.aspect = sizes.width / sizes.height
      camera.updateProjectionMatrix()
  
      // Update renderer
      renderer.setSize(sizes.width, sizes.height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  })

/**
 * Animate
 */
const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  world.step(1 / 60, deltaTime, 3);

  asteroid.position.copy(asteroidBody.position)
  asteroidBody.position.x -= 0.010

  // Actualizar posiciones de las partículas
  const positions = points.geometry.attributes.position.array;
  for (let i = 0; i < particleBodies.length; i++) {
    const i3 = i * 3;
    const body = particleBodies[i];
    positions[i3] = body.position.x;
    positions[i3 + 1] = body.position.y;
    positions[i3 + 2] = body.position.z;
  }
  points.geometry.attributes.position.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
};

tick();
