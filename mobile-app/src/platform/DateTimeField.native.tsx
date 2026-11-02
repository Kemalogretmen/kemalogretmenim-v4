import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { usePlatform } from './PlatformContext';
import { Action, Icon, IconButton } from './components';
import { DateTimeFieldProps, pickerDate, pickerLabel, pickerValue } from './dateTime';

export function DateTimeField({ label, mode, value, onChange, minimumDate, optional }: DateTimeFieldProps) {
  const { palette, dark } = usePlatform();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => pickerDate(value, mode));
  const picker = <DateTimePicker value={draft} mode={mode} minimumDate={minimumDate} themeVariant={dark ? 'dark' : 'light'} locale="tr_TR" is24Hour
    presentation={Platform.OS === 'android' ? 'dialog' : 'inline'} display={mode === 'time' ? 'default' : 'inline'} accentColor={palette.primary}
    positiveButton={{ label: 'Seç' }} negativeButton={{ label: 'Vazgeç' }} onDismiss={() => setOpen(false)}
    onValueChange={(_event, date) => { setDraft(date); if (Platform.OS === 'android') { onChange(pickerValue(date, mode)); setOpen(false); } }} />;
  return <View style={{ gap: 8 }}><Text style={{ color: palette.muted, fontSize: 13 }}>{label}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${pickerLabel(value, mode)}`} onPress={() => { setDraft(pickerDate(value, mode)); setOpen(true); }} style={({ pressed }) => ({ flex: 1, minHeight: 54, paddingHorizontal: 16, borderRadius: 14, backgroundColor: palette.background, borderWidth: 1, borderColor: palette.line, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}><Icon name={mode === 'date' ? 'calendar-outline' : 'time-outline'} /><Text style={{ color: palette.text, fontSize: 16, flex: 1 }}>{pickerLabel(value, mode)}</Text><Icon name="chevron-down" size={17} /></Pressable>
    {optional && !!value && <IconButton label={`${label} seçimini kaldır`} icon="close" onPress={() => onChange('')} />}</View>
    {open && Platform.OS === 'android' && picker}
    {Platform.OS === 'ios' && <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, backgroundColor: '#0007', justifyContent: 'flex-end' }}><SafeAreaView edges={['bottom']} style={{ backgroundColor: palette.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: palette.text, fontSize: 20, fontWeight: '600' }}>{label}</Text><IconButton label="Seçimi kapat" icon="close" onPress={() => setOpen(false)} /></View>{open && picker}<Action label="Seçimi kullan" onPress={() => { onChange(pickerValue(draft, mode)); setOpen(false); }} /></SafeAreaView></View></Modal>}
  </View>;
}
