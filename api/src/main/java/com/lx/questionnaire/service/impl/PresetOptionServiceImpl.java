package com.lx.questionnaire.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.lx.questionnaire.common.BusinessException;
import com.lx.questionnaire.common.ErrorCode;
import com.lx.questionnaire.common.PaginatedResponse;
import com.lx.questionnaire.dto.*;
import com.lx.questionnaire.entity.PresetOptionGroup;
import com.lx.questionnaire.entity.PresetOptionItem;
import com.lx.questionnaire.mapper.PresetOptionGroupMapper;
import com.lx.questionnaire.mapper.PresetOptionItemMapper;
import com.lx.questionnaire.service.PresetOptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PresetOptionServiceImpl implements PresetOptionService {

    private final PresetOptionGroupMapper groupMapper;
    private final PresetOptionItemMapper itemMapper;

    @Override
    public PaginatedResponse<PresetOptionGroupVO> query(String keyword, String category, int page, int pageSize) {
        LambdaQueryWrapper<PresetOptionGroup> q = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            q.and(w -> w.like(PresetOptionGroup::getName, keyword).or().like(PresetOptionGroup::getCategory, keyword));
        }
        if (category != null && !category.isBlank()) {
            q.eq(PresetOptionGroup::getCategory, category);
        }
        q.orderByAsc(PresetOptionGroup::getCategory)
                .orderByAsc(PresetOptionGroup::getSort)
                .orderByAsc(PresetOptionGroup::getId);
        Page<PresetOptionGroup> p = new Page<>(page, pageSize);
        Page<PresetOptionGroup> result = groupMapper.selectPage(p, q);
        List<PresetOptionGroupVO> items = result.getRecords().stream().map(this::toGroupVO).collect(Collectors.toList());
        return new PaginatedResponse<>(items, result.getTotal(), result.getCurrent(), result.getSize());
    }

    @Override
    public PresetOptionGroupDetailVO getDetail(Long id) {
        PresetOptionGroup g = groupMapper.selectById(id);
        if (g == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        List<PresetOptionItem> items = itemMapper.selectList(
                new LambdaQueryWrapper<PresetOptionItem>().eq(PresetOptionItem::getGroupId, id).orderByAsc(PresetOptionItem::getSortOrder).orderByAsc(PresetOptionItem::getId)
        );
        PresetOptionGroupDetailVO vo = toGroupDetailVO(g);
        vo.setItems(items.stream().map(this::toItemVO).collect(Collectors.toList()));
        return vo;
    }

    @Override
    @Transactional
    public Long create(PresetOptionGroupUpsertDTO dto) {
        PresetOptionGroup g = new PresetOptionGroup();
        g.setCategory(trimOrNull(dto.getCategory()));
        g.setName(trimOrNull(dto.getName()));
        g.setSort(dto.getSort() != null ? dto.getSort() : 0);
        g.setEnabled(dto.getEnabled() == null ? Boolean.TRUE : dto.getEnabled());
        validateGroup(g);
        groupMapper.insert(g);

        upsertItems(g.getId(), dto.getItems());
        return g.getId();
    }

    @Override
    @Transactional
    public void update(Long id, PresetOptionGroupUpsertDTO dto) {
        PresetOptionGroup g = groupMapper.selectById(id);
        if (g == null) throw new BusinessException(ErrorCode.NOT_FOUND);
        if (dto.getCategory() != null) g.setCategory(trimOrNull(dto.getCategory()));
        if (dto.getName() != null) g.setName(trimOrNull(dto.getName()));
        if (dto.getSort() != null) g.setSort(dto.getSort());
        if (dto.getEnabled() != null) g.setEnabled(dto.getEnabled());
        validateGroup(g);
        groupMapper.updateById(g);

        upsertItems(id, dto.getItems());
    }

    @Override
    @Transactional
    public void delete(Long id) {
        // item 表有外键级联，但这里仍显式删除以兼容部分环境
        itemMapper.delete(new LambdaQueryWrapper<PresetOptionItem>().eq(PresetOptionItem::getGroupId, id));
        groupMapper.deleteById(id);
    }

    @Override
    public List<PresetOptionCategoryVO> getEnabledTree() {
        List<PresetOptionGroup> groups = groupMapper.selectList(new LambdaQueryWrapper<PresetOptionGroup>()
                .eq(PresetOptionGroup::getEnabled, true)
                .orderByAsc(PresetOptionGroup::getCategory)
                .orderByAsc(PresetOptionGroup::getSort)
                .orderByAsc(PresetOptionGroup::getId));
        if (groups.isEmpty()) return List.of();

        List<Long> groupIds = groups.stream().map(PresetOptionGroup::getId).collect(Collectors.toList());
        List<PresetOptionItem> items = itemMapper.selectList(new LambdaQueryWrapper<PresetOptionItem>()
                .in(PresetOptionItem::getGroupId, groupIds)
                .orderByAsc(PresetOptionItem::getGroupId)
                .orderByAsc(PresetOptionItem::getSortOrder)
                .orderByAsc(PresetOptionItem::getId));
        Map<Long, List<PresetOptionItem>> itemMap = items.stream().collect(Collectors.groupingBy(PresetOptionItem::getGroupId, LinkedHashMap::new, Collectors.toList()));

        LinkedHashMap<String, List<PresetOptionGroupDetailVO>> byCat = new LinkedHashMap<>();
        for (PresetOptionGroup g : groups) {
            PresetOptionGroupDetailVO vo = toGroupDetailVO(g);
            List<PresetOptionItem> its = itemMap.getOrDefault(g.getId(), List.of());
            vo.setItems(its.stream().map(this::toItemVO).collect(Collectors.toList()));
            byCat.computeIfAbsent(g.getCategory(), _k -> new ArrayList<>()).add(vo);
        }

        List<PresetOptionCategoryVO> res = new ArrayList<>();
        for (Map.Entry<String, List<PresetOptionGroupDetailVO>> e : byCat.entrySet()) {
            PresetOptionCategoryVO c = new PresetOptionCategoryVO();
            c.setCategory(e.getKey());
            c.setGroups(e.getValue());
            res.add(c);
        }
        return res;
    }

    private void upsertItems(Long groupId, List<PresetOptionItemVO> itemVos) {
        itemMapper.delete(new LambdaQueryWrapper<PresetOptionItem>().eq(PresetOptionItem::getGroupId, groupId));
        if (itemVos == null) return;
        int idx = 0;
        for (PresetOptionItemVO vo : itemVos) {
            if (vo == null) continue;
            String label = trimOrNull(vo.getLabel());
            if (label == null || label.isBlank()) continue;
            PresetOptionItem it = new PresetOptionItem();
            it.setGroupId(groupId);
            it.setSortOrder(vo.getSortOrder() != null ? vo.getSortOrder() : idx);
            it.setLabel(label);
            it.setAllowFill(Boolean.TRUE.equals(vo.getAllowFill()));
            it.setDescription(trimOrNull(vo.getDescription()));
            it.setDescriptionOpenInPopup(Boolean.TRUE.equals(vo.getDescriptionOpenInPopup()));
            it.setImageUrl(trimOrNull(vo.getImageUrl()));
            itemMapper.insert(it);
            idx++;
        }
    }

    private void validateGroup(PresetOptionGroup g) {
        if (g.getCategory() == null || g.getCategory().isBlank()) {
            throw new BusinessException(ErrorCode.fail(ErrorCode.PARAM_ERROR.getCode(), "分类不能为空"));
        }
        if (g.getName() == null || g.getName().isBlank()) {
            throw new BusinessException(ErrorCode.fail(ErrorCode.PARAM_ERROR.getCode(), "名称不能为空"));
        }
    }

    private String trimOrNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private PresetOptionGroupVO toGroupVO(PresetOptionGroup g) {
        PresetOptionGroupVO vo = new PresetOptionGroupVO();
        vo.setId(g.getId());
        vo.setCategory(g.getCategory());
        vo.setName(g.getName());
        vo.setSort(g.getSort());
        vo.setEnabled(g.getEnabled());
        return vo;
    }

    private PresetOptionGroupDetailVO toGroupDetailVO(PresetOptionGroup g) {
        PresetOptionGroupDetailVO vo = new PresetOptionGroupDetailVO();
        vo.setId(g.getId());
        vo.setCategory(g.getCategory());
        vo.setName(g.getName());
        vo.setSort(g.getSort());
        vo.setEnabled(g.getEnabled());
        vo.setItems(new ArrayList<>());
        return vo;
    }

    private PresetOptionItemVO toItemVO(PresetOptionItem it) {
        PresetOptionItemVO vo = new PresetOptionItemVO();
        vo.setId(it.getId());
        vo.setSortOrder(it.getSortOrder());
        vo.setLabel(it.getLabel());
        vo.setAllowFill(it.getAllowFill());
        vo.setDescription(it.getDescription());
        vo.setDescriptionOpenInPopup(it.getDescriptionOpenInPopup());
        vo.setImageUrl(it.getImageUrl());
        return vo;
    }
}

