import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // Get current user
  User? get currentUser => _supabase.auth.currentUser;

  // Sign in with email and password
  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _supabase.auth.signInWithPassword(
      password: password,
      email: email,
    );
    return response;
  }

  // Sign up with email and password
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await _supabase.auth.signUp(
      password: password,
      email: email,
      data: {
        'name': name,
      },
    );
    return response;
  }

  // Sign out
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  // Get user session
  Session? get currentSession => _supabase.auth.currentSession;

  Future<Session?> getSession() async {
    return _supabase.auth.currentSession;
  }

  // Listen to auth state changes
  StreamSubscription<AuthState> onAuthStateChanged(void Function(AuthState) onAuthState) {
    return _supabase.auth.onAuthStateChange.listen(onAuthState);
  }
}