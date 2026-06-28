package com.architext.dto;

public class AuthResponse {
    private final boolean ok;
    private final String message;
    private final UserDto user;
    private final String token;

    public AuthResponse(boolean ok, String message, UserDto user, String token) {
        this.ok = ok; this.message = message; this.user = user; this.token = token;
    }

    public boolean isOk() { return ok; }
    public String getMessage() { return message; }
    public UserDto getUser() { return user; }
    public String getToken() { return token; }

    public static class UserDto {
        private final Long id;
        private final String name;
        private final String email;
        private final String plan;

        public UserDto(Long id, String name, String email, String plan) {
            this.id = id; this.name = name; this.email = email; this.plan = plan;
        }

        public Long getId() { return id; }
        public String getName() { return name; }
        public String getEmail() { return email; }
        public String getPlan() { return plan; }
    }
}