import * as THREE from 'three';
import { easeInOutQuad, easeInOutCubic, easeOutQuad, easeOutCubic, easeInOutBack } from './utils.js';

// Animation state
let animating = false;

// Update stability indicator based on water level
export function updateStabilityIndicator(value) {
    const stabilityIndicator = document.getElementById('stability-indicator');
    if (!stabilityIndicator) return;
    
    let stabilityText, stabilityColor;
    
    if (value > 80) {
        stabilityText = "Critical - Imminent Failure";
        stabilityColor = "#e53935"; // deep red
    } else if (value > 65) {
        stabilityText = "Very Low - Dangerously Unstable";
        stabilityColor = "#ff5252"; // red
    } else if (value > 50) {
        stabilityText = "Low - Significant Risk";
        stabilityColor = "#ff9800"; // orange
    } else if (value > 35) {
        stabilityText = "Moderate - Caution";
        stabilityColor = "#ffc107"; // amber
    } else if (value > 20) {
        stabilityText = "Good - Minor Stress";
        stabilityColor = "#cddc39"; // lime
    } else {
        stabilityText = "Excellent - Stable";
        stabilityColor = "#4caf50"; // green
    }
    
    stabilityIndicator.textContent = "Stability: " + stabilityText;
    stabilityIndicator.style.backgroundColor = stabilityColor;
    stabilityIndicator.style.color = value > 35 ? "#fff" : "#333";
    
    return {
        text: stabilityText,
        color: stabilityColor
    };
}

// Reset the simulation to initial state
export function resetSimulation(scene, waterLevelSlider, clayLayer, landslideBlock, waterMesh, saturatedZone) {
    // Stop any ongoing animation
    animating = false;
    
    // Reset water level slider
    if (waterLevelSlider) {
        waterLevelSlider.value = 30;
        updateWaterLevel(waterMesh, 30);
        updateStabilityIndicator(30);
        updateSaturationVisualization(saturatedZone, 30);
    }
    
    // Reset landslide block position and rotation
    if (landslideBlock) {
        landslideBlock.visible = true;
        
        if (landslideBlock.userData.originalPosition) {
            landslideBlock.position.copy(landslideBlock.userData.originalPosition);
        }
        
        if (landslideBlock.userData.originalRotation) {
            landslideBlock.rotation.copy(landslideBlock.userData.originalRotation);
        }
    }
    
    // Reset clay layer color
    if (clayLayer && clayLayer.material) {
        clayLayer.material.color.set(0xA09077); // Default clay color
        clayLayer.material.emissiveIntensity = 0;
    }
    
    // Hide timeline
    const timeline = document.getElementById('timeline');
    if (timeline) {
        timeline.style.display = 'none';
    }
    
    // Remove any animation objects
    cleanupAnimationObjects(scene);
    
    // Re-enable controls
    enableUIControls();
}

// Update water level based on slider value
function updateWaterLevel(waterMesh, sliderValue) {
    if (!waterMesh) return;
    
    // Get min and max water heights from CONFIG
    const minWaterHeight = 5;
    const maxWaterHeight = 90;
    
    // Calculate water height
    const waterHeight = (sliderValue / 100) * (maxWaterHeight - minWaterHeight) + minWaterHeight;
    
    // Update water mesh position
    waterMesh.position.y = waterHeight;
    
    return waterHeight;
}

// Update saturated zone visualization
function updateSaturationVisualization(saturatedZone, sliderValue) {
    if (!saturatedZone) return;
    
    // Only show saturation at higher water levels
    if (sliderValue > 30) {
        saturatedZone.visible = true;
        
        // Calculate saturation scale based on water level
        const saturationScale = (sliderValue - 30) / 70; // 0 at 30%, 1 at 100%
        
        // Adjust opacity and scale
        saturatedZone.material.opacity = 0.3 + saturationScale * 0.5;
        const scale = 0.6 + saturationScale * 0.5;
        saturatedZone.scale.set(1, scale, 1);
    } else {
        saturatedZone.visible = false;
    }
}

