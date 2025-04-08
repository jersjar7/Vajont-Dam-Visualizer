/**
 * UIView - Manages the user interface elements
 * Handles UI interactions, controls, and status displays
 */
export default class UIView {
    /**
     * Initialize the UI view
     */
    constructor() {
        this.waterLevelSlider = null;
        this.stabilityIndicator = null;
        this.timeline = null;
        this.timelineProgress = null;
        this.infoBox = null;
        
        this._setupUIElements();
        this._setupEventListeners();
    }
    
    /**
     * Setup UI elements
     * @private
     */
    _setupUIElements() {
        // Get UI elements
        this.waterLevelSlider = document.getElementById('waterLevel');
        this.stabilityIndicator = document.getElementById('stability-indicator');
        this.timeline = document.getElementById('timeline');
        this.timelineProgress = document.getElementById('timeline-progress');
        this.infoBox = document.getElementById('info-box');
        
        // Hide timeline initially
        if (this.timeline) {
            this.timeline.style.display = 'none';
        }
    }
    
    /**
     * Setup event listeners for UI elements
     * @private
     */
    _setupEventListeners() {
        // Water level slider
        if (this.waterLevelSlider) {
            this.waterLevelSlider.addEventListener('input', (event) => {
                this._onWaterLevelChange(event);
            });
        }
        
        // Info toggle button
        const infoToggle = document.getElementById('toggle-info');
        if (infoToggle) {
            infoToggle.addEventListener('click', () => this.toggleInfoBox());
        }
    }
    
    /**
     * Register event handlers for water level changes
     * @param {Function} waterLevelCallback - Callback for water level changes
     * @param {Function} stabilityCallback - Callback for stability indicator updates
     */
    registerWaterLevelHandlers(waterLevelCallback, stabilityCallback) {
        this.waterLevelCallback = waterLevelCallback;
        this.stabilityCallback = stabilityCallback;
    }
    
    /**
     * Handle water level slider change
     * @param {Event} event - Input event
     * @private
     */
    _onWaterLevelChange(event) {
        // Get slider value
        const value = parseInt(event.target.value);
        
        // Call external callbacks if registered
        if (this.waterLevelCallback) {
            this.waterLevelCallback(value);
        }
        
        if (this.stabilityCallback) {
            this.stabilityCallback(value);
        }
    }
    
    /**
     * Update stability indicator based on water level
     * @param {number} value - Water level value (0-100)
     * @returns {Object} Stability status info
     */
    updateStabilityIndicator(value) {
        if (!this.stabilityIndicator) return null;
        
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
        
        this.stabilityIndicator.textContent = "Stability: " + stabilityText;
        this.stabilityIndicator.style.backgroundColor = stabilityColor;
        this.stabilityIndicator.style.color = value > 35 ? "#fff" : "#333";
        
        return {
            text: stabilityText,
            color: stabilityColor
        };
    }
    
    /**
     * Toggle info box visibility
     * @returns {boolean} New visibility state
     */
    toggleInfoBox() {
        if (!this.infoBox) return false;
        
        this.infoBox.classList.toggle('collapsed');
        
        const toggleButton = document.getElementById('toggle-info');
        if (toggleButton) {
            toggleButton.textContent = this.infoBox.classList.contains('collapsed') ? '?' : 'i';
        }
        
        return !this.infoBox.classList.contains('collapsed');
    }
    
    /**
     * Show disaster summary overlay
     * @param {string} summaryHTML - HTML content for the summary
     * @param {Function} closeCallback - Callback when summary is closed
     * @returns {HTMLElement} Created summary element
     */
    showDisasterSummary(summaryHTML, closeCallback) {
        // Create summary overlay
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'disaster-summary';
        summaryDiv.innerHTML = summaryHTML;
        
        // Add close button if not included in HTML
        if (!summaryDiv.querySelector('button')) {
            const closeButton = document.createElement('button');
            closeButton.id = 'close-summary';
            closeButton.textContent = 'Close';
            summaryDiv.appendChild(closeButton);
        }
        
        document.body.appendChild(summaryDiv);
        
        // Add close handler
        document.getElementById('close-summary').addEventListener('click', () => {
            document.body.removeChild(summaryDiv);
            if (closeCallback) closeCallback();
        });
        
        return summaryDiv;
    }
    
    /**
     * Show loading screen
     * @param {boolean} visible - Visibility state
     */
    setLoadingScreenVisible(visible) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = visible ? 'flex' : 'none';
        }
    }
    
    /**
     * Update loading progress
     * @param {number} progress - Progress percentage (0-100)
     */
    updateLoadingProgress(progress) {
        const loadingProgress = document.getElementById('loading-progress');
        if (loadingProgress) {
            loadingProgress.textContent = `${Math.floor(progress)}%`;
        }
    }
    
    /**
     * Show error message
     * @param {string} message - Error message
     * @returns {HTMLElement} Created error element
     */
    showErrorMessage(message) {
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
        
        // Hide loading screen
        this.setLoadingScreenVisible(false);
        
        return errorDiv;
    }
    
    /**
     * Disable UI controls
     */
    disableControls() {
        // Disable buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            if (button.id !== 'close-summary') {
                button.disabled = true;
                button.style.opacity = 0.5;
            }
        });
        
        // Disable water slider
        if (this.waterLevelSlider) {
            this.waterLevelSlider.disabled = true;
            this.waterLevelSlider.style.opacity = 0.5;
        }
    }
    
    /**
     * Enable UI controls
     */
    enableControls() {
        // Enable buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = false;
            button.style.opacity = 1;
        });
        
        // Enable water slider
        if (this.waterLevelSlider) {
            this.waterLevelSlider.disabled = false;
            this.waterLevelSlider.style.opacity = 1;
        }
    }
    
    /**
     * Show timeline
     * @param {boolean} visible - Visibility state
     */
    setTimelineVisible(visible) {
        if (this.timeline) {
            this.timeline.style.display = visible ? 'block' : 'none';
        }
    }
    
    /**
     * Update timeline progress
     * @param {number} progress - Progress percentage (0-100)
     */
    updateTimelineProgress(progress) {
        if (this.timelineProgress) {
            this.timelineProgress.style.width = `${progress}%`;
        }
    }
    
    /**
     * Get current water level
     * @returns {number} Current water level value
     */
    getCurrentWaterLevel() {
        return this.waterLevelSlider ? parseInt(this.waterLevelSlider.value) : 30;
    }
    
    /**
     * Set water level
     * @param {number} value - Water level value (0-100)
     */
    setWaterLevel(value) {
        if (this.waterLevelSlider) {
            this.waterLevelSlider.value = value;
            
            // Trigger callbacks
            if (this.waterLevelCallback) {
                this.waterLevelCallback(value);
            }
            
            if (this.stabilityCallback) {
                this.stabilityCallback(value);
            }
        }
    }
    
    /**
     * Set active view button
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
}