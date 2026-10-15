package com.must.planner.service.impl;

import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.must.planner.domain.User;
import com.must.planner.service.UserService;
import com.must.planner.mapper.UserMapper;
import org.springframework.stereotype.Service;

/**
* @author macbook
* @description 针对表【user(用户表：数据归属主体)】的数据库操作Service实现
* @createDate 2026-10-14 22:46:24
*/
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User>
    implements UserService{

}