// Update clay layer visualization based on stability
function updateClayLayer(clayLayer, sliderValue) {
    if (!clayLayer || !clayLayer.material) return;
    
    if (sliderValue > 65) {
        // Critical stress
        clayLayer.material.color.set(0xe53935); // Red
        clayLayer.material.emissive = new THREE.Color(0xff5252);
        clayLayer.material.emissiveIntensity = 0.3;
    } else if (sliderValue > 50) {
        // High stress
        clayLayer.material.color.set(0xff9800); // Orange
        clayLayer.material.emissive = new THREE.Color(0xff9800);
        clayLayer.material.emissiveIntensity = 0.2;
    } else {
        // Normal state
        clayLayer.material.color.set(0xA09077); // Default clay color
        clayLayer.material.emissiveIntensity = 0;
    }
}

// Play the complete disaster sequence
export async function playDisasterSequence(
    scene, camera, controls, landslideBlock, waterMesh, clayLayer, saturatedZone, waterLevelSlider
) {
    if (animating) return;
    animating = true;
    
    // Disable UI controls during animation
    disableUIControls();
    
    // Show timeline
    const timeline = document.getElementById('timeline');
    const timelineProgress = document.getElementById('timeline-progress');
    if (timeline) {
        timeline.style.display = 'block';
        timelineProgress.style.width = '0%';
    }
    
    try {
        // 1. Move to view of Mount Toc
        await animateCameraToMountToc(camera, controls);
        
        // 2. Gradually raise water level
        await animateWaterLevel(waterMesh, clayLayer, saturatedZone, waterLevelSlider, 30, 85, timelineProgress);
        
        // Wait a moment at critical level
        await delay(1000);
        if (!animating) return;
        
        // 3. Trigger landslide
        await animateLandslide(scene, landslideBlock, timelineProgress);
        
        // 4. Create tsunami wave
        await animateTsunami(scene, waterMesh, timelineProgress);
        
        // 5. Show disaster summary after a delay
        await delay(1000);
        if (animating) {
            showDisasterSummary();
        }
    } catch (error) {
        console.error("Animation error:", error);
    } finally {
        if (!animating) {
            // If animation was interrupted, reset
            resetSimulation(scene, waterLevelSlider, clayLayer, landslideBlock, waterMesh, saturatedZone);
        }
        
        // Re-enable UI controls
        enableUIControls();
    }
}

// Animate camera to Mount Toc view
async function animateCameraToMountToc(camera, controls) {
    return new Promise((resolve) => {
        // Start position and target
        const startPosition = camera.position.clone();
        const startTarget = controls.target.clone();
        
        // End position and target (Mount Toc view)
        const endPosition = new THREE.Vector3(-150, 80, -50);
        const endTarget = new THREE.Vector3(-120, 50, -180);
        
        // Animation parameters
        const duration = 2000; // 2 seconds
        const startTime = Date.now();
        
        function updateCamera() {
            if (!animating) {
                resolve();
                return;
            }
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing for smooth camera movement
            const easedProgress = easeInOutCubic(progress);
            
            // Update camera position
            camera.position.lerpVectors(startPosition, endPosition, easedProgress);
            
            // Update controls target
            controls.target.lerpVectors(startTarget, endTarget, easedProgress);
            controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(updateCamera);
            } else {
                resolve();
            }
        }
        
        updateCamera();
    });
}

