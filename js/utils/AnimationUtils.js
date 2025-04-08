import * as THREE from 'three';

/**
 * Animation utility functions for the Vajont Dam simulation
 * Provides common animation helpers and easing functions
 */

/**
 * Create debris particles for landslide effect
 * @param {THREE.Scene} scene - The scene to add particles to
 * @param {THREE.Vector3} position - Base position for particles
 * @returns {THREE.Points} Particle system
 */
export function createDebrisParticles(scene, position) {
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Initialize particles around the landslide
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Random positions near the landslide
        positions[i3] = position.x + (Math.random() - 0.5) * 50;
        positions[i3 + 1] = position.y + Math.random() * 50;
        positions[i3 + 2] = position.z + (Math.random() - 0.5) * 50;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create material
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x8B4513,
        size: 2,
        opacity: 0.8,
        transparent: true,
        sizeAttenuation: true
    });
    
    // Create particles
    const particles = new THREE.Points(particleGeo, particleMaterial);
    particles.userData.velocities = [];
    
    // Initialize velocities
    for (let i = 0; i < particleCount; i++) {
        particles.userData.velocities.push({
            x: (Math.random() - 0.5) * 2,
            y: Math.random() * -2,
            z: (Math.random() - 0.5) * 2
        });
    }
    
    // Tag for cleanup
    particles.userData.isAnimationObject = true;
    
    scene.add(particles);
    
    return particles;
}

/**
 * Update debris particles
 * @param {THREE.Scene} scene - Scene containing particles
 * @param {number} progress - Animation progress (0-1)
 */
export function updateDebrisParticles(scene, progress) {
    // Find all particle systems
    scene.traverse(function(object) {
        if (object instanceof THREE.Points && object.userData.isAnimationObject) {
            const positions = object.geometry.attributes.position.array;
            const velocities = object.userData.velocities;
            
            // Update each particle position
            for (let i = 0; i < positions.length / 3; i++) {
                const i3 = i * 3;
                
                // Apply velocity
                positions[i3] += velocities[i].x;
                positions[i3 + 1] += velocities[i].y;
                positions[i3 + 2] += velocities[i].z;
                
                // Add gravity
                velocities[i].y -= 0.1;
                
                // Bounce off ground
                if (positions[i3 + 1] < 0) {
                    positions[i3 + 1] = 0;
                    velocities[i].y *= -0.4;
                }
            }
            
            // Fade out particles as animation progresses
            object.material.opacity = Math.max(0, 0.8 - progress * 0.8);
            
            // Update geometry
            object.geometry.attributes.position.needsUpdate = true;
        }
    });
}

/**
 * Update splash particles for water effects
 * @param {THREE.Scene} scene - Scene containing particles
 * @param {number} progress - Animation progress (0-1)
 */
export function updateSplashParticles(scene, progress) {
    // Find all splash particle systems
    scene.traverse(function(object) {
        if (object instanceof THREE.Points && 
            object.userData.isAnimationObject && 
            object.material.color.getHexString() === '1e88e5') {
            
            const positions = object.geometry.attributes.position.array;
            const velocities = object.userData.velocities;
            
            // Update each particle position
            for (let i = 0; i < positions.length / 3; i++) {
                const i3 = i * 3;
                
                // Apply velocity
                positions[i3] += velocities[i].x;
                positions[i3 + 1] += velocities[i].y;
                positions[i3 + 2] += velocities[i].z;
                
                // Add gravity
                velocities[i].y -= 0.1;
            }
            
            // Fade out particles as animation progresses
            object.material.opacity = Math.max(0, 0.7 - progress * 0.7);
            
            // Update geometry
            object.geometry.attributes.position.needsUpdate = true;
        }
    });
}

/**
 * Clean up animation objects from scene
 * @param {THREE.Scene} scene - Scene to clean up
 */
export function cleanupAnimationObjects(scene) {
    const objectsToRemove = [];
    
    scene.traverse(function(object) {
        if (object.userData && object.userData.isAnimationObject) {
            objectsToRemove.push(object);
        }
    });
    
    objectsToRemove.forEach(object => {
        scene.remove(object);
    });
}

/**
 * Add camera shake effect
 * @param {THREE.Camera} camera - Camera to shake
 * @param {number} intensity - Shake intensity
 * @param {number} duration - Shake duration in milliseconds
 * @returns {Promise} Promise that resolves when shaking completes
 */
