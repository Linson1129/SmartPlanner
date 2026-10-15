package com.must.planner.service.impl;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.must.planner.domain.Event;
import com.must.planner.service.EventService;
import com.must.planner.mapper.EventMapper;
import org.springframework.stereotype.Service;

/**
* @author macbook
* @description 针对表【event(日程与待办主表：start_time 为 NULL 即为待办)】的数据库操作Service实现
* @createDate 2026-10-14 22:46:23
*/
@Service
public class EventServiceImpl extends ServiceImpl<EventMapper, Event>
    implements EventService{

}




