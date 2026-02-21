package com.lx.questionnaire.common;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PaginatedResponse<T> {
    private List<T> items;
    private long total;
    private long page;
    private long pageSize;

    public static <T> PaginatedResponse<T> from(Page<T> page) {
        PaginatedResponse<T> response = new PaginatedResponse<>();
        response.setItems(page.getRecords());
        response.setTotal(page.getTotal());
        response.setPage(page.getCurrent());
        response.setPageSize(page.getSize());
        return response;
    }
}
