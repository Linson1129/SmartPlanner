package com.smartplanner;

import com.smartplanner.dto.AnalysisDto;
import com.smartplanner.dto.EngineDtos;
import com.smartplanner.service.EngineClient;
import com.smartplanner.service.PresenceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class EventApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PresenceService presenceService;

    @MockitoBean
    private EngineClient engineClient;

    @BeforeEach
    void setUp() {
        presenceService.clearSessions();
        when(engineClient.analyze(any())).thenReturn(new AnalysisDto(
                true,
                null,
                List.of(),
                List.of(),
                null,
                List.of(),
                LocalDateTime.of(2026, 11, 5, 9, 0)
        ));
        when(engineClient.holidays(anyInt(), anyString())).thenReturn(
                new EngineDtos.HolidayResponse(2026, "MO", List.of())
        );
        when(engineClient.isHealthy()).thenReturn(true);
        when(engineClient.weather(any(), any(), anyDouble(), anyDouble(), anyString(), anyString())).thenReturn(new EngineDtos.WeatherResponse(
                true,
                "澳门",
                22.1987,
                113.5439,
                "Asia/Macau",
                List.of(new EngineDtos.WeatherDay(
                        "2026-11-07", 63, "中雨", 23.1, 18.2, 80.0, 24.4, true, false, false
                )),
                null,
                "2026-11-06T09:00:00"
        ));
        when(engineClient.parseNlp(anyString(), any())).thenReturn(new EngineDtos.NlpDraft(
                "和队友开会",
                LocalDateTime.of(2026, 11, 7, 15, 0),
                LocalDateTime.of(2026, 11, 7, 16, 0),
                com.smartplanner.domain.EventType.NORMAL,
                com.smartplanner.domain.Priority.HIGH,
                null,
                "明天下午3点和队友开会",
                0.95,
                List.of("明天", "下午3点")
        ));
    }

    @Test
    void createListUpdateAndDeleteEvent() throws Exception {
        Map<String, Object> body = eventBody("测试日程", "NORMAL", "HIGH",
                "2026-11-20T09:00:00", "2026-11-20T10:00:00", null);
        MvcResult created = mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.event.title", is("测试日程")))
                .andExpect(jsonPath("$.event.id", notNullValue()))
                .andExpect(jsonPath("$.analysis.engineAvailable", is(true)))
                .andReturn();

        long id = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("event").path("id").asLong();

        mockMvc.perform(get("/api/events")
                        .param("from", "2026-11-01T00:00:00")
                        .param("to", "2026-12-01T00:00:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is((int) id)));

        body.put("title", "测试日程（改）");
        body.put("priority", "MEDIUM");
        mockMvc.perform(put("/api/events/{id}", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.event.title", is("测试日程（改）")))
                .andExpect(jsonPath("$.event.priority", is("MEDIUM")));

        mockMvc.perform(delete("/api/events/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detachedChildren", is(0)));

        mockMvc.perform(get("/api/events/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void goalCompletionConvertsItIntoAContainer() throws Exception {
        LocalDateTime start = LocalDateTime.now().minusDays(1).withSecond(0).withNano(0);
        Map<String, Object> body = eventBody("写完初稿", "GOAL", "HIGH",
                start.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME), null, null);
        MvcResult created = mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.event.type", is("GOAL")))
                .andExpect(jsonPath("$.event.endAt").doesNotExist())
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("event").path("id").asLong();

        mockMvc.perform(patch("/api/events/{id}/complete", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type", is("CONTAINER")))
                .andExpect(jsonPath("$.goalCompleted", is(true)))
                .andExpect(jsonPath("$.status", is("DONE")))
                .andExpect(jsonPath("$.endAt", notNullValue()));
    }

    @Test
    void onlyContainerEventsCanBeParents() throws Exception {
        Map<String, Object> normal = eventBody("普通事件", "NORMAL", "MEDIUM",
                "2026-11-21T09:00:00", "2026-11-21T10:00:00", null);
        MvcResult normalResult = mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(normal)))
                .andExpect(status().isCreated())
                .andReturn();
        long normalId = objectMapper.readTree(normalResult.getResponse().getContentAsString())
                .path("event").path("id").asLong();

        Map<String, Object> child = eventBody("子事件", "NORMAL", "LOW",
                "2026-11-21T09:10:00", "2026-11-21T09:20:00", null);
        child.put("parentId", normalId);
        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(child)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", is("只有容器事件可以容纳其它事件")));
    }

    @Test
    void parallelChildrenCanLiveInsideAContainer() throws Exception {
        Map<String, Object> container = eventBody("并行容器", "CONTAINER", "MEDIUM",
                "2026-11-22T20:00:00", "2026-11-22T21:00:00", null);
        MvcResult result = mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(container)))
                .andExpect(status().isCreated())
                .andReturn();
        long containerId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("event").path("id").asLong();

        for (String title : List.of("洗衣机", "小憩")) {
            Map<String, Object> child = eventBody(title, "NORMAL", "LOW",
                    "2026-11-22T20:05:00", "2026-11-22T20:50:00", null);
            child.put("parentId", containerId);
            mockMvc.perform(post("/api/events")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(child)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.event.parentId", is((int) containerId)));
        }

        mockMvc.perform(delete("/api/events/{id}", containerId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.detachedChildren", is(2)));
    }

    @Test
    void normalReminderIsSoftWhileUserIsActiveAndStrongWhenIdle() throws Exception {
        LocalDateTime start = LocalDateTime.now().minusMinutes(5).withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(30);
        Map<String, Object> body = eventBody("普通提醒", "NORMAL", "MEDIUM",
                start.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                end.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME), null);
        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/presence/heartbeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sessionId":"test-active","active":true,"visible":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active", is(true)))
                .andExpect(jsonPath("$.reminders[0].strength", is("SOFT")))
                .andExpect(jsonPath("$.reminders[0].kind", is("START")));

        mockMvc.perform(post("/api/presence/heartbeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sessionId":"test-active","active":false,"visible":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active", is(false)))
                .andExpect(jsonPath("$.reminders[0].strength", is("STRONG")));
    }

    @Test
    void importantReminderIsStrongEvenWhileActive() throws Exception {
        LocalDateTime start = LocalDateTime.now().minusMinutes(5).withSecond(0).withNano(0);
        LocalDateTime end = start.plusMinutes(30);
        Map<String, Object> body = eventBody("重要提醒", "IMPORTANT", "HIGH",
                start.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                end.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME), null);
        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/presence/heartbeat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"sessionId":"test-important","active":true,"visible":true}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reminders[0].strength", is("STRONG")))
                .andExpect(jsonPath("$.reminders[0].kind", is("START")));
    }

    @Test
    void profileAndHolidaysAndSystemStatusAreAvailable() throws Exception {
        mockMvc.perform(put("/api/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "displayName":"阿恒",
                                  "expectedFinishTime":"23:15",
                                  "holidayMode":"AVOID",
                                  "holidayRegion":"CN",
                                  "weatherProvince":"BEIJING",
                                  "idleThresholdSeconds":45
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName", is("阿恒")))
                .andExpect(jsonPath("$.expectedFinishTime", is("23:15")))
                .andExpect(jsonPath("$.holidayMode", is("AVOID")))
                .andExpect(jsonPath("$.holidayRegion", is("CN")))
                .andExpect(jsonPath("$.weatherProvince", is("BEIJING")));

        when(engineClient.holidays(2026, "CN")).thenReturn(new EngineDtos.HolidayResponse(
                2026,
                "CN",
                List.of(new EngineDtos.HolidayEntry("2026-10-01", "国庆节", "PUBLIC_HOLIDAY", "CN"))
        ));
        mockMvc.perform(get("/api/holidays").param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available", is(true)))
                .andExpect(jsonPath("$.holidays", hasSize(1)))
                .andExpect(jsonPath("$.holidays[0].name", is("国庆节")));

        mockMvc.perform(get("/api/system/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.engineAvailable", is(true)));
    }

    @Test
    void weatherAndNlpEndpointsAreExposed() throws Exception {
        mockMvc.perform(get("/api/weather")
                        .param("from", "2026-11-06")
                        .param("to", "2026-11-08")
                        .param("province", "BEIJING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available", is(true)))
                .andExpect(jsonPath("$.days[0].condition", is("中雨")))
                .andExpect(jsonPath("$.days[0].rainy", is(true)));

        mockMvc.perform(post("/api/nlp/parse")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"text":"明天下午3点和队友开会"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("和队友开会")))
                .andExpect(jsonPath("$.startAt", is("2026-11-07T15:00:00")))
                .andExpect(jsonPath("$.priority", is("HIGH")));
    }

    @Test
    void moveEndpointReschedulesAnEvent() throws Exception {
        Map<String, Object> body = eventBody("可拖动日程", "NORMAL", "MEDIUM",
                "2026-11-20T09:00:00", "2026-11-20T10:00:00", null);
        MvcResult created = mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn();
        long id = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("event").path("id").asLong();

        mockMvc.perform(patch("/api/events/{id}/move", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"startAt":"2026-11-20T10:15:00","endAt":"2026-11-20T11:15:00"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.event.startAt", is("2026-11-20T10:15:00")))
                .andExpect(jsonPath("$.analysis.engineAvailable", is(true)));
    }

    @Test
    void weatherSensitivityIsPersisted() throws Exception {
        Map<String, Object> body = eventBody("雨天跑步", "NORMAL", "LOW",
                "2026-11-21T07:00:00", "2026-11-21T08:00:00", null);
        body.put("weatherSensitive", true);
        body.put("lookaheadDays", 3);
        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.event.weatherSensitive", is(true)))
                .andExpect(jsonPath("$.event.lookaheadDays", is(3)));
    }

    @Test
    void validationErrorsReturnAFieldMap() throws Exception {
        Map<String, Object> body = eventBody("", "NORMAL", "HIGH",
                "2026-11-20T09:00:00", "2026-11-20T10:00:00", null);
        mockMvc.perform(post("/api/events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_FAILED")))
                .andExpect(jsonPath("$.fields.title", notNullValue()));
    }

    private Map<String, Object> eventBody(
            String title,
            String type,
            String priority,
            String start,
            String end,
            String due
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("title", title);
        body.put("type", type);
        body.put("priority", priority);
        body.put("startAt", start);
        body.put("endAt", end);
        body.put("dueAt", due);
        body.put("notes", "integration test");
        body.put("location", "test room");
        return body;
    }
}
