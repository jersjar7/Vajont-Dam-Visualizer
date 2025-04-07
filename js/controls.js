import * as THREE from 'three';
import { updateStabilityIndicator } from './animation.js';
import { easeInOutCubic, easeInOutQuad } from './utils.js';

// Camera positions for different views
let cameraPositions = {
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
        target: new THREE.Vector3(-120, 40, -180)
    },
    geology: {
        position: new THREE.Vector3(-150, 60, -50),
        target: new THREE.Vector3(-100, 30, -100)
    }
};

// Setup event listeners for user interaction
export function setupEventListeners() {
    // Water level slider
    const slider = document.getElementById('waterLevel');
    if (slider) {
        slider.addEventListener('input', onWaterLevelChange);
    }
    
    // Reset button
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', onResetClick);
    }
    
    // Disaster sequence button
    const disasterButton = document.getElementById('disaster-button');
    if (disasterButton) {
        disasterButton.addEventListener('click', onDisasterClick);
    }
    
    // Info toggle button
    const infoToggle = document.getElementById('toggle-info');
    if (infoToggle) {
        infoToggle.addEventListener('click', toggleInfoBox);
    }
    
    // View buttons
    setupViewButtons();
    
    // Keyboard shortcuts
    setupKeyboardShortcuts();
}

// Setup all view buttons
function setupViewButtons() {
    // Aerial view
    const aerialButton = document.getElementById('view-aerial');
    if (aerialButton) {
        aerialButton.addEventListener('click', () => {
            setActiveView('aerial');
            setCamera('aerial');
        });
    }
    
    // Dam view
    const damButton = document.getElementById('view-dam');
    if (damButton) {
        damButton.addEventListener('click', () => {
            setActiveView('dam');
            setCamera('dam');
        });
    }
    
    // Slope view
    const slopeButton = document.getElementById('view-slope');
    if (slopeButton) {
        slopeButton.addEventListener('click', () => {
            setActiveView('slope');
            setCamera('slope');
        });
    }
    
    // Geology view
    const geologyButton = document.getElementById('view-geology');
    if (geologyButton) {
        geologyButton.addEventListener('click', () => {
            setActiveView('geology');
            setCamera('geology');
        });
    }
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'r':
            case 'R':
                // Reset simulation
                onResetClick();
                break;
                
            case 'p':
            case 'P':
            case ' ': // Space bar
                // Play disaster sequence
                onDisasterClick();
                break;
                
            case '1':
                // Aerial view
                setActiveView('aerial');
                setCamera('aerial');
                break;
                
            case '2':
                // Dam view
                setActiveView('dam');
                setCamera('dam');
                break;
                
            case '3':
                // Slope view
                setActiveView('slope');
                setCamera('slope');
                break;
                
            case '4':
                // Geology view
                setActiveView('geology');
                setCamera('geology');
                break;
                
            case 'i':
            case 'I':
                // Toggle info box
                toggleInfoBox();
                break;
                
            case 'ArrowUp':
                // Increase water level
                const waterSlider = document.getElementById('waterLevel');
                if (waterSlider) {
                    waterSlider.value = Math.min(100, parseInt(waterSlider.value) + 5);
                    onWaterLevelChange({ target: waterSlider });
                }
                break;
                
            case 'ArrowDown':
                // Decrease water level
                const waterSlider2 = document.getElementById('waterLevel');
                if (waterSlider2) {
                    waterSlider2.value = Math.max(0, parseInt(waterSlider2.value) - 5);
                    onWaterLevelChange({ target: waterSlider2 });
                }
                break;
        }
    });
}

// Callback for water level slider change
function onWaterLevelChange(event) {
    // Get slider value
    const value = parseInt(event.target.value);
    
    // Create a custom event to notify the rest of the application
    const waterLevelEvent = new CustomEvent('waterLevelChanged', {
        detail: { value: value }
    });
    
    // Dispatch the event
    document.dispatchEvent(waterLevelEvent);
    
    // Update stability indicator
    updateStabilityIndicator(value);
}

