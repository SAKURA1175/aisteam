package com.tutormarket.api.knowledge;

import com.tutormarket.api.common.RequestIdFilter;
import com.tutormarket.api.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class UserKnowledgeFileController {

    private final KnowledgeFileService knowledgeFileService;

    public UserKnowledgeFileController(KnowledgeFileService knowledgeFileService) {
        this.knowledgeFileService = knowledgeFileService;
    }

    @PostMapping("/teachers/{teacherId}/knowledge-files")
    @ResponseStatus(HttpStatus.CREATED)
    public KnowledgeDtos.KnowledgeFileResponse upload(@PathVariable UUID teacherId,
                                                      @RequestPart("file") MultipartFile file,
                                                      @AuthenticationPrincipal UserPrincipal actor,
                                                      HttpServletRequest request) {
        return knowledgeFileService.uploadUserPrivate(
                teacherId,
                file,
                actor,
                (String) request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
        );
    }

    @GetMapping("/teachers/{teacherId}/knowledge-files")
    public List<KnowledgeDtos.KnowledgeFileResponse> list(@PathVariable UUID teacherId,
                                                          @AuthenticationPrincipal UserPrincipal actor) {
        return knowledgeFileService.listUserPrivate(teacherId, actor);
    }

    @GetMapping("/knowledge-files/{fileId}")
    public KnowledgeDtos.KnowledgeFileResponse get(@PathVariable UUID fileId,
                                                   @AuthenticationPrincipal UserPrincipal actor) {
        return knowledgeFileService.getUserPrivateById(fileId, actor);
    }

    @DeleteMapping("/knowledge-files/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID fileId,
                       @AuthenticationPrincipal UserPrincipal actor,
                       HttpServletRequest request) {
        knowledgeFileService.deleteUserPrivate(fileId, actor, (String) request.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE));
    }
}
