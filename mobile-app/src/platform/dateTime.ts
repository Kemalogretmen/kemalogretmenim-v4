export type DateTimeFieldProps = {
  label: string;
  mode: 'date' | 'time';
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  optional?: boolean;
};

export function pickerDate(value: string, mode: 'date' | 'time', now = new Date()) {
  if (mode === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00`);
    if (Number.isFinite(date.getTime())) return date;
  }
  const date = new Date(now);
  if (mode === 'time' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    const [hour, minute] = value.split(':').map(Number);
    date.setHours(hour, minute, 0, 0);
  }
  return date;
}

export function pickerValue(date: Date, mode: 'date' | 'time') {
  const pad = (value: number) => String(value).padStart(2, '0');
  return mode === 'date'
    ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    : `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function pickerLabel(value: string, mode: 'date' | 'time') {
  if (!value) return mode === 'date' ? 'Tarih seç' : 'Saat seç';
  return mode === 'date' ? pickerDate(value, mode).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : value;
}
