import * as THREE from 'three';
import CONFIG from '../config.js';
import { loadTexture } from '../utils/LoadingUtils.js';

/**
 * GeologyModel - Handles geological elements like mountains, clay layers, and dam
 * Creates and manages the main geological features for the simulation
 */
export default class GeologyModel {
    constructor() {
        this.mountToc = null;
        this.landslideBlock = null;
        this.clayLayer = null;
        this.saturatedZone = null;
        this.dam = null;
    }
    
    /**
     * Create Mount Toc with landslide area
     * @param {THREE.Scene} scene - The scene to add the mountain to
     * @param {THREE.TextureLoader} textureLoader - Texture loader instance
     * @returns {Promise<Object>} Object containing mountain and landslide meshes
     */
    async createMountToc(scene, textureLoader) {
        try {
            // Load limestone texture
            const rockTexture = await loadTexture(textureLoader, 'assets/textures/limestone.jpg');
            
            // Configure texture
            rockTexture.wrapS = THREE.RepeatWrapping;
            rockTexture.wrapT = THREE.RepeatWrapping;
            rockTexture.repeat.set(4, 4);
            
            // Create Mount Toc (main mountain)
            this.mountToc = this._createMountTocGeometry(rockTexture);
            scene.add(this.mountToc);
            
            // Create the landslide block (separate part that will move)
            this.landslideBlock = this._createLandslideBlock(rockTexture);
            scene.add(this.landslideBlock);
            
            return {
                mountain: this.mountToc,
                landslide: this.landslideBlock
            };
        } catch (error) {
            console.error('Error loading mountain textures:', error);
            
            // Create with fallback materials
            this.mountToc = this._createFallbackMountain();
            scene.add(this.mountToc);
            
            this.landslideBlock = this._createFallbackLandslide();
            scene.add(this.landslideBlock);
            
            return {
                mountain: this.mountToc,
                landslide: this.landslideBlock
            };
        }
    }
    
    /**
     * Create detailed geometry for Mount Toc
     * @param {THREE.Texture} texture - Rock texture
     * @returns {THREE.Mesh} Mountain mesh
     * @private
     */
    _createMountTocGeometry(texture) {
        // Create custom geometry for Mount Toc
        const mountGeometry = new THREE.BufferGeometry();
        
        // Create vertices for the mountain
        const vertices = new Float32Array([
            // Base of the mountain (roughly triangular)
            -200, 0, -100,  // 0
            -150, 0, -250,  // 1
            -50, 0, -200,   // 2
            0, 0, -150,     // 3
            -150, 0, -100,  // 4
            
            // Mid-level points
            -170, 40, -120, // 5
            -130, 50, -230, // 6
            -60, 45, -190,  // 7
            -20, 40, -140,  // 8
            -130, 40, -110, // 9
            
            // Peak
            -120, CONFIG.mountain.height, -180, // 10 - main peak
        ]);
        
        // Create faces connecting to the peak
        const indices = [
            // Base to mid-level
            0, 1, 5,
            1, 6, 5,
            1, 2, 6,
            2, 7, 6,
            2, 3, 7,
            3, 8, 7,
            3, 4, 8,
            4, 9, 8,
            4, 0, 9,
            0, 5, 9,
            
            // Mid-level to peak
            5, 6, 10,
            6, 7, 10,
            7, 8, 10,
            8, 9, 10,
            9, 5, 10
        ];
        
        // Set geometry attributes
        mountGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        mountGeometry.setIndex(indices);
        mountGeometry.computeVertexNormals();
        
        // Create material
        const mountMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create mesh
        const mountTocMesh = new THREE.Mesh(mountGeometry, mountMaterial);
        mountTocMesh.castShadow = true;
        mountTocMesh.receiveShadow = true;
        
        return mountTocMesh;
    }
    
