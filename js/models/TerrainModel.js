import * as THREE from 'three';
import CONFIG from '../config.js';
import { loadTexture } from '../utils/LoadingUtils.js';

/**
 * TerrainModel - Handles terrain generation and management
 * Creates realistic terrain based on heightmap or procedural generation
 */
export default class TerrainModel {
    constructor() {
        this.terrain = null;
        this.topographicOverlay = null;
        this.crossSection = null;
    }
    
    /**
     * Create detailed terrain based on heightmap
     * @param {THREE.Scene} scene - The scene to add terrain to
     * @param {THREE.TextureLoader} textureLoader - Texture loader instance
     * @returns {Promise<THREE.Mesh>} The created terrain mesh
     */
    async createTerrain(scene, textureLoader) {
        try {
            // Load heightmap
            const heightMap = await loadTexture(textureLoader, 'assets/textures/vajont_heightmap.jpg');
            
            // Load terrain texture
            const terrainTexture = await loadTexture(textureLoader, 'assets/textures/rock.jpg');
            
            // Configure textures
            this._configureTextures(terrainTexture, heightMap);
            
            // Create terrain with the loaded textures
            this.terrain = this._createTerrainMesh(terrainTexture, heightMap);
            scene.add(this.terrain);
            
            // Create topographic overlay (initially hidden)
            this.topographicOverlay = this._createTopographicOverlay();
            scene.add(this.topographicOverlay);
            
            return this.terrain;
        } catch (error) {
            console.error('Error loading terrain textures:', error);
            
            // Create procedural terrain as fallback
            this.terrain = this._createProceduralTerrain();
            scene.add(this.terrain);
            
            return this.terrain;
        }
    }
    
    /**
     * Configure terrain textures
     * @param {THREE.Texture} terrainTexture - Main terrain color texture
     * @param {THREE.Texture} heightMap - Heightmap texture
     * @private
     */
    _configureTextures(terrainTexture, heightMap) {
        // Terrain texture repeating
        terrainTexture.wrapS = THREE.RepeatWrapping;
        terrainTexture.wrapT = THREE.RepeatWrapping;
        terrainTexture.repeat.set(8, 8);
        
        // Heightmap should not repeat
        heightMap.wrapS = THREE.ClampToEdgeWrapping;
        heightMap.wrapT = THREE.ClampToEdgeWrapping;
    }
    
    /**
     * Create terrain mesh from textures
     * @param {THREE.Texture} terrainTexture - Main terrain color texture
     * @param {THREE.Texture} heightMap - Heightmap texture
     * @returns {THREE.Mesh} The terrain mesh
     * @private
     */
    _createTerrainMesh(terrainTexture, heightMap) {
        // Create geometry with detailed resolution
        const geometry = new THREE.PlaneGeometry(
            CONFIG.terrain.width,
            CONFIG.terrain.depth,
            CONFIG.terrain.segments,
            CONFIG.terrain.segments
        );
        
        // Create material with heightmap displacement
        const material = new THREE.MeshStandardMaterial({
            map: terrainTexture,
            displacementMap: heightMap,
            displacementScale: CONFIG.terrain.maxHeight,
            roughness: 0.8,
            metalness: 0.2,
            bumpMap: heightMap,
            bumpScale: 5
        });
        
        // Create mesh
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2; // Lay flat
        terrain.position.y = -2; // Slight offset so water can go to zero
        terrain.receiveShadow = true;
        
        return terrain;
    }
    
    /**
     * Create procedural terrain as fallback
     * @returns {THREE.Mesh} Procedurally generated terrain
     * @private
     */
    _createProceduralTerrain() {
        // Create geometry with fewer segments for performance
        const geometry = new THREE.PlaneGeometry(
            CONFIG.terrain.width, 
            CONFIG.terrain.depth, 
            64, 
            64
        );
        
        // Create vertices with procedural noise
        const positions = geometry.attributes.position.array;
        
        // Simple procedural height generation
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            
            // Create valley running through the middle
            const distanceFromCenter = Math.sqrt(x * x + z * z) / 100;
            const valleyDepth = Math.min(30, Math.pow(distanceFromCenter, 2));
            
            // Create mountain range with simplex-like noise (simplified)
            const mountainHeight = Math.sin(x / 50) * Math.cos(z / 70) * CONFIG.terrain.maxHeight * 0.4;
            const smallerNoise = Math.sin(x / 10) * Math.cos(z / 15) * CONFIG.terrain.maxHeight * 0.1;
            
            // Combine valley and mountains
            positions[i + 1] = mountainHeight + smallerNoise - (z > -50 && z < 50 ? valleyDepth : 0);
        }
        
