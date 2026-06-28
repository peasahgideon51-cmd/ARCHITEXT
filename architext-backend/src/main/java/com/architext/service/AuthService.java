package com.architext.service;

import com.architext.dto.AuthResponse;
import com.architext.dto.LoginRequest;
import com.architext.dto.SignupRequest;
import com.architext.model.User;
import com.architext.repository.UserRepository;
import com.architext.security.JwtUtils;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    public AuthResponse signup(SignupRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .plan("Free Plan")
                .build();

        user = userRepository.save(user);
        String token = jwtUtils.generateToken(user.getEmail());

        return new AuthResponse(
                true,
                "Account created successfully.",
                new AuthResponse.UserDto(user.getId(), user.getName(), user.getEmail(), user.getPlan()),
                token
        );
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password.");
        }

        String token = jwtUtils.generateToken(user.getEmail());

        return new AuthResponse(
                true,
                "Logged in successfully.",
                new AuthResponse.UserDto(user.getId(), user.getName(), user.getEmail(), user.getPlan()),
                token
        );
    }

    public void logout(String email) {
        // JWT is stateless — client discards token
    }
}
