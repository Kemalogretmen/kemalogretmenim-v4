import { createElement } from 'react';
import { Text, View } from 'react-native';
import { usePlatform } from './PlatformContext';
import { DateTimeFieldProps } from './dateTime';

// The installed app uses DateTimeField.native.tsx and the operating system picker.
export function DateTimeField({ label, mode, value, onChange, minimumDate }: DateTimeFieldProps) {
  const { palette } = usePlatform();
  return <View style={{ gap: 8 }}><Text style={{ color: palette.muted, fontSize: 13 }}>{label}</Text>{createElement('input', {
    type: mode, value, 'aria-label': label, min: mode === 'date' && minimumDate ? `${minimumDate.getFullYear()}-${String(minimumDate.getMonth() + 1).padStart(2, '0')}-${String(minimumDate.getDate()).padStart(2, '0')}` : undefined,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    style: { minHeight: 54, padding: '0 16px', borderRadius: 14, border: `1px solid ${palette.line}`, background: palette.background, color: palette.text, fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box', width: '100%' },
  })}</View>;
}
