package com.smartplanner.service;

import com.smartplanner.common.EngineUnavailableException;
import com.smartplanner.dto.AnalysisDto;
import com.smartplanner.dto.EngineDtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class EngineClient {

    private static final Logger log = LoggerFactory.getLogger(EngineClient.class);
    private final RestClient client;

    public EngineClient(
            RestClient.Builder builder,
            @Value("${smartplanner.engine.base-url:http://127.0.0.1:8000}") String baseUrl
    ) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2_000);
        factory.setReadTimeout(5_000);
        this.client = builder
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    public AnalysisDto analyze(EngineDtos.AnalyzeRequest request) {
        try {
            AnalysisDto result = client.post()
                    .uri("/analyze")
                    .body(request)
                    .retrieve()
                    .body(AnalysisDto.class);
            if (result == null) {
                throw new EngineUnavailableException("排期引擎没有返回结果", null);
            }
            return result;
        } catch (RestClientException ex) {
            log.warn("Scheduling engine unavailable: {}", ex.getMessage());
            throw new EngineUnavailableException("排期引擎暂不可用，日程已保存，可稍后刷新重试", ex);
        }
    }

    public EngineDtos.HolidayResponse holidays(int year, String region) {
        try {
            EngineDtos.HolidayResponse response = client.get()
                    .uri(uriBuilder -> uriBuilder.path("/holidays")
                            .queryParam("year", year)
                            .queryParam("region", region)
                            .build())
                    .retrieve()
                    .body(EngineDtos.HolidayResponse.class);
            if (response == null) {
                throw new EngineUnavailableException("节假日服务没有返回结果", null);
            }
            return response;
        } catch (RestClientException ex) {
            throw new EngineUnavailableException("节假日与排期引擎暂不可用", ex);
        }
    }

    public EngineDtos.WeatherResponse weather(java.time.LocalDate from, java.time.LocalDate to) {
        try {
            EngineDtos.WeatherResponse response = client.get()
                    .uri(uriBuilder -> uriBuilder.path("/weather")
                            .queryParam("from", from)
                            .queryParam("to", to)
                            .build())
                    .retrieve()
                    .body(EngineDtos.WeatherResponse.class);
            if (response == null) {
                throw new EngineUnavailableException("天气服务没有返回结果", null);
            }
            return response;
        } catch (RestClientException ex) {
            throw new EngineUnavailableException("天气服务暂不可用", ex);
        }
    }

    public EngineDtos.NlpDraft parseNlp(String text, java.time.LocalDateTime now) {
        try {
            EngineDtos.NlpDraft response = client.post()
                    .uri("/nlp/parse")
                    .body(new EngineDtos.NlpRequest(text, now))
                    .retrieve()
                    .body(EngineDtos.NlpDraft.class);
            if (response == null) {
                throw new EngineUnavailableException("NLP 服务没有返回结果", null);
            }
            return response;
        } catch (RestClientException ex) {
            throw new EngineUnavailableException("自然语言解析服务暂不可用", ex);
        }
    }

    public boolean isHealthy() {
        try {
            EngineDtos.HealthResponse response = client.get()
                    .uri("/health")
                    .retrieve()
                    .body(EngineDtos.HealthResponse.class);
            return response != null && "ok".equals(response.status());
        } catch (RestClientException ex) {
            return false;
        }
    }
}
