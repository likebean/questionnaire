package com.lx.questionnaire.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.entity.User;

import java.util.List;

public interface UserService {

    User getById(String id);

    List<String> getRoleCodesByUserId(String userId);

    /** 获取用户拥有的角色 ID 列表 */
    List<Long> getRoleIdsByUserId(String userId);

    /** 设置用户角色（覆盖原有） */
    void setUserRoles(String userId, List<Long> roleIds);

    /** 分页查询用户（关键词匹配 id/nickname，可选院系） */
    Page<User> queryUsers(String keyword, Long departmentId, int page, int pageSize);

    User createUser(User user);

    void updateUser(String id, User user);

    void deleteUser(String id);
}
