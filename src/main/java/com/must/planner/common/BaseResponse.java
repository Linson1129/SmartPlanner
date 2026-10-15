package com.must.planner.common;

import com.must.planner.exception.BussinessException;

import java.io.Serializable;

/**
 * a basical response templated which will process in the latter phase
 * @param <T>
 */
public class BaseResponse<T> implements Serializable {
    private int code;
    private T data;
    private String message;
    private String  description;

    public BaseResponse(int code, T data, String message, String description) {
        this.code = code;
        this.data = data;
        this.message = message;
        this.description = description;
    }
    public BaseResponse()
    {
        this.code = -1;
        this.data = null;
        this.message = "";
        this.description = "";
    }
    public BaseResponse(T data){
        this.code = 200;
        this.data = data;
        this.message = "";
        this.description = "";
    }
    public BaseResponse(ErrorCode errorCode,T data){
        this.code = errorCode.getCode();
        this.data = data;
        this.message = errorCode.getMessage();
        this.description = errorCode.getDescription();
    }
    public BaseResponse(ErrorCode errorCode)
    {
        new BaseResponse(errorCode,null);
    }
    public BaseResponse(BussinessException e)
    {
        this.code = e.getCode();
        this.data = null;
        this.message = e.getMessage();
        this.description = e.getDescription();
    }
}
