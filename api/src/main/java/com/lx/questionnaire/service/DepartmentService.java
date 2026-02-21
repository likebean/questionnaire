package com.lx.questionnaire.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.entity.Department;

import java.util.List;

public interface DepartmentService {

    Page<Department> queryDepartments(String keyword, Integer page, Integer pageSize);

    /** 全部院系（平铺，按层级与排序），供下拉选择等使用 */
    List<Department> listAll();

    Department getById(Long id);

    Department create(Department department);

    void update(Long id, Department department);

    void delete(Long id);
}
