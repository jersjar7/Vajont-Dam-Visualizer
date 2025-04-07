import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TextureLoader } from 'three';

// Global variables
let scene, camera, renderer, controls;
let waterLevelSlider, stabilityIndicator;
let timeline, timelineProgress;
let animating = false;
let loadingManager, loadingScreen, loadingProgress;

// Scene objects
let terrain, mountToc, dam, reservoir, clayLayer, saturatedZone;
let mountTocMesh, landslideBlock, damMesh, waterMesh;
let annotations = [];

// Configuration for scene dimensions and scale
const CONFIG = {
    // Terrain dimensions
    terrainWidth: 800,
    terrainDepth: 800,
    terrainMaxHeight: 120,
    
    // Water properties
    initialWaterHeight: 40,
    maxWaterHeight: 90,
    minWaterHeight: 5,
    
    // Dam properties
    damHeight: 90,
    damWidth: 150,
    damThickness: 15,
    damCurvature: 0.3,
    
    // Mountain properties
    mountTocHeight: 100,
    slideVolume: 270, // million cubic meters
    
    // Geological properties
    clayLayerThickness: 3,
    clayLayerAngle: 25, // degrees
    
    // Animation timings
    waterRiseTime: 5000, // ms
    landslideTime: 3000, // ms
    tsunamiTime: 4000  // ms
};

// Camera positions
const cameraPositions = {
    aerial: {
        position: new THREE.Vector3(0, 400, 400),
        target: new THREE.Vector3(0, 0, 0)
    },
    dam: {
        position: new THREE.Vector3(0, 60, 200),
        target: new THREE.Vector3(0, 40, 0)
    },
    slope: {
        position: new THREE.Vector3(-200, 80, -100),
        target: new THREE.Vector3(-100, 40, -150)
    },
    geology: {
        position: new THREE.Vector3(-150, 60, -50),
        target: new THREE.Vector3(-100, 30, -100)
    }
};

// Initialize everything
function init() {
    console.log("Initializing Vajont Dam simulation...");
    setupLoadingManager();
    setupScene();
    setupCamera();
    setupRenderer();
    setupLighting();
    setupControls();
    setupEventListeners();
    
    // Load terrain and scene objects
    loadTerrain()
        .then(() => {
            createDam();
            createMountToc();
            createClayLayer();
            createWater();
            createSaturatedZone();
            setupUIElements();
            hideLoadingScreen();
            animate();
        })
        .catch(error => {
            console.error("Error initializing:", error);
            showErrorMessage("Failed to load terrain. Please refresh the page.");
        });
}

// Setup loading manager with progress tracking
function setupLoadingManager() {
    loadingScreen = document.getElementById('loading-screen');
    loadingProgress = document.getElementById('loading-progress');
    
    loadingManager = new THREE.LoadingManager();
    
    loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
        const progress = Math.floor((itemsLoaded / itemsTotal) * 100);
        loadingProgress.textContent = `${progress}%`;
    };
    
    loadingManager.onLoad = function() {
        console.log("All resources loaded");
    };
    
    loadingManager.onError = function(url) {
        console.error('Error loading:', url);
        // Continue with fallback textures
    };
}

// Setup scene
function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 400, 1000);
}

// Setup camera
function setupCamera() {
    const container = document.getElementById('canvas-container');
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
    camera.position.copy(cameraPositions.aerial.position);
    camera.lookAt(cameraPositions.aerial.target);
}

// Setup renderer
function setupRenderer() {
    const container = document.getElementById('canvas-container');
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        logarithmicDepthBuffer: true
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    window.addEventListener('resize', onWindowResize);
}

// Setup lighting
function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Main sun light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-300, 400, 300);
    directionalLight.castShadow = true;
    
    // Configure shadows
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -400;
    directionalLight.shadow.camera.right = 400;
    directionalLight.shadow.camera.top = 400;
    directionalLight.shadow.camera.bottom = -400;
    directionalLight.shadow.bias = -0.0003;
    
    scene.add(directionalLight);
    
    // Secondary fill light
    const secondaryLight = new THREE.DirectionalLight(0xffffff, 0.3);
    secondaryLight.position.set(200, 200, -200);
    scene.add(secondaryLight);
    
    // Hemisphere light for better ambient gradient
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.5);
    scene.add(hemisphereLight);
}

