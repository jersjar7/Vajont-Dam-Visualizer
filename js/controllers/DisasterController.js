import * as THREE from 'three';
import CONFIG from '../config.js';
import {
    easeInOutQuad,
    easeOutQuad,
    easeOutCubic,
    easeInOutBack,
    delay,
    createDebrisParticles,
    updateDebrisParticles,
    updateSplashParticles,
    addCameraShake,
    cleanupAnimationObjects
} from '../utils/AnimationUtils.js';

/**
 * DisasterController - Manages the disaster sequence animation
 * Handles the complete disaster animation sequence
 */
export default class DisasterController {
    /**
     * Initialize the disaster controller
     * @param {THREE.Scene} scene - The scene
     * @param {Object} models - Object containing model instances
     * @param {Object} controllers - Object containing controller instances
     * @param {Object} uiElements - Object containing UI elements
     */
    constructor(scene, models, controllers, uiElements) {
        this.scene = scene;
        this.models = models;
        this.controllers = controllers;
        this.uiElements = uiElements;
        
        this.animating = false;
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Disaster sequence button
        const disasterButton = document.getElementById('disaster-button');
        if (disasterButton) {
            disasterButton.addEventListener('click', () => this.playDisasterSequence());
        }
        
        // Reset button
        const resetButton = document.getElementById('reset-button');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetSimulation());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'r':
                case 'R':
                    // Reset simulation
                    this.resetSimulation();
                    break;
                    