        // Update geometry normals
        geometry.computeVertexNormals();
        
        // Create material
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B8B7A, // Grayish brown
            roughness: 0.9,
            metalness: 0.1,
            flatShading: false
        });
        
        // Create mesh
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2; // Lay flat
        terrain.position.y = -2;
        terrain.receiveShadow = true;
        
        return terrain;
    }
    
    /**
     * Create topographic contour lines overlay
     * @returns {THREE.Group} Group containing contour lines
     * @private
     */
    _createTopographicOverlay() {
        if (!this.terrain) return new THREE.Group();
        
        // Create lines for contours
        const contourLines = new THREE.Group();
        const contourInterval = 10; // Height between contour lines
        
        // Map of already processed points to avoid duplicates
        const processedPoints = new Map();
        
        // Get geometry positions
        const positions = this.terrain.geometry.attributes.position.array;
        
        // For each vertex, create contour lines at specific heights
        for (let i = 0; i < positions.length; i += 3) {
            const height = positions[i + 1];
            
            // Check if height is near a contour level
            const nearestContour = Math.round(height / contourInterval) * contourInterval;
            if (Math.abs(height - nearestContour) < 0.5) {
                // Get vertex position
                const x = positions[i];
                const z = positions[i + 2];
                
                // Check if we've already processed this point at this contour
                const key = `${Math.round(x)},${Math.round(z)},${nearestContour}`;
                if (processedPoints.has(key)) continue;
                processedPoints.set(key, true);
                
                // Find neighboring vertices at same contour level
                const neighbors = this._findNeighborsAtSameContour(
                    positions, i, nearestContour, contourInterval
                );
                
                if (neighbors.length > 0) {
                    // Create line for this contour segment
                    const lineGeometry = new THREE.BufferGeometry();
                    
                    // Add current point and neighbors to line
                    const pointsArray = [
                        new THREE.Vector3(x, nearestContour, z)
                    ];
                    
                    neighbors.forEach(neighbor => {
                        pointsArray.push(
                            new THREE.Vector3(neighbor.x, nearestContour, neighbor.z)
                        );
                        
                        // Mark neighbors as processed
                        const neighborKey = `${Math.round(neighbor.x)},${Math.round(neighbor.z)},${nearestContour}`;
                        processedPoints.set(neighborKey, true);
                    });
                    
                    lineGeometry.setFromPoints(pointsArray);
                    
                    // Create line material
                    const lineMaterial = new THREE.LineBasicMaterial({
                        color: 0x1976D2,
                        linewidth: 1
                    });
                    
                    // Create line and add to group
                    const line = new THREE.Line(lineGeometry, lineMaterial);
                    contourLines.add(line);
                }
            }
        }
        
        // Apply same transformations as terrain
        contourLines.rotation.x = this.terrain.rotation.x;
        contourLines.position.copy(this.terrain.position);
        contourLines.position.y += 0.1; // Slight offset to prevent z-fighting
        
        // Hide by default
        contourLines.visible = false;
        
        return contourLines;
    }
    
    /**
     * Helper function to find neighboring vertices at the same contour level
     * @param {Float32Array} positions - The geometry positions array
     * @param {number} index - Current vertex index
     * @param {number} contourHeight - Target contour height
     * @param {number} tolerance - Height tolerance
     * @returns {Array} Array of neighboring vertices
     * @private
     */
    _findNeighborsAtSameContour(positions, index, contourHeight, tolerance) {
        const neighbors = [];
        const x = positions[index];
        const z = positions[index + 2];
        const maxDistance = 2; // Maximum distance to consider as neighbor
        
        // Check all vertices
        for (let i = 0; i < positions.length; i += 3) {
            if (i === index) continue; // Skip self
            
            const height = positions[i + 1];
            
            // Check if height is near the contour level
            if (Math.abs(height - contourHeight) < tolerance) {
                const neighborX = positions[i];
                const neighborZ = positions[i + 2];
                
                // Calculate distance
                const distance = Math.sqrt(
                    Math.pow(x - neighborX, 2) + 
                    Math.pow(z - neighborZ, 2)
                );
                
                // If within range, add as neighbor
                if (distance < maxDistance) {
                    neighbors.push({
                        x: neighborX,
                        z: neighborZ,
                        index: i
                    });
                }
            }
        }
        
        return neighbors;
    }
    
    /**
     * Create a cross-section view showing geological layers
     * @param {THREE.Scene} scene - The scene to add the cross-section to
     * @param {THREE.TextureLoader} textureLoader - Texture loader instance
     * @returns {Promise<THREE.Mesh|THREE.Group>} The created cross-section
     */
    async createCrossSection(scene, textureLoader) {
        try {
            // Try to load cross-section texture
            const texture = await loadTexture(textureLoader, 'assets/textures/geological_layers.jpg');
            
            // Create a vertical plane showing geological layers
            const sectionWidth = 300;
            const sectionHeight = 120;
            const geometry = new THREE.PlaneGeometry(sectionWidth, sectionHeight);
            
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            
            this.crossSection = new THREE.Mesh(geometry, material);
            this.crossSection.position.set(-300, sectionHeight / 2, 0);
            this.crossSection.rotation.y = Math.PI / 2;
            this.crossSection.visible = false; // Hidden by default
            this.crossSection.userData.isGeologySection = true;
            
            scene.add(this.crossSection);
            
            return this.crossSection;
        } catch (error) {
            console.error('Error loading cross-section texture:', error);
            
            // Create procedural cross-section instead
            this.crossSection = this._createProceduralCrossSection(scene);
            return this.crossSection;
        }
    }
    
    /**
     * Create a procedural cross-section if texture loading fails
     * @param {THREE.Scene} scene - The scene to add the cross-section to
     * @returns {THREE.Group} Group containing the cross-section layers
     * @private
     */
    _createProceduralCrossSection(scene) {
        // Create a group to hold all layers
        const crossSection = new THREE.Group();
        const sectionWidth = 300;
        const sectionHeight = 120;
        
        crossSection.position.set(-300, sectionHeight / 2, 0);
        crossSection.rotation.y = Math.PI / 2;
        crossSection.visible = false;
        crossSection.userData.isGeologySection = true;
        
        // Create multiple geological layers
        const layers = [
            { height: 0.3, color: 0xD2B48C, name: "Topsoil" },
            { height: 0.15, color: 0xA0522D, name: "Weathered Limestone" },
            { height: 0.2, color: 0xD3D3D3, name: "Limestone" },
            { height: 0.05, color: 0x8B4513, name: "Clay Layer (Failure Plane)" },
            { height: 0.2, color: 0xD3D3D3, name: "Limestone" },
            { height: 0.1, color: 0x696969, name: "Bedrock" }
        ];
        
        let currentHeight = 0;
        
        layers.forEach(layer => {
            const layerHeight = layer.height * sectionHeight;
            const geometry = new THREE.PlaneGeometry(sectionWidth, layerHeight);
            const material = new THREE.MeshBasicMaterial({
                color: layer.color,
                side: THREE.DoubleSide
            });
            
            const layerMesh = new THREE.Mesh(geometry, material);
            layerMesh.position.y = currentHeight - sectionHeight / 2 + layerHeight / 2;
            
            crossSection.add(layerMesh);
            currentHeight += layerHeight;
            
            // Add text label for important layers
            if (layer.name === "Clay Layer (Failure Plane)") {
                this._createTextLabel(layer.name, 0, layerMesh.position.y, 0, crossSection);
            }
        });
        
        scene.add(crossSection);
        return crossSection;
    }
    
    /**
     * Create a text label for the cross-section
     * @param {string} text - Label text
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     * @param {THREE.Object3D} parent - Parent object to attach to
     * @returns {THREE.Sprite} Created text sprite
     * @private
     */
    _createTextLabel(text, x, y, z, parent) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw text
        context.fillStyle = '#ffffff';
        context.font = 'Bold 20px Arial';
        context.fillText(text, 10, 40);
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create sprite material
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        
        // Create sprite
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x + 100, y, z + 5);
        sprite.scale.set(50, 12.5, 1);
        
        parent.add(sprite);
        return sprite;
    }
    
    /**
     * Toggle visibility of topographic overlay
     * @returns {boolean} New visibility state
     */
    toggleTopographicOverlay() {
        if (!this.topographicOverlay) return false;
        
        this.topographicOverlay.visible = !this.topographicOverlay.visible;
        return this.topographicOverlay.visible;
    }
    
    /**
     * Toggle visibility of geological cross-section
     * @returns {boolean} New visibility state
     */
    toggleCrossSection() {
        if (!this.crossSection) return false;
        
        this.crossSection.visible = !this.crossSection.visible;
        return this.crossSection.visible;
    }}