import * as THREE from 'three';
import CONFIG from '../config.js';
import { loadTexture } from '../utils/LoadingUtils.js';

/**
 * WaterModel - Handles all water-related functionality for the simulation
 * Includes water surface, wave effects, and water-related animation
 */
export default class WaterModel {
    constructor() {
        this.waterMesh = null;
    }
    
    /**
     * Create realistic water for the reservoir
     * @param {THREE.Scene} scene - The scene to add water to
     * @param {THREE.TextureLoader} textureLoader - Texture loader instance
     * @returns {Promise<THREE.Mesh>} The created water mesh
     */
    async createWater(scene, textureLoader) {
        try {
            // Load water textures
            const [waterColor, waterNormal] = await Promise.all([
                loadTexture(textureLoader, 'assets/textures/water_color.jpg'),
                loadTexture(textureLoader, 'assets/textures/water_normal.jpg')
            ]);
            
            // Configure textures
            this._configureTextures(waterColor, waterNormal);
            
            // Create water mesh
            this.waterMesh = this._createWaterMesh(waterColor, waterNormal);
            
            // Add to scene
            scene.add(this.waterMesh);
            
            return this.waterMesh;
        } catch (error) {
            console.error('Error loading water textures:', error);
            
            // Create fallback water
            this.waterMesh = this._createFallbackWater();
            scene.add(this.waterMesh);
            
            return this.waterMesh;
        }
    }
    
    /**
     * Configure water textures with proper wrapping and repeats
     * @param {THREE.Texture} colorTexture - Water color texture
     * @param {THREE.Texture} normalTexture - Water normal map texture
     * @private
     */
    _configureTextures(colorTexture, normalTexture) {
        // Color texture
        colorTexture.wrapS = colorTexture.wrapT = THREE.RepeatWrapping;
        colorTexture.repeat.set(8, 8);
        
        // Normal texture for wave effect
        normalTexture.wrapS = normalTexture.wrapT = THREE.RepeatWrapping;
        normalTexture.repeat.set(12, 12);
    }
    
    /**
     * Create the water mesh with custom valley shape
     * @param {THREE.Texture} colorTexture - Water color texture
     * @param {THREE.Texture} normalTexture - Water normal map texture
     * @returns {THREE.Mesh} Water mesh
     * @private
     */
    _createWaterMesh(colorTexture, normalTexture) {
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
        waterMesh.position.y = CONFIG.water.initialHeight;
        
        // Enable shadows
        waterMesh.receiveShadow = true;
        
        // Add userData for animation reference
        waterMesh.userData.initialHeight = CONFIG.water.initialHeight;
        
        return waterMesh;
    }
    
    /**
     * Create simpler fallback water if textures fail to load
     * @returns {THREE.Mesh} Fallback water mesh
     * @private
     */
    _createFallbackWater() {
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
        waterMesh.position.y = CONFIG.water.initialHeight;
        waterMesh.position.z = -50; // Position in valley
        
        // Enable shadows
        waterMesh.receiveShadow = true;
        
        // Add userData for animation reference
        waterMesh.userData.initialHeight = CONFIG.water.initialHeight;
        
        return waterMesh;
    }
    
    /**
     * Update water level based on slider value (0-100)
     * @param {number} sliderValue - Value from slider (0-100)
     * @returns {number} The calculated water height
     */
    updateWaterLevel(sliderValue) {
        if (!this.waterMesh) return 0;
        
        // Calculate water height
        const waterHeight = (sliderValue / 100) * 
                          (CONFIG.water.maxHeight - CONFIG.water.minHeight) + 
                          CONFIG.water.minHeight;
        
        // Update position
        this.waterMesh.position.y = waterHeight;
        
        return waterHeight;
    }
    
    /**
     * Animate water texture to create rippling effect
     * @param {number} deltaTime - Time since last frame (seconds)
     */
    animateWater(deltaTime) {
        if (this.waterMesh && this.waterMesh.material && this.waterMesh.material.normalMap) {
            const time = Date.now() * 0.0005;
            this.waterMesh.material.normalMap.offset.x = time;
            this.waterMesh.material.normalMap.offset.y = time;
        }
    }
    
    /**
     * Create water splash effect at a specific position
     * @param {THREE.Scene} scene - Scene to add splash to
     * @param {THREE.Vector3} position - Position for the splash
     * @param {number} scale - Size scale factor
     * @returns {THREE.Mesh} The created splash mesh
     */
    createWaterSplash(scene, position, scale = 1) {
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
    
    /**
     * Create a tsunami wave
     * @param {THREE.Scene} scene - Scene to add the wave to
     * @param {THREE.Vector3} position - Starting position
     * @param {number} waterHeight - Current water level height
     * @returns {THREE.Mesh} Created wave mesh
     */
    createTsunamiWave(scene, position, waterHeight) {
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
    
    /**
     * Create splash particles for tsunami effect
     * @param {THREE.Scene} scene - Scene to add particles to
     * @param {THREE.Vector3} position - Start position
     * @returns {THREE.Points} Particle system
     */
    createSplashParticles(scene, position) {
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
        particles.userData.creationTime = Date.now();
        
        scene.add(particles);
        
        return particles;
    }
    
    /**
     * Create water overtopping effect (particles flowing over dam)
     * @param {THREE.Scene} scene - Scene to add particles to
     * @param {THREE.Vector3} damPosition - Dam position
     * @param {number} damWidth - Width of the dam
     * @param {number} damHeight - Height of the dam
     * @returns {THREE.Points} Particle system
     */
    createWaterOvertopping(scene, damPosition, damWidth, damHeight) {
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
        particles.userData.damHeight = damHeight;
        
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
    
    /**
     * Update water overtopping particles
     * @param {THREE.Points} particles - Particle system to update
     * @param {number} deltaTime - Time since last frame (seconds)
     */
    updateOvertoppingParticles(particles, deltaTime = 0.016) {
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
}