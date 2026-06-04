import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Header, Screen, SelectField } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  branchOptions,
  gradeOptions,
  loadCities,
  loadDistricts,
  loadSchools,
  manualSchoolOption,
  roleOptions,
  type Option,
  type SchoolOption,
  teacherBranchOptions,
} from '@/services/schoolOptions';
import type { UserRole } from '@/types/domain';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [role, setRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [branch, setBranch] = useState('');
  const [cities, setCities] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [verificationFile, setVerificationFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [busy, setBusy] = useState(false);

  const isParent = role === 'parent';
  const isManualSchool = schoolId === manualSchoolOption.value;

  useEffect(() => {
    loadCities().then(setCities).catch(() => setCities([]));
  }, []);

  useEffect(() => {
    setDistrict('');
    setSchoolId('');
    setSchoolName('');
    setSchools([]);
    if (!city) {
      setDistricts([]);
      return;
    }
    loadDistricts(city).then(setDistricts).catch(() => setDistricts([]));
  }, [city]);

  useEffect(() => {
    setSchoolId('');
    setSchoolName('');
    if (!city || !district || isParent) {
      setSchools([]);
      return;
    }
    loadSchools(city, district).then(setSchools).catch(() => setSchools([manualSchoolOption]));
  }, [city, district, isParent]);

  function selectSchool(value: string) {
    setSchoolId(value);
    const selected = schools.find((item) => item.value === value);
    setSchoolName(selected && selected.value !== manualSchoolOption.value ? selected.name : '');
  }

  async function pickVerificationFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled) {
      setVerificationFile(result.assets[0]);
    }
  }

  async function submit() {
    if (!email || !password || !firstName) {
      Alert.alert('Eksik bilgi', 'E-posta, şifre ve ad alanları zorunlu.');
      return;
    }
    if (!isParent && (!city || !district || (!schoolName && !schoolId))) {
      Alert.alert('Eksik bilgi', 'Şehir, ilçe ve okul bilgilerini seçmelisin.');
      return;
    }
    if (role === 'student' && !gradeLevel) {
      Alert.alert('Eksik bilgi', 'Öğrenci kaydı için sınıf seçmelisin.');
      return;
    }
    if (role === 'teacher' && (!branch || !verificationFile)) {
      Alert.alert('Eksik bilgi', 'Öğretmen kaydı için branş ve öğretmen kimliği/çalışma belgesi zorunlu.');
      return;
    }
    setBusy(true);
    try {
      await signUp({
        email,
        password,
        role,
        firstName,
        lastName,
        city,
        district,
        schoolId: schoolId && !isManualSchool ? schoolId : null,
        schoolName,
        schoolMissing: isManualSchool,
        gradeLevel: gradeLevel ? Number(gradeLevel) : null,
        branch,
        verificationFile: verificationFile ? {
          uri: verificationFile.uri,
          name: verificationFile.name,
          mimeType: verificationFile.mimeType,
        } : null,
      });
      Alert.alert('Kayıt alındı', 'E-posta doğrulaması gerekirse gelen kutunu kontrol et.');
      router.replace('/(app)/home');
    } catch (caught) {
      Alert.alert('Kayıt yapılamadı', caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Header title="Kayıt Ol" subtitle="Rolünü seç, bilgilerini doldur ve mobil panele geç." />
      <Card>
        <View style={localStyles.roleRow}>
          {roleOptions.map((item) => (
            <Pressable key={item.value} onPress={() => setRole(item.value as UserRole)} style={[localStyles.roleButton, role === item.value && localStyles.roleButtonActive]}>
              <Text style={[localStyles.roleText, role === item.value && localStyles.roleTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Ad" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <Field label="Soyad" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <Field label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry />
        {role !== 'parent' ? (
          <>
            <SelectField label="Şehir" value={city} onChange={setCity} options={cities} placeholder="Şehir seçiniz" />
            <SelectField label="İlçe" value={district} onChange={setDistrict} options={districts} placeholder={city ? 'İlçe seçiniz' : 'Önce şehir seçiniz'} disabled={!city} />
            <SelectField label="Okul" value={schoolId} onChange={selectSchool} options={schools} placeholder={district ? 'Okul seçiniz' : 'Önce il ve ilçe seçiniz'} disabled={!district} />
            {isManualSchool ? <Field label="Okul adı" value={schoolName} onChangeText={setSchoolName} autoCapitalize="words" /> : null}
          </>
        ) : null}
        {role === 'student' ? (
          <>
            <SelectField label="Sınıf" value={gradeLevel} onChange={setGradeLevel} options={gradeOptions} />
            <SelectField label="Şube" value={branch} onChange={setBranch} options={branchOptions} placeholder="Şube seçiniz" />
          </>
        ) : null}
        {role === 'teacher' ? (
          <>
            <SelectField label="Branş / Sınıf" value={branch} onChange={setBranch} options={teacherBranchOptions} placeholder="Branş seçiniz" />
            <Button title={verificationFile ? verificationFile.name : 'Öğretmen belgesi seç'} icon="document-attach-outline" variant="secondary" onPress={pickVerificationFile} />
            <Text style={localStyles.helpText}>Öğretmen kimliği veya çalışma belgesi zorunludur. JPEG, PNG veya PDF kabul edilir.</Text>
          </>
        ) : null}
        <Button title="Kayıt Ol" icon="person-add-outline" onPress={submit} disabled={busy} />
        <Button title="Girişe dön" variant="ghost" onPress={() => router.back()} />
      </Card>
    </Screen>
  );
}

const localStyles = StyleSheet.create({
  roleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleButton: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    padding: spacing.sm,
  },
  roleButtonActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  roleText: {
    color: colors.slate,
    fontWeight: '900',
    textAlign: 'center',
  },
  roleTextActive: {
    color: colors.white,
  },
  helpText: {
    color: colors.slate,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
});
