import * as THREE from 'three';

// Configuration for the water
const CONFIG = {
    initialWaterHeight: 40,
    maxWaterHeight: 90,
    minWaterHeight: 5,
};

// Create realistic water for the reservoir
export async function createRealisticWater(scene, textureLoader) {
    return new Promise((resolve, reject) => {
        // Load water textures
        Promise.all([
            loadTexture(textureLoader, 'assets/textures/water_color.jpg'),
            loadTexture(textureLoader, 'assets/textures/water_normal.jpg')
        ]).then(([waterColor, waterNormal]) => {
            // Configure textures
            configureTextures(waterColor, waterNormal);
            
            // Create water shape following the Vajont valley topography
            const waterMesh = createWaterMesh(waterColor, waterNormal);
            
            // Add to scene
            scene.add(waterMesh);
            
            // Resolve with the water mesh
            resolve(waterMesh);
        }).catch(error => {
            console.error('Error loading water textures:', error);
            
            // Create fallback water
            const fallbackWater = createFallbackWater();
            scene.add(fallbackWater);
            
            resolve(fallbackWater);
        });
    });
}

// Helper function to load a texture with proper error handling
function loadTexture(textureLoader, path) {
    return new Promise((resolve, reject) => {
        textureLoader.load(
            path,
            texture => resolve(texture),
            undefined,
            error => reject(error)
        );
    });
}

// Configure water textures with proper wrapping and repeats
function configureTextures(colorTexture, normalTexture) {
    // Color texture
    colorTexture.wrapS = colorTexture.wrapT = THREE.RepeatWrapping;
    colorTexture.repeat.set(8, 8);
    
    // Normal texture for wave effect
    normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(12, 12);
}

// Create the actual water mesh with custom shape
function createWaterMesh(colorTexture, normalTexture) {
    // Create winding valley shape for reservoir
    const waterShape = new THREE.Shape();
    
    // Define points tracing the valley contour (tailored to Vajont)
    waterShape.moveTo(-150, -150);
    waterShape.quadraticCurveTo(-100, -100, 0, -80);
    waterShape.quadraticCurveTo(100, -60, 150, -20);
    waterShape.lineTo(150, 50);
    waterShape.quadraticCurveTo(80, 30, 0, 0);
    waterShape.quadraticCurveTo(-80, -30, -150, 0);
    waterShape.lineTo(-150, -150);
    
    // Create geometry from shape
    const waterGeometry = new THREE.ShapeGeometry(waterShape, 32);
    
    // Create advanced water material
    const waterMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x0D47A1,
        map: colorTexture,
        normalMap: normalTexture,
        normalScale: new THREE.Vector2(0.3, 0.3),
        transparent: true,
        opacity: 0.85,
        roughness: 0.1,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    
    // Lay flat and position
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = CONFIG.initialWaterHeight;
    
    // Enable shadows
    waterMesh.receiveShadow = true;
    
    // Add userData for animation
    waterMesh.userData.initialHeight = CONFIG.initialWaterHeight;
    
    return waterMesh;
}

// Create simple fallback water if textures fail to load
function createFallbackWater() {
    // Create simpler shape (rectangular)
    const waterGeometry = new THREE.PlaneGeometry(300, 200);
    
    // Basic blue material
    const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x1565C0,
        transparent: true,
        opacity: 0.75,
        roughness: 0.1,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
    
    // Lay flat and position
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = CONFIG.initialWaterHeight;
    waterMesh.position.z = -50; // Position in valley
    
    // Enable shadows
    waterMesh.receiveShadow = true;
    
    // Add userData for animation
    waterMesh.userData.initialHeight = CONFIG.initialWaterHeight;
    
    return waterMesh;
}

// Update water level based on slider value (0-100)
export function updateWaterLevel(waterMesh, sliderValue) {
    if (!waterMesh) return;
    
    // Calculate water height
    const waterHeight = (sliderValue / 100) * 
                      (CONFIG.maxWaterHeight - CONFIG.minWaterHeight) + 
                      CONFIG.minWaterHeight;
    
    // Update position
    waterMesh.position.y = waterHeight;
    
    return waterHeight;
}

