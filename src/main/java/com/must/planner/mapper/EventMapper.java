package com.must.planner.mapper;

import com.must.planner.domain.Event;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;

/**
* @author macbook
* @description 针对表【event(日程与待办主表：start_time 为 NULL 即为待办)】的数据库操作Mapper
* @createDate 2026-10-14 22:46:23
* @Entity generator.domain.Event
*/
public interface EventMapper extends BaseMapper<Event> {
}