// Setup controls
function setupControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent looking below ground
    controls.minDistance = 50;
    controls.maxDistance = 800;
    controls.target.copy(cameraPositions.aerial.target);
}

// Create terrain from heightmap
function loadTerrain() {
    return new Promise((resolve, reject) => {
        const textureLoader = new THREE.TextureLoader(loadingManager);
        
        // Load terrain heightmap
        textureLoader.load(
            'assets/textures/vajont_heightmap.jpg',
            function(heightMap) {
                // Create terrain geometry based on heightmap
                const geometry = new THREE.PlaneGeometry(
                    CONFIG.terrainWidth,
                    CONFIG.terrainDepth,
                    128, 128 // High resolution for detailed terrain
                );
                
                // Load terrain texture
                textureLoader.load(
                    'assets/textures/rock.jpg',
                    function(terrainTexture) {
                        // Configure texture
                        terrainTexture.wrapS = THREE.RepeatWrapping;
                        terrainTexture.wrapT = THREE.RepeatWrapping;
                        terrainTexture.repeat.set(8, 8);
                        
                        // Create terrain material
                        const material = new THREE.MeshStandardMaterial({
                            map: terrainTexture,
                            displacementMap: heightMap,
                            displacementScale: CONFIG.terrainMaxHeight,
                            roughness: 0.8,
                            metalness: 0.2
                        });
                        
                        // Create terrain mesh
                        terrain = new THREE.Mesh(geometry, material);
                        terrain.rotation.x = -Math.PI / 2; // Rotate to horizontal
                        terrain.receiveShadow = true;
                        scene.add(terrain);
                        
                        // Resolve the promise
                        resolve();
                    },
                    undefined,
                    function(error) {
                        console.error("Error loading terrain texture:", error);
                        // Create a fallback material without texture
                        const material = new THREE.MeshStandardMaterial({
                            color: 0x8B8B7A,
                            displacementMap: heightMap,
                            displacementScale: CONFIG.terrainMaxHeight,
                            roughness: 0.9,
                            metalness: 0.1
                        });
                        
                        // Create terrain mesh with fallback material
                        terrain = new THREE.Mesh(geometry, material);
                        terrain.rotation.x = -Math.PI / 2; // Rotate to horizontal
                        terrain.receiveShadow = true;
                        scene.add(terrain);
                        
                        // Resolve with fallback
                        resolve();
                    }
                );
            },
            undefined,
            function(error) {
                console.error("Error loading heightmap:", error);
                reject(error);
            }
        );
    });
}

// Create the dam
function createDam() {
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
    
    // Extrude along the curve
    const extrudeSettings = {
        steps: 40,
        bevelEnabled: false,
        extrudePath: archCurve
    };
    
    const damGeometry = new THREE.ExtrudeGeometry(damShape, extrudeSettings);
    
    // Load concrete texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'assets/textures/concrete.jpg',
        function(concreteTexture) {
            // Configure texture
            concreteTexture.wrapS = THREE.RepeatWrapping;
            concreteTexture.wrapT = THREE.RepeatWrapping;
            concreteTexture.repeat.set(8, 4);
            
            // Create material
            const damMaterial = new THREE.MeshStandardMaterial({
                map: concreteTexture,
                roughness: 0.7,
                metalness: 0.2
            });
            
            // Create mesh
            damMesh = new THREE.Mesh(damGeometry, damMaterial);
            damMesh.position.set(0, 0, -50); // Position at the narrowest part of the valley
            damMesh.castShadow = true;
            damMesh.receiveShadow = true;
            scene.add(damMesh);
            
            // Create annotation for the dam
            createAnnotation(damMesh, "Vajont Dam (262m)", new THREE.Vector3(0, CONFIG.damHeight/2, 0));
        },
        undefined,
        function(error) {
            console.error("Error loading concrete texture:", error);
            
            // Fallback material
            const damMaterial = new THREE.MeshStandardMaterial({
                color: 0x999999,
                roughness: 0.7,
                metalness: 0.2
            });
            
            // Create mesh with fallback material
            damMesh = new THREE.Mesh(damGeometry, damMaterial);
            damMesh.position.set(0, 0, -50);
            damMesh.castShadow = true;
            damMesh.receiveShadow = true;
            scene.add(damMesh);
        }
    );
}