    /**
     * Create the landslide block that will move during animation
     * @param {THREE.Texture} texture - Rock texture
     * @returns {THREE.Mesh} Landslide mesh
     * @private
     */
    _createLandslideBlock(texture) {
        // Create a separate geometry for the part that will slide
        const slideGeometry = new THREE.BufferGeometry();
        
        // Create vertices for the landslide block
        // This approximates the 270 million cubic meter slide area
        const vertices = new Float32Array([
            // Base points on the mountain side
            -170, 20, -150,
            -140, 30, -220,
            -80, 25, -190,
            -90, 15, -140,
            
            // Top points (matching the mountain slope)
            -150, 80, -170,
            -120, 90, -210,
            -90, 85, -180,
            -100, 75, -150
        ]);
        
        // Create faces
        const indices = [
            // Bottom face
            0, 1, 2,
            0, 2, 3,
            
            // Top face
            4, 6, 5,
            4, 7, 6,
            
            // Side faces
            0, 4, 1,
            1, 4, 5,
            1, 5, 2,
            2, 5, 6,
            2, 6, 3,
            3, 6, 7,
            3, 7, 0,
            0, 7, 4
        ];
        
        // Set geometry attributes
        slideGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        slideGeometry.setIndex(indices);
        slideGeometry.computeVertexNormals();
        
        // Create material with slightly different color to distinguish it
        const slideMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.7,
            metalness: 0.1,
            color: 0x8B5A2B
        });
        
        // Create mesh
        const landslideBlock = new THREE.Mesh(slideGeometry, slideMaterial);
        landslideBlock.castShadow = true;
        landslideBlock.receiveShadow = true;
        
        // Store original position for animation reset
        landslideBlock.userData.originalPosition = landslideBlock.position.clone();
        landslideBlock.userData.originalRotation = landslideBlock.rotation.clone();
        
        return landslideBlock;
    }
    
    /**
     * Create simple fallback mountain if texture loading fails
     * @returns {THREE.Mesh} Simplified mountain mesh
     * @private
     */
    _createFallbackMountain() {
        // Simple cone geometry for the mountain
        const geometry = new THREE.ConeGeometry(
            CONFIG.mountain.width / 2,
            CONFIG.mountain.height,
            5 // Low polygon count for performance
        );
        
        // Basic material
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.9,
            metalness: 0.1
        });
        
        // Create mesh
        const mountainMesh = new THREE.Mesh(geometry, material);
        
        // Position at Mount Toc location
        mountainMesh.position.set(-120, CONFIG.mountain.height / 2, -180);
        
        mountainMesh.castShadow = true;
        mountainMesh.receiveShadow = true;
        
        return mountainMesh;
    }
    
    /**
     * Create simple fallback landslide block
     * @returns {THREE.Mesh} Simplified landslide mesh
     * @private
     */
    _createFallbackLandslide() {
        // Simple box geometry for the landslide
        const geometry = new THREE.BoxGeometry(80, 40, 60);
        
        // Different color material
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B5A2B,
            roughness: 0.7,
            metalness: 0.1
        });
        
        // Create mesh
        const landslideBlock = new THREE.Mesh(geometry, material);
        
        // Position at landslide location
        landslideBlock.position.set(-120, 60, -180);
        
        // Store original position for animation reset
        landslideBlock.userData.originalPosition = landslideBlock.position.clone();
        landslideBlock.userData.originalRotation = landslideBlock.rotation.clone();
        
        landslideBlock.castShadow = true;
        landslideBlock.receiveShadow = true;
        
        return landslideBlock;
    }
    
    /**
     * Create the clay failure plane
     * @param {THREE.Scene} scene - The scene to add the clay layer to
     * @param {THREE.TextureLoader} textureLoader - Texture loader instance
     * @returns {Promise<THREE.Mesh>} Clay layer mesh
     */
    async createClayLayer(scene, textureLoader) {
        try {
            // Load clay texture
            const clayTexture = await loadTexture(textureLoader, 'assets/textures/clay.jpg');
            
            // Configure texture
            clayTexture.wrapS = THREE.RepeatWrapping;
            clayTexture.wrapT = THREE.RepeatWrapping;
            clayTexture.repeat.set(3, 3);
            
            // Create geometry for clay layer
            const clayGeometry = new THREE.PlaneGeometry(200, 120);
            
            // Create material
            const clayMaterial = new THREE.MeshStandardMaterial({
                map: clayTexture,
                color: 0xA09077,
                roughness: 0.9,
                metalness: 0.05,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            
            // Create mesh
            this.clayLayer = new THREE.Mesh(clayGeometry, clayMaterial);
            
            // Position and rotate to match the landslide surface
            const angleRadians = CONFIG.geology.clayLayerAngle * Math.PI / 180;
            this.clayLayer.position.set(-120, 40, -180);
            this.clayLayer.rotation.x = -Math.PI / 2 + angleRadians;
            this.clayLayer.rotation.y = Math.PI / 6; // Slight rotation to match mountain contour
            
            this.clayLayer.receiveShadow = true;
            scene.add(this.clayLayer);
            
            return this.clayLayer;
        } catch (error) {
            console.error('Error loading clay texture:', error);
            
            // Create with fallback material
            const clayGeometry = new THREE.PlaneGeometry(200, 120);
            const clayMaterial = new THREE.MeshStandardMaterial({
                color: 0xA09077,
                roughness: 0.9,
                metalness: 0.05,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            
            this.clayLayer = new THREE.Mesh(clayGeometry, clayMaterial);
            
            const angleRadians = CONFIG.geology.clayLayerAngle * Math.PI / 180;
            this.clayLayer.position.set(-120, 40, -180);
            this.clayLayer.rotation.x = -Math.PI / 2 + angleRadians;
            this.clayLayer.rotation.y = Math.PI / 6;
            
            this.clayLayer.receiveShadow = true;
            scene.add(this.clayLayer);
            
            return this.clayLayer;
        }
    }
    
    /**
     * Create visualization of water saturation inside the mountain
     * @param {THREE.Scene} scene - The scene to add the saturation zone to
     * @returns {THREE.Mesh} Saturation zone mesh
     */
    createSaturatedZone(scene) {
        // Create a geometry that approximates the landslide block but slightly smaller
        const saturatedGeometry = new THREE.BufferGeometry();
        
        // Create simplified vertices for the saturated zone
        const vertices = new Float32Array([
            // Base points
            -165, 25, -155,
            -140, 35, -215,
            -85, 30, -185,
            -95, 20, -145,
            
            // Top points (lower than the landslide block)
            -145, 70, -175,
            -125, 75, -205,
            -95, 70, -175,
            -105, 65, -155
        ]);
        
        // Use the same face indices as the landslide block
        const indices = [
            // Bottom face
            0, 1, 2,
            0, 2, 3,
            
            // Top face
            4, 6, 5,
            4, 7, 6,
            
            // Side faces
            0, 4, 1,
            1, 4, 5,
            1, 5, 2,
            2, 5, 6,
            2, 6, 3,
            3, 6, 7,
            3, 7, 0,
            0, 7, 4
        ];
        
        // Set geometry attributes
        saturatedGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        saturatedGeometry.setIndex(indices);
        saturatedGeometry.computeVertexNormals();
        
        // Create material
        const saturatedMaterial = new THREE.MeshStandardMaterial({
            color: 0x1E4870, // Deep blue
            transparent: true, 
            opacity: 0.7
        });
        
        // Create mesh
        this.saturatedZone = new THREE.Mesh(saturatedGeometry, saturatedMaterial);
        
        // Initially not visible - will be shown based on water level
        this.saturatedZone.visible = false;
        scene.add(this.saturatedZone);
        
        return this.saturatedZone;
    }
    
    /**
     * Create the dam
     * @param {THREE.Scene} scene - The scene to add the dam to
     * @param {THREE.TextureLoader} textureLoader - Texture loader instance
     * @returns {Promise<THREE.Mesh>} Dam mesh
     */
    async createDam(scene, textureLoader) {
        try {
            // Load concrete texture
            const concreteTexture = await loadTexture(textureLoader, 'assets/textures/concrete.jpg');
            
            // Configure texture
            concreteTexture.wrapS = THREE.RepeatWrapping;
            concreteTexture.wrapT = THREE.RepeatWrapping;
            concreteTexture.repeat.set(2, 5);
            
            // Create a curved arch dam geometry
            this.dam = this._createArchDam(concreteTexture);
            scene.add(this.dam);
            
            return this.dam;
        } catch (error) {
            console.error('Error loading concrete texture:', error);
            
            // Create with fallback material
            this.dam = this._createFallbackDam();
            scene.add(this.dam);
            
            return this.dam;
        }
    }
    
    /**
     * Create a realistic arch dam
     * @param {THREE.Texture} concreteTexture - Concrete texture
     * @returns {THREE.Mesh} Dam mesh
     * @private
     */
    _createArchDam(concreteTexture) {
        // Create a curved arch dam geometry
        const damShape = new THREE.Shape();
        damShape.moveTo(0, 0);
        damShape.lineTo(0, CONFIG.dam.height);
        damShape.lineTo(CONFIG.dam.thickness, CONFIG.dam.height);
        damShape.lineTo(CONFIG.dam.thickness, 0);
        damShape.lineTo(0, 0);
        
        // Create curve path for the dam
        const archCurve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(-CONFIG.dam.width/2, 0, 0),
            new THREE.Vector3(-CONFIG.dam.width/2 + CONFIG.dam.width*CONFIG.dam.curvature, 0, -CONFIG.dam.width*CONFIG.dam.curvature),
            new THREE.Vector3(CONFIG.dam.width/2 - CONFIG.dam.width*CONFIG.dam.curvature, 0, -CONFIG.dam.width*CONFIG.dam.curvature),
            new THREE.Vector3(CONFIG.dam.width/2, 0, 0)
        );
        
        // Extrude settings
        const extrudeSettings = {
            steps: 40,
            bevelEnabled: false,
            extrudePath: archCurve
        };
        
        // Create geometry
        const damGeometry = new THREE.ExtrudeGeometry(damShape, extrudeSettings);
        
        // Create material
        const damMaterial = new THREE.MeshStandardMaterial({
            map: concreteTexture,
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Create mesh
        const dam = new THREE.Mesh(damGeometry, damMaterial);
        dam.position.set(0, 0, -50); // Position in valley
        dam.castShadow = true;
        dam.receiveShadow = true;
        
        return dam;
    }
    
    /**
     * Create a fallback dam if texture loading fails
     * @returns {THREE.Mesh} Fallback dam mesh
     * @private
     */
    _createFallbackDam() {
        // Create simpler dam geometry
        const damGeometry = new THREE.BoxGeometry(
            CONFIG.dam.width,
            CONFIG.dam.height,
            CONFIG.dam.thickness
        );
        
        // Basic material
        const damMaterial = new THREE.MeshStandardMaterial({
            color: 0x999999, // Concrete color
            roughness: 0.7,
            metalness: 0.2
        });
        
        // Create mesh
        const dam = new THREE.Mesh(damGeometry, damMaterial);
        dam.position.set(0, CONFIG.dam.height/2, -50); // Position in valley
        dam.castShadow = true;
        dam.receiveShadow = true;
        
        return dam;
    }
    
    /**
     * Update the clay layer visualization based on water level
     * @param {number} waterLevel - Current water level (0-100)
     */
    updateClayLayer(waterLevel) {
        if (!this.clayLayer || !this.clayLayer.material) return;
        
        if (waterLevel > CONFIG.stability.veryLow) {
            // Critical stress
            this.clayLayer.material.color.set(0xe53935); // Red
            this.clayLayer.material.emissive = new THREE.Color(0xff5252);
            this.clayLayer.material.emissiveIntensity = 0.3;
        } else if (waterLevel > CONFIG.stability.low) {
            // High stress
            this.clayLayer.material.color.set(0xff9800); // Orange
            this.clayLayer.material.emissive = new THREE.Color(0xff9800);
            this.clayLayer.material.emissiveIntensity = 0.2;
        } else {
            // Normal state
            this.clayLayer.material.color.set(0xA09077); // Default clay color
            this.clayLayer.material.emissiveIntensity = 0;
        }
    }
    
    /**
     * Update saturation visualization based on water level
     * @param {number} waterLevel - Current water level (0-100)
     */
    updateSaturationZone(waterLevel) {
        if (!this.saturatedZone) return;
        
        // Only show saturation at higher water levels
        const threshold = 30; // Show above 30% water level
        
        if (waterLevel > threshold) {
            this.saturatedZone.visible = true;
            
            // Calculate saturation scale based on water level
            const saturationScale = (waterLevel - threshold) / (100 - threshold);
            
            // Adjust opacity based on saturation
            this.saturatedZone.material.opacity = 0.3 + saturationScale * 0.5;
            
            // Expand the saturated area as water level rises
            const scale = 0.6 + saturationScale * 0.5;
            this.saturatedZone.scale.set(1, scale, 1);
        } else {
            this.saturatedZone.visible = false;
        }
    }
    
    /**
     * Create a 3D annotation for a geological feature
     * @param {THREE.Scene} scene - The scene to add the annotation to
     * @param {string} text - Annotation text
     * @param {THREE.Vector3} position - Position for the annotation
     * @returns {THREE.Sprite} Created annotation sprite
     */
    createAnnotation(scene, text, position) {
        // Create text sprite
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw background
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.font = 'Bold 20px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.fillText(text, canvas.width / 2, canvas.height / 2 + 8);
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create sprite material
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        
        // Create sprite
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(20, 5, 1);
        
        // Store text for reference
        sprite.userData = {
            text: text,
            isAnnotation: true
        };
        
        scene.add(sprite);
        
        return sprite;
    }
}