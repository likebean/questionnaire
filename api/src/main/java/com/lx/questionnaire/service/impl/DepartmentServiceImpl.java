package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.entity.Department;
import com.lx.questionnaire.entity.User;
import com.lx.questionnaire.mapper.DepartmentMapper;
import com.lx.questionnaire.mapper.UserMapper;
import com.lx.questionnaire.service.DepartmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentMapper departmentMapper;
    private final UserMapper userMapper;

    @Override
    public Page<Department> queryDepartments(String keyword, Integer page, Integer pageSize) {
        Page<Department> p = new Page<>(page != null ? page : 1, pageSize != null ? pageSize : 20);
        LambdaQueryWrapper<Department> q = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            q.and(w -> w.like(Department::getCode, keyword).or().like(Department::getName, keyword));
        }
        q.orderByAsc(Department::getLevel).orderByAsc(Department::getSort).orderByAsc(Department::getId);
        return departmentMapper.selectPage(p, q);
    }

    @Override
    public List<Department> listAll() {
        return departmentMapper.selectList(
                new LambdaQueryWrapper<Department>()
                        .orderByAsc(Department::getLevel)
                        .orderByAsc(Department::getSort)
                        .orderByAsc(Department::getId));
    }

    @Override
    public Department getById(Long id) {
        Department d = departmentMapper.selectById(id);
        if (d == null) {
            throw new BusinessException(new ErrorCode(2010, "院系不存在") {});
        }
        return d;
    }

    @Override
    public Department create(Department department) {
        if (StringUtils.hasText(department.getCode())) {
            long cnt = departmentMapper.selectCount(
                    new LambdaQueryWrapper<Department>().eq(Department::getCode, department.getCode().trim()));
            if (cnt > 0) {
                throw new BusinessException(new ErrorCode(2011, "院系编码已存在") {});
            }
        }
        if (department.getParentId() == null) {
            department.setLevel(1);
        } else {
            Department parent = departmentMapper.selectById(department.getParentId());
            department.setLevel(parent != null ? parent.getLevel() + 1 : 1);
        }
        departmentMapper.insert(department);
        return department;
    }

    @Override
    public void update(Long id, Department department) {
        Department existing = getById(id);
        if (StringUtils.hasText(department.getCode()) && !department.getCode().trim().equals(existing.getCode())) {
            long cnt = departmentMapper.selectCount(
                    new LambdaQueryWrapper<Department>().eq(Department::getCode, department.getCode().trim()));
            if (cnt > 0) {
                throw new BusinessException(new ErrorCode(2011, "院系编码已存在") {});
            }
            existing.setCode(department.getCode().trim());
        }
        if (StringUtils.hasText(department.getName())) {
            existing.setName(department.getName().trim());
        }
        if (department.getParentId() != null) {
            existing.setParentId(department.getParentId());
            Department parent = departmentMapper.selectById(department.getParentId());
            existing.setLevel(parent != null ? parent.getLevel() + 1 : 1);
        }
        if (department.getSort() != null) {
            existing.setSort(department.getSort());
        }
        departmentMapper.updateById(existing);
    }

    @Override
    public void delete(Long id) {
        Department d = getById(id);
        long children = departmentMapper.selectCount(
                new LambdaQueryWrapper<Department>().eq(Department::getParentId, id));
        if (children > 0) {
            throw new BusinessException(new ErrorCode(2012, "该院系下尚有子院系，无法删除") {});
        }
        long users = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getDepartmentId, id));
        if (users > 0) {
            throw new BusinessException(new ErrorCode(2013, "该院系下尚有用户，无法删除") {});
        }
        departmentMapper.deleteById(id);
    }
}