// Create Mount Toc with landslide area
function createMountToc() {
    const textureLoader = new THREE.TextureLoader();
    
    // Load limestone texture
    textureLoader.load(
        'assets/textures/limestone.jpg',
        function(rockTexture) {
            // Configure texture
            rockTexture.wrapS = THREE.RepeatWrapping;
            rockTexture.wrapT = THREE.RepeatWrapping;
            rockTexture.repeat.set(4, 4);
            
            // Create custom geometry for Mount Toc
            const mountGeometry = new THREE.BufferGeometry();
            
            // Create vertices for the mountain
            // This is a simplified representation - you would use more detailed geometry in production
            const vertices = new Float32Array([
                // Base of the mountain (roughly triangular)
                -200, 0, -100,
                -150, 0, -250,
                -50, 0, -200,
                0, 0, -150,
                -150, 0, -100,
                
                // Peak
                -120, CONFIG.mountTocHeight, -180,
            ]);
            
            // Create faces connecting to the peak
            const indices = [
                0, 1, 5,
                1, 2, 5,
                2, 3, 5,
                3, 4, 5,
                4, 0, 5
            ];
            
            // Set geometry attributes
            mountGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            mountGeometry.setIndex(indices);
            mountGeometry.computeVertexNormals();
            
            // Create material
            const mountMaterial = new THREE.MeshStandardMaterial({
                map: rockTexture,
                roughness: 0.8,
                metalness: 0.1
            });
            
            // Create mesh
            mountTocMesh = new THREE.Mesh(mountGeometry, mountMaterial);
            mountTocMesh.castShadow = true;
            mountTocMesh.receiveShadow = true;
            scene.add(mountTocMesh);
            
            // Create the actual landslide block that will move during animation
            createLandslideBlock(rockTexture);
            
            // Create annotation
            createAnnotation(mountTocMesh, "Mount Toc", new THREE.Vector3(-120, CONFIG.mountTocHeight + 10, -180));
        },
        undefined,
        function(error) {
            console.error("Error loading limestone texture:", error);
            // Create with fallback material...
        }
    );
}

// Create the specific landslide block that will move during animation
function createLandslideBlock(rockTexture) {
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
    
    // Create material
    const slideMaterial = new THREE.MeshStandardMaterial({
        map: rockTexture,
        roughness: 0.7,
        metalness: 0.1,
        color: 0x8B5A2B // Slightly different color to distinguish it
    });
    
    // Create mesh
    landslideBlock = new THREE.Mesh(slideGeometry, slideMaterial);
    landslideBlock.castShadow = true;
    landslideBlock.receiveShadow = true;
    
    // Store original position for animation
    landslideBlock.userData.originalPosition = landslideBlock.position.clone();
    landslideBlock.userData.originalRotation = landslideBlock.rotation.clone();
    
    // Initially visible
    landslideBlock.visible = true;
    scene.add(landslideBlock);
    
    // Create annotation
    createAnnotation(landslideBlock, "Landslide Area (270 million m³)", new THREE.Vector3(-120, 60, -180));
}

// Create clay layer failure plane
function createClayLayer() {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'assets/textures/clay.jpg',
        function(clayTexture) {
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
            clayLayer = new THREE.Mesh(clayGeometry, clayMaterial);
            
            // Position and rotate to match the landslide surface
            const angleRadians = CONFIG.clayLayerAngle * Math.PI / 180;
            clayLayer.position.set(-120, 40, -180);
            clayLayer.rotation.x = -Math.PI / 2 + angleRadians;
            clayLayer.rotation.y = Math.PI / 6;
            
            clayLayer.receiveShadow = true;
            scene.add(clayLayer);
            
            // Create annotation
            createAnnotation(clayLayer, "Clay Failure Surface", new THREE.Vector3(-110, 35, -160));
        },
        undefined,
        function(error) {
            console.error("Error loading clay texture:", error);
            // Create with fallback material...
        }
    );
}

