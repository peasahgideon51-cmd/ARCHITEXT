package com.architext.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse {
    private final boolean ok;
    private final String message;
    private final String error;

    private ApiResponse(boolean ok, String message, String error) {
        this.ok = ok; this.message = message; this.error = error;
    }

    public static ApiResponse ok(String message) {
        return new ApiResponse(true, message, null);
    }

    public static ApiResponse error(String error) {
        return new ApiResponse(false, null, error);
    }
}
