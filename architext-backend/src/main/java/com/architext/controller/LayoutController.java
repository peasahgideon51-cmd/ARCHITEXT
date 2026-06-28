package com.architext.controller;

import com.architext.service.FlaskProxyService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/layout")
public class LayoutController {

    private final FlaskProxyService flaskProxy;

    public LayoutController(FlaskProxyService flaskProxy) {
        this.flaskProxy = flaskProxy;
    }

    @PostMapping(value = "/generate", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> generate(@RequestBody Map<String, Object> body) {
        if (body == null || (!body.containsKey("text") && !body.containsKey("parsed"))) {
            return ResponseEntity.badRequest()
                    .body("{\"ok\":false,\"error\":\"Provide either 'text' or 'parsed' in the request body.\"}");
        }
        if (body.containsKey("text")) {
            String text = String.valueOf(body.get("text")).trim();
            if (text.isEmpty()) return ResponseEntity.badRequest()
                    .body("{\"ok\":false,\"error\":\"'text' field must not be empty.\"}");
            if (text.length() > 2000) return ResponseEntity.badRequest()
                    .body("{\"ok\":false,\"error\":\"Input text must be 2000 characters or fewer.\"}");
        }
        return flaskProxy.post("/api/layout/generate", body);
    }

    @GetMapping(value = "/templates", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> templates() {
        return flaskProxy.get("/api/layout/templates");
    }
}