// Create water for the reservoir
function createWater() {
    const textureLoader = new THREE.TextureLoader();
    
    // Load water textures
    Promise.all([
        new Promise(resolve => textureLoader.load('assets/textures/water_color.jpg', resolve)),
        new Promise(resolve => textureLoader.load('assets/textures/water_normal.jpg', resolve))
    ]).then(([waterColor, waterNormal]) => {
        // Configure textures
        waterColor.wrapS = waterColor.wrapT = THREE.RepeatWrapping;
        waterNormal.wrapS = waterNormal.wrapT = THREE.RepeatWrapping;
        waterColor.repeat.set(8, 8);
        waterNormal.repeat.set(8, 8);
        
        // Create custom shape for the reservoir following the valley
        const waterShape = new THREE.Shape();
        
        // Define points tracing the valley contour
        waterShape.moveTo(-150, -150);
        waterShape.quadraticCurveTo(-100, -100, 0, -80);
        waterShape.quadraticCurveTo(100, -60, 150, -20);
        waterShape.lineTo(150, 50);
        waterShape.quadraticCurveTo(80, 30, 0, 0);
        waterShape.quadraticCurveTo(-80, -30, -150, 0);
        waterShape.lineTo(-150, -150);
        
        const waterGeometry = new THREE.ShapeGeometry(waterShape);
        
        // Create water material
        const waterMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x1565C0,
            map: waterColor,
            normalMap: waterNormal,
            normalScale: new THREE.Vector2(0.3, 0.3),
            transparent: true,
            opacity: 0.85,
            roughness: 0.1,
            metalness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.2
        });
        
        // Create water mesh
        waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
        waterMesh.rotation.x = -Math.PI / 2; // Lay flat
        
        // Position at initial water level
        const initialWaterLevel = (parseInt(waterLevelSlider.value) / 100) * 
                                 (CONFIG.maxWaterHeight - CONFIG.minWaterHeight) + 
                                 CONFIG.minWaterHeight;
        waterMesh.position.y = initialWaterLevel;
        
        waterMesh.receiveShadow = true;
        scene.add(waterMesh);
        
        // Create annotation
        createAnnotation(waterMesh, "Vajont Reservoir", new THREE.Vector3(-50, initialWaterLevel + 5, -50));
    }).catch(error => {
        console.error("Error loading water textures:", error);
        // Create with fallback material...
    });
}

// Create visualization of water saturation inside the mountain
function createSaturatedZone() {
    // Create a copy of the landslide block geometry but slightly smaller
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
    
    // Create material for saturated zone
    const saturatedMaterial = new THREE.MeshStandardMaterial({
        color: 0x1E4870,
        transparent: true, 
        opacity: 0.7
    });
    
    // Create mesh
    saturatedZone = new THREE.Mesh(saturatedGeometry, saturatedMaterial);
    
    // Initially not visible - will be shown based on water level
    saturatedZone.visible = false;
    scene.add(saturatedZone);
}

// Create screen-space annotation for a 3D object
function createAnnotation(object, text, position) {
    // Create HTML element
    const annotationElement = document.createElement('div');
    annotationElement.className = 'annotation';
    annotationElement.textContent = text;
    document.body.appendChild(annotationElement);
    
    // Store reference to update position
    const annotation = {
        object: object,
        element: annotationElement,
        position: position || object.position.clone()
    };
    
    annotations.push(annotation);
    
    // Initial position update
    updateCamera();
}

// Toggle info box visibility
function toggleInfoBox() {
    const infoBox = document.getElementById('info-box');
    if (infoBox) {
        infoBox.classList.toggle('collapsed');
        
        const toggleButton = document.getElementById('toggle-info');
        if (toggleButton) {
            toggleButton.textContent = infoBox.classList.contains('collapsed') ? '?' : 'i';
        }
    }
}

