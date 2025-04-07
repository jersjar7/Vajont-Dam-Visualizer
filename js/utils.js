import * as THREE from 'three';

// Load a texture with proper error handling
export function loadTexture(textureLoader, path) {
    return new Promise((resolve, reject) => {
        textureLoader.load(
            path,
            texture => resolve(texture),
            undefined,
            error => {
                console.error(`Error loading texture ${path}:`, error);
                reject(error);
            }
        );
    });
}

// Create a skybox environment to provide background
export function createSkyEnvironment(scene) {
    // Create skybox geometry
    const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
    
    // Load skybox textures or create gradient
    const skyboxMaterials = [];
    
    // Try to create a gradient sky using simple shading
    for (let i = 0; i < 6; i++) {
        // Different colors for different sides
        let color;
        
        if (i === 2) { // Top - lighter sky blue
            color = new THREE.Color(0x87CEEB);
        } else if (i === 3) { // Bottom - subtle ground color
            color = new THREE.Color(0x4C6D7E);
        } else { // Sides - gradient from top to bottom
            color = new THREE.Color(0x4A80BD);
        }
        
        skyboxMaterials.push(
            new THREE.MeshBasicMaterial({
                color: color,
                side: THREE.BackSide
            })
        );
    }
    
    // Create skybox mesh
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    scene.add(skybox);
    
    // Add some clouds
    addClouds(scene);
    
    return skybox;
}

// Add clouds to the sky
function addClouds(scene) {
    // Create cloud particles
    const cloudCount = 20;
    const cloudGeometry = new THREE.BufferGeometry();
    const cloudPositions = new Float32Array(cloudCount * 3);
    const cloudSizes = new Float32Array(cloudCount);
    
    // Place clouds randomly in the sky
    for (let i = 0; i < cloudCount; i++) {
        const i3 = i * 3;
        
        // Position in the sky hemisphere
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI * 0.2; // Keep near the horizon
        const radius = 450; // Close to the skybox
        
        cloudPositions[i3] = radius * Math.sin(theta) * Math.cos(phi);
        cloudPositions[i3 + 1] = radius * Math.cos(theta) + 100; // Keep above horizon
        cloudPositions[i3 + 2] = radius * Math.sin(theta) * Math.sin(phi);
        
        // Random sizes
        cloudSizes[i] = Math.random() * 40 + 20;
    }
    
    // Set geometry attributes
    cloudGeometry.setAttribute('position', new THREE.BufferAttribute(cloudPositions, 3));
    cloudGeometry.setAttribute('size', new THREE.BufferAttribute(cloudSizes, 1));
    
    // Create cloud sprite texture
    const cloudCanvas = document.createElement('canvas');
    const ctx = cloudCanvas.getContext('2d');
    
    // Set canvas size
    cloudCanvas.width = 128;
    cloudCanvas.height = 128;
    
    // Draw cloud
    ctx.beginPath();
    ctx.arc(64, 64, 32, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    
    // Blur the edges
    ctx.shadowColor = 'white';
    ctx.shadowBlur = 15;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(64, 64, 24, 0, Math.PI * 2);
    ctx.fill();
    
    // Create texture
    const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
    
    // Create cloud material
    const cloudMaterial = new THREE.PointsMaterial({
        size: 1,
        map: cloudTexture,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });
    
    // Create cloud particles
    const clouds = new THREE.Points(cloudGeometry, cloudMaterial);
    clouds.userData.rotationSpeed = 0.0001; // Very slow rotation
    
    scene.add(clouds);
    
    return clouds;
}

// Animate clouds
export function animateClouds(clouds, deltaTime) {
    if (!clouds) return;
    
    // Rotate clouds slowly
    clouds.rotation.y += clouds.userData.rotationSpeed * deltaTime;
}

// Add atmospheric fog to the scene
export function addAtmosphericFog(scene) {
    // Add fog for depth perception
    scene.fog = new THREE.Fog(0x87CEEB, 200, 700);
    
    return scene.fog;
}

// Create a simple ground plane
export function createGroundPlane(scene, width = 1000, height = 1000) {
    // Create geometry
    const geometry = new THREE.PlaneGeometry(width, height);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
        color: 0x4C6D7E,
        roughness: 1.0,
        metalness: 0.0
    });
    
    // Create mesh
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2; // Lay flat
    ground.position.y = -2; // Below other objects
    ground.receiveShadow = true;
    
    scene.add(ground);
    
    return ground;
}

// Helper to convert degrees to radians
export function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

// Helper to convert radians to degrees
export function radToDeg(radians) {
    return radians * 180 / Math.PI;
}

