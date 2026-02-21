package com.lx.questionnaire.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.entity.User;

import java.util.List;

public interface UserService {

    User getById(String id);

    List<String> getRoleCodesByUserId(String userId);

    /** 分页查询用户（关键词匹配 id/nickname，可选院系） */
    Page<User> queryUsers(String keyword, Long departmentId, int page, int pageSize);

    User createUser(User user);

    void updateUser(String id, User user);

    void deleteUser(String id);
}