// Callback for reset button click
function onResetClick() {
    // Create a custom event to notify the rest of the application
    const resetEvent = new CustomEvent('resetSimulation');
    
    // Dispatch the event
    document.dispatchEvent(resetEvent);
}

// Callback for disaster button click
function onDisasterClick() {
    // Create a custom event to notify the rest of the application
    const disasterEvent = new CustomEvent('playDisasterSequence');
    
    // Dispatch the event
    document.dispatchEvent(disasterEvent);
}

// Toggle info box visibility
export function toggleInfoBox() {
    const infoBox = document.getElementById('info-box');
    if (!infoBox) return;
    
    infoBox.classList.toggle('collapsed');
    
    const toggleButton = document.getElementById('toggle-info');
    if (toggleButton) {
        toggleButton.textContent = infoBox.classList.contains('collapsed') ? '?' : 'i';
    }
}

// Set active view button style
export function setActiveView(view) {
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

// Set camera to specific position
export function setCamera(position, callback) {
    if (!window.camera || !window.controls || !cameraPositions[position]) return;
    
    const camera = window.camera;
    const controls = window.controls;
    
    // Get target position and look-at point
    const endPos = cameraPositions[position].position.clone();
    const endTarget = cameraPositions[position].target.clone();
    
    // Store current camera position and controls target
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    
    // Animate the transition
    const duration = 1000; // 1 second
    const startTime = Date.now();
    
    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease function for smoother motion
        const eased = easeInOutCubic(progress);
        
        // Update camera position
        camera.position.lerpVectors(startPos, endPos, eased);
        
        // Update controls target
        controls.target.lerpVectors(startTarget, endTarget, eased);
        controls.update();
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        } else if (callback) {
            callback(); // Execute callback when animation completes
        }
    }
    
    animateCamera();
}

// Setup camera positions based on scene configuration
export function setupCameraPositions(config) {
    // Update camera positions with actual scene dimensions
    cameraPositions = {
        aerial: {
            position: new THREE.Vector3(0, config.terrainMaxHeight * 3, config.terrainDepth * 0.4),
            target: new THREE.Vector3(0, 0, 0)
        },
        dam: {
            position: new THREE.Vector3(0, config.damHeight * 0.6, config.valleyWidth * 2),
            target: new THREE.Vector3(0, config.damHeight * 0.4, 0)
        },
        slope: {
            position: new THREE.Vector3(-config.mountTocWidth * 0.8, config.mountTocHeight * 0.8, -config.mountTocWidth * 0.4),
            target: new THREE.Vector3(-config.mountTocWidth * 0.5, config.mountTocHeight * 0.4, -config.mountTocWidth * 0.7)
        },
        geology: {
            position: new THREE.Vector3(-config.mountTocWidth * 0.6, config.mountTocHeight * 0.6, -config.mountTocWidth * 0.2),
            target: new THREE.Vector3(-config.mountTocWidth * 0.4, config.clayLayerThickness, -config.mountTocWidth * 0.4)
        }
    };
}

// Handle window resize
export function onWindowResize() {
    if (!window.camera || !window.renderer) return;
    
    const container = document.getElementById('canvas-container');
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    if (width === 0 || height === 0) return;
    
    // Update camera aspect ratio
    window.camera.aspect = width / height;
    window.camera.updateProjectionMatrix();
    
    // Update renderer size
    window.renderer.setSize(width, height);
    
    // Also update any screen-space elements
    updateScreenSpaceElements();
}

// Update elements that depend on screen space coordinates
function updateScreenSpaceElements() {
    // Update annotations if they exist
    if (window.updateAnnotations) {
        window.updateAnnotations();
    }
}

// Export additional functions
export {
    onWaterLevelChange,
    onResetClick,
    onDisasterClick,
    cameraPositions
};