package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.entity.Role;
import com.lx.questionnaire.entity.User;
import com.lx.questionnaire.entity.UserRole;
import com.lx.questionnaire.mapper.RoleMapper;
import com.lx.questionnaire.mapper.UserMapper;
import com.lx.questionnaire.mapper.UserRoleMapper;
import com.lx.questionnaire.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

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
    public Page<User> queryUsers(String keyword, Long departmentId, int page, int pageSize) {
        Page<User> p = new Page<>(page, pageSize);
        LambdaQueryWrapper<User> q = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            q.and(w -> w.like(User::getId, keyword).or().like(User::getNickname, keyword));
        }
        if (departmentId != null) {
            q.eq(User::getDepartmentId, departmentId);
        }
        q.orderByDesc(User::getCreatedAt);
        return userMapper.selectPage(p, q);
    }

    @Override
    public User createUser(User user) {
        userMapper.insert(user);
        return user;
    }

    @Override
    public void updateUser(String id, User user) {
        User existing = userMapper.selectById(id);
        if (existing == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        user.setId(id);
        userMapper.updateById(user);
    }

    @Override
    public void deleteUser(String id) {
        User existing = userMapper.selectById(id);
        if (existing == null) {
            throw new BusinessException(ErrorCode.USER_NOT_FOUND);
        }
        userMapper.deleteById(id);
    }
}