// Create water splash effect at a specific position
export function createWaterSplash(scene, position, scale = 1) {
    // Create splash geometry
    const splashGeometry = new THREE.CylinderGeometry(
        0, // top radius
        15 * scale, // bottom radius
        25 * scale, // height
        16, // segments
        1, // height segments
        true // open ended
    );
    
    // Create material
    const splashMaterial = new THREE.MeshBasicMaterial({
        color: 0x0D47A1,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const splashMesh = new THREE.Mesh(splashGeometry, splashMaterial);
    
    // Position
    splashMesh.position.copy(position);
    
    // Hide initially
    splashMesh.visible = false;
    
    // Mark for cleanup
    splashMesh.userData.isAnimationObject = true;
    splashMesh.userData.creationTime = Date.now();
    
    scene.add(splashMesh);
    
    return splashMesh;
}

// Animate water splash
export function animateSplash(splash, duration = 1000) {
    if (!splash) return;
    
    // Make visible
    splash.visible = true;
    
    // Start time
    const startTime = Date.now();
    
    // Animation function
    function updateSplash() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Expand outward
        const scale = progress * 2;
        splash.scale.set(scale, scale * 0.5, scale);
        
        // Fade out
        splash.material.opacity = 0.7 * (1 - progress);
        
        // Continue animation until complete
        if (progress < 1) {
            requestAnimationFrame(updateSplash);
        } else {
            // Remove when done
            splash.parent.remove(splash);
        }
    }
    
    // Start animation
    updateSplash();
}

// Create a tsunami wave
export function createTsunamiWave(scene, position, waterHeight) {
    // Wave geometry (expanding cylinder)
    const waveGeometry = new THREE.CylinderGeometry(
        5, // top radius (will be animated)
        20, // bottom radius
        30, // height
        32, // segments
        1, // height segments
        true // open ended
    );
    
    // Wave material
    const waveMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x0D47A1,
        transparent: true,
        opacity: 0.7,
        roughness: 0.2,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const waveMesh = new THREE.Mesh(waveGeometry, waveMaterial);
    
    // Position at water surface where landslide hits
    waveMesh.position.copy(position);
    waveMesh.position.y = waterHeight;
    
    // Scale (will be animated)
    waveMesh.scale.set(0.1, 1, 0.1);
    
    // Mark for animation
    waveMesh.userData.isAnimationObject = true;
    waveMesh.userData.creationTime = Date.now();
    
    scene.add(waveMesh);
    
    return waveMesh;
}

// Animate the tsunami wave
export function animateTsunamiWave(wave, duration = 3000, targetScale = 5, targetPosition = null) {
    if (!wave) return Promise.reject('No wave mesh provided');
    
    return new Promise((resolve) => {
        const startTime = Date.now();
        const startPosition = wave.position.clone();
        const startScale = wave.scale.clone();
        
        function updateWave() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing function for natural wave motion
            const easedProgress = easeOutQuad(progress);
            
            // Scale wave outward
            const currentScale = easedProgress * targetScale;
            wave.scale.set(currentScale, 1 + progress * 2, currentScale);
            
            // Move wave if target position provided
            if (targetPosition) {
                wave.position.lerpVectors(
                    startPosition, 
                    targetPosition, 
                    easedProgress
                );
            }
            
            // Fade over time
            if (progress > 0.7) {
                wave.material.opacity = 0.7 * (1 - (progress - 0.7) / 0.3);
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateWave);
            } else {
                resolve();
            }
        }
        
        updateWave();
    });
}

// Create water wake behind a moving object
export function createWaterWake(scene, position, direction, waterHeight) {
    // Create wake geometry (elongated shape)
    const wakeShape = new THREE.Shape();
    
    // Create elongated teardrop shape
    wakeShape.moveTo(0, 0);
    wakeShape.quadraticCurveTo(5, 10, 0, 20);
    wakeShape.quadraticCurveTo(-5, 10, 0, 0);
    
    const wakeGeometry = new THREE.ShapeGeometry(wakeShape);
    
    // Create material
    const wakeMaterial = new THREE.MeshBasicMaterial({
        color: 0x29B6F6,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const wakeMesh = new THREE.Mesh(wakeGeometry, wakeMaterial);
    
    // Position
    wakeMesh.position.copy(position);
    wakeMesh.position.y = waterHeight + 0.1; // Slightly above water
    
    // Rotate to align with direction
    wakeMesh.rotation.x = -Math.PI / 2; // Lay flat
    
    // Calculate rotation to align with direction
    const angle = Math.atan2(direction.x, direction.z);
    wakeMesh.rotation.z = angle;
    
    // Mark for cleanup
    wakeMesh.userData.isAnimationObject = true;
    wakeMesh.userData.creationTime = Date.now();
    
    scene.add(wakeMesh);
    
    return wakeMesh;
}

// Create water overtopping effect (particles flowing over dam)
export function createWaterOvertopping(scene, damPosition, damWidth, damHeight) {
    // Create particles
    const particleCount = 200;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    
    // Initialize particles along the top of the dam
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Random position along dam crest
        particlePositions[i3] = damPosition.x + (Math.random() - 0.5) * damWidth;
        particlePositions[i3 + 1] = damHeight + Math.random() * 2;
        particlePositions[i3 + 2] = damPosition.z + (Math.random() - 0.5) * 10;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    // Create material
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x29B6F6,
        size: 1.5,
        opacity: 0.8,
        transparent: true,
        sizeAttenuation: true
    });
    
    // Create particle system
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    
    // Add velocity data
    particles.userData.velocities = [];
    for (let i = 0; i < particleCount; i++) {
        // Particles flow downward and outward from dam
        particles.userData.velocities.push({
            x: (Math.random() - 0.5) * 0.5,
            y: -Math.random() * 2 - 1,
            z: Math.random() * 2 + 1 // Away from dam
        });
    }
    
    // Tag for cleanup
    particles.userData.isAnimationObject = true;
    
    scene.add(particles);
    
    return particles;
}

// Update water overtopping particles
export function updateOvertoppingParticles(particles, deltaTime = 0.016) {
    if (!particles || !particles.userData.velocities) return;
    
    const positions = particles.geometry.attributes.position.array;
    const velocities = particles.userData.velocities;
    
    // Update each particle
    for (let i = 0; i < positions.length / 3; i++) {
        const i3 = i * 3;
        
        // Update position
        positions[i3] += velocities[i].x;
        positions[i3 + 1] += velocities[i].y;
        positions[i3 + 2] += velocities[i].z;
        
        // Apply gravity
        velocities[i].y -= 0.1 * deltaTime * 60;
        
        // Reset particles that go too far down
        if (positions[i3 + 1] < -20) {
            // Reset to top of dam
            positions[i3 + 1] = particles.userData.damHeight;
            
            // Reset velocity
            velocities[i].y = -Math.random() * 2 - 1;
        }
    }
    
    // Update geometry
    particles.geometry.attributes.position.needsUpdate = true;
}

// Quadratic ease out function for smooth animations
function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
}

// Export utilities
export {
    CONFIG,
    animateSplash,
    animateTsunamiWave,
    createWaterWake,
    createWaterOvertopping,
    updateOvertoppingParticles
};