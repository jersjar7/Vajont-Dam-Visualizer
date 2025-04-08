/**
 * Main entry point for the Vajont Dam Disaster Simulation
 * Initializes the simulation and starts the application
 */

import SimulationController from './controllers/SimulationController.js';

// Start the application when document is ready
document.addEventListener('DOMContentLoaded', () => {
    init();
});

/**
 * Initialize the application
 */
async function init() {
    try {
        // Get container element
        const container = document.getElementById('canvas-container');
        if (!container) {
            throw new Error('Container element not found');
        }

        // Create simulation controller
        const simulationController = new SimulationController(container);
        
        // Initialize simulation
        await simulationController.init();
        
        // Store controller on window for debugging (optional)
        window.simulationController = simulationController;
        
        console.log('Vajont Dam Disaster Simulation initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showErrorMessage('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showErrorMessage(message) {
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
        document.body.removeChild(errorDiv);
    });
    
    errorDiv.appendChild(closeButton);
    document.body.appendChild(errorDiv);
    
    // Hide loading screen if exists
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}