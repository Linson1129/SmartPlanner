package com.must.planner.common;


public enum ErrorCode {
    NETWORK_ISSUE(4000,"Bad Network","the network has mistakes or not connected"),
    PAST_ISUUE(5000,"that is the past","you can't do anything to the past record");



    private final int code;
    private final String message;
    private final String description;

    ErrorCode(int code, String message, String description) {
        this.code = code;
        this.message = message;
        this.description = description;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }

    public String getDescription() {
        return description;
    }
}