// Get height at a specific position on a terrain
export function getHeightAtPosition(terrain, x, z) {
    if (!terrain || !terrain.geometry) return 0;
    
    // Raycasting to find height
    const raycaster = new THREE.Raycaster();
    raycaster.set(
        new THREE.Vector3(x, 1000, z), // Start high above
        new THREE.Vector3(0, -1, 0)    // Cast downward
    );
    
    const intersects = raycaster.intersectObject(terrain);
    
    if (intersects.length > 0) {
        return intersects[0].point.y;
    }
    
    return 0;
}

// Create a legend for the visualization
export function createLegend(container) {
    // Create legend element
    const legend = document.createElement('div');
    legend.className = 'legend';
    legend.style.position = 'absolute';
    legend.style.bottom = '20px';
    legend.style.right = '20px';
    legend.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
    legend.style.padding = '10px';
    legend.style.borderRadius = '5px';
    legend.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    
    // Add legend items
    const items = [
        { color: '#8B4513', label: 'Mount Toc' },
        { color: '#A09077', label: 'Clay Failure Plane' },
        { color: '#2E86C1', label: 'Reservoir Water' },
        { color: '#999999', label: 'Concrete Dam' },
        { color: '#1E4870', label: 'Saturated Rock' }
    ];
    
    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.style.display = 'flex';
        itemDiv.style.alignItems = 'center';
        itemDiv.style.marginBottom = '5px';
        
        const colorBox = document.createElement('div');
        colorBox.style.width = '15px';
        colorBox.style.height = '15px';
        colorBox.style.backgroundColor = item.color;
        colorBox.style.marginRight = '8px';
        
        const label = document.createElement('span');
        label.textContent = item.label;
        
        itemDiv.appendChild(colorBox);
        itemDiv.appendChild(label);
        legend.appendChild(itemDiv);
    });
    
    container.appendChild(legend);
    
    return legend;
}

// Show error message
export function showErrorMessage(message, container) {
    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '50%';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translate(-50%, -50%)';
    errorDiv.style.backgroundColor = 'rgba(220, 53, 69, 0.9)';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '20px';
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    errorDiv.style.textAlign = 'center';
    errorDiv.style.zIndex = '1000';
    
    // Add message
    errorDiv.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'OK';
    closeButton.style.backgroundColor = 'white';
    closeButton.style.color = '#dc3545';
    closeButton.style.border = 'none';
    closeButton.style.padding = '5px 15px';
    closeButton.style.marginTop = '15px';
    closeButton.style.borderRadius = '3px';
    closeButton.style.cursor = 'pointer';
    
    closeButton.addEventListener('click', () => {
        container.removeChild(errorDiv);
    });
    
    errorDiv.appendChild(closeButton);
    container.appendChild(errorDiv);
    
    return errorDiv;
}

// Generate random number within range
export function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Convert a value from one range to another
export function mapRange(value, minA, maxA, minB, maxB) {
    return (value - minA) / (maxA - minA) * (maxB - minB) + minB;
}

// Clamp a value between min and max
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Create a screenshot of the current view
export function takeScreenshot(renderer) {
    // Render the scene
    renderer.render(renderer.scene, renderer.camera);
    
    // Get the image data from the renderer
    const imgData = renderer.domElement.toDataURL('image/png');
    
    // Create a download link
    const link = document.createElement('a');
    link.href = imgData;
    link.download = 'vajont-simulation-' + Date.now() + '.png';
    
    // Trigger the download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Check if a point is visible to the camera
export function isPointVisible(point, camera, renderer) {
    // Convert 3D point to screen coordinates
    const screenPosition = point.clone();
    screenPosition.project(camera);
    
    // Check if point is within view frustum
    if (screenPosition.z > 1 || 
        screenPosition.x < -1 || screenPosition.x > 1 || 
        screenPosition.y < -1 || screenPosition.y > 1) {
        return false;
    }
    
    // Convert to pixel coordinates
    const x = (screenPosition.x + 1) * renderer.domElement.width / 2;
    const y = (-screenPosition.y + 1) * renderer.domElement.height / 2;
    
    // Check if point is within screen bounds
    return (x >= 0 && x <= renderer.domElement.width && 
            y >= 0 && y <= renderer.domElement.height);
}

// Calculate distance between two points
export function distance(point1, point2) {
    return point1.distanceTo(point2);
}

// Generate a random point on a surface
export function randomPointOnSurface(geometry) {
    // Get triangle areas
    const triangles = [];
    const triangleAreas = [];
    let totalArea = 0;
    
    // Find all triangles in the geometry
    const positionAttr = geometry.getAttribute('position');
    const indices = geometry.getIndex();
    
    if (indices) {
        // Indexed geometry
        for (let i = 0; i < indices.count; i += 3) {
            const a = new THREE.Vector3().fromBufferAttribute(positionAttr, indices.getX(i));
            const b = new THREE.Vector3().fromBufferAttribute(positionAttr, indices.getX(i + 1));
            const c = new THREE.Vector3().fromBufferAttribute(positionAttr, indices.getX(i + 2));
            
            const triangle = [a, b, c];
            const area = calculateTriangleArea(a, b, c);
            
            triangles.push(triangle);
            triangleAreas.push(area);
            totalArea += area;
        }
    } else {
        // Non-indexed geometry
        for (let i = 0; i < positionAttr.count; i += 3) {
            const a = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
            const b = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 1);
            const c = new THREE.Vector3().fromBufferAttribute(positionAttr, i + 2);
            
            const triangle = [a, b, c];
            const area = calculateTriangleArea(a, b, c);
            
            triangles.push(triangle);
            triangleAreas.push(area);
            totalArea += area;
        }
    }
    
    // Choose a random triangle weighted by area
    let randomArea = Math.random() * totalArea;
    let selectedTriangle;
    
    for (let i = 0; i < triangles.length; i++) {
        randomArea -= triangleAreas[i];
        if (randomArea <= 0) {
            selectedTriangle = triangles[i];
            break;
        }
    }
    
    // If somehow no triangle was selected, use the first one
    if (!selectedTriangle && triangles.length > 0) {
        selectedTriangle = triangles[0];
    } else if (!selectedTriangle) {
        return new THREE.Vector3(); // Empty geometry
    }
    
    // Generate random point in the triangle
    return randomPointInTriangle(selectedTriangle[0], selectedTriangle[1], selectedTriangle[2]);
}

