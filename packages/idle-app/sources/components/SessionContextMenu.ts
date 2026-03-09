import { Modal } from '@/modal';
import { sync } from '@/sync/sync';
import { getCachedSessionOrderV2 } from '@/sync/sessionOrderPersistence';
import { t } from '@/text';

/**
 * Show a context menu for a session with options to manage grouping.
 * Triggered by long-press on session tiles in the session list.
 */
export function showSessionContextMenu(sessionId: string) {
    Modal.alert(
        t('session.actions'),
        undefined,
        [
            {
                text: t('sessionInfo.moveToTop'),
                onPress: () => sync.moveSessionToTop(sessionId)
            },
            {
                text: t('session.moveToGroup'),
                onPress: () => showGroupPicker(sessionId)
            },
            { text: t('common.cancel'), style: 'cancel' }
        ]
    );
}

function showGroupPicker(sessionId: string) {
    const order = getCachedSessionOrderV2();

    if (order.groups.length === 0) {
        // No groups yet — offer to create one and move the session into it
        promptNewGroupAndMove(sessionId);
        return;
    }

    const groupButtons = order.groups.map(g => ({
        text: g.name,
        onPress: () => sync.moveSessionToGroup(sessionId, g.id)
    }));

    Modal.alert(
        t('session.selectGroup'),
        undefined,
        [
            ...groupButtons,
            {
                text: t('session.removeFromGroup'),
                onPress: () => sync.moveSessionToGroup(sessionId, null)
            },
            {
                text: t('home.newGroup'),
                onPress: () => promptNewGroupAndMove(sessionId)
            },
            { text: t('common.cancel'), style: 'cancel' }
        ]
    );
}

async function promptNewGroupAndMove(sessionId: string) {
    const name = await Modal.prompt(
        t('home.newGroupTitle'),
        t('home.newGroupMessage')
    );
    if (name && name.trim()) {
        const groupId = await sync.createSessionGroup(name.trim());
        await sync.moveSessionToGroup(sessionId, groupId);
    }
}
