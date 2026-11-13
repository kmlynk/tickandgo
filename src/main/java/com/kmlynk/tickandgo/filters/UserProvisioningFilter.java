package com.kmlynk.tickandgo.filters;

import com.kmlynk.tickandgo.domain.User;
import com.kmlynk.tickandgo.repositories.UserRepository;
import com.nimbusds.jwt.JWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.text.ParseException;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class UserProvisioningFilter extends OncePerRequestFilter {

    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null
                && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof JWT jwt) {
            try {
                UUID keycloakId = UUID.fromString(jwt.getJWTClaimsSet().getSubject());

                if (!userRepository.existsById(keycloakId)) {
                    User user = new User();
                    user.setId(keycloakId);
                    user.setName(jwt.getJWTClaimsSet().getStringClaim("preferred_username"));
                    user.setEmail(jwt.getJWTClaimsSet().getStringClaim("email"));
                }

            } catch (ParseException e) {
                throw new RuntimeException(e);
            }
        }

        filterChain.doFilter(request, response);
    }

}
