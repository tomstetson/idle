import * as React from 'react';
import { SessionListViewItem, useSessionListViewData, useSetting } from '@/sync/storage';

export function useVisibleSessionListViewData(): SessionListViewItem[] | null {
    const data = useSessionListViewData();
    const hideInactiveSessions = useSetting('hideInactiveSessions');

    return React.useMemo(() => {
        if (!data) {
            return data;
        }
        if (!hideInactiveSessions) {
            return data;
        }

        const filtered: SessionListViewItem[] = [];
        let pendingProjectGroup: SessionListViewItem | null = null;
        let pendingMachineGroup: SessionListViewItem | null = null;

        for (const item of data) {
            if (item.type === 'project-group') {
                pendingProjectGroup = item;
                continue;
            }

            if (item.type === 'machine-group') {
                pendingMachineGroup = item;
                continue;
            }

            if (item.type === 'session') {
                if (item.session.active) {
                    if (pendingMachineGroup) {
                        filtered.push(pendingMachineGroup);
                        pendingMachineGroup = null;
                    }
                    if (pendingProjectGroup) {
                        filtered.push(pendingProjectGroup);
                        pendingProjectGroup = null;
                    }
                    filtered.push(item);
                }
                continue;
            }

            pendingProjectGroup = null;

            if (item.type === 'active-sessions') {
                pendingMachineGroup = null;
                filtered.push(item);
            }
        }

        return filtered;
    }, [data, hideInactiveSessions]);
}
