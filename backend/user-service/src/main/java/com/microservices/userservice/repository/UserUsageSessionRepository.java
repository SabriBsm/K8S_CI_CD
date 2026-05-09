package com.microservices.userservice.repository;

/**
 * Ancien repository d'historique d'usage supprimé.
 * Le classement est désormais calculé uniquement à partir de `users.totalAppUsageSeconds`.
 */
@Deprecated
final class UserUsageSessionRepository {
    private UserUsageSessionRepository() {
    }
}