// Update water level based on slider value
function updateWaterLevel(value) {
    // Calculate water height based on slider value (0-100)
    const waterHeight = (value / 100) * (CONFIG.maxWaterHeight - CONFIG.minWaterHeight) + CONFIG.minWaterHeight;
    
    // Update water mesh position
    if (waterMesh) {
        waterMesh.position.y = waterHeight;
    }
    
    return waterHeight;
}

// Update slope stability indicator
function updateStabilityStatus(value) {
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
    
    // Update clay layer visualization to match stability
    if (clayLayer && clayLayer.material) {
        if (value > 65) {
            clayLayer.material.color.set(0xe53935);
            clayLayer.material.emissive = new THREE.Color(0xff5252);
            clayLayer.material.emissiveIntensity = 0.3;
        } else if (value > 50) {
            clayLayer.material.color.set(0xff9800);
            clayLayer.material.emissiveIntensity = 0.2;
        } else {
            clayLayer.material.color.set(0xA09077);
            clayLayer.material.emissiveIntensity = 0;
        }
    }
}

// Update water saturation visualization
function updateSaturationVisualization(value) {
    if (!saturatedZone) return;
    
    // Only show saturation at higher water levels
    if (value > 30) {
        saturatedZone.visible = true;
        
        // Calculate the saturation height based on water level
        const waterHeight = updateWaterLevel(value);
        
        // Scale saturation based on water level
        const saturationScale = (value - 30) / 70; // 0 at 30%, 1 at 100%
        saturatedZone.material.opacity = 0.3 + saturationScale * 0.5;
        
        // Expand the saturated area as water level rises
        const scale = 0.6 + saturationScale * 0.5;
        saturatedZone.scale.set(1, scale, 1);
    } else {
        saturatedZone.visible = false;
    }
}

// Reset the simulation
function resetSimulation() {
    // Stop any ongoing animation
    animating = false;
    
    // Reset water level slider
    if (waterLevelSlider) {
        waterLevelSlider.value = 30;
        updateWaterLevel(30);
        updateStabilityStatus(30);
        updateSaturationVisualization(30);
    }
    
    // Reset landslide block position and rotation
    if (landslideBlock) {
        landslideBlock.visible = true;
        landslideBlock.position.copy(landslideBlock.userData.originalPosition || new THREE.Vector3());
        landslideBlock.rotation.copy(landslideBlock.userData.originalRotation || new THREE.Euler());
    }
    
    // Hide timeline
    if (timeline) {
        timeline.style.display = 'none';
    }
    
    // Reset camera to aerial view
    setActiveView('aerial');
    animateCameraTransition(cameraPositions.aerial.position, cameraPositions.aerial.target);
    
    // Re-enable controls
    enableControls();
}

// Play the complete disaster sequence
async function playDisasterSequence() {
    if (animating) return;
    animating = true;
    
    // Disable UI controls during animation
    disableControls();
    
    // Show timeline
    if (timeline) {
        timeline.style.display = 'block';
        timelineProgress.style.width = '0%';
    }
    
    try {
        // 1. Move to slope view
        await animateCameraTransition(cameraPositions.slope.position, cameraPositions.slope.target);
        
        // 2. Gradually raise water level
        await animateWaterLevel(30, 85);
        
        // Wait a moment at critical level
        await delay(1000);
        if (!animating) return;
        
        // 3. Trigger landslide
        await animateLandslide();
        
        // 4. Create tsunami wave
        await animateTsunami();
        
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
            resetSimulation();
        }
        
        // Re-enable UI controls
        enableControls();
    }
}

