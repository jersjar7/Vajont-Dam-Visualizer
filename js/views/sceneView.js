import * as THREE from 'three';
import CONFIG from '../config.js';

/**
 * SceneView - Manages the 3D scene setup and rendering
 * Handles scene creation, lighting, and rendering loop
 */
export default class SceneView {
    /**
     * Initialize the scene view
     * @param {HTMLElement} container - Container element for renderer
     */
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.renderer = null;
        this.annotations = [];
        
        this._setupScene();
        this._setupRenderer();
        this._setupLighting();
    }
    
    /**
     * Setup Three.js scene
     * @private
     */
    _setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.scene.backgroundColor);
        this.scene.fog = new THREE.Fog(
            CONFIG.scene.backgroundColor, 
            CONFIG.scene.fogNear, 
            CONFIG.scene.fogFar
        );
    }
    
    /**
     * Setup renderer
     * @private
     */
    _setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            logarithmicDepthBuffer: true
        });
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container.appendChild(this.renderer.domElement);
    }
    
    /**
     * Setup scene lighting
     * @private
     */
    _setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(-300, 400, 300);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 10;
        directionalLight.shadow.camera.far = 1000;
        directionalLight.shadow.camera.left = -400;
        directionalLight.shadow.camera.right = 400;
        directionalLight.shadow.camera.top = 400;
        directionalLight.shadow.camera.bottom = -400;
        directionalLight.shadow.bias = -0.0003;
        
        this.scene.add(directionalLight);
        
        // Secondary fill light
        const secondaryLight = new THREE.DirectionalLight(0xffffff, 0.3);
        secondaryLight.position.set(200, 200, -200);
        this.scene.add(secondaryLight);
        
        // Hemisphere light for better ambient gradient
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.5);
        this.scene.add(hemisphereLight);
    }
    
    /**
     * Render the scene
     * @param {THREE.Camera} camera - Camera to render from
     */
    render(camera) {
        if (this.renderer && this.scene && camera) {
            this.renderer.render(this.scene, camera);
        }
    }
    
    /**
     * Handle window resize
     * @param {THREE.Camera} camera - Camera to update
     */
    onWindowResize(camera) {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        if (width === 0 || height === 0) return;
        
        if (camera) {
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        }
        
        this.renderer.setSize(width, height);
        
        // Update annotations
        this.updateAnnotations(camera);
    }
    
    /**
     * Create screen-space annotation for a 3D object
     * @param {THREE.Object3D} object - Object to annotate
     * @param {string} text - Annotation text
     * @param {THREE.Vector3} position - Position for annotation (optional)
     * @returns {Object} Annotation object
     */
    createAnnotation(object, text, position) {
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
        
        this.annotations.push(annotation);
        
        return annotation;
    }
    
    /**
     * Update annotation position based on 3D position
     * @param {Object} annotation - Annotation object
     * @param {THREE.Camera} camera - Camera for projection
     */
    updateAnnotationPosition(annotation, camera) {
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
    
    /**
     * Update all annotations
     * @param {THREE.Camera} camera - Camera for projection
     */
    updateAnnotations(camera) {
        this.annotations.forEach(annotation => {
            this.updateAnnotationPosition(annotation, camera);
        });
    }
    
    /**
     * Create a skybox environment
     * @returns {THREE.Mesh} Skybox mesh
     */
    createSkyEnvironment() {
        // Create skybox geometry
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        
        // Create materials for each side with color gradients
        const skyboxMaterials = [];
        
        // Different colors for different sides
        for (let i = 0; i < 6; i++) {
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
        this.scene.add(skybox);
        
        return skybox;
    }
    
    /**
     * Add atmospheric fog to the scene
     */
    addAtmosphericFog() {
        this.scene.fog = new THREE.Fog(
            CONFIG.scene.backgroundColor,
            CONFIG.scene.fogNear,
            CONFIG.scene.fogFar
        );
    }
    
    /**
     * Create a simple ground plane
     * @returns {THREE.Mesh} Ground mesh
     */
    createGroundPlane() {
        // Create geometry
        const geometry = new THREE.PlaneGeometry(1000, 1000);
        
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
        
        this.scene.add(ground);
        
        return ground;
    }
    
    /**
     * Create a legend for the visualization
     * @returns {HTMLElement} Legend element
     */
    createLegend() {
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
        
        document.body.appendChild(legend);
        
        return legend;
    }
    
    /**
     * Take a screenshot of the current view
     * @returns {string} Data URL of screenshot
     */
    takeScreenshot() {
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        
        // Get the image data from the renderer
        const imgData = this.renderer.domElement.toDataURL('image/png');
        
        // Create a download link
        const link = document.createElement('a');
        link.href = imgData;
        link.download = 'vajont-simulation-' + Date.now() + '.png';
        
        // Trigger the download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return imgData;
    }
}