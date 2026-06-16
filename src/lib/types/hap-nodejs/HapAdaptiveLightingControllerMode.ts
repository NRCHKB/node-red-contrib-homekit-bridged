enum HapAdaptiveLightingControllerMode {
    /**
     * In automatic mode pretty much everything from setup to transition scheduling is done by the controller.
     */
    AUTOMATIC = 1,
    /**
     * In manual mode setup is done by the controller but the actual transition must be done by the user.
     * This is useful for lights which natively support transitions.
     */
    MANUAL = 2,
}

export default HapAdaptiveLightingControllerMode