// Calculate area of a triangle
function calculateTriangleArea(a, b, c) {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const cross = new THREE.Vector3().crossVectors(ab, ac);
    
    return cross.length() / 2;
}

// Generate random point in a triangle
function randomPointInTriangle(a, b, c) {
    // Barycentric coordinates
    let r1 = Math.random();
    let r2 = Math.random();
    
    // Check if point is in the triangle
    if (r1 + r2 > 1) {
        r1 = 1 - r1;
        r2 = 1 - r2;
    }
    
    const point = new THREE.Vector3()
        .addScaledVector(a, 1 - r1 - r2)
        .addScaledVector(b, r1)
        .addScaledVector(c, r2);
    
    return point;
}

// Smooth interpolation using easing functions
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Easing functions for smooth animations
export function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
}

export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

export function easeInOutBack(t) {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    
    return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
}

// Track frames per second for performance monitoring
export function createFPSCounter() {
    // Create counter element
    const counterDiv = document.createElement('div');
    counterDiv.style.position = 'absolute';
    counterDiv.style.top = '10px';
    counterDiv.style.right = '10px';
    counterDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    counterDiv.style.color = 'white';
    counterDiv.style.padding = '5px 10px';
    counterDiv.style.borderRadius = '3px';
    counterDiv.style.fontSize = '12px';
    counterDiv.style.zIndex = '1000';
    
    // Initial values
    let lastTime = performance.now();
    let frames = 0;
    let fps = 0;
    
    // Update function
    function update() {
        frames++;
        
        const currentTime = performance.now();
        const elapsed = currentTime - lastTime;
        
        if (elapsed >= 1000) {
            fps = Math.round((frames * 1000) / elapsed);
            frames = 0;
            lastTime = currentTime;
            
            counterDiv.textContent = `${fps} FPS`;
            
            // Change color based on performance
            if (fps >= 50) {
                counterDiv.style.color = '#4caf50'; // Green for good performance
            } else if (fps >= 30) {
                counterDiv.style.color = '#ffeb3b'; // Yellow for acceptable
            } else {
                counterDiv.style.color = '#f44336'; // Red for poor performance
            }
        }
        
        requestAnimationFrame(update);
    }
    
    // Start updating
    update();
    
    // Create toggle function
    function toggle() {
        if (counterDiv.style.display === 'none') {
            counterDiv.style.display = 'block';
        } else {
            counterDiv.style.display = 'none';
        }
    }
    
    return {
        element: counterDiv,
        toggle: toggle
    };
}

// Debug helpers for development
export function createDebugHelpers(scene) {
    // Create a group to hold all helpers
    const debugGroup = new THREE.Group();
    debugGroup.visible = false; // Off by default
    scene.add(debugGroup);
    
    // Add axes helper
    const axesHelper = new THREE.AxesHelper(50);
    debugGroup.add(axesHelper);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x888888);
    debugGroup.add(gridHelper);
    
    // Toggle visibility function
    function toggle() {
        debugGroup.visible = !debugGroup.visible;
    }
    
    return {
        group: debugGroup,
        toggle: toggle
    };
}

// Export everything
export {
    addClouds,
    animateClouds,
    addAtmosphericFog,
    createGroundPlane,
    degToRad,
    radToDeg,
    getHeightAtPosition,
    createLegend,
    showErrorMessage,
    random
};