// Animate water level change
async function animateWaterLevel(startLevel, endLevel) {
    return new Promise((resolve) => {
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
                updateWaterLevel(currentLevel);
                updateStabilityStatus(currentLevel);
                updateSaturationVisualization(currentLevel);
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
async function animateLandslide() {
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
    createDebrisParticles();
    
    // Animate the landslide
    const slideDuration = CONFIG.landslideTime;
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
            updateDebrisParticles(progress);
            
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
function createDebrisParticles() {
    const particleCount = 100;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Initialize particles around the landslide
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Random positions near the landslide
        positions[i3] = landslideBlock.position.x + (Math.random() - 0.5) * 50;
        positions[i3 + 1] = landslideBlock.position.y + Math.random() * 50;
        positions[i3 + 2] = landslideBlock.position.z + (Math.random() - 0.5) * 50;
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
}

// Update debris particles
function updateDebrisParticles(progress) {
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
async function animateTsunami() {
    // Get water level
    const waterHeight = waterMesh ? waterMesh.position.y : CONFIG.maxWaterHeight;
    
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
    createSplashParticles(wave.position);
    
    // Animate the tsunami wave
    const waveDuration = CONFIG.tsunamiTime;
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
            updateSplashParticles(progress);
            
            // Raise water level to simulate dam overtopping
            if (progress > 0.7 && waterMesh) {
                const overflowHeight = THREE.MathUtils.lerp(
                    CONFIG.maxWaterHeight,
                    CONFIG.damHeight + 10,
                    (progress - 0.7) / 0.3
                );
                waterMesh.position.y = overflowHeight;
                
                // Create overtopping effect
                if (progress > 0.8 && progress < 0.85) {
                    createWaterOvertopping();
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
function createSplashParticles(position) {
    const particleCount = 200;
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
    
    scene.add(particles);
}

// Update splash particles
function updateSplashParticles(progress) {
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
function createWaterOvertopping() {
    // Create falling water particles on downstream side of dam
    const particleCount = 150;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Position particles along the top of the dam
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Random position along dam crest
        positions[i3] = (Math.random() - 0.5) * CONFIG.damWidth;
        positions[i3 + 1] = CONFIG.damHeight;
        positions[i3 + 2] = 0;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create material
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x29B6F6,
        size: 1,
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
        resetSimulation();
    });
}

// Hide loading screen when ready
function hideLoadingScreen() {
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

// Show error message
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Hide loading screen
    hideLoadingScreen();
}

// Disable UI controls during animation
function disableControls() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        if (button.id !== 'close-summary') {
            button.disabled = true;
            button.style.opacity = 0.5;
        }
    });
    
    if (waterLevelSlider) {
        waterLevelSlider.disabled = true;
        waterLevelSlider.style.opacity = 0.5;
    }
    
    if (controls) {
        controls.enabled = false;
    }
}

// Re-enable UI controls after animation
function enableControls() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = false;
        button.style.opacity = 1;
    });
    
    if (waterLevelSlider) {
        waterLevelSlider.disabled = false;
        waterLevelSlider.style.opacity = 1;
    }
    
    if (controls) {
        controls.enabled = true;
    }
}

// Utility function: simple delay
function delay(ms) {
    return new Promise(resolve => {
        if (!animating) {
            resolve();
            return;
        }
        
        setTimeout(resolve, ms);
    });
}

// Handle window resize
function onWindowResize() {
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    if (width === 0 || height === 0) return;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    
    // Update annotations
    updateAnnotations();
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Update annotations
    updateAnnotations();
    
    // Animate water texture if available
    animateWater();
    
    // Render scene
    renderer.render(scene, camera);
}

// Animate water ripples
function animateWater() {
    if (waterMesh && waterMesh.material && waterMesh.material.normalMap) {
        const time = Date.now() * 0.0005;
        waterMesh.material.normalMap.offset.x = time;
        waterMesh.material.normalMap.offset.y = time;
    }
}

// Easing Functions
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInOutBack(t) {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    
    return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
}

// Start initialization when document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}AnnotationPosition(annotation);


// Update annotation position based on 3D position
function updateAnnotationPosition(annotation) {
    if (!annotation.object.visible) {
        annotation.element.style.display = 'none';
        return;
    }
    
    // Get world position
    const worldPosition = annotation.position.clone();
    if (annotation.object) {
        worldPosition.applyMatrix4(annotation.object.matrixWorld);
    }
    
    // Project to screen space
    const screenPosition = worldPosition.clone();
    screenPosition.project(camera);
    
    // Convert to CSS coordinates
    const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPosition.y * 0.5 + 0.5) * window.innerHeight;
    
    // Check if behind camera or too far to sides
    if (screenPosition.z > 1 || 
        x < 0 || x > window.innerWidth || 
        y < 0 || y > window.innerHeight) {
        annotation.element.style.display = 'none';
    } else {
        annotation.element.style.display = 'block';
        annotation.element.style.left = x + 'px';
        annotation.element.style.top = y + 'px';
    }
}

