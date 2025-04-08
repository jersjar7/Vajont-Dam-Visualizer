/**
 * Centralized configuration for the Vajont Dam Disaster simulation
 * This file contains all parameters that control the simulation's behavior
 */

const CONFIG = {
    // Scene dimensions
    scene: {
        fogNear: 400,
        fogFar: 1000,
        backgroundColor: 0x87CEEB // Sky blue
    },
    
    // Terrain dimensions
    terrain: {
        width: 800,
        depth: 800,
        maxHeight: 120,
        segments: 128 // Resolution of the terrain mesh
    },
    
    // Water properties
    water: {
        initialHeight: 40,
        maxHeight: 90,
        minHeight: 5
    },
    
    // Dam properties
    dam: {
        height: 90,
        width: 150,
        thickness: 15,
        curvature: 0.3 // For arch shape
    },
    
    // Mountain properties (Mount Toc)
    mountain: {
        height: 100,
        width: 200,
        depth: 150,
        slideVolume: 270 // million cubic meters
    },
    
    // Geological properties
    geology: {
        clayLayerThickness: 3,
        clayLayerAngle: 25 // degrees
    },
    
    // Animation timing (milliseconds)
    animation: {
        cameraTransition: 1000,
        waterRiseTime: 5000,
        landslideTime: 3000,
        tsunamiTime: 4000
    },
    
    // Camera positions for different views
    cameraPositions: {
        aerial: {
            position: { x: 0, y: 400, z: 400 },
            target: { x: 0, y: 0, z: 0 }
        },
        dam: {
            position: { x: 0, y: 60, z: 200 },
            target: { x: 0, y: 40, z: 0 }
        },
        slope: {
            position: { x: -200, y: 80, z: -100 },
            target: { x: -120, y: 40, z: -180 }
        },
        geology: {
            position: { x: -150, y: 60, z: -50 },
            target: { x: -100, y: 30, z: -100 }
        }
    },
    
    // Stability thresholds for UI indicator
    stability: {
        critical: 80,  // Critical - Imminent Failure
        veryLow: 65,   // Very Low - Dangerously Unstable
        low: 50,       // Low - Significant Risk
        moderate: 35,  // Moderate - Caution
        good: 20       // Good - Minor Stress
        // Below good: Excellent - Stable
    }
};

export default CONFIG;