// Animate water level change
async function animateWaterLevel(waterMesh, clayLayer, saturatedZone, waterLevelSlider, startLevel, endLevel, timelineProgress) {
    return new Promise((resolve) => {
        // Animation parameters
        const duration = Math.abs(endLevel - startLevel) * 50; // 50ms per level unit
        const startTime = Date.now();
        
        function updateWaterAnimation() {
            if (!animating) {
                resolve();
                return;
            }
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Update timeline progress (first 40% of timeline)
            if (timelineProgress) {
                timelineProgress.style.width = `${progress * 40}%`;
            }
            
            // Calculate current level with easing
            const easedProgress = easeInOutQuad(progress);
            const currentLevel = Math.round(startLevel + (endLevel - startLevel) * easedProgress);
            
            // Update water level
            if (waterLevelSlider) {
                waterLevelSlider.value = currentLevel;
                updateWaterLevel(waterMesh, currentLevel);
                updateStabilityIndicator(currentLevel);
                updateSaturationVisualization(saturatedZone, currentLevel);
                updateClayLayer(clayLayer, currentLevel);
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateWaterAnimation);
            } else {
                resolve();
            }
        }
        
        updateWaterAnimation();
    });
}

// Animate the landslide
async function animateLandslide(scene, landslideBlock, timelineProgress) {
    if (!landslideBlock) return Promise.resolve();
    
    // Define landslide animation parameters
    const startPos = landslideBlock.position.clone();
    const endPos = new THREE.Vector3(
        startPos.x + 30,     // Move slightly laterally
        startPos.y - 40,     // Slide down
        startPos.z + 40      // Move into reservoir
    );
    
    const startRotation = landslideBlock.rotation.clone();
    const endRotation = new THREE.Euler(
        startRotation.x + 0.2,  // Tilt forward
        startRotation.y,
        startRotation.z - 0.1   // Slight twist
    );
    
    // Create debris particles
    createDebrisParticles(scene, landslideBlock.position);
    
    // Add rumble/cracking sound effect if available
    playLandslideSound();
    
    // Animation parameters
    const slideDuration = 3000; // 3 seconds
    const startTime = Date.now();
    
    return new Promise((resolve) => {
        function animateLandslideStep() {
            if (!animating) {
                resolve();
                return;
            }
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / slideDuration, 1);
            
            // Update timeline (40-70% of timeline)
            if (timelineProgress) {
                timelineProgress.style.width = `${40 + progress * 30}%`;
            }
            
            // Use non-linear easing for more dramatic effect
            const eased = easeInOutBack(progress);
            
            // Update landslide position and rotation
            landslideBlock.position.lerpVectors(startPos, endPos, eased);
            
            // Update rotation
            landslideBlock.rotation.x = THREE.MathUtils.lerp(
                startRotation.x,
                endRotation.x,
                eased
            );
            
            landslideBlock.rotation.z = THREE.MathUtils.lerp(
                startRotation.z,
                endRotation.z,
                eased
            );
            
            // Update debris particles
            updateDebrisParticles(scene, progress);
            
            if (progress < 1) {
                requestAnimationFrame(animateLandslideStep);
            } else {
                resolve();
            }
        }
        
        animateLandslideStep();
    });
}

// Create debris particles for landslide effect
function createDebrisParticles(scene, position) {
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
    
    // Initialize velocities with spherical distribution
    for (let i = 0; i < particleCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const speed = Math.random() * 3 + 1;
        
        particles.userData.velocities.push({
            x: Math.sin(phi) * Math.cos(theta) * speed,
            y: Math.sin(phi) * Math.sin(theta) * speed,
            z: Math.cos(phi) * speed
        });
    }
    
    // Tag for cleanup
    particles.userData.isAnimationObject = true;
    
    scene.add(particles);
}

