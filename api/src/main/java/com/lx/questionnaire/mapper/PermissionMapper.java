package com.lx.questionnaire.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.lx.questionnaire.entity.Permission;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PermissionMapper extends BaseMapper<Permission> {

    @Select("SELECT p.* FROM permission p INNER JOIN role_permission rp ON p.id = rp.permission_id " +
            "INNER JOIN user_role ur ON rp.role_id = ur.role_id WHERE ur.user_id = #{userId}")
    List<Permission> selectByUserId(@Param("userId") String userId);
}
