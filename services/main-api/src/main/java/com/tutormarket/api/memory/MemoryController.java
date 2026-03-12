package com.tutormarket.api.memory;

import com.tutormarket.api.common.RequestIdFilter;
import com.tutormarket.api.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class MemoryController {

    private final MemoryService memoryService;

    public MemoryController(MemoryService memoryService) {
        this.memoryService = memoryService;
    }

    @GetMapping("/teachers/{teacherId}/memory-records")
    public List<MemoryDtos.MemoryRecordResponse> list(@PathVariable UUID teacherId,
                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return memoryService.listByTeacher(teacherId, principal);
    }

    @PatchMapping("/teachers/{teacherId}/memory-records/{memoryId}")
    public MemoryDtos.MemoryRecordResponse update(@PathVariable UUID teacherId,
                                                  @PathVariable UUID memoryId,
                                                  @AuthenticationPrincipal UserPrincipal principal,
                                                  @Valid @RequestBody MemoryDtos.UpdateMemoryRequest request,
                                                  HttpServletRequest httpServletRequest) {
        return memoryService.update(
                teacherId,
                memoryId,
                principal,
                request,
                (String) httpServletRequest.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
        );
    }

    @DeleteMapping("/teachers/{teacherId}/memory-records/{memoryId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID teacherId,
                       @PathVariable UUID memoryId,
                       @AuthenticationPrincipal UserPrincipal principal,
                       HttpServletRequest httpServletRequest) {
        memoryService.delete(
                teacherId,
                memoryId,
                principal,
                (String) httpServletRequest.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
        );
    }
}