// Update splash particles
function updateSplashParticles(scene, progress) {
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

// Create water overtopping effect
function createWaterOvertopping(scene) {
    // Create falling water particles on downstream side of dam
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Position particles along the top of the dam
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Random position along dam crest
        positions[i3] = (Math.random() - 0.5) * 150; // Dam width
        positions[i3 + 1] = 90; // Dam height
        positions[i3 + 2] = (Math.random() - 0.5) * 10;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create material
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x29B6F6,
        size: 1.5,
        opacity: 0.9,
        transparent: true,
        sizeAttenuation: true
    });
    
    // Create particles
    const particles = new THREE.Points(particleGeo, particleMaterial);
    particles.userData.velocities = [];
    
    // Initialize velocities downward
    for (let i = 0; i < particleCount; i++) {
        particles.userData.velocities.push({
            x: (Math.random() - 0.5) * 0.5,
            y: -Math.random() * 2 - 1,
            z: Math.random() * 2 + 1 // Flow away from dam
        });
    }
    
    // Tag for cleanup
    particles.userData.isAnimationObject = true;
    
    scene.add(particles);
    
    // Return for potential updates
    return particles;
}

// Show disaster summary
function showDisasterSummary() {
    animating = false;
    
    // Create summary overlay
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'disaster-summary';
    summaryDiv.innerHTML = `
        <h2>The Vajont Dam Disaster: October 9, 1963</h2>
        <p>A massive landslide of approximately 270 million cubic meters of rock slid into the Vajont reservoir at around 110 km/h (68 mph).</p>
        <p>The displaced water created a 250-meter high tsunami wave that overtopped the dam by 100 meters and rushed down the narrow valley.</p>
        <p>Nearly 2,000 people perished in the towns of Longarone, Pirago, Villanova, Rivalta, and Fae. The dam itself remained almost intact.</p>
        <p>This tragedy resulted from a failure to properly assess the geological instability of Mount Toc, despite warning signs in the years prior to the disaster.</p>
        <p>The Vajont disaster serves as a critical lesson in the importance of thorough geological studies for large infrastructure projects in mountainous regions.</p>
        <button id="close-summary">Close</button>
    `;
    document.body.appendChild(summaryDiv);
    
    // Add close handler
    document.getElementById('close-summary').addEventListener('click', () => {
        document.body.removeChild(summaryDiv);
        
        // Find reset button and trigger it
        const resetButton = document.getElementById('reset-button');
        if (resetButton) {
            resetButton.click();
        }
    });
}

// Clean up animation objects from scene
function cleanupAnimationObjects(scene) {
    // Find all animation objects
    const objectsToRemove = [];
    
    scene.traverse(function(object) {
        if (object.userData && object.userData.isAnimationObject) {
            objectsToRemove.push(object);
        }
    });
    
    // Remove them
    objectsToRemove.forEach(object => {
        scene.remove(object);
    });
}

// Disable UI controls during animation
function disableUIControls() {
    // Disable buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        if (button.id !== 'close-summary') {
            button.disabled = true;
            button.style.opacity = 0.5;
        }
    });
    
    // Disable water slider
    const waterLevelSlider = document.getElementById('waterLevel');
    if (waterLevelSlider) {
        waterLevelSlider.disabled = true;
        waterLevelSlider.style.opacity = 0.5;
    }
}

// Re-enable UI controls
function enableUIControls() {
    // Enable buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = false;
        button.style.opacity = 1;
    });
    
    // Enable water slider
    const waterLevelSlider = document.getElementById('waterLevel');
    if (waterLevelSlider) {
        waterLevelSlider.disabled = false;
        waterLevelSlider.style.opacity = 1;
    }
}

// Play sound effects (if supported by browser)
function playLandslideSound() {
    try {
        // Create audio element
        const audio = document.createElement('audio');
        
        // Try to load sound file
        audio.src = './assets/sounds/landslide.mp3';
        
        // Adjust volume
        audio.volume = 0.5;
        
        // Play sound
        audio.play().catch(error => {
            console.warn('Audio playback failed:', error);
            // Silently ignore - sound is not essential
        });
    } catch (error) {
        console.warn('Error playing sound:', error);
        // Silently ignore - sound is not essential
    }
}

