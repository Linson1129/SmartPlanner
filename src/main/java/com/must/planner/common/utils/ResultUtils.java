package com.must.planner.common.utils;

import com.must.planner.common.BaseResponse;
import com.must.planner.common.ErrorCode;
import com.must.planner.exception.BussinessException;

/**
 *  ResultUtils
 *  helps dev to better express service result
 */
public class ResultUtils {
    public static <T> BaseResponse<T> success (T data){
        return  new BaseResponse<T>(data);
    }

    public static <T> BaseResponse<T> error (ErrorCode errorCode){
        return  new BaseResponse<T>(errorCode);
    }

    public static <T> BaseResponse<T> error (BussinessException e){
        return  new BaseResponse<T>(e);
    }
}