export function addCameraShake(camera, intensity = 1, duration = 1000) {
    if (!camera) return Promise.resolve();
    
    // Store original position
    const originalPosition = camera.position.clone();
    
    // Animation parameters
    const startTime = Date.now();
    let lastTime = startTime;
    
    return new Promise(resolve => {
        function shakeStep() {
            const now = Date.now();
            const elapsed = now - startTime;
            const deltaTime = now - lastTime;
            lastTime = now;
            
            if (elapsed >= duration) {
                // Reset to original position
                camera.position.copy(originalPosition);
                resolve();
                return;
            }
            
            // Calculate decreasing intensity
            const remainingIntensity = intensity * (1 - elapsed / duration);
            
            // Add random displacement
            camera.position.x = originalPosition.x + (Math.random() - 0.5) * remainingIntensity;
            camera.position.y = originalPosition.y + (Math.random() - 0.5) * remainingIntensity;
            camera.position.z = originalPosition.z + (Math.random() - 0.5) * remainingIntensity;
            
            requestAnimationFrame(shakeStep);
        }
        
        shakeStep();
    });
}

/**
 * Create an explosion effect
 * @param {THREE.Scene} scene - Scene to add explosion to
 * @param {THREE.Vector3} position - Explosion position
 * @param {number} size - Explosion size
 * @param {number} color - Explosion color
 * @returns {THREE.Points} Particle system
 */
export function createExplosionEffect(scene, position, size = 1, color = 0xff5500) {
    const particleCount = 100 * size;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Set all initial positions to the center
    for (let i = 0; i < positions.length; i++) {
        positions[i] = 0;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create material
    const particleMaterial = new THREE.PointsMaterial({
        color: color,
        size: 2 * size,
        opacity: 1,
        transparent: true,
        sizeAttenuation: true
    });
    
    // Create particle system
    const particles = new THREE.Points(particleGeo, particleMaterial);
    particles.position.copy(position);
    
    // Setup velocities
    particles.userData.velocities = [];
    
    for (let i = 0; i < particleCount; i++) {
        // Random direction
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        // Random speed
        const speed = Math.random() * 2 * size + 0.5;
        
        // Convert to Cartesian coordinates
        particles.userData.velocities.push({
            x: Math.sin(phi) * Math.cos(theta) * speed,
            y: Math.sin(phi) * Math.sin(theta) * speed,
            z: Math.cos(phi) * speed
        });
    }
    
    // Mark for cleanup
    particles.userData.isAnimationObject = true;
    particles.userData.creationTime = Date.now();
    particles.userData.duration = 1000; // 1 second
    
    scene.add(particles);
    
    // Animate explosion
    function animateExplosion() {
        const elapsed = Date.now() - particles.userData.creationTime;
        const progress = Math.min(elapsed / particles.userData.duration, 1);
        
        if (progress >= 1) {
            // Remove when complete
            scene.remove(particles);
            return;
        }
        
        // Update particle positions
        const positions = particles.geometry.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const velocity = particles.userData.velocities[i];
            
            // Update position
            positions[i3] += velocity.x;
            positions[i3 + 1] += velocity.y;
            positions[i3 + 2] += velocity.z;
            
            // Slow down over time
            velocity.x *= 0.95;
            velocity.y *= 0.95;
            velocity.z *= 0.95;
        }
        
        // Fade out
        particles.material.opacity = 1 - progress;
        
        // Update geometry
        particles.geometry.attributes.position.needsUpdate = true;
        
        // Continue animation
        requestAnimationFrame(animateExplosion);
    }
    
    // Start animation
    animateExplosion();
    
    return particles;
}

/**
 * Simple delay promise
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} Promise that resolves after delay
 */
export function delay(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

// Easing Functions

/**
 * Quadratic ease-in-out
 * @param {number} t - Progress (0-1)
 * @returns {number} Eased value
 */
export function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Cubic ease-in-out
 * @param {number} t - Progress (0-1)
 * @returns {number} Eased value
 */
export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Quadratic ease-out
 * @param {number} t - Progress (0-1)
 * @returns {number} Eased value
 */
export function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
}

/**
 * Cubic ease-out
 * @param {number} t - Progress (0-1)
 * @returns {number} Eased value
 */
export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Back ease-in-out (overshooting)
 * @param {number} t - Progress (0-1)
 * @returns {number} Eased value
 */
export function easeInOutBack(t) {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    
    return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
}