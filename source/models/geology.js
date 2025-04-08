import * as THREE from 'three';

// Configuration for the geological features
const CONFIG = {
    // Mount Toc (the unstable mountain)
    mountTocHeight: 100,
    mountTocWidth: 200,
    mountTocDepth: 150,
    
    // Clay layer (failure plane)
    clayLayerThickness: 3,
    clayLayerAngle: 25, // degrees
    
    // Dam properties
    damHeight: 90,
    damWidth: 150,
    damThickness: 15,
    damCurvature: 0.3
};

// Create Mount Toc with realistic geometry
export function createMountToc(scene, textureLoader) {
    return new Promise((resolve) => {
        // Load limestone texture
        textureLoader.load(
            'assets/textures/limestone.jpg',
            function(rockTexture) {
                // Configure texture
                rockTexture.wrapS = THREE.RepeatWrapping;
                rockTexture.wrapT = THREE.RepeatWrapping;
                rockTexture.repeat.set(4, 4);
                
                // Create Mount Toc model
                const mountTocMesh = createMountTocGeometry(rockTexture);
                scene.add(mountTocMesh);
                
                // Create the separate landslide block
                const landslideBlock = createLandslideBlock(rockTexture);
                scene.add(landslideBlock);
                
                // Group them together
                const mountTocGroup = new THREE.Group();
                mountTocGroup.add(mountTocMesh);
                mountTocGroup.add(landslideBlock);
                
                // Store properties for animation
                mountTocGroup.userData = {
                    mainMesh: mountTocMesh,
                    landslideBlock: landslideBlock
                };
                
                // Create annotation
                createAnnotation(scene, "Mount Toc", new THREE.Vector3(-120, CONFIG.mountTocHeight + 10, -180));
                
                resolve(mountTocGroup);
            },
            undefined,
            function(error) {
                console.error("Error loading limestone texture:", error);
                
                // Create fallback
                const mountTocGroup = createFallbackMountToc(scene);
                resolve(mountTocGroup);
            }
        );
    });
}

// Create the main Mount Toc geometry
function createMountTocGeometry(texture) {
    // Create a custom geometry for the mountain
    const mountGeometry = new THREE.BufferGeometry();
    
    // Define vertices for a more natural mountain shape
    // These vertices create the non-landslide parts of Mount Toc
    const vertices = new Float32Array([
        // Base points in roughly triangular arrangement
        -200, 0, -100, // 0
        -150, 0, -250, // 1
        -50, 0, -200,  // 2
        0, 0, -150,    // 3
        -150, 0, -100, // 4
        
        // Points slightly up the slope
        -180, 30, -120, // 5
        -140, 25, -230, // 6
        -60, 20, -190,  // 7
        -10, 25, -140,  // 8
        -130, 30, -110, // 9
        
        // Mid-height points
        -160, 60, -140, // 10
        -130, 50, -210, // 11
        -70, 45, -180,  // 12
        -20, 55, -130,  // 13
        -110, 60, -120, // 14
        
        // Peak area points
        -120, CONFIG.mountTocHeight, -180, // 15 - main peak
        -90, CONFIG.mountTocHeight * 0.9, -160, // 16 - secondary peak
        -140, CONFIG.mountTocHeight * 0.8, -200 // 17 - tertiary peak
    ]);
    
    // Define faces as triangles
    const indices = [
        // Base faces
        0, 1, 5, 5, 1, 6,
        1, 2, 6, 6, 2, 7,
        2, 3, 7, 7, 3, 8,
        3, 4, 8, 8, 4, 9,
        4, 0, 9, 9, 0, 5,
        
        // Middle section
        5, 6, 10, 10, 6, 11,
        6, 7, 11, 11, 7, 12,
        7, 8, 12, 12, 8, 13,
        8, 9, 13, 13, 9, 14,
        9, 5, 14, 14, 5, 10,
        
        // Upper section
        10, 11, 15, 
        11, 12, 15,
        12, 13, 16,
        13, 14, 16,
        14, 10, 17,
        
        // Peak connections
        15, 16, 17,
        15, 17, 10,
        16, 15, 12
    ];
    
    // Set geometry attributes
    mountGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    mountGeometry.setIndex(indices);
    mountGeometry.computeVertexNormals();
    
    // Create material
    const mountMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.1,
        bumpMap: texture,
        bumpScale: 0.5
    });
    
    // Create mesh
    const mountTocMesh = new THREE.Mesh(mountGeometry, mountMaterial);
    mountTocMesh.castShadow = true;
    mountTocMesh.receiveShadow = true;
    
    return mountTocMesh;
}

