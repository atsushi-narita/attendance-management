package com.attendance.util;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Simple in-memory cache manager for Lambda functions Optimized for short-lived Lambda executions
 */
public class CacheManager {

    private static final CacheManager INSTANCE = new CacheManager();
    private final ConcurrentHashMap<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    private CacheManager() {
        // Clean up expired entries every 5 minutes
        scheduler.scheduleAtFixedRate(this::cleanupExpiredEntries, 5, 5, TimeUnit.MINUTES);
    }

    public static CacheManager getInstance() {
        return INSTANCE;
    }

    /**
     * Get cached value or compute and cache it
     */
    public <T> T getOrCompute(String key, Supplier<T> supplier, long ttlMinutes) {
        CacheEntry entry = cache.get(key);

        if (entry != null && !entry.isExpired()) {
            @SuppressWarnings("unchecked")
            T value = (T) entry.getValue();
            return value;
        }

        // Compute new value
        T value = supplier.get();
        cache.put(key,
                new CacheEntry(value, System.currentTimeMillis() + (ttlMinutes * 60 * 1000)));

        return value;
    }

    /**
     * Put value in cache with TTL
     */
    public void put(String key, Object value, long ttlMinutes) {
        cache.put(key,
                new CacheEntry(value, System.currentTimeMillis() + (ttlMinutes * 60 * 1000)));
    }

    /**
     * Get cached value
     */
    public <T> T get(String key) {
        CacheEntry entry = cache.get(key);
        if (entry != null && !entry.isExpired()) {
            @SuppressWarnings("unchecked")
            T value = (T) entry.getValue();
            return value;
        }
        return null;
    }

    /**
     * Remove cached value
     */
    public void remove(String key) {
        cache.remove(key);
    }

    /**
     * Clear all cached values
     */
    public void clear() {
        cache.clear();
    }

    /**
     * Clean up expired entries
     */
    private void cleanupExpiredEntries() {
        cache.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }

    /**
     * Cache entry with expiration
     */
    private static class CacheEntry {
        private final Object value;
        private final long expirationTime;

        public CacheEntry(Object value, long expirationTime) {
            this.value = value;
            this.expirationTime = expirationTime;
        }

        public Object getValue() {
            return value;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() > expirationTime;
        }
    }

    /**
     * Shutdown cache manager
     */
    public void shutdown() {
        scheduler.shutdown();
        cache.clear();
    }
}
