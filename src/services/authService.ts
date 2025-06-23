import { supabase } from '../config/supabase';
import type { User, LoginData, RegisterData, ResetPasswordData } from '../types';

class AuthService {  async login(loginData: LoginData): Promise<{ user: User | null; error: string | null }> {
    try {
      // Validate input
      if (!loginData.email || !loginData.password) {
        return { user: null, error: 'Email and password are required' };
      }

      console.log('Attempting login with email:', loginData.email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email.trim(),
        password: loginData.password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        return { user: null, error: error.message };
      }      if (data.user) {
        console.log('Login successful, user:', data.user.email);
        
        // Try to get user profile from profiles table (optional)
        let profile = null;
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) {
            console.warn('Profile not found or error fetching profile:', profileError.message);
          } else {
            profile = profileData;
          }
        } catch (profileError) {
          console.warn('Error fetching profile (table might not exist):', profileError);
        }

        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          full_name: profile?.full_name || data.user.user_metadata?.full_name || '',
          avatar_url: profile?.avatar_url || '',
          created_at: data.user.created_at!,
          updated_at: data.user.updated_at || data.user.created_at!,
        };

        return { user, error: null };
      }

      return { user: null, error: 'Login failed' };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  }
  async register(registerData: RegisterData): Promise<{ user: User | null; error: string | null }> {
    try {
      // Validate input
      if (!registerData.email || !registerData.password) {
        return { user: null, error: 'Email and password are required' };
      }

      if (registerData.password !== registerData.confirmPassword) {
        return { user: null, error: 'Passwords do not match' };
      }

      if (registerData.password.length < 6) {
        return { user: null, error: 'Password must be at least 6 characters long' };
      }

      console.log('Attempting registration with email:', registerData.email);

      const { data, error } = await supabase.auth.signUp({
        email: registerData.email.trim(),
        password: registerData.password,
        options: {
          data: {
            full_name: registerData.fullName,
          },
        },
      });      if (error) {
        console.error('Supabase registration error:', error);
        return { user: null, error: error.message };
      }

      if (data.user) {
        console.log('Registration successful, user:', data.user.email);
        
        // Try to create profile record (optional)
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: data.user.id,
                full_name: registerData.fullName,
                email: registerData.email,
              },
            ]);

          if (profileError) {
            console.warn('Error creating profile (table might not exist):', profileError.message);
          }
        } catch (profileError) {
          console.warn('Profile table might not exist:', profileError);
        }

        const user: User = {
          id: data.user.id,
          email: data.user.email!,
          full_name: registerData.fullName,
          avatar_url: '',
          created_at: data.user.created_at!,
          updated_at: data.user.updated_at || data.user.created_at!,
        };

        return { user, error: null };
      }

      return { user: null, error: 'Registration failed' };
    } catch (error) {
      return { user: null, error: (error as Error).message };
    }
  }
  async resetPassword(resetData: ResetPasswordData): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetData.email, {
        redirectTo: `${window.location.origin}`,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  async logout(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }  async getCurrentUser(): Promise<{ user: User | null; error: string | null }> {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Auth timeout')), 10000); // 10 second timeout
      });

      // First check if there's a session
      const sessionPromise = supabase.auth.getSession();
      const { data: { session }, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]);
      
      if (sessionError) {
        console.warn('Session error:', sessionError.message);
        return { user: null, error: null }; // Return null user, not an error for missing session
      }

      // If no session, return null user (this is normal when not logged in)
      if (!session?.user) {
        return { user: null, error: null };
      }

      console.log('getCurrentUser - session details:', {
        userId: session.user.id,
        email: session.user.email,
      });

      // Create user from session data (avoid additional API calls that might hang)
      const user: User = {
        id: session.user.id,
        email: session.user.email!,
        full_name: session.user.user_metadata?.full_name || '',
        avatar_url: session.user.user_metadata?.avatar_url || '',
        created_at: session.user.created_at!,
        updated_at: session.user.updated_at || session.user.created_at!,
      };

      return { user, error: null };
    } catch (error) {
      if (error instanceof Error && error.message === 'Auth timeout') {
        console.warn('Authentication check timed out');
        return { user: null, error: null };
      }
      return { user: null, error: (error as Error).message };
    }
  }
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Create a basic user object from session data
        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          full_name: session.user.user_metadata?.full_name || '',
          avatar_url: session.user.user_metadata?.avatar_url || '',
          created_at: session.user.created_at!,
          updated_at: session.user.updated_at || session.user.created_at!,
        };
        callback(user);
      } else {
        callback(null);
      }
    });
  }
}

export const authService = new AuthService();
