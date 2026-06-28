package com.architext.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    @Email(message = "Invalid email address.")
    @NotBlank(message = "Email is required.")
    private String email;

    @NotBlank(message = "Password is required.")
    private String password;

    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public void setEmail(String email) { this.email = email; }
    public void setPassword(String password) { this.password = password; }
}
