package com.lx.questionnaire.controller;

import com.lx.questionnaire.common.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 问卷列表占位：步骤 2 仅返回空数组，步骤 3 再实现问卷 CRUD。
 */
@RestController
@RequestMapping("/api/surveys")
public class SurveyController {

    @GetMapping
    public Result<List<?>> list() {
        return Result.ok(List.of());
    }
}
