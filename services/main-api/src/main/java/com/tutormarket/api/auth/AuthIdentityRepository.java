package com.tutormarket.api.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuthIdentityRepository extends JpaRepository<AuthIdentityEntity, UUID> {

    Optional<AuthIdentityEntity> findByProviderAndProviderSubject(AuthIdentityProvider provider, String providerSubject);

    Optional<AuthIdentityEntity> findByProviderAndWechatOpenId(AuthIdentityProvider provider, String wechatOpenId);
}