// Create the specific landslide block that will move during animation
function createLandslideBlock(texture) {
    // Create a separate geometry for the part that will slide
    const slideGeometry = new THREE.BufferGeometry();
    
    // Define vertices for the landslide block
    // This approximates the 270 million cubic meter slide area
    const vertices = new Float32Array([
        // Lower points near failure plane
        -170, 20, -150, // 0
        -140, 30, -220, // 1
        -80, 25, -190,  // 2
        -90, 15, -140,  // 3
        
        // Mid-height points
        -160, 50, -160, // 4
        -130, 55, -210, // 5
        -90, 50, -180,  // 6
        -100, 45, -150, // 7
        
        // Upper points
        -150, 80, -170, // 8
        -120, 90, -210, // 9
        -90, 85, -180,  // 10
        -100, 75, -150  // 11
    ]);
    
    // Define faces as triangles
    const indices = [
        // Bottom layer
        0, 1, 4, 4, 1, 5,
        1, 2, 5, 5, 2, 6,
        2, 3, 6, 6, 3, 7,
        3, 0, 7, 7, 0, 4,
        
        // Middle to top
        4, 5, 8, 8, 5, 9,
        5, 6, 9, 9, 6, 10,
        6, 7, 10, 10, 7, 11,
        7, 4, 11, 11, 4, 8,
        
        // Top face
        8, 9, 10, 8, 10, 11
    ];
    
    // Set geometry attributes
    slideGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    slideGeometry.setIndex(indices);
    slideGeometry.computeVertexNormals();
    
    // Create material - slightly different color to distinguish it
    const slideMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0x8B5A2B, // Brownish tint
        roughness: 0.7,
        metalness: 0.1,
        bumpMap: texture,
        bumpScale: 0.3
    });
    
    // Create mesh
    const landslideBlock = new THREE.Mesh(slideGeometry, slideMaterial);
    landslideBlock.castShadow = true;
    landslideBlock.receiveShadow = true;
    
    // Store original position and rotation for animation
    landslideBlock.userData = {
        originalPosition: landslideBlock.position.clone(),
        originalRotation: landslideBlock.rotation.clone(),
        isLandslideBlock: true
    };
    
    return landslideBlock;
}

// Create a simpler fallback mountain if texture loading fails
function createFallbackMountToc(scene) {
    // Create group
    const mountTocGroup = new THREE.Group();
    
    // Create simple mountain geometry
    const mountGeometry = new THREE.ConeGeometry(
        CONFIG.mountTocWidth / 2, // radius
        CONFIG.mountTocHeight,    // height
        8                        // segments
    );
    
    // Create material
    const mountMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, // Brown
        roughness: 0.9,
        metalness: 0.1
    });
    
    // Create mesh
    const mountTocMesh = new THREE.Mesh(mountGeometry, mountMaterial);
    mountTocMesh.position.set(-120, CONFIG.mountTocHeight / 2, -180);
    mountTocMesh.castShadow = true;
    mountTocMesh.receiveShadow = true;
    
    mountTocGroup.add(mountTocMesh);
    
    // Create simple landslide block
    const blockGeometry = new THREE.BoxGeometry(80, 40, 60);
    const blockMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B5A2B, // Lighter brown
        roughness: 0.7,
        metalness: 0.1
    });
    
    const landslideBlock = new THREE.Mesh(blockGeometry, blockMaterial);
    landslideBlock.position.set(-120, 60, -180);
    landslideBlock.castShadow = true;
    landslideBlock.receiveShadow = true;
    
    // Store original position and rotation for animation
    landslideBlock.userData = {
        originalPosition: landslideBlock.position.clone(),
        originalRotation: landslideBlock.rotation.clone(),
        isLandslideBlock: true
    };
    
    mountTocGroup.add(landslideBlock);
    
    // Store properties for animation
    mountTocGroup.userData = {
        mainMesh: mountTocMesh,
        landslideBlock: landslideBlock
    };
    
    return mountTocGroup;
}

