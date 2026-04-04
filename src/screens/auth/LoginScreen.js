import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import Colors from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

const ERROR_COLOR = '#ff4d4f';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const clearErrorState = useCallback(() => {
    setError('');
    shakeAnim.stopAnimation();
    shakeAnim.setValue(0);
  }, [shakeAnim]);

  const triggerShake = useCallback(() => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const onEmailChange = (text) => {
    setEmail(text);
    clearErrorState();
  };

  const onPasswordChange = (text) => {
    setPassword(text);
    clearErrorState();
  };

  const isInvalidCredentialsFailure = (errMsg) => {
    if (!errMsg || typeof errMsg !== 'string') return true;
    const m = errMsg.toLowerCase();
    if (m.includes('network') || m.includes('timeout') || m.includes('no response')) return false;
    return true;
  };

  const handleLogin = async () => {
    if (loading) return;

    if (!email.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Please fill in all fields',
        position: 'top',
      });
      return;
    }

    console.log('Login started');
    setLoading(true);
    clearErrorState();

    try {
      const result = await login(email.trim().toLowerCase(), password);

      if (!result.success) {
        console.log('Login failed');
        const msg = result.error || '';
        const showInvalid = isInvalidCredentialsFailure(msg);

        if (showInvalid) {
          setError('Invalid credentials');
          Toast.show({
            type: 'error',
            text1: 'Invalid credentials',
            position: 'top',
          });
          triggerShake();
        } else {
          Toast.show({
            type: 'error',
            text1: msg || 'Something went wrong',
            position: 'top',
          });
        }
        setLoading(false);
        return;
      }

      console.log('Login success');
      Toast.show({
        type: 'success',
        text1: 'Welcome back 👋',
        position: 'top',
      });
      setLoading(false);
    } catch (err) {
      console.log('Login failed');
      Toast.show({
        type: 'error',
        text1: 'Something went wrong. Please try again.',
        position: 'top',
      });
      setLoading(false);
    }
  };

  const inputGroupError = !!error;
  const inputGroupDynamic = inputGroupError ? styles.inputGroupError : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <Ionicons name="barbell" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>GymPro</Text>
          <Text style={styles.tagline}>Manage your gym like a pro</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <View style={[styles.inputGroup, inputGroupDynamic]}>
              <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.placeholder}
                value={email}
                onChangeText={onEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={[styles.inputGroup, inputGroupDynamic, styles.inputGroupLast]}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.placeholder}
                value={password}
                onChangeText={onPasswordChange}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ResetPassword')}
            disabled={loading}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {error ? (
            <Text style={styles.inlineError}>{error}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.loginBtnText}>{loading ? 'Logging in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')} disabled={loading}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const inputErrorShadow = Platform.select({
  ios: {
    shadowColor: ERROR_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  android: {
    elevation: 6,
    shadowColor: ERROR_COLOR,
  },
  default: {
    shadowColor: ERROR_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  form: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    height: 52,
  },
  inputGroupLast: {
    marginBottom: 0,
  },
  inputGroupError: {
    borderColor: ERROR_COLOR,
    ...inputErrorShadow,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 14,
    marginBottom: 12,
  },
  forgotText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  inlineError: {
    color: ERROR_COLOR,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  loginBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginBtnDisabled: {
    opacity: 0.65,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signupText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;
