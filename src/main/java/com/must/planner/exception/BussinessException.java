package com.must.planner.exception;

import com.must.planner.common.ErrorCode;

public class BussinessException extends RuntimeException {

    private final int code;
    private final String description;

    public int getCode() {
        return code;
    }

    public String getDescription() {
        return description;
    }

    public BussinessException(int code, String description,String message) {
        super(message);
        this.code =code;
        this.description =description;

    }

    public BussinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.code = errorCode.getCode();
        this.description = errorCode.getDescription();
    }
}

