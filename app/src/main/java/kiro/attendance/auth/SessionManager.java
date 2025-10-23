package kiro.attendance.auth;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * セッション管理クラス
 * JWT トークンの有効性とセッション状態を管理
 */
public class SessionManager {
    
    private final Map<String, SessionInfo> activeSessions;
    private final long sessionTimeoutMinutes;
    
    public SessionManager() {
        this(30); // デフォルト30分のセッションタイムアウト
    }
    
    public SessionManager(long sessionTimeoutMinutes) {
        this.activeSessions = new ConcurrentHashMap<>();
        this.sessionTimeoutMinutes = sessionTimeoutMinutes;
    }
    
    /**
     * セッションを作成
     */
    public void createSession(String userId, String sessionId, AuthenticatedUser user) {
        SessionInfo sessionInfo = new SessionInfo(
            sessionId,
            userId,
            user,
            LocalDateTime.now(),
            LocalDateTime.now().plusMinutes(sessionTimeoutMinutes)
        );
        
        activeSessions.put(sessionId, sessionInfo);
    }
    
    /**
     * セッションを取得
     */
    public SessionInfo getSession(String sessionId) {
        SessionInfo session = activeSessions.get(sessionId);
        
        if (session == null) {
            return null;
        }
        
        // セッションの有効期限をチェック
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            activeSessions.remove(sessionId);
            return null;
        }
        
        return session;
    }
    
    /**
     * セッションを更新（最終アクセス時間を更新）
     */
    public void refreshSession(String sessionId) {
        SessionInfo session = activeSessions.get(sessionId);
        if (session != null) {
            session.setLastAccessedAt(LocalDateTime.now());
            session.setExpiresAt(LocalDateTime.now().plusMinutes(sessionTimeoutMinutes));
        }
    }
    
    /**
     * セッションを削除
     */
    public void removeSession(String sessionId) {
        activeSessions.remove(sessionId);
    }
    
    /**
     * ユーザーの全セッションを削除
     */
    public void removeAllUserSessions(String userId) {
        activeSessions.entrySet().removeIf(entry -> 
            entry.getValue().getUserId().equals(userId));
    }
    
    /**
     * 期限切れセッションをクリーンアップ
     */
    public void cleanupExpiredSessions() {
        LocalDateTime now = LocalDateTime.now();
        activeSessions.entrySet().removeIf(entry -> 
            entry.getValue().getExpiresAt().isBefore(now));
    }
    
    /**
     * アクティブセッション数を取得
     */
    public int getActiveSessionCount() {
        cleanupExpiredSessions();
        return activeSessions.size();
    }
    
    /**
     * セッション情報クラス
     */
    public static class SessionInfo {
        private final String sessionId;
        private final String userId;
        private final AuthenticatedUser user;
        private final LocalDateTime createdAt;
        private LocalDateTime lastAccessedAt;
        private LocalDateTime expiresAt;
        
        public SessionInfo(String sessionId, String userId, AuthenticatedUser user, 
                          LocalDateTime createdAt, LocalDateTime expiresAt) {
            this.sessionId = sessionId;
            this.userId = userId;
            this.user = user;
            this.createdAt = createdAt;
            this.lastAccessedAt = createdAt;
            this.expiresAt = expiresAt;
        }
        
        public String getSessionId() {
            return sessionId;
        }
        
        public String getUserId() {
            return userId;
        }
        
        public AuthenticatedUser getUser() {
            return user;
        }
        
        public LocalDateTime getCreatedAt() {
            return createdAt;
        }
        
        public LocalDateTime getLastAccessedAt() {
            return lastAccessedAt;
        }
        
        public void setLastAccessedAt(LocalDateTime lastAccessedAt) {
            this.lastAccessedAt = lastAccessedAt;
        }
        
        public LocalDateTime getExpiresAt() {
            return expiresAt;
        }
        
        public void setExpiresAt(LocalDateTime expiresAt) {
            this.expiresAt = expiresAt;
        }
        
        public boolean isExpired() {
            return expiresAt.isBefore(LocalDateTime.now());
        }
        
        public long getSessionDurationMinutes() {
            return ChronoUnit.MINUTES.between(createdAt, LocalDateTime.now());
        }
    }
}