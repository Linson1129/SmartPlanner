package com.smartplanner.common;

public class EngineUnavailableException extends RuntimeException {
    public EngineUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
