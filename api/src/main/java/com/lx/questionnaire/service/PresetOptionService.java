package com.lx.questionnaire.service;

import com.lx.questionnaire.common.PaginatedResponse;
import com.lx.questionnaire.dto.PresetOptionCategoryVO;
import com.lx.questionnaire.dto.PresetOptionGroupDetailVO;
import com.lx.questionnaire.dto.PresetOptionGroupUpsertDTO;
import com.lx.questionnaire.dto.PresetOptionGroupVO;

import java.util.List;

public interface PresetOptionService {
    PaginatedResponse<PresetOptionGroupVO> query(String keyword, String category, int page, int pageSize);

    PresetOptionGroupDetailVO getDetail(Long id);

    Long create(PresetOptionGroupUpsertDTO dto);

    void update(Long id, PresetOptionGroupUpsertDTO dto);

    void delete(Long id);

    /** 给问卷编辑端使用：按分类返回启用的预定义选项组（含明细） */
    List<PresetOptionCategoryVO> getEnabledTree();
}

