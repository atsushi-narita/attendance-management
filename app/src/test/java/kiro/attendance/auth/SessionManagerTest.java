package kiro.attendance.auth;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SessionManagerTest {

    private SessionManager sessionManager;
    private AuthenticatedUser testUser;

    @BeforeEach
    void setUp() {
        sessionManager = new SessionManager(30); // 30分のタイムアウト
        testUser = new AuthenticatedUser("user-123", "test@example.com", "EMP001", "EMPLOYEE",
                List.of("employees"));
    }

    @Test
    void testCreateAndGetSession() {
        // Given
        String sessionId = "session-123";
        String userId = "user-123";

        // When
        sessionManager.createSession(userId, sessionId, testUser);
        SessionManager.SessionInfo session = sessionManager.getSession(sessionId);

        // Then
        assertThat(session).isNotNull();
        assertThat(session.getSessionId()).isEqualTo(sessionId);
        assertThat(session.getUserId()).isEqualTo(userId);
        assertThat(session.getUser()).isEqualTo(testUser);
        assertThat(session.getCreatedAt()).isBeforeOrEqualTo(LocalDateTime.now());
        assertThat(session.getExpiresAt()).isAfter(LocalDateTime.now());
    }

    @Test
    void testGetNonExistentSession() {
        // When
        SessionManager.SessionInfo session = sessionManager.getSession("non-existent");

        // Then
        assertThat(session).isNull();
    }

    @Test
    void testRefreshSession() {
        // Given
        String sessionId = "session-123";
        String userId = "user-123";
        sessionManager.createSession(userId, sessionId, testUser);

        SessionManager.SessionInfo originalSession = sessionManager.getSession(sessionId);
        LocalDateTime originalExpiresAt = originalSession.getExpiresAt();
        LocalDateTime originalLastAccessed = originalSession.getLastAccessedAt();

        // When
        try {
            Thread.sleep(100); // 100ms待機（短縮）
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        sessionManager.refreshSession(sessionId);

        // Then
        SessionManager.SessionInfo refreshedSession = sessionManager.getSession(sessionId);
        assertThat(refreshedSession).isNotNull();
        assertThat(refreshedSession.getExpiresAt()).isAfterOrEqualTo(originalExpiresAt);
        assertThat(refreshedSession.getLastAccessedAt()).isAfterOrEqualTo(originalLastAccessed);
    }

    @Test
    void testRemoveSession() {
        // Given
        String sessionId = "session-123";
        String userId = "user-123";
        sessionManager.createSession(userId, sessionId, testUser);

        // When
        sessionManager.removeSession(sessionId);

        // Then
        SessionManager.SessionInfo session = sessionManager.getSession(sessionId);
        assertThat(session).isNull();
    }

    @Test
    void testRemoveAllUserSessions() {
        // Given
        String userId = "user-123";
        sessionManager.createSession(userId, "session-1", testUser);
        sessionManager.createSession(userId, "session-2", testUser);
        sessionManager.createSession("user-456", "session-3", testUser);

        // When
        sessionManager.removeAllUserSessions(userId);

        // Then
        assertThat(sessionManager.getSession("session-1")).isNull();
        assertThat(sessionManager.getSession("session-2")).isNull();
        assertThat(sessionManager.getSession("session-3")).isNotNull(); // 異なるユーザーのセッションは残る
    }

    @Test
    void testExpiredSessionCleanup() {
        // Given
        SessionManager shortTimeoutManager = new SessionManager(0); // 即座に期限切れ
        String sessionId = "session-123";
        String userId = "user-123";

        shortTimeoutManager.createSession(userId, sessionId, testUser);

        // When
        try {
            Thread.sleep(1000); // 1秒待機して期限切れにする
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        SessionManager.SessionInfo session = shortTimeoutManager.getSession(sessionId);

        // Then
        assertThat(session).isNull(); // 期限切れのため取得できない
    }

    @Test
    void testGetActiveSessionCount() {
        // Given
        sessionManager.createSession("user-1", "session-1", testUser);
        sessionManager.createSession("user-2", "session-2", testUser);
        sessionManager.createSession("user-3", "session-3", testUser);

        // When
        int count = sessionManager.getActiveSessionCount();

        // Then
        assertThat(count).isEqualTo(3);
    }

    @Test
    void testCleanupExpiredSessions() {
        // Given
        SessionManager shortTimeoutManager = new SessionManager(0); // 即座に期限切れ
        shortTimeoutManager.createSession("user-1", "session-1", testUser);
        shortTimeoutManager.createSession("user-2", "session-2", testUser);

        // When
        try {
            Thread.sleep(1000); // 1秒待機して期限切れにする
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        shortTimeoutManager.cleanupExpiredSessions();
        int count = shortTimeoutManager.getActiveSessionCount();

        // Then
        assertThat(count).isEqualTo(0);
    }

    @Test
    void testSessionInfoMethods() {
        // Given
        String sessionId = "session-123";
        String userId = "user-123";
        sessionManager.createSession(userId, sessionId, testUser);

        // When
        SessionManager.SessionInfo session = sessionManager.getSession(sessionId);

        // Then
        assertThat(session.isExpired()).isFalse();
        assertThat(session.getSessionDurationMinutes()).isGreaterThanOrEqualTo(0);

        // セッション情報の更新テスト
        LocalDateTime newAccessTime = LocalDateTime.now().plusMinutes(5);
        session.setLastAccessedAt(newAccessTime);
        assertThat(session.getLastAccessedAt()).isEqualTo(newAccessTime);

        LocalDateTime newExpiresAt = LocalDateTime.now().plusMinutes(60);
        session.setExpiresAt(newExpiresAt);
        assertThat(session.getExpiresAt()).isEqualTo(newExpiresAt);
    }
}
