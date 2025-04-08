import * as THREE from 'three';
import CONFIG from '../config.js';
import CameraController from './CameraController.js';
import DisasterController from './DisasterController.js';
import WaterModel from '../models/WaterModel.js';
import TerrainModel from '../models/TerrainModel.js';
import GeologyModel from '../models/GeologyModel.js';
import { initLoadingScreen, createLoadingManager, hideLoadingScreen } from '../utils/LoadingUtils.js';

/**
 * SimulationController - Main controller for the Vajont Dam simulation
 * Orchestrates the different components and handles the main simulation loop
 */
export default class SimulationController {
    /**
     * Initialize the simulation controller
     * @param {HTMLElement} container - Container element for the simulation
     */
    constructor(container) {
        this.container = container;
        this.models = {};
        this.controllers = {};
        this.views = {};
        this.uiElements = {};
        this.running = false;
        this.lastTime = 0;
        
        // Initialize loading screen
        const { loadingScreen, loadingProgress } = initLoadingScreen();
        this.loadingScreen = loadingScreen;
        this.loadingProgress = loadingProgress;
    }
    
    /**
     * Initialize the simulation
     */
    async init() {
        try {
            console.log("Initializing Vajont Dam simulation...");
            
            // Setup loading manager
            const onLoadComplete = () => this._onLoadingComplete();
            this.loadingManager = createLoadingManager(
                this.loadingScreen,
                this.loadingProgress,
                onLoadComplete
            );
            
            // Create texture loader
            this.textureLoader = new THREE.TextureLoader(this.loadingManager);
            
            // Setup scene and camera
            this._setupScene();
            this._setupCamera();
            this._setupViews();
            
            // Load models
            await this._loadModels();
            
            // Setup controllers
            this._setupControllers();
            
            // Setup event listeners
            this._setupEventListeners();
            
            // Hide loading screen
            hideLoadingScreen(this.loadingScreen);
            
            // Start animation loop
            this.start();
        } catch (error) {
            console.error("Error initializing simulation:", error);
            this._showErrorMessage("Failed to initialize simulation. Please refresh the page.");
        }
    }
    
    /**
     * Setup scene and renderer
     * @private
     */
    _setupScene() {
        // Import SceneView dynamically to avoid circular dependencies
        import('../views/SceneView.js').then(({ default: SceneView }) => {
            this.views.scene = new SceneView(this.container);
            this.views.scene.createSkyEnvironment();
            
            // Store reference to scene and renderer
            this.scene = this.views.scene.scene;
            this.renderer = this.views.scene.renderer;
        });
    }
    
    /**
     * Setup camera
     * @private
     */
    _setupCamera() {
        // Create camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 2000);
        
        // Set initial position
        const initialView = 'aerial';
        const position = CONFIG.cameraPositions[initialView].position;
        const target = CONFIG.cameraPositions[initialView].target;
        
        this.camera.position.set(position.x, position.y, position.z);
        this.camera.lookAt(new THREE.Vector3(target.x, target.y, target.z));
    }
    
    /**
     * Setup views
     * @private
     */
    _setupViews() {
        // Import UIView dynamically to avoid circular dependencies
        import('../views/UIView.js').then(({ default: UIView }) => {
            this.views.ui = new UIView();
            
            // Store UI elements
            this.uiElements = {
                waterLevelSlider: this.views.ui.waterLevelSlider,
                stabilityIndicator: this.views.ui.stabilityIndicator,
                timeline: this.views.ui.timeline,
                timelineProgress: this.views.ui.timelineProgress
            };
            
            // Register water level change handler
            this.views.ui.registerWaterLevelHandlers(
                value => this._onWaterLevelChange(value),
                value => this._onStabilityUpdate(value)
            );
        });
    }
    
    /**
     * Load models
     * @private
     */
    async _loadModels() {
        // Create models
        this.models.water = new WaterModel();
        this.models.terrain = new TerrainModel();
        this.models.geology = new GeologyModel();
        
        try {
            // Load terrain
            await this.models.terrain.createTerrain(this.scene, this.textureLoader);
            
            // Create cross-section (geology view)
            await this.models.terrain.createCrossSection(this.scene, this.textureLoader);
            
            // Create water
            await this.models.water.createWater(this.scene, this.textureLoader);
            
            // Create Mount Toc and landslide
            await this.models.geology.createMountToc(this.scene, this.textureLoader);
            
            // Create clay layer
            await this.models.geology.createClayLayer(this.scene, this.textureLoader);
            
            // Create saturation zone
            this.models.geology.createSaturatedZone(this.scene);
            
            // Create dam
            await this.models.geology.createDam(this.scene, this.textureLoader);
            
        } catch (error) {
            console.error('Error loading models:', error);
            throw error;
        }
    }
    
    /**
     * Setup controllers
     * @private
     */
    _setupControllers() {
        // Create camera controller
        this.controllers.camera = new CameraController(this.camera, this.renderer);
        
        // Create disaster controller
        this.controllers.disaster = new DisasterController(
            this.scene,
            this.models,
            this.controllers,
            this.uiElements
        );
        
        // Setup keyboard shortcuts
        this.controllers.camera.setupKeyboardShortcuts();
    }
    
    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this._onWindowResize());
    }
    
    /**
     * Start animation loop
     */
    start() {
        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            this._animate();
        }
    }
    
    /**
     * Stop animation loop
     */
    stop() {
        this.running = false;
    }
    
    /**
     * Animation loop
     * @private
     */
    _animate() {
        if (!this.running) return;
        
        // Request next frame
        requestAnimationFrame(() => this._animate());
        
        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // in seconds
        this.lastTime = currentTime;
        
        // Update controllers
        if (this.controllers.camera) {
            this.controllers.camera.update();
        }
        
        // Update water animation
        if (this.models.water) {
            this.models.water.animateWater(deltaTime);
        }
        
        // Update annotations
        if (this.views.scene && this.camera) {
            this.views.scene.updateAnnotations(this.camera);
        }
        
        // Render scene
        if (this.views.scene && this.camera) {
            this.views.scene.render(this.camera);
        }
    }
    
    /**
     * Handle window resize
     * @private
     */
    _onWindowResize() {
        // Update camera and renderer in scene view
        if (this.views.scene) {
            this.views.scene.onWindowResize(this.camera);
        }
        
        // Update camera controller
        if (this.controllers.camera) {
            this.controllers.camera.onWindowResize();
        }
    }
    
    /**
     * Handle water level change
     * @param {number} value - New water level value (0-100)
     * @private
     */
    _onWaterLevelChange(value) {
        // Update water model
        if (this.models.water) {
            this.models.water.updateWaterLevel(value);
        }
        
        // Update stability
        this._onStabilityUpdate(value);
        
        // Update geology models
        if (this.models.geology) {
            this.models.geology.updateSaturationZone(value);
            this.models.geology.updateClayLayer(value);
        }
    }
    
    /**
     * Handle stability update
     * @param {number} value - Water level value (0-100)
     * @private
     */
    _onStabilityUpdate(value) {
        // Update UI
        if (this.views.ui) {
            this.views.ui.updateStabilityIndicator(value);
        }
    }
    
    /**
     * Handle loading complete
     * @private
     */
    _onLoadingComplete() {
        console.log("Loading complete");
        hideLoadingScreen(this.loadingScreen);
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     * @private
     */
    _showErrorMessage(message) {
        if (this.views.ui) {
            this.views.ui.showErrorMessage(message);
        } else {
            // Fallback if UI view is not yet initialized
            alert(message);
        }
    }
}