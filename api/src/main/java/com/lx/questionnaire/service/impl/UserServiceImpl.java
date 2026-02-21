package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.lx.questionnaire.entity.Role;
import com.lx.questionnaire.entity.User;
import com.lx.questionnaire.entity.UserRole;
import com.lx.questionnaire.mapper.RoleMapper;
import com.lx.questionnaire.mapper.UserMapper;
import com.lx.questionnaire.mapper.UserRoleMapper;
import com.lx.questionnaire.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final UserRoleMapper userRoleMapper;
    private final RoleMapper roleMapper;

    @Override
    public User getById(String id) {
        return userMapper.selectById(id);
    }

    @Override
    public List<String> getRoleCodesByUserId(String userId) {
        LambdaQueryWrapper<UserRole> q = new LambdaQueryWrapper<>();
        q.eq(UserRole::getUserId, userId);
        List<UserRole> list = userRoleMapper.selectList(q);
        if (list.isEmpty()) {
            return List.of();
        }
        List<Long> roleIds = list.stream().map(UserRole::getRoleId).toList();
        List<Role> roles = roleMapper.selectBatchIds(roleIds);
        return roles.stream().map(Role::getCode).toList();
    }

    @Override
    public User createUser(User user) {
        userMapper.insert(user);
        return user;
    }
}