// Create geological layers including the clay failure plane
export function createGeologicalLayers(scene, textureLoader) {
    return new Promise((resolve) => {
        // Object to hold all geological layers
        const layers = {};
        
        // Load clay texture
        textureLoader.load(
            'assets/textures/clay.jpg',
            function(clayTexture) {
                // Configure texture
                clayTexture.wrapS = THREE.RepeatWrapping;
                clayTexture.wrapT = THREE.RepeatWrapping;
                clayTexture.repeat.set(5, 5);
                
                // Create the clay failure plane
                layers.clayLayer = createClayLayer(clayTexture);
                scene.add(layers.clayLayer);
                
                // Create annotation
                createAnnotation(scene, "Clay Failure Surface", new THREE.Vector3(-130, 40, -170));
                
                // Create saturated zone visualization
                layers.saturatedZone = createSaturatedZone();
                scene.add(layers.saturatedZone);
                
                resolve(layers);
            },
            undefined,
            function(error) {
                console.error("Error loading clay texture:", error);
                
                // Create fallback
                layers.clayLayer = createFallbackClayLayer();
                scene.add(layers.clayLayer);
                
                // Create saturated zone
                layers.saturatedZone = createSaturatedZone();
                scene.add(layers.saturatedZone);
                
                resolve(layers);
            }
        );
    });
}

// Create the clay layer that formed the failure plane
function createClayLayer(clayTexture) {
    // Calculate the size of the clay layer
    const width = 200;  // Width of clay layer
    const height = 120; // Height of clay layer
    
    // Create geometry
    const clayGeometry = new THREE.PlaneGeometry(width, height, 32, 32);
    
    // Create material
    const clayMaterial = new THREE.MeshStandardMaterial({
        map: clayTexture,
        color: 0xA09077, // Clay color
        roughness: 0.9,
        metalness: 0.05,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const clayLayer = new THREE.Mesh(clayGeometry, clayMaterial);
    
    // Position and rotate to match the landslide surface
    const angleRadians = CONFIG.clayLayerAngle * Math.PI / 180;
    clayLayer.position.set(-120, 40, -180);
    clayLayer.rotation.x = -Math.PI / 2 + angleRadians;
    clayLayer.rotation.y = Math.PI / 6; // Slight rotation to match mountain contour
    
    clayLayer.receiveShadow = true;
    
    return clayLayer;
}

// Create a fallback clay layer if texture loading fails
function createFallbackClayLayer() {
    // Calculate the size of the clay layer
    const width = 200;  // Width of clay layer
    const height = 120; // Height of clay layer
    
    // Create geometry
    const clayGeometry = new THREE.PlaneGeometry(width, height);
    
    // Create material
    const clayMaterial = new THREE.MeshStandardMaterial({
        color: 0xA09077, // Clay color
        roughness: 0.9,
        metalness: 0.05,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    
    // Create mesh
    const clayLayer = new THREE.Mesh(clayGeometry, clayMaterial);
    
    // Position and rotate to match the landslide surface
    const angleRadians = CONFIG.clayLayerAngle * Math.PI / 180;
    clayLayer.position.set(-120, 40, -180);
    clayLayer.rotation.x = -Math.PI / 2 + angleRadians;
    clayLayer.rotation.y = Math.PI / 6; // Slight rotation to match mountain contour
    
    clayLayer.receiveShadow = true;
    
    return clayLayer;
}

// Create visualization of water saturation inside the mountain
function createSaturatedZone() {
    // Create geometry that approximates the landslide block but slightly smaller
    const saturatedGeometry = new THREE.BufferGeometry();
    
    // Create simplified vertices
    const vertices = new Float32Array([
        // Lower points
        -165, 25, -155, // 0
        -140, 35, -215, // 1
        -85, 30, -185,  // 2
        -95, 20, -145,  // 3
        
        // Upper points (lower than the landslide block)
        -145, 70, -175, // 4
        -125, 75, -205, // 5
        -95, 70, -175,  // 6
        -105, 65, -155  // 7
    ]);
    
    // Define faces
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
        color: 0x1E4870,      // Deep blue
        transparent: true, 
        opacity: 0.7
    });
    
    // Create mesh
    const saturatedZone = new THREE.Mesh(saturatedGeometry, saturatedMaterial);
    
    // Initially not visible - will be shown based on water level
    saturatedZone.visible = false;
    
    return saturatedZone;
}

// Create the dam
export function createDam(scene, textureLoader) {
    return new Promise((resolve) => {
        // Load concrete texture
        textureLoader.load(
            'assets/textures/concrete.jpg',
            function(concreteTexture) {
                // Configure texture
                concreteTexture.wrapS = THREE.RepeatWrapping;
                concreteTexture.wrapT = THREE.RepeatWrapping;
                concreteTexture.repeat.set(2, 5);
                
                // Create dam
                const dam = createArchDam(concreteTexture);
                scene.add(dam);
                
                // Create annotation
                createAnnotation(scene, "Vajont Dam (262m)", new THREE.Vector3(0, CONFIG.damHeight/2, 0));
                
                resolve(dam);
            },
            undefined,
            function(error) {
                console.error("Error loading concrete texture:", error);
                
                // Create fallback
                const dam = createFallbackDam();
                scene.add(dam);
                
                resolve(dam);
            }
        );
    });
}

// Create a realistic arch dam
function createArchDam(concreteTexture) {
    // Create a curved arch dam geometry
    const damShape = new THREE.Shape();
    damShape.moveTo(0, 0);
    damShape.lineTo(0, CONFIG.damHeight);
    damShape.lineTo(CONFIG.damThickness, CONFIG.damHeight);
    damShape.lineTo(CONFIG.damThickness, 0);
    damShape.lineTo(0, 0);
    
    // Create curve path for the dam
    const archCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(-CONFIG.damWidth/2, 0, 0),
        new THREE.Vector3(-CONFIG.damWidth/2 + CONFIG.damWidth*CONFIG.damCurvature, 0, -CONFIG.damWidth*CONFIG.damCurvature),
        new THREE.Vector3(CONFIG.damWidth/2 - CONFIG.damWidth*CONFIG.damCurvature, 0, -CONFIG.damWidth*CONFIG.damCurvature),
        new THREE.Vector3(CONFIG.damWidth/2, 0, 0)
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
        metalness: 0.2,
        bumpMap: concreteTexture,
        bumpScale: 0.1
    });
    
    // Create mesh
    const dam = new THREE.Mesh(damGeometry, damMaterial);
    dam.position.set(0, 0, 0); // At the narrowest part of the valley
    dam.castShadow = true;
    dam.receiveShadow = true;
    
    return dam;
}

