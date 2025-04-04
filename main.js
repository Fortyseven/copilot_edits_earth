import * as THREE from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Ensure the body, html, and canvas occupy the full viewport
document.documentElement.style.height = "100%";
document.body.style.height = "100%";
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
renderer.domElement.style.display = "block";
renderer.domElement.style.position = "absolute";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";

// Enable shadows in the renderer
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Use soft shadows

const resizeCanvas = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    renderer.domElement.width = width;
    renderer.domElement.height = height;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
};

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

camera.position.z = 5;

// Update the geometry to a sphere
const geometry = new THREE.SphereGeometry(1, 32, 32); // Create a sphere with radius 1 and 32 segments
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load("textures/earth.jpg"); // Use the local texture
const material = new THREE.MeshStandardMaterial({ map: earthTexture }); // Use MeshStandardMaterial for lighting
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Configure the sphere to cast and receive shadows
sphere.castShadow = true;
sphere.receiveShadow = true;

// Create a smaller "moon-like" sphere with a texture
const moonGeometry = new THREE.SphereGeometry(0.3, 16, 16); // Smaller sphere
const moonTexture = textureLoader.load("textures/moon.png"); // Load the moon texture
const moonMaterial = new THREE.MeshStandardMaterial({ map: moonTexture }); // Use MeshStandardMaterial for lighting
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moon);

// Configure the moon to cast and receive shadows
moon.castShadow = true;
moon.receiveShadow = true;

let moonAngle = 0; // Track the moon's orbit angle

// Load a water texture for the plane
const waterTexture = textureLoader.load("textures/water.png"); // Use the local texture
waterTexture.wrapS = THREE.ClampToEdgeWrapping; // Prevent repeating
waterTexture.wrapT = THREE.ClampToEdgeWrapping; // Prevent repeating
waterTexture.repeat.set(1, 1); // Stretch the texture over the plane

const planeGeometry = new THREE.PlaneGeometry(15, 10); // Increase width by 200% more
const planeMaterial = new THREE.MeshStandardMaterial({
    map: waterTexture,
    color: 0x808080, // Reduce brightness to 50% (gray)
}); // Use MeshStandardMaterial for lighting
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2; // Rotate the plane to lie flat
plane.position.y = -1; // Position the plane just under the sphere
scene.add(plane); // Add the plane to the scene

// Configure the plane to receive shadows
plane.receiveShadow = true;

// Add a directional light to simulate sunlight
const sunlight = new THREE.DirectionalLight(0xffffff, 1); // White light with full intensity
sunlight.position.set(5, 10, 5); // Position the light at an angle
sunlight.castShadow = true; // Enable shadows for the light
sunlight.shadow.mapSize.width = 1024; // Shadow map resolution
sunlight.shadow.mapSize.height = 1024;
sunlight.shadow.camera.near = 0.5;
sunlight.shadow.camera.far = 50;
scene.add(sunlight);

// Restore the directional light intensity and shadow settings
sunlight.intensity = 1.5; // Restore the original light intensity
sunlight.shadow.bias = 0; // Remove the shadow bias adjustment
sunlight.position.set(10, 15, 10); // Adjust the light angle for better shadow casting

// Configure the shadow camera for better shadow visibility
sunlight.shadow.camera.left = -10;
sunlight.shadow.camera.right = 10;
sunlight.shadow.camera.top = 10;
sunlight.shadow.camera.bottom = -10;

// Function to create stars
const createStars = () => {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            pointTexture: {
                value: new THREE.TextureLoader().load("textures/star.png"),
            },
        },
        vertexShader: `
            attribute float sizeFactor;
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = sizeFactor * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D pointTexture;
            void main() {
                vec2 flippedCoord = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y); // Flip Y-axis
                vec4 textureColor = texture2D(pointTexture, flippedCoord);
                if (textureColor.a < 0.1) discard; // Discard fragments with low alpha
                gl_FragColor = vec4(textureColor.rgb, textureColor.a); // Preserve alpha for transparency
            }
        `,
        transparent: true, // Enable transparency
        depthWrite: false, // Prevent depth conflicts for transparent objects
        blending: THREE.AdditiveBlending, // Use additive blending for better star visuals
    });

    const starCount = 500;
    const positions = new Float32Array(starCount * 3); // Each star has x, y, z
    const sizes = new Float32Array(starCount); // Store individual size factors
    const rotationSpeeds = new Float32Array(starCount); // Store individual rotation speeds

    for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100; // x
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100; // y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100; // z
        sizes[i] = Math.random() * 2 + 0.5; // Random initial size between 0.5 and 2.5
        rotationSpeeds[i] = Math.random() * 0.001 + 0.0005; // Random rotation speed between 0.0005 and 0.0015
    }

    starGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );
    starGeometry.setAttribute(
        "sizeFactor",
        new THREE.BufferAttribute(sizes, 1)
    );

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    stars.userData = { sizes, rotationSpeeds }; // Store sizes and rotation speeds for animation
    return stars;
};

const stars = createStars(); // Add stars to the scene

let time = 0; // Track time for sine wave motion

const animate = () => {
    requestAnimationFrame(animate);
    sphere.rotation.y += 0.01; // Rotate only on the Y-axis

    // Rotate the moon in the opposite direction
    moon.rotation.y -= 0.01; // Rotate in the opposite direction at the same speed

    // Add sine wave motion to the sphere
    time += 0.02; // Increment time
    sphere.position.y = Math.sin(time) * 0.5; // Gently raise and lower the sphere

    // Animate the moon's orbit around the sphere
    moonAngle += 0.01; // Increment the moon's orbit angle
    moon.position.x = sphere.position.x + Math.cos(moonAngle) * 2; // Orbit radius of 2
    moon.position.z = sphere.position.z + Math.sin(moonAngle) * 2;
    moon.position.y = sphere.position.y; // Keep the moon aligned with the sphere's Y position

    // Animate star sizes and rotation for twinkling effect
    const sizes = stars.userData.sizes;
    const rotationSpeeds = stars.userData.rotationSpeeds;
    const sizeAttribute = stars.geometry.attributes.sizeFactor;
    const positions = stars.geometry.attributes.position.array;

    for (let i = 0; i < sizes.length; i++) {
        sizes[i] += (Math.random() - 0.5) * 0.02; // Smaller random size change for slower animation
        sizes[i] = Math.min(1.5, Math.max(0.8, sizes[i])); // Clamp between 0.8 and 1.5
        sizeAttribute.array[i] = sizes[i]; // Update the size factor

        // Rotate stars on the Z-axis
        const x = positions[i * 3];
        const y = positions[i * 3 + 1];
        const angle = rotationSpeeds[i];
        positions[i * 3] = x * Math.cos(angle) - y * Math.sin(angle); // Update x
        positions[i * 3 + 1] = x * Math.sin(angle) + y * Math.cos(angle); // Update y
    }

    sizeAttribute.needsUpdate = true; // Notify Three.js of the update
    stars.geometry.attributes.position.needsUpdate = true; // Notify Three.js of position update

    renderer.render(scene, camera);
};

animate();