// Play tsunami sound effect
function playTsunamiSound() {
    try {
        // Create audio element
        const audio = document.createElement('audio');
        
        // Try to load sound file
        audio.src = './assets/sounds/tsunami.mp3';
        
        // Adjust volume
        audio.volume = 0.4;
        
        // Play sound
        audio.play().catch(error => {
            console.warn('Audio playback failed:', error);
            // Silently ignore - sound is not essential
        });
    } catch (error) {
        console.warn('Error playing sound:', error);
        // Silently ignore - sound is not essential
    }
}

// Simple delay function
function delay(ms) {
    return new Promise(resolve => {
        if (!animating) {
            resolve();
            return;
        }
        
        setTimeout(resolve, ms);
    });
}

// Add camera shake effect
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
            
            if (elapsed >= duration || !animating) {
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

// Create a mini-explosion effect
export function createExplosionEffect(scene, position, size = 1, color = 0xff5500) {
    // Create particles
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

// Export additional functions and state
export {
    animating,
    updateClayLayer,
    updateWaterLevel,
    updateSaturationVisualization,
    cleanupAnimationObjects,
    disableUIControls,
    enableUIControls,
    showDisasterSummary,
    delay
};
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


// Update debris particles
function updateDebrisParticles(scene, progress) {
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

// Animate tsunami wave
async function animateTsunami(scene, waterMesh, timelineProgress) {
    // Get water level
    const waterHeight = waterMesh ? waterMesh.position.y : 80;
    
    // Create tsunami wave mesh
    const waveGeometry = new THREE.CylinderGeometry(10, 100, 30, 32, 1, true);
    const waveMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x0D47A1,
        transparent: true,
        opacity: 0.7,
        roughness: 0.2,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    
    const wave = new THREE.Mesh(waveGeometry, waveMaterial);
    wave.position.set(-100, waterHeight, -140); // Position at landslide impact point
    wave.scale.set(0.1, 1, 0.1);
    wave.userData.isAnimationObject = true;
    scene.add(wave);
    
    // Create splash particles
    createSplashParticles(scene, wave.position);
    
    // Play tsunami sound
    playTsunamiSound();
    
    // Animation parameters
    const waveDuration = 4000; // 4 seconds
    const waveStartTime = Date.now();
    
    return new Promise((resolve) => {
        function animateWaveStep() {
            if (!animating) {
                resolve();
                return;
            }
            
            const elapsed = Date.now() - waveStartTime;
            const progress = Math.min(elapsed / waveDuration, 1);
            
            // Update timeline (70-100% of timeline)
            if (timelineProgress) {
                timelineProgress.style.width = `${70 + progress * 30}%`;
            }
            
            // Expand wave outward
            const waveScale = easeOutCubic(progress) * 5;
            wave.scale.set(waveScale, 1 + progress * 2, waveScale);
            
            // Move wave toward dam
            wave.position.z = -140 + easeOutQuad(progress) * 180;
            
            // Update splash particles
            updateSplashParticles(scene, progress);
            
            // Raise water level to simulate dam overtopping
            if (progress > 0.7 && waterMesh) {
                const overflowHeight = THREE.MathUtils.lerp(
                    waterMesh.position.y,
                    waterMesh.position.y + 15, // Above dam height
                    (progress - 0.7) / 0.3
                );
                waterMesh.position.y = overflowHeight;
                
                // Create overtopping effect
                if (progress > 0.8 && progress < 0.85) {
                    createWaterOvertopping(scene);
                }
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateWaveStep);
            } else {
                resolve();
            }
        }
        
        animateWaveStep();
    });
}

// Create splash particles
function createSplashParticles(scene, position) {
    const particleCount = 300;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Initialize all particles at the wave origin
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = position.x;
        positions[i3 + 1] = position.y;
        positions[i3 + 2] = position.z;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create splash particle material
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x1E88E5,
        size: 1.5,
        opacity: 0.7,
        transparent: true,
        sizeAttenuation: true
    });
    
    // Create particle system
    const particles = new THREE.Points(particleGeo, particleMaterial);
    particles.userData.velocities = [];
    
    // Initialize velocities
}