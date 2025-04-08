import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import CONFIG from '../config.js';
import { easeInOutCubic } from '../utils/AnimationUtils.js';

/**
 * CameraController - Manages camera positioning and movements
 * Handles different view perspectives and camera transitions
 */
export default class CameraController {
    /**
     * Initialize the camera controller
     * @param {THREE.Camera} camera - The camera to control
     * @param {THREE.Renderer} renderer - The renderer (for orbit controls)
     */
    constructor(camera, renderer) {
        this.camera = camera;
        this.controls = null;
        this.renderer = renderer;
        this.cameraPositions = this._initializeCameraPositions();
        
        this._setupControls();
        this._setupEventListeners();
    }
    
    /**
     * Initialize camera position presets
     * @returns {Object} Camera position presets
     * @private
     */
    _initializeCameraPositions() {
        // Initialize from CONFIG but convert to Vector3 objects
        const positions = {};
        
        for (const [viewName, viewData] of Object.entries(CONFIG.cameraPositions)) {
            positions[viewName] = {
                position: new THREE.Vector3(
                    viewData.position.x,
                    viewData.position.y,
                    viewData.position.z
                ),
                target: new THREE.Vector3(
                    viewData.target.x,
                    viewData.target.y,
                    viewData.target.z
                )
            };
        }
        
        return positions;
    }
    
    /**
     * Setup orbit controls
     * @private
     */
    _setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent looking below ground
        this.controls.minDistance = 50;
        this.controls.maxDistance = 800;
        
        // Set initial target
        const initialView = 'aerial';
        this.controls.target.copy(this.cameraPositions[initialView].target);
        this.camera.position.copy(this.cameraPositions[initialView].position);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
    }
    
    /**
     * Setup event listeners for view buttons
     * @private
     */
    _setupEventListeners() {
        // Aerial view
        const aerialButton = document.getElementById('view-aerial');
        if (aerialButton) {
            aerialButton.addEventListener('click', () => {
                this.setActiveView('aerial');
                this.setCamera('aerial');
            });
        }
        
        // Dam view
        const damButton = document.getElementById('view-dam');
        if (damButton) {
            damButton.addEventListener('click', () => {
                this.setActiveView('dam');
                this.setCamera('dam');
            });
        }
        
        // Slope view
        const slopeButton = document.getElementById('view-slope');
        if (slopeButton) {
            slopeButton.addEventListener('click', () => {
                this.setActiveView('slope');
                this.setCamera('slope');
            });
        }
        
        // Geology view
        const geologyButton = document.getElementById('view-geology');
        if (geologyButton) {
            geologyButton.addEventListener('click', () => {
                this.setActiveView('geology');
                this.setCamera('geology');
            });
        }
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        const container = document.getElementById('canvas-container');
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        if (width === 0 || height === 0) return;
        
        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(width, height);
    }
    
    /**
     * Set active view button style
     * @param {string} view - View name
     */
    setActiveView(view) {
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
    
    /**
     * Set camera to specific position
     * @param {string} position - Position name
     * @param {Function} callback - Optional callback after animation
     */
    setCamera(position, callback) {
        if (!this.camera || !this.controls || !this.cameraPositions[position]) return;
        
        // Get target position and look-at point
        const endPos = this.cameraPositions[position].position.clone();
        const endTarget = this.cameraPositions[position].target.clone();
        
        // Store current camera position and controls target
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        
        // Animate the transition
        const duration = CONFIG.animation.cameraTransition;
        const startTime = Date.now();
        
        const animateCamera = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease function for smoother motion
            const eased = easeInOutCubic(progress);
            
            // Update camera position
            this.camera.position.lerpVectors(startPos, endPos, eased);
            
            // Update controls target
            this.controls.target.lerpVectors(startTarget, endTarget, eased);
            this.controls.update();
            
            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            } else if (callback) {
                callback(); // Execute callback when animation completes
            }
        };
        
        animateCamera();
    }
    
    /**
     * Setup keyboard shortcuts for camera control
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case '1':
                    // Aerial view
                    this.setActiveView('aerial');
                    this.setCamera('aerial');
                    break;
                    
                case '2':
                    // Dam view
                    this.setActiveView('dam');
                    this.setCamera('dam');
                    break;
                    
                case '3':
                    // Slope view
                    this.setActiveView('slope');
                    this.setCamera('slope');
                    break;
                    
                case '4':
                    // Geology view
                    this.setActiveView('geology');
                    this.setCamera('geology');
                    break;
            }
        });
    }
    
    /**
     * Update camera and controls (should be called in animation loop)
     */
    update() {
        if (this.controls) {
            this.controls.update();
        }
    }
    
    /**
     * Enable camera controls
     */
    enable() {
        if (this.controls) {
            this.controls.enabled = true;
        }
    }
    
    /**
     * Disable camera controls
     */
    disable() {
        if (this.controls) {
            this.controls.enabled = false;
        }
    }
    
    /**
     * Update camera positions based on scene configuration
     * @param {Object} config - Scene configuration object
     */
    updateCameraPositions(config) {
        // Update camera positions with actual scene dimensions
        this.cameraPositions = {
            aerial: {
                position: new THREE.Vector3(0, config.terrain.maxHeight * 3, config.terrain.depth * 0.4),
                target: new THREE.Vector3(0, 0, 0)
            },
            dam: {
                position: new THREE.Vector3(0, config.dam.height * 0.6, config.dam.width * 2),
                target: new THREE.Vector3(0, config.dam.height * 0.4, 0)
            },
            slope: {
                position: new THREE.Vector3(-config.mountain.width * 0.8, config.mountain.height * 0.8, -config.mountain.width * 0.4),
                target: new THREE.Vector3(-config.mountain.width * 0.5, config.mountain.height * 0.4, -config.mountain.width * 0.7)
            },
            geology: {
                position: new THREE.Vector3(-config.mountain.width * 0.6, config.mountain.height * 0.6, -config.mountain.width * 0.2),
                target: new THREE.Vector3(-config.mountain.width * 0.4, config.geology.clayLayerThickness, -config.mountain.width * 0.4)
            }
        };
    }
}