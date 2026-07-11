import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';

import { Button, Card, Field, Header, Screen, SelectField } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { validateContentFields } from '@/lib/contentSafety';
import { roleLabel } from '@/lib/format';
import { uploadTeacherVerification } from '@/services/api';
import {
  branchOptions,
  gradeOptions,
  loadCities,
  loadDistricts,
  loadSchools,
  manualSchoolOption,
  type Option,
  type SchoolOption,
  teacherBranchOptions,
} from '@/services/schoolOptions';

export default function ProfileScreen() {
  const { profile, signOut, updateProfile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [district, setDistrict] = useState(profile?.district ?? '');
  const [schoolId, setSchoolId] = useState(profile?.school_id ?? '');
  const [schoolName, setSchoolName] = useState(profile?.school_name ?? '');
  const [gradeLevel, setGradeLevel] = useState(profile?.grade_level ? String(profile.grade_level) : '');
  const [branch, setBranch] = useState(profile?.branch ?? '');
  const [cities, setCities] = useState<Option[]>([]);
  const [districts, setDistricts] = useState<Option[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [verificationFile, setVerificationFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [busy, setBusy] = useState(false);

  const isParent = profile?.role === 'parent';
  const isManualSchool = schoolId === manualSchoolOption.value || (!!schoolName && !schoolId);

  useEffect(() => {
    loadCities().then(setCities).catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!city) {
      setDistricts([]);
      return;
    }
    loadDistricts(city).then(setDistricts).catch(() => setDistricts([]));
  }, [city]);

  useEffect(() => {
    if (!city || !district || isParent) {
      setSchools([]);
      return;
    }
    loadSchools(city, district).then((items) => {
      setSchools(items);
      if (!schoolId && schoolName) {
        setSchoolId(manualSchoolOption.value);
      }
    }).catch(() => setSchools([manualSchoolOption]));
  }, [city, district, isParent, schoolId, schoolName]);

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

  async function save() {
    if (!profile) return;
    if (!isParent && (!city || !district || (!schoolName && !schoolId))) {
      Alert.alert('Eksik bilgi', 'Şehir, ilçe ve okul bilgilerini seçmelisin.');
      return;
    }
    if (profile.role === 'teacher' && !branch) {
      Alert.alert('Eksik bilgi', 'Öğretmen profili için branş seçmelisin.');
      return;
    }
    if (profile.role === 'teacher' && !profile.verification_file_path && !verificationFile) {
      Alert.alert('Eksik bilgi', 'Öğretmen profili için öğretmen kimliği veya çalışma belgesi yüklemelisin.');
      return;
    }
    const safety = validateContentFields([
      { label: 'ad', value: firstName },
      { label: 'soyad', value: lastName },
      { label: 'okul_adi', value: schoolName },
    ]);
    if (!safety.ok) {
      Alert.alert('Uygun olmayan ifade', safety.message);
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        full_name: [firstName, lastName].filter(Boolean).join(' ').trim(),
        city,
        district,
        school_id: schoolId && !isManualSchool ? schoolId : null,
        school_name: schoolName,
        school_missing: isManualSchool,
        grade_level: gradeLevel ? Number(gradeLevel) : null,
        branch,
        approval_status: profile.role === 'teacher' ? 'pending' : profile.approval_status,
      });
      if (profile.role === 'teacher' && verificationFile) {
        await uploadTeacherVerification({
          userId: profile.id,
          uri: verificationFile.uri,
          name: verificationFile.name,
          mimeType: verificationFile.mimeType,
        });
        await refreshProfile();
      }
      Alert.alert('Profil', 'Bilgilerin güncellendi.');
    } catch (caught) {
      Alert.alert('Profil güncellenemedi', caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await signOut();
    router.replace('/login');
  }

  if (!profile) return null;

  return (
    <Screen>
      <Header title="Profil" subtitle={`${roleLabel(profile.role)} hesabı · ${profile.email}`} />
      <Card>
        <Text style={{ color: colors.slate, fontWeight: '900' }}>Rol: {roleLabel(profile.role)}</Text>
        <Field label="Ad" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <Field label="Soyad" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        {profile.role !== 'parent' ? (
          <>
            <SelectField label="Şehir" value={city} onChange={setCity} options={cities} placeholder="Şehir seçiniz" />
            <SelectField label="İlçe" value={district} onChange={setDistrict} options={districts} placeholder={city ? 'İlçe seçiniz' : 'Önce şehir seçiniz'} disabled={!city} />
            <SelectField label="Okul" value={isManualSchool ? manualSchoolOption.value : schoolId} onChange={selectSchool} options={schools} placeholder={district ? 'Okul seçiniz' : 'Önce il ve ilçe seçiniz'} disabled={!district} />
            {isManualSchool ? <Field label="Okul adı" value={schoolName} onChangeText={setSchoolName} autoCapitalize="words" /> : null}
          </>
        ) : null}
        {profile.role === 'student' ? (
          <>
            <SelectField label="Sınıf" value={gradeLevel} onChange={setGradeLevel} options={gradeOptions} />
            <SelectField label="Şube" value={branch} onChange={setBranch} options={branchOptions} placeholder="Şube seçiniz" />
          </>
        ) : null}
        {profile.role === 'teacher' ? (
          <>
            <SelectField label="Branş / Sınıf" value={branch} onChange={setBranch} options={teacherBranchOptions} placeholder="Branş seçiniz" />
            <Text style={{ color: colors.slate, fontWeight: '800' }}>
              Belge durumu: {profile.verification_file_path ? 'Belge yüklendi, yönetici onayı bekleniyor.' : 'Belge bekleniyor.'}
            </Text>
            <Button title={verificationFile ? verificationFile.name : 'Öğretmen belgesi seç'} icon="document-attach-outline" variant="secondary" onPress={pickVerificationFile} />
          </>
        ) : null}
        <Button title="Kaydet" icon="save-outline" onPress={save} disabled={busy} />
      </Card>
      <Card>
        <Button title="Çıkış yap" icon="log-out-outline" variant="danger" onPress={logout} />
      </Card>
    </Screen>
  );
}
