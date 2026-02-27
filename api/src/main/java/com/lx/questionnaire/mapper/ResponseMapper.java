package com.lx.questionnaire.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.lx.questionnaire.entity.Response;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface ResponseMapper extends BaseMapper<Response> {

    @Select("SELECT id, survey_id, user_id, status, submitted_at, duration_seconds, submitted_ip, device_id, created_at, updated_at FROM response WHERE survey_id = #{surveyId} AND status = 'SUBMITTED' ORDER BY submitted_at DESC LIMIT #{size} OFFSET #{offset}")
    List<Response> selectPageBySurveyId(@Param("surveyId") String surveyId, @Param("offset") long offset, @Param("size") long size);
}
