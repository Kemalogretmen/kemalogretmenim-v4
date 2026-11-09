import { Children, PropsWithChildren, ReactNode, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { Icon } from './components';
import { usePlatform } from './PlatformContext';

const tones = {
  yellow: {
    light: { fill: '#FFF3B8', border: '#D9C66B', edge: '#C7A830', ink: '#342F18', muted: '#655A32' },
    dark: { fill: '#363222', border: '#71653C', edge: '#BDA451', ink: '#FFF2BB', muted: '#DED0A0' },
  },
  cyan: {
    light: { fill: '#DCF5F7', border: '#8CCAD2', edge: '#459EAC', ink: '#163C42', muted: '#3D6067' },
    dark: { fill: '#19383D', border: '#3D717A', edge: '#64B8C6', ink: '#D8F5FA', muted: '#AAD5DD' },
  },
  pink: {
    light: { fill: '#FCE3ED', border: '#E3B0C5', edge: '#C77B9B', ink: '#54283B', muted: '#7A4B61' },
    dark: { fill: '#402733', border: '#825167', edge: '#CB8BA8', ink: '#FFE3EE', muted: '#E5B6CA' },
  },
  green: {
    light: { fill: '#E4F3D8', border: '#ACCE94', edge: '#729F54', ink: '#293F22', muted: '#4D6642' },
    dark: { fill: '#283B27', border: '#57784C', edge: '#90B777', ink: '#E5F5D8', muted: '#BED7AE' },
  },
};

export function agendaNoteAppearance(kind: unknown, dark: boolean) {
  const tone = kind === 'exam' ? 'cyan' : kind === 'birthday' ? 'pink' : kind === 'holiday' || kind === 'schoolBreak' ? 'green' : 'yellow';
  const label = kind === 'exam' ? 'Sınav' : kind === 'birthday' ? 'Doğum günü' : kind === 'holiday' ? 'Tatil' : kind === 'schoolBreak' ? 'Okul takvimi' : kind === 'special' ? 'Önemli gün' : kind === 'meeting' ? 'Görüşme' : kind === 'reminder' ? 'Hatırlatıcı' : 'Ajanda notu';
  const icon = kind === 'exam' ? 'document-text-outline' : kind === 'birthday' ? 'gift-outline' : kind === 'holiday' ? 'flag-outline' : kind === 'schoolBreak' ? 'school-outline' : kind === 'special' ? 'sparkles-outline' : kind === 'meeting' ? 'chatbubbles-outline' : kind === 'reminder' ? 'notifications-outline' : 'document-outline';
  return { ...tones[tone][dark ? 'dark' : 'light'], label, icon };
}

export function AgendaNote({ kind, title, meta, note, done, actions, testID }: {
  kind?: unknown; title: string; meta?: string; note?: string; done?: boolean; actions?: ReactNode; testID?: string;
}) {
  const { dark } = usePlatform();
  const color = agendaNoteAppearance(kind, dark);
  return <View testID={testID} style={{ flexGrow: 1, minWidth: 0, gap: 9, padding: 14, borderRadius: 6, borderWidth: 1, borderTopWidth: 4, borderColor: color.border, borderTopColor: color.edge, backgroundColor: color.fill }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: actions ? 48 : 24 }}>
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Icon name={color.icon} color={color.ink} size={17} />
        <Text style={{ color: color.muted, flexShrink: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{color.label}</Text>
      </View>
      {actions && <View style={{ flexDirection: 'row', alignItems: 'center' }}>{actions}</View>}
    </View>
    <Text selectable style={{ color: color.ink, fontSize: 15, fontWeight: '600', lineHeight: 22, textDecorationLine: done ? 'line-through' : 'none' }}>{title}</Text>
    {!!meta && <Text style={{ color: color.muted, fontSize: 12, lineHeight: 19 }}>{meta}</Text>}
    {!!note && <Text selectable style={{ color: color.ink, fontSize: 14, lineHeight: 22 }}>{note}</Text>}
  </View>;
}

export function AgendaNoteGrid({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const [available, setAvailable] = useState(0);
  // Measure the content area: a tablet may still have a narrow navigation pane.
  const columns = width >= 600 && available >= 552 ? 2 : 1;
  return <View onLayout={event => setAvailable(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
    {Children.map(children, child => <View style={{ width: columns === 2 ? (available - 12) / 2 : '100%', minWidth: 0 }}>{child}</View>)}
  </View>;
}
