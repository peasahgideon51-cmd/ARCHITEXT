package com.architext.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class FlaskProxyService {

    private static final Logger log = LoggerFactory.getLogger(FlaskProxyService.class);

    private final RestTemplate restTemplate;
    private final String flaskBaseUrl;

    public FlaskProxyService(@Value("${architext.flask.base-url}") String flaskBaseUrl) {
        this.flaskBaseUrl = flaskBaseUrl;
        this.restTemplate = new RestTemplate();
    }

    public ResponseEntity<String> post(String path, Map<String, Object> body) {
        String url = flaskBaseUrl + path;
        log.debug("Proxying POST {} → {}", path, url);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            return restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        } catch (HttpClientErrorException ex) {
            return ResponseEntity.status(ex.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(ex.getResponseBodyAsString());
        } catch (HttpServerErrorException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body("{\"ok\":false,\"error\":\"Layout engine returned a server error.\"}");
        } catch (ResourceAccessException ex) {
            log.error("Flask unreachable at {}: {}", url, ex.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("{\"ok\":false,\"error\":\"Layout engine is not reachable. Make sure app.py is running.\"}");
        }
    }

    public ResponseEntity<String> get(String path) {
        String url = flaskBaseUrl + path;
        log.debug("Proxying GET {} → {}", path, url);

        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            return restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        } catch (HttpClientErrorException ex) {
            return ResponseEntity.status(ex.getStatusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(ex.getResponseBodyAsString());
        } catch (HttpServerErrorException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body("{\"ok\":false,\"error\":\"Layout engine returned a server error.\"}");
        } catch (ResourceAccessException ex) {
            log.error("Flask unreachable at {}: {}", url, ex.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("{\"ok\":false,\"error\":\"Layout engine is not reachable. Make sure app.py is running.\"}");
        }
    }
}
