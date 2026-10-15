package com.must.planner.exception;


import com.must.planner.common.BaseResponse;
import com.must.planner.common.utils.ResultUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BussinessException.class)
    public BaseResponse businessExceptionHandler(BussinessException e){
        log.error("business_error message:"+e.getMessage());
        return ResultUtils.error(e);
    }
    @ExceptionHandler(RuntimeException.class)
    public BaseResponse runtimeExceptionHandler(BussinessException e){
        log.error("runtime_error message:"+e.getMessage());
        return ResultUtils.error(e);
    }
}
