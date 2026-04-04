import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import Colors from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

const SignupScreen = ({ navigation }) => {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    name: '',
    gymName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigateTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
        navigateTimerRef.current = null;
      }
    };
  }, []);

  const updateField = (key, value) => {
    if (error) setError('');
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSignup = async () => {
    if (loading || success) return;

    const { name, gymName, mobile, email, password, confirmPassword } = form;
    if (!name || !gymName || !mobile || !email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Please fill all required fields',
        position: 'top',
      });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Passwords do not match',
        position: 'top',
      });
      return;
    }
    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Password must be at least 6 characters',
        position: 'top',
      });
      return;
    }

    setLoading(true);
    setError('');

    const result = await signup(name, gymName, mobile, email.trim().toLowerCase(), password);
    setLoading(false);

    if (!result.success) {
      const errMsg = result.error || 'Signup failed';
      setError(errMsg);
      Toast.show({
        type: 'error',
        text1: errMsg,
        position: 'top',
      });
      return;
    }

    setSuccess(true);
    Toast.show({
      type: 'success',
      text1: 'Account created successfully ✅',
      position: 'top',
    });

    if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    navigateTimerRef.current = setTimeout(() => {
      navigateTimerRef.current = null;
      navigation.navigate('Login');
    }, 1500);
  };

  const fields = [
    { key: 'name', icon: 'person-outline', placeholder: 'Owner Name', type: 'default' },
    { key: 'gymName', icon: 'fitness-outline', placeholder: 'Gym Name', type: 'default' },
    { key: 'mobile', icon: 'call-outline', placeholder: 'Mobile Number', type: 'phone-pad' },
    { key: 'email', icon: 'mail-outline', placeholder: 'Email Address', type: 'email-address' },
    { key: 'password', icon: 'lock-closed-outline', placeholder: 'Password', secure: true },
    { key: 'confirmPassword', icon: 'shield-checkmark-outline', placeholder: 'Confirm Password', secure: true },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            disabled={loading || success}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Set up your gym management account</Text>
        </View>

        <View style={styles.form}>
          {fields.map((field) => (
            <View key={field.key} style={styles.inputGroup}>
              <Ionicons name={field.icon} size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.placeholder}
                value={form[field.key]}
                onChangeText={(v) => updateField(field.key, v)}
                keyboardType={field.type || 'default'}
                secureTextEntry={field.secure}
                autoCapitalize={field.key === 'email' ? 'none' : 'words'}
                editable={!loading && !success}
              />
            </View>
          ))}

          {error ? (
            <Text style={styles.apiError} numberOfLines={3}>
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[styles.signupBtn, (loading || success) && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading || success}
            activeOpacity={0.85}
          >
            <Text style={styles.signupBtnText}>
              {success ? 'Redirecting...' : loading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading && !success}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  header: { marginBottom: 24 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: Colors.text },
  apiError: {
    color: '#ff4d4f',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  signupBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.65 },
  signupBtnText: { fontSize: 16, fontWeight: '700', color: Colors.background },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 14, color: Colors.textSecondary },
  loginLink: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
});

export default SignupScreen;
