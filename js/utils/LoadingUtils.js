import * as THREE from 'three';

/**
 * Loading utilities for the Vajont Dam simulation
 * Handles asset loading and loading screen management
 */

/**
 * Create a loading manager with progress tracking
 * @param {HTMLElement} loadingScreen - Loading screen element
 * @param {HTMLElement} loadingProgress - Progress display element
 * @param {Function} onLoadComplete - Callback when loading completes
 * @returns {THREE.LoadingManager} Configured loading manager
 */
export function createLoadingManager(loadingScreen, loadingProgress, onLoadComplete) {
    const loadingManager = new THREE.LoadingManager();
    
    loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
        const progress = Math.floor((itemsLoaded / itemsTotal) * 100);
        if (loadingProgress) {
            loadingProgress.textContent = `${progress}%`;
        }
    };
    
    loadingManager.onLoad = function() {
        console.log("All resources loaded");
        if (onLoadComplete) {
            onLoadComplete();
        }
    };
    
    loadingManager.onError = function(url) {
        console.error('Error loading:', url);
        // Continue with fallback textures
    };
    
    return loadingManager;
}

/**
 * Load a texture with proper error handling
 * @param {THREE.TextureLoader} textureLoader - Texture loader instance
 * @param {string} path - Path to texture
 * @returns {Promise<THREE.Texture>} Promise resolving to loaded texture
 */
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

/**
 * Hide loading screen
 * @param {HTMLElement} loadingScreen - Loading screen element
 */
export function hideLoadingScreen(loadingScreen) {
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

/**
 * Show loading screen
 * @param {HTMLElement} loadingScreen - Loading screen element
 */
export function showLoadingScreen(loadingScreen) {
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
    }
}

/**
 * Show error message when loading fails
 * @param {string} message - Error message
 * @param {HTMLElement} container - Container to add message to
 * @returns {HTMLElement} Created error element
 */
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
    
    // Hide loading screen if it exists
    const loadingScreen = document.getElementById('loading-screen');
    hideLoadingScreen(loadingScreen);
    
    return errorDiv;
}

/**
 * Initialize loading screen elements
 * @returns {Object} Object containing loading screen elements
 */
export function initLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingProgress = document.getElementById('loading-progress');
    
    return { loadingScreen, loadingProgress };
}