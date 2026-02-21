package com.lx.questionnaire.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.lx.questionnaire.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