// Create a fallback dam if texture loading fails
function createFallbackDam() {
    // Create simpler dam geometry
    const damGeometry = new THREE.BoxGeometry(
        CONFIG.damThickness,
        CONFIG.damHeight,
        CONFIG.damWidth
    );
    
    // Create material
    const damMaterial = new THREE.MeshStandardMaterial({
        color: 0x999999, // Concrete color
        roughness: 0.7,
        metalness: 0.2
    });
    
    // Create mesh
    const dam = new THREE.Mesh(damGeometry, damMaterial);
    dam.position.set(0, CONFIG.damHeight/2, 0);
    dam.castShadow = true;
    dam.receiveShadow = true;
    
    return dam;
}

// Create 3D annotation for objects
function createAnnotation(scene, text, position) {
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

// Update the saturated zone based on water level
export function updateSaturationVisualization(saturatedZone, waterLevel, maxWaterLevel) {
    if (!saturatedZone) return;
    
    // Only show saturation at higher water levels
    const threshold = 0.3; // 30% of max
    
    if (waterLevel / maxWaterLevel > threshold) {
        saturatedZone.visible = true;
        
        // Scale saturation based on water level
        const saturationScale = (waterLevel / maxWaterLevel - threshold) / (1 - threshold);
        
        // Adjust opacity based on saturation
        saturatedZone.material.opacity = 0.3 + saturationScale * 0.5;
        
        // Expand the saturated area as water level rises
        const scale = 0.6 + saturationScale * 0.5;
        saturatedZone.scale.set(1, scale, 1);
    } else {
        saturatedZone.visible = false;
    }
}

// Export utilities
export {
    CONFIG,
    updateSaturationVisualization,
    createAnnotation
};