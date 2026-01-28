import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "./supabaseClient";
import * as SecureStore from "expo-secure-store";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role?: 'student' | 'lecturer';
  student_id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string, studentId?: string, role?: 'student' | 'lecturer') => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        if (session?.user) {
          // Get user role from the user table
          const { data: userData, error: userError } = await supabase
            .from('user')
            .select('role, student_id')
            .eq('id', session.user.id)
            .single();
          
          console.log('Fetched user data from database:', { userData, userError });
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name,
            image: session.user.user_metadata?.avatar_url,
            role: userData?.role || 'student',
            student_id: userData?.student_id,
          });
          
          console.log('Set user state with role:', userData?.role || 'student');
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Get user role from the user table
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('role, student_id')
          .eq('id', session.user.id)
          .single();
        
        console.log('Fetched user data from database (fetchUser):', { userData, userError });
        
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
          image: session.user.user_metadata?.avatar_url,
          role: userData?.role || 'student',
          student_id: userData?.student_id,
        });
        
        console.log('Set user state with role (fetchUser):', userData?.role || 'student');
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      console.error("Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string, studentId?: string, role?: 'student' | 'lecturer') => {
    try {
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      
      if (authError) throw authError;
      
      // 2. Insert user data into user table (your existing table)
      if (authData.user) {
        const { error: dbError } = await supabase.from('user').insert({
          id: authData.user.id,
          email: email,
          name: name || '',
          student_id: studentId || null,
          role: role || 'student',
          email_verified: false
        });
        
        if (dbError) {
          console.error('Error inserting user data:', dbError);
          // Don't throw error here - auth was successful, just log the issue
        }
      }
    } catch (error) {
      console.error("Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: Platform.OS === 'web' ? window.location.origin : Linking.createURL('/'),
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error(`${provider} sign in failed:`, error);
      throw error;
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
        signOut,
        fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
