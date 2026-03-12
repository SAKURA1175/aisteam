package com.tutormarket.api.teacher;

import com.tutormarket.api.config.AppProperties;
import com.tutormarket.api.preference.UserPreferenceEntity;
import com.tutormarket.api.preference.UserPreferenceRepository;
import com.tutormarket.api.user.UserEntity;
import com.tutormarket.api.user.UserRepository;
import com.tutormarket.api.user.UserRole;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

@Component
public class DemoDataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final TeacherRepository teacherRepository;
    private final TeacherRuleVersionRepository teacherRuleVersionRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties appProperties;

    public DemoDataSeeder(UserRepository userRepository,
                          UserPreferenceRepository userPreferenceRepository,
                          TeacherRepository teacherRepository,
                          TeacherRuleVersionRepository teacherRuleVersionRepository,
                          PasswordEncoder passwordEncoder,
                          AppProperties appProperties) {
        this.userRepository = userRepository;
        this.userPreferenceRepository = userPreferenceRepository;
        this.teacherRepository = teacherRepository;
        this.teacherRuleVersionRepository = teacherRuleVersionRepository;
        this.passwordEncoder = passwordEncoder;
        this.appProperties = appProperties;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedUsers();
        seedTeachers();
    }

    private void seedUsers() {
        if (!userRepository.existsByEmailIgnoreCase("admin@tutormarket.ai")) {
            userRepository.save(createUser("admin@tutormarket.ai", "蛋壳伴学运营", UserRole.ADMIN, "Admin123!"));
        }
        if (!userRepository.existsByEmailIgnoreCase("student@tutormarket.ai")) {
            var student = userRepository.save(createUser("student@tutormarket.ai", "演示家长", UserRole.STUDENT, "Student123!"));
            var preference = new UserPreferenceEntity();
            preference.setId(UUID.randomUUID());
            preference.setTenantId(student.getTenantId());
            preference.setUserId(student.getId());
            preference.setPreferredLanguage("zh-CN");
            preference.setResponseStyle("balanced");
            preference.setCorrectionMode("gentle");
            userPreferenceRepository.save(preference);
        }
    }

    private void seedTeachers() {
        if (!teacherRepository.findAllByTenantIdOrderByCreatedAtAsc(appProperties.platform().tenantId()).isEmpty()) {
            return;
        }

        var teachers = List.of(
                newSeedTeacher(
                        "luna-rabbit",
                        "小兔老师 Luna",
                        "中文启蒙陪伴师",
                        "擅长用儿歌、字卡和小游戏带孩子认识汉字，在轻松对话里延续每一次认字进度。",
                        List.of("汉字启蒙", "儿歌互动", "表达鼓励")
                ),
                newSeedTeacher(
                        "benny-bear",
                        "小熊老师 Benny",
                        "英语启蒙陪伴师",
                        "用自然拼读、节奏感练习和生活化场景陪孩子开口说英语，保持温暖鼓励的学习节奏。",
                        List.of("自然拼读", "英语开口", "节奏练习")
                ),
                newSeedTeacher(
                        "mimi-cat",
                        "小猫老师 Mimi",
                        "绘本阅读陪伴师",
                        "围绕绘本共读、复述表达和故事提问，帮助孩子建立阅读兴趣并记住喜欢的内容。",
                        List.of("绘本共读", "故事表达", "亲子陪伴")
                )
        );

        var admin = userRepository.findByEmailIgnoreCase("admin@tutormarket.ai").orElseThrow();
        teachers.forEach(teacher -> {
            teacherRepository.save(teacher);
            teacherRuleVersionRepository.save(createRuleVersion(teacher, admin.getId(), promptFor(teacher.getSlug())));
        });
    }

    private UserEntity createUser(String email, String displayName, UserRole role, String rawPassword) {
        var user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setTenantId(appProperties.platform().tenantId());
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setRole(role);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        return user;
    }

    private TeacherEntity newSeedTeacher(String slug, String name, String headline, String description, List<String> tags) {
        var teacher = new TeacherEntity();
        teacher.setId(UUID.randomUUID());
        teacher.setTenantId(appProperties.platform().tenantId());
        teacher.setSlug(slug);
        teacher.setName(name);
        teacher.setHeadline(headline);
        teacher.setDescription(description);
        teacher.setTags(new LinkedHashSet<>(tags));
        return teacher;
    }

    private TeacherRuleVersionEntity createRuleVersion(TeacherEntity teacher, UUID createdBy, String systemPrompt) {
        var version = new TeacherRuleVersionEntity();
        version.setId(UUID.randomUUID());
        version.setTenantId(teacher.getTenantId());
        version.setTeacher(teacher);
        version.setVersionNo(1);
        version.setTitle("Default v1");
        version.setSystemPrompt(systemPrompt);
        version.setActive(true);
        version.setCreatedBy(createdBy);
        return version;
    }

    private String promptFor(String slug) {
        return switch (slug) {
            case "luna-rabbit" -> """
                    You are 小兔老师 Luna from Eggshell Companion, a warm Chinese literacy guide for young children.
                    Always answer in the family's preferred language.
                    Use short sentences, vivid imagery, songs, and bite-sized mini games.
                    Encourage the child often, keep corrections gentle, and continue from prior learning progress when memory is available.
                    Avoid abstract exam-style explanations and focus on child-friendly examples that can be spoken aloud together.
                    """;
            case "benny-bear" -> """
                    You are 小熊老师 Benny from Eggshell Companion, an energetic English learning buddy for children.
                    Always answer in the family's preferred language, mixing in simple English phrases when helpful.
                    Keep replies playful, rhythmic, and confidence-building.
                    Use phonics cues, repeatable speaking drills, and cheerful praise.
                    Correct mistakes softly and turn every response into an interactive practice moment instead of a lecture.
                    """;
            default -> """
                    You are 小猫老师 Mimi from Eggshell Companion, a gentle picture-book reading companion for children.
                    Always answer in the family's preferred language.
                    Guide the child with vivid storytelling, prediction questions, and simple retelling prompts.
                    Connect to prior reading memories when possible, praise curiosity, and keep the tone calm, safe, and imaginative.
                    Do not sound like a formal tutor or give rigid textbook-style lessons.
                    """;
        };
    }
}
