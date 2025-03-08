import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Base
 */
const canvas = document.getElementById("container");

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const parameters = {
  count: 650,
  size: 0.01,
  radius: 1,
  branches: 6,
  spin: 3,
  randomness: 0.3,
  randomnessPower: 5,
  insideColor: "#ff6030",
  outsideColor: "#1b3984",
};
const colorInside = new THREE.Color(parameters.insideColor);
const colorOutside = new THREE.Color(parameters.outsideColor);

/**
 * Three.js Scene
 */
const scene = new THREE.Scene();

/**
 * Three.js Renderer
 */
const renderer = new THREE.WebGLRenderer();
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvas.appendChild(renderer.domElement);

/**
 * Three.js Camera
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
 * Three.js Orbital Controls
 */
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/**
 * CannonJs Physics world
 */
const world = new CANNON.World();
world.gravity.set(0, 0, 0);

/**
 * CannonJs Materials
 */
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
 * Asteroid
 */
// Three.js Asteroid
const texture = new THREE.TextureLoader().load("textures/asteroid.png");
const asteroidGeometry = new THREE.SphereGeometry(0.05, 32, 32);
const asteroidMaterial = new THREE.MeshMatcapMaterial({ color: 0x525252, matcap: texture });
const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
scene.add(asteroid);

// CannonJs Asteroid (Physics)
const asteroidShape = new CANNON.Sphere(0.15);
const asteroidBody = new CANNON.Body({
  mass: 50,
  shape: asteroidShape,
  position: new CANNON.Vec3(3, 0, 0),
  material: defaultMaterial,
});
world.addBody(asteroidBody);

const debugObject = {};

/**
 * Galaxy
 */
let geometry = null;
let material = null;
let points = null;
let particleBodies = [];

debugObject.generateGalaxy = () => {
  // Reset the galaxy
  if (points !== null) {
    geometry.dispose();
    material.dispose();
    particleBodies.length = 0;
    scene.remove(points);
  }

  // Geometry
  geometry = new THREE.BufferGeometry();

  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);

  // Calculate all the elipsis of the galaxy
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

    // Galaxy color
    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);
    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    // Galaxy particles physics
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

  //Galaxy material (Three.js)
  material = new THREE.PointsMaterial({
    size: parameters.size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  // Galaxy Points (Three.js Particles)
  points = new THREE.Points(geometry, material);
  scene.add(points);
};

debugObject.generateGalaxy();

/**
 * Reset the galaxy
 */
debugObject.reset = () => {
  for (let i = 0; i < particleBodies.length; i++) {
    world.removeBody(particleBodies[i]);
  }
  asteroidBody.position.set(3, 0, 0);
  asteroidBody.velocity.set(0, 0, 0);
  asteroidBody.angularVelocity.set(0, 0, 0);
  debugObject.generateGalaxy();
};

document.querySelector("button").addEventListener("click", debugObject.reset);

/**
 * Resize
 */
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

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

  // Update the position of the asteroid and add some movement
  asteroid.position.copy(asteroidBody.position);
  asteroidBody.position.x -= 0.015;

  // In case of collision, update the position of the particles
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
