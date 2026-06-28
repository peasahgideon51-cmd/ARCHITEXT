package com.architext.controller;

import com.architext.service.FlaskProxyService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/parse")
public class ParseController {

    private final FlaskProxyService flaskProxy;

    public ParseController(FlaskProxyService flaskProxy) {
        this.flaskProxy = flaskProxy;
    }

    @PostMapping(value = "/input", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> parseInput(@RequestBody Map<String, Object> body) {
        if (body == null || !body.containsKey("text")) {
            return ResponseEntity.badRequest()
                    .body("{\"ok\":false,\"error\":\"Request body must be JSON with a non-empty 'text' field.\"}");
        }
        String text = String.valueOf(body.get("text")).trim();
        if (text.isEmpty()) return ResponseEntity.badRequest()
                .body("{\"ok\":false,\"error\":\"Request body must be JSON with a non-empty 'text' field.\"}");
        if (text.length() > 2000) return ResponseEntity.badRequest()
                .body("{\"ok\":false,\"error\":\"Input text must be 2000 characters or fewer.\"}");
        return flaskProxy.post("/api/parse/input", body);
    }
}