import { useQuery } from '@tanstack/react-query';
import api from '../../shared/api/axios';

/**
 * Resolve the caller's active clinic membership: which role they hold,
 * which permissions that role carries. The same shape is returned by
 * /api/clinic/team/me — see backend's ClinicRequest.clinicContext.
 *
 * Pages use this to hide buttons a DIRECTOR can't action (the role is
 * read-only + daily-report-only in the 2-role world).
 */
export function useMyClinicMembership() {
    const { data, isLoading } = useQuery({
        queryKey: ['clinic', 'team', 'me'],
        queryFn: async () => (await api.get('/clinic/team/me')).data?.data,
        staleTime: 60_000,
    });

    const perms = data?.permissions || [];
    const roleName = data?.roleName || null;

    return {
        isLoading,
        roleName,
        permissions: perms,
        isDirector: roleName === 'DIRECTOR',
        can: (perm) => perms.includes(perm),
    };
}
