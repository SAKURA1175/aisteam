package com.tutormarket.api.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tutormarket.api.common.DomainException;
import com.tutormarket.api.config.AppProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@Component
public class WeChatClient {

    private final AppProperties appProperties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public WeChatClient(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
    }

    public WeChatIdentity exchangeCode(String code) {
        AppProperties.WeChatProperties properties = appProperties.wechat();
        String appId = properties != null ? properties.openAppId() : null;
        String appSecret = properties != null ? properties.openAppSecret() : null;

        if (appId == null || appId.isBlank() || appSecret == null || appSecret.isBlank()) {
            throw new DomainException(HttpStatus.SERVICE_UNAVAILABLE, "微信扫码登录配置缺失");
        }

        String url = String.format("https://api.weixin.qq.com/sns/oauth2/access_token?appid=%s&secret=%s&code=%s&grant_type=authorization_code",
                appId, appSecret, code);

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new DomainException(HttpStatus.BAD_GATEWAY, "Failed to connect to WeChat API");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> body = objectMapper.readValue(response.body(), Map.class);

            if (body.containsKey("errcode")) {
                Integer errcode = ((Number) body.get("errcode")).intValue();
                if (errcode != null && errcode != 0) {
                    String errmsg = (String) body.get("errmsg");
                    throw new DomainException(HttpStatus.UNAUTHORIZED, "微信登录失败: " + errmsg);
                }
            }

            String openId = (String) body.get("openid");
            if (openId == null || openId.isBlank()) {
                throw new DomainException(HttpStatus.BAD_GATEWAY, "微信返回的身份信息不完整");
            }
            return new WeChatIdentity(openId, (String) body.get("unionid"));

        } catch (Exception e) {
            if (e instanceof DomainException) {
                throw (DomainException) e;
            }
            throw new DomainException(HttpStatus.BAD_GATEWAY, "微信身份交换失败: " + e.getMessage());
        }
    }

    public record WeChatIdentity(String openId, String unionId) {
    }
}
