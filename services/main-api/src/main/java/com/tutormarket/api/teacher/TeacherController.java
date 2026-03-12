package com.tutormarket.api.teacher;

import com.tutormarket.api.common.RequestIdFilter;
import com.tutormarket.api.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class TeacherController {

    private final TeacherService teacherService;

    public TeacherController(TeacherService teacherService) {
        this.teacherService = teacherService;
    }

    @GetMapping("/teachers")
    public List<TeacherDtos.TeacherSummaryResponse> listTeachers() {
        return teacherService.listTeachers();
    }

    @GetMapping("/teachers/{teacherId}")
    public TeacherDtos.TeacherDetailResponse getTeacher(@PathVariable UUID teacherId) {
        return teacherService.getTeacher(teacherId);
    }

    @GetMapping("/admin/teachers/{teacherId}/rule-versions")
    public List<TeacherDtos.RuleVersionResponse> listRuleVersions(@PathVariable UUID teacherId) {
        return teacherService.listRuleVersions(teacherId);
    }

    @PostMapping("/admin/teachers/{teacherId}/rule-versions")
    public TeacherDtos.RuleVersionResponse createRuleVersion(@PathVariable UUID teacherId,
                                                             @Valid @RequestBody TeacherDtos.CreateRuleVersionRequest request,
                                                             @AuthenticationPrincipal UserPrincipal actor,
                                                             HttpServletRequest httpServletRequest) {
        return teacherService.createRuleVersion(
                teacherId,
                request,
                actor,
                (String) httpServletRequest.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
        );
    }

    @PostMapping("/admin/teachers/{teacherId}/rule-versions/{versionId}/activate")
    public TeacherDtos.RuleVersionResponse activateRuleVersion(@PathVariable UUID teacherId,
                                                               @PathVariable UUID versionId,
                                                               @AuthenticationPrincipal UserPrincipal actor,
                                                               HttpServletRequest httpServletRequest) {
        return teacherService.activateRuleVersion(
                teacherId,
                versionId,
                actor,
                (String) httpServletRequest.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
        );
    }
}
