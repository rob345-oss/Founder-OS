import { useWorkspace } from '@/context/WorkspaceContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Body, Caption, Title } from '@/components/ui/AppText';
import { useState } from 'react';

export function WorkspaceSwitcher() {
  const { workspaces, active, setActiveId, createWorkspace } = useWorkspace();
  const t = useAppTheme();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.pill, { borderColor: t.border }]}>
        <Caption style={{ color: t.accent, fontWeight: '600' }}>
          {active?.name ?? 'Workspace'}
          {active?.is_example ? ' (example)' : ''}
        </Caption>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: t.card }]} onPress={(e) => e.stopPropagation()}>
            <Title style={{ fontSize: 20, marginBottom: 12 }}>Workspaces</Title>
            {workspaces.map((w) => (
              <Pressable
                key={w.id}
                onPress={() => {
                  setActiveId(w.id);
                  setOpen(false);
                }}
                style={[styles.row, w.id === active?.id && { backgroundColor: t.accentMuted }]}>
                <Body>
                  {w.name}
                  {w.is_example ? ' · sample' : ''}
                </Body>
              </Pressable>
            ))}
            <Caption style={{ marginTop: 16, marginBottom: 8 }}>New workspace</Caption>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Brand or project name"
              placeholderTextColor={t.textSecondary}
              style={[styles.input, { color: t.text, borderColor: t.border }]}
            />
            <Pressable
              onPress={() => {
                if (!name.trim()) return;
                createWorkspace(name.trim());
                setName('');
                setOpen(false);
              }}
              style={[styles.cta, { backgroundColor: t.accent }]}>
              <Caption style={{ color: '#fff', fontWeight: '700' }}>Create</Caption>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  cta: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});
