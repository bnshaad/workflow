export function readTrustedManagerProfile(uid, authUserDisabled, data) {
    if (authUserDisabled || !data || typeof data !== 'object') {
        return null;
    }
    const profile = data;
    if (profile.id !== uid ||
        profile.isActive !== true ||
        (profile.role !== 'admin' && profile.role !== 'manager') ||
        typeof profile.organizationId !== 'string' ||
        profile.organizationId.length === 0) {
        return null;
    }
    return {
        id: uid,
        organizationId: profile.organizationId,
    };
}
//# sourceMappingURL=trustedProfile.js.map