// Update all annotations
function updateAnnotations() {
    annotations.forEach(updateAnnotationPosition);
}

// Setup UI elements and attach event listeners
function setupUIElements() {
    // Get UI elements
    waterLevelSlider = document.getElementById('waterLevel');
    stabilityIndicator = document.getElementById('stability-indicator');
    timeline = document.getElementById('timeline');
    timelineProgress = document.getElementById('timeline-progress');
    
    // Set initial UI state based on slider
    updateWaterLevel(parseInt(waterLevelSlider.value));
    updateStabilityStatus(parseInt(waterLevelSlider.value));
}

// Setup event listeners
function setupEventListeners() {
    // Water level slider
    const slider = document.getElementById('waterLevel');
    if (slider) {
        slider.addEventListener('input', function(event) {
            const value = parseInt(event.target.value);
            updateWaterLevel(value);
            updateStabilityStatus(value);
            updateSaturationVisualization(value);
        });
    }
    
    // Reset button
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', resetSimulation);
    }
    
    // Disaster sequence button
    const disasterButton = document.getElementById('disaster-button');
    if (disasterButton) {
        disasterButton.addEventListener('click', playDisasterSequence);
    }
    
    // Info toggle button
    const infoToggle = document.getElementById('toggle-info');
    if (infoToggle) {
        infoToggle.addEventListener('click', toggleInfoBox);
    }
    
    // View buttons
    setupViewButtons();
}

// Setup view buttons
function setupViewButtons() {
    // Aerial view
    const aerialButton = document.getElementById('view-aerial');
    if (aerialButton) {
        aerialButton.addEventListener('click', function() {
            setActiveView('aerial');
            animateCameraTransition(cameraPositions.aerial.position, cameraPositions.aerial.target);
        });
    }
    
    // Dam view
    const damButton = document.getElementById('view-dam');
    if (damButton) {
        damButton.addEventListener('click', function() {
            setActiveView('dam');
            animateCameraTransition(cameraPositions.dam.position, cameraPositions.dam.target);
        });
    }
    
    // Slope view
    const slopeButton = document.getElementById('view-slope');
    if (slopeButton) {
        slopeButton.addEventListener('click', function() {
            setActiveView('slope');
            animateCameraTransition(cameraPositions.slope.position, cameraPositions.slope.target);
        });
    }
    
    // Geology view
    const geologyButton = document.getElementById('view-geology');
    if (geologyButton) {
        geologyButton.addEventListener('click', function() {
            setActiveView('geology');
            animateCameraTransition(cameraPositions.geology.position, cameraPositions.geology.target);
            // Make clay layer more visible
            if (clayLayer) {
                clayLayer.material.opacity = 0.9;
            }
        });
    }
}

// Set active view button
function setActiveView(view) {
    // Remove active class from all buttons
    const viewButtons = document.querySelectorAll('.view-button');
    viewButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Add active class to selected button
    const activeButton = document.getElementById(`view-${view}`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Animate camera transition
function animateCameraTransition(targetPosition, targetLookAt) {
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 1000; // ms
    const startTime = Date.now();
    
    function updateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease function
        const easedProgress = easeInOutCubic(progress);
        
        // Update camera position
        camera.position.lerpVectors(startPosition, targetPosition, easedProgress);
        
        // Update control target (look-at point)
        controls.target.lerpVectors(startTarget, targetLookAt, easedProgress);
        controls.update();
        
        // Update annotations
        updateAnnotations();
        
        if (progress < 1) {
            requestAnimationFrame(updateCamera);
        }
    }
    
}