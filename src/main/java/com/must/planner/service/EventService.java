package com.must.planner.service;

import com.must.planner.domain.Event;
import com.baomidou.mybatisplus.spring.service.IService;

/**
* @author macbook
* @description 针对表【event(日程与待办主表：start_time 为 NULL 即为待办)】的数据库操作Service
* @createDate 2026-10-14 22:46:23
*/
public interface EventService extends IService<Event> {

}
