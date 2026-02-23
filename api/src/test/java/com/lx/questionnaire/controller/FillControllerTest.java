package com.lx.questionnaire.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 填写接口：匿名可访问 /api/fill/**；不存在的问卷返回 400 + code 4001。
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FillControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void getFillMetadata_notFound_returns400WithSurveyNotFoundCode() throws Exception {
        mockMvc.perform(get("/api/fill/999999").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(4001))
                .andExpect(jsonPath("$.message").value("问卷已删除"));
    }

    @Test
    void submit_notFound_returns400WithSurveyNotFoundCode() throws Exception {
        mockMvc.perform(post("/api/fill/999999/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[],\"durationSeconds\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value(4001));
    }
}
