import * as THREE from 'three';

// Create a detailed terrain model based on a heightmap
export async function createDetailedTerrain(scene, textureLoader) {
    return new Promise((resolve, reject) => {
        // Configuration for terrain
        const terrainWidth = 800;
        const terrainDepth = 800;
        const terrainSegments = 128; // Higher resolution for more detail
        const terrainMaxHeight = 120;
        
        // Create geometry
        const geometry = new THREE.PlaneGeometry(
            terrainWidth, 
            terrainDepth, 
            terrainSegments, 
            terrainSegments
        );
        
        // Load heightmap
        textureLoader.load(
            'assets/textures/vajont_heightmap.jpg',
            function(heightMap) {
                // Load terrain texture
                textureLoader.load(
                    'assets/textures/rock.jpg',
                    function(terrainTexture) {
                        // Configure textures
                        terrainTexture.wrapS = THREE.RepeatWrapping;
                        terrainTexture.wrapT = THREE.RepeatWrapping;
                        terrainTexture.repeat.set(8, 8);
                        
                        heightMap.wrapS = THREE.ClampToEdgeWrapping;
                        heightMap.wrapT = THREE.ClampToEdgeWrapping;
                        
                        // Create material
                        const material = new THREE.MeshStandardMaterial({
                            map: terrainTexture,
                            displacementMap: heightMap,
                            displacementScale: terrainMaxHeight,
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
                        
                        scene.add(terrain);
                        resolve(terrain);
                    },
                    undefined,
                    function(error) {
                        console.error('Error loading terrain texture:', error);
                        
                        // Fallback material
                        const material = new THREE.MeshStandardMaterial({
                            color: 0x8B8B7A,
                            displacementMap: heightMap,
                            displacementScale: terrainMaxHeight,
                            roughness: 0.9,
                            metalness: 0.1
                        });
                        
                        const terrain = new THREE.Mesh(geometry, material);
                        terrain.rotation.x = -Math.PI / 2;
                        terrain.position.y = -2;
                        terrain.receiveShadow = true;
                        
                        scene.add(terrain);
                        resolve(terrain);
                    }
                );
            },
            undefined,
            function(error) {
                console.error('Error loading heightmap:', error);
                
                // Create a procedural terrain instead
                const terrain = createProceduralTerrain(scene, terrainWidth, terrainDepth, terrainMaxHeight);
                resolve(terrain);
            }
        );
    });
}

// Create a procedural terrain as fallback if heightmap loading fails
function createProceduralTerrain(scene, width, depth, maxHeight) {
    // Create geometry with fewer segments for performance
    const geometry = new THREE.PlaneGeometry(width, depth, 64, 64);
    
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
        const mountainHeight = Math.sin(x / 50) * Math.cos(z / 70) * maxHeight * 0.4;
        const smallerNoise = Math.sin(x / 10) * Math.cos(z / 15) * maxHeight * 0.1;
        
        // Combine valley and mountains
        positions[i + 1] = mountainHeight + smallerNoise - (z > -50 && z < 50 ? valleyDepth : 0);
    }
    
    // Update geometry
    geometry.computeVertexNormals();
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
        color: 0x8B8B7A,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: false
    });
    
    // Create mesh
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2; // Lay flat
    terrain.position.y = -2;
    terrain.receiveShadow = true;
    
    scene.add(terrain);
    
    return terrain;
}

// Create a cross-section view for educational purposes
export function createCrossSection(scene, textureLoader) {
    // Create a vertical plane showing geological layers
    const sectionWidth = 300;
    const sectionHeight = 120;
    const geometry = new THREE.PlaneGeometry(sectionWidth, sectionHeight);
    
    // Try to load cross-section texture
    textureLoader.load(
        'assets/textures/geological_layers.jpg',
        function(texture) {
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9,
                side: THREE.DoubleSide
            });
            
            const crossSection = new THREE.Mesh(geometry, material);
            crossSection.position.set(-300, sectionHeight / 2, 0);
            crossSection.rotation.y = Math.PI / 2;
            crossSection.visible = false; // Hidden by default
            crossSection.userData.isGeologySection = true;
            
            scene.add(crossSection);
        },
        undefined,
        function(error) {
            console.error('Error loading cross-section texture:', error);
            
            // Create procedural cross-section
            createProceduralCrossSection(scene, sectionWidth, sectionHeight);
        }
    );
}

// Create a procedural cross-section if texture loading fails
function createProceduralCrossSection(scene, width, height) {
    // Create a group to hold all layers
    const crossSection = new THREE.Group();
    crossSection.position.set(-300, height / 2, 0);
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
        const layerHeight = layer.height * height;
        const geometry = new THREE.PlaneGeometry(width, layerHeight);
        const material = new THREE.MeshBasicMaterial({
            color: layer.color,
            side: THREE.DoubleSide
        });
        
        const layerMesh = new THREE.Mesh(geometry, material);
        layerMesh.position.y = currentHeight - height / 2 + layerHeight / 2;
        
        crossSection.add(layerMesh);
        currentHeight += layerHeight;
        
        // Add text label for important layers
        if (layer.name === "Clay Layer (Failure Plane)") {
            createTextLabel(layer.name, 0, layerMesh.position.y, 0, crossSection);
        }
    });
    
    scene.add(crossSection);
    return crossSection;
}

// Create a text label for the cross-section
function createTextLabel(text, x, y, z, parent) {
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

// Create a topographic contour overlay for the terrain
export function createTopographicOverlay(terrain, scene) {
    // Extract terrain vertices
    const geometry = terrain.geometry;
    const positions = geometry.attributes.position.array;
    
    // Create lines for contours
    const contourLines = new THREE.Group();
    const contourInterval = 10; // Height between contour lines
    
    // Map of already processed points to avoid duplicates
    const processedPoints = new Map();
    
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
            const neighbors = findNeighborsAtSameContour(
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
    contourLines.rotation.x = terrain.rotation.x;
    contourLines.position.copy(terrain.position);
    contourLines.position.y += 0.1; // Slight offset to prevent z-fighting
    
    // Add to scene but make invisible by default
    contourLines.visible = false;
    scene.add(contourLines);
    
    return contourLines;
}

// Helper function to find neighboring vertices at the same contour level
function findNeighborsAtSameContour(positions, index, contourHeight, tolerance) {
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