                case 'p':
                case 'P':
                case ' ': // Space bar
                    // Play disaster sequence
                    this.playDisasterSequence();
                    break;
            }
        });
    }
    
    /**
     * Play the complete disaster sequence
     */
    async playDisasterSequence() {
        if (this.animating) return;
        this.animating = true;
        
        // Disable UI controls during animation
        this._disableControls();
        
        // Show timeline
        const timeline = document.getElementById('timeline');
        const timelineProgress = document.getElementById('timeline-progress');
        if (timeline) {
            timeline.style.display = 'block';
            timelineProgress.style.width = '0%';
        }
        
        try {
            // 1. Move to slope view
            await this._animateCameraToMountToc();
            
            // 2. Gradually raise water level
            await this._animateWaterLevel(30, 85, timelineProgress);
            
            // Wait a moment at critical level
            await delay(1000);
            if (!this.animating) return;
            
            // 3. Trigger landslide
            await this._animateLandslide(timelineProgress);
            
            // 4. Create tsunami wave
            await this._animateTsunami(timelineProgress);
            
            // 5. Show disaster summary after a delay
            await delay(1000);
            if (this.animating) {
                this._showDisasterSummary();
            }
        } catch (error) {
            console.error("Animation error:", error);
        } finally {
            if (!this.animating) {
                // If animation was interrupted, reset
                this.resetSimulation();
            }
            
            // Re-enable UI controls
            this._enableControls();
        }
    }
    
    /**
     * Reset the simulation to initial state
     */
    resetSimulation() {
        // Stop any ongoing animation
        this.animating = false;
        
        // Reset water level slider
        if (this.uiElements.waterLevelSlider) {
            this.uiElements.waterLevelSlider.value = 30;
            this.models.water.updateWaterLevel(30);
            this._updateStabilityStatus(30);
            this.models.geology.updateSaturationZone(30);
        }
        
        // Reset landslide block position and rotation
        if (this.models.geology.landslideBlock) {
            this.models.geology.landslideBlock.visible = true;
            
            // Restore original position if saved
            if (this.models.geology.landslideBlock.userData.originalPosition) {
                this.models.geology.landslideBlock.position.copy(
                    this.models.geology.landslideBlock.userData.originalPosition
                );
            }
            
            // Restore original rotation if saved
            if (this.models.geology.landslideBlock.userData.originalRotation) {
                this.models.geology.landslideBlock.rotation.copy(
                    this.models.geology.landslideBlock.userData.originalRotation
                );
            }
        }
        
        // Reset clay layer
        if (this.models.geology.clayLayer) {
            this.models.geology.updateClayLayer(30);
        }
        
        // Hide timeline
        const timeline = document.getElementById('timeline');
        if (timeline) {
            timeline.style.display = 'none';
        }
        
        // Reset camera to aerial view
        this.controllers.camera.setActiveView('aerial');
        this.controllers.camera.setCamera('aerial');
        
        // Clean up animation objects
        cleanupAnimationObjects(this.scene);
        
        // Re-enable controls
        this._enableControls();
    }
    
    /**
     * Animate camera to Mount Toc view
     * @returns {Promise} Promise that resolves when animation completes
     * @private
     */
    async _animateCameraToMountToc() {
        return new Promise((resolve) => {
            this.controllers.camera.setActiveView('slope');
            this.controllers.camera.setCamera('slope', resolve);
        });
    }
    
    /**
     * Animate water level change
     * @param {number} startLevel - Starting water level (0-100)
     * @param {number} endLevel - Ending water level (0-100)
     * @param {HTMLElement} timelineProgress - Timeline progress element
     * @returns {Promise} Promise that resolves when animation completes
     * @private
     */
    async _animateWaterLevel(startLevel, endLevel, timelineProgress) {
        return new Promise((resolve) => {
            const duration = Math.abs(endLevel - startLevel) * 50; // 50ms per level unit
            const startTime = Date.now();
            
            const updateWaterAnimation = () => {
                if (!this.animating) {
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
                if (this.uiElements.waterLevelSlider) {
                    this.uiElements.waterLevelSlider.value = currentLevel;
                    this.models.water.updateWaterLevel(currentLevel);
                    this._updateStabilityStatus(currentLevel);
                    this.models.geology.updateSaturationZone(currentLevel);
                    this.models.geology.updateClayLayer(currentLevel);
                }
                
                if (progress < 1) {
                    requestAnimationFrame(updateWaterAnimation);
                } else {
                    resolve();
                }
            };
            
            updateWaterAnimation();
        });
    }
    
    /**
     * Animate the landslide
     * @param {HTMLElement} timelineProgress - Timeline progress element
     * @returns {Promise} Promise that resolves when animation completes
     * @private
     */
    async _animateLandslide(timelineProgress) {
        const landslideBlock = this.models.geology.landslideBlock;
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
        createDebrisParticles(this.scene, landslideBlock.position);
        
        // Add camera shake
        addCameraShake(this.controllers.camera.camera, 3, 500);
        
        // Try to play sound effect if available
        this._playLandslideSound();
        
        // Animate the landslide
        const slideDuration = CONFIG.animation.landslideTime;
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const animateLandslideStep = () => {
                if (!this.animating) {
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
                updateDebrisParticles(this.scene, progress);
                
                if (progress < 1) {
                    requestAnimationFrame(animateLandslideStep);
                } else {
                    resolve();
                }
            };
            
            animateLandslideStep();
        });
    }
    
    /**
     * Animate tsunami wave
     * @param {HTMLElement} timelineProgress - Timeline progress element
     * @returns {Promise} Promise that resolves when animation completes
     * @private
     */
    async _animateTsunami(timelineProgress) {
        // Get water level
        const waterHeight = this.models.water.waterMesh ? 
                          this.models.water.waterMesh.position.y : 
                          CONFIG.water.maxHeight;
        
        // Create impact position
        const impactPosition = new THREE.Vector3(-100, waterHeight, -140);
        
        // Create tsunami wave
        const wave = this.models.water.createTsunamiWave(
            this.scene, 
            impactPosition,
            waterHeight
        );
        
        // Create splash particles
        const splashParticles = this.models.water.createSplashParticles(
            this.scene,
            impactPosition
        );
        
        // Try to play tsunami sound
        this._playTsunamiSound();
        
        // Add camera shake
        addCameraShake(this.controllers.camera.camera, 2, 2000);
        
        // Animation parameters
        const waveDuration = CONFIG.animation.tsunamiTime;
        const waveStartTime = Date.now();
        
        return new Promise((resolve) => {
            const animateWaveStep = () => {
                if (!this.animating) {
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
                updateSplashParticles(this.scene, progress);
                
                // Raise water level to simulate dam overtopping
                if (progress > 0.7 && this.models.water.waterMesh) {
                    const overflowHeight = THREE.MathUtils.lerp(
                        waterHeight,
                        CONFIG.dam.height + 10, // Above dam height
                        (progress - 0.7) / 0.3
                    );
                    
                    this.models.water.waterMesh.position.y = overflowHeight;
                    
                    // Create overtopping effect
                    if (progress > 0.8 && progress < 0.85) {
                        this.models.water.createWaterOvertopping(
                            this.scene,
                            new THREE.Vector3(0, 0, -50), // Dam position
                            CONFIG.dam.width,
                            CONFIG.dam.height
                        );
                    }
                }
                
                if (progress < 1) {
                    requestAnimationFrame(animateWaveStep);
                } else {
                    resolve();
                }
            };
            
            animateWaveStep();
        });
    }
    
    /**
     * Show disaster summary overlay
     * @private
     */
    _showDisasterSummary() {
        this.animating = false;
        
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
            this.resetSimulation();
        });
    }
    
    /**
     * Update stability indicator based on water level
     * @param {number} value - Water level (0-100)
     * @private
     */
    _updateStabilityStatus(value) {
        const stabilityIndicator = document.getElementById('stability-indicator');
        if (!stabilityIndicator) return;
        
        let stabilityText, stabilityColor;
        
        if (value > CONFIG.stability.critical) {
            stabilityText = "Critical - Imminent Failure";
            stabilityColor = "#e53935"; // deep red
        } else if (value > CONFIG.stability.veryLow) {
            stabilityText = "Very Low - Dangerously Unstable";
            stabilityColor = "#ff5252"; // red
        } else if (value > CONFIG.stability.low) {
            stabilityText = "Low - Significant Risk";
            stabilityColor = "#ff9800"; // orange
        } else if (value > CONFIG.stability.moderate) {
            stabilityText = "Moderate - Caution";
            stabilityColor = "#ffc107"; // amber
        } else if (value > CONFIG.stability.good) {
            stabilityText = "Good - Minor Stress";
            stabilityColor = "#cddc39"; // lime
        } else {
            stabilityText = "Excellent - Stable";
            stabilityColor = "#4caf50"; // green
        }
        
        stabilityIndicator.textContent = "Stability: " + stabilityText;
        stabilityIndicator.style.backgroundColor = stabilityColor;
        stabilityIndicator.style.color = value > CONFIG.stability.moderate ? "#fff" : "#333";
    }
    
    /**
     * Disable UI controls during animation
     * @private
     */
    _disableControls() {
        // Disable buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            if (button.id !== 'close-summary') {
                button.disabled = true;
                button.style.opacity = 0.5;
            }
        });
        
        // Disable water slider
        if (this.uiElements.waterLevelSlider) {
            this.uiElements.waterLevelSlider.disabled = true;
            this.uiElements.waterLevelSlider.style.opacity = 0.5;
        }
        
        // Disable camera controls
        this.controllers.camera.disable();
    }
    
    /**
     * Re-enable UI controls after animation
     * @private
     */
    _enableControls() {
        // Enable buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = false;
            button.style.opacity = 1;
        });
        
        // Enable water slider
        if (this.uiElements.waterLevelSlider) {
            this.uiElements.waterLevelSlider.disabled = false;
            this.uiElements.waterLevelSlider.style.opacity = 1;
        }
        
        // Enable camera controls
        this.controllers.camera.enable();
    }
    
    /**
     * Play landslide sound effect
     * @private
     */
    _playLandslideSound() {
        try {
            // Create audio element
            const audio = document.createElement('audio');
            
            // Try to load sound file
            audio.src = './assets/sounds/landslide.mp3';
            
            // Adjust volume
            audio.volume = 0.5;
            
            // Play sound
            audio.play().catch(error => {
                console.warn('Audio playback failed:', error);
                // Silently ignore - sound is not essential
            });
        } catch (error) {
            console.warn('Error playing sound:', error);
            // Silently ignore - sound is not essential
        }
    }
    
    /**
     * Play tsunami sound effect
     * @private
     */
    _playTsunamiSound() {
        try {
            // Create audio element
            const audio = document.createElement('audio');
            
            // Try to load sound file
            audio.src = './assets/sounds/tsunami.mp3';
            
            // Adjust volume
            audio.volume = 0.4;
            
            // Play sound
            audio.play().catch(error => {
                console.warn('Audio playback failed:', error);
                // Silently ignore - sound is not essential
            });
        } catch (error) {
            console.warn('Error playing sound:', error);
            // Silently ignore - sound is not essential
        }
    }
}