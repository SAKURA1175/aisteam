package com.tutormarket.api.auth;

import com.tutormarket.api.common.RequestIdFilter;
import com.tutormarket.api.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthDtos.AuthResponse register(@Valid @RequestBody AuthDtos.RegisterRequest request,
                                          HttpServletRequest httpServletRequest) {
        return authService.register(request, requestId(httpServletRequest));
    }

    @PostMapping("/auth/login")
    public AuthDtos.AuthResponse login(@Valid @RequestBody AuthDtos.LoginRequest request,
                                       HttpServletRequest httpServletRequest) {
        return authService.login(request, requestId(httpServletRequest));
    }

    @PostMapping("/auth/wechat-login")
    public AuthDtos.AuthResponse wechatLogin(@Valid @RequestBody AuthDtos.WeChatLoginRequest request,
                                             HttpServletRequest httpServletRequest) {
        return authService.handleWeChatLogin(request, requestId(httpServletRequest));
    }

    @GetMapping("/auth/wechat/qr-config")
    public AuthDtos.WeChatQrConfigResponse wechatQrConfig(@RequestParam(name = "next", required = false) String nextPath,
                                                          HttpServletRequest httpServletRequest) {
        return authService.wechatQrConfig(nextPath, requestId(httpServletRequest), clientKey(httpServletRequest));
    }

    @PostMapping("/auth/wechat/exchange")
    public AuthDtos.WeChatAuthResponse wechatExchange(@Valid @RequestBody AuthDtos.WeChatExchangeRequest request,
                                                      HttpServletRequest httpServletRequest) {
        return authService.exchangeWeChat(request, requestId(httpServletRequest), clientKey(httpServletRequest));
    }

    @PostMapping("/auth/desktop/codes")
    public AuthDtos.DesktopAuthCodeResponse createDesktopCode(@AuthenticationPrincipal UserPrincipal principal,
                                                              HttpServletRequest httpServletRequest) {
        return authService.createDesktopCode(principal, requestId(httpServletRequest));
    }

    @PostMapping("/auth/desktop/exchange")
    public AuthDtos.AuthResponse exchangeDesktopCode(@Valid @RequestBody AuthDtos.DesktopAuthExchangeRequest request,
                                                     HttpServletRequest httpServletRequest) {
        return authService.exchangeDesktopCode(request, requestId(httpServletRequest));
    }

    @GetMapping("/me")
    public AuthDtos.UserProfileResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return authService.currentUser(principal);
    }

    private String requestId(HttpServletRequest request) {
        return (String) request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE);
    }

    private String clientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
