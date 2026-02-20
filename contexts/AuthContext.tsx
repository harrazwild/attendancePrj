import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
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
  signUpWithEmail: (email: string, password: string, name?: string, studentId?: string, role?: 'student' | 'lecturer', courses?: { name: string, code: string }[]) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
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
            .select('role, student_id, name')
            .eq('id', session.user.id)
            .single();

          console.log('Fetched user data from database:', { userData, userError });

          let userName = userData?.name;
          const metaName = session.user.user_metadata?.name;

          // Sync: If DB name is missing but Auth name exists, update DB
          if (!userName && metaName) {
            console.log('Syncing name to database:', metaName);
            const { error: updateError } = await supabase
              .from('user')
              .update({ name: metaName })
              .eq('id', session.user.id);

            if (!updateError) {
              userName = metaName;
            } else {
              console.error('Error syncing name:', updateError);
            }
          }

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: userName || metaName, // Prefer DB/Synced name, fallback to meta
            image: session.user.user_metadata?.avatar_url,
            role: userData?.role,
            student_id: userData?.student_id,
          });

          console.log('Set user state with role:', userData?.role);
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
          .select('role, student_id, name')
          .eq('id', session.user.id)
          .single();

        console.log('Fetched user data from database (fetchUser):', { userData, userError });

        let userName = userData?.name;
        const metaName = session.user.user_metadata?.name;

        // Sync: If DB name is missing but Auth name exists, update DB
        if (!userName && metaName) {
          console.log('Syncing name to database (fetchUser):', metaName);
          const { error: updateError } = await supabase
            .from('user')
            .update({ name: metaName })
            .eq('id', session.user.id);

          if (!updateError) {
            userName = metaName;
          } else {
            console.error('Error syncing name:', updateError);
          }
        }

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: userName || metaName,
          image: session.user.user_metadata?.avatar_url,
          role: userData?.role,
          student_id: userData?.student_id,
        });

        console.log('Set user state with role (fetchUser):', userData?.role);
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

  const signUpWithEmail = async (email: string, password: string, name?: string, studentId?: string, role?: 'student' | 'lecturer', courses?: { name: string, code: string }[]) => {
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
        });

        if (dbError) {
          console.error('Error inserting user data:', dbError);
          // Don't throw error here - auth was successful, just log the issue
        }

        // 3. Insert courses if role is lecturer and courses are provided
        if (role === 'lecturer' && courses && courses.length > 0) {
          console.log('Attempting to insert courses:', courses);
          console.log('Current Auth User ID:', authData.user?.id);

          const coursesToInsert = courses.map(course => ({
            lecturer_id: authData.user!.id,
            name: course.name,
            code: course.code
          }));

          const { error: coursesError } = await supabase
            .from('courses')
            .insert(coursesToInsert);

          if (coursesError) {
            console.error('Error inserting courses:', coursesError);
            // Optionally throw error or just log it?
            // Prioritizing user creation success over course creation failure for now, could act as a partial success
          } else {
            console.log('Courses inserted successfully');
          }
        } else {
          console.log('No courses to insert. Role:', role, 'Courses length:', courses?.length);
        }

        // 4. Fetch user to update local state with role
        await fetchUser();
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

  const updateProfile = async (name: string) => {
    try {
      if (!user?.id) throw new Error("No user logged in");

      const { error } = await supabase
        .from('user')
        .update({ name })
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUser(prev => prev ? { ...prev, name } : null);
    } catch (error) {
      console.error("Update profile failed:", error);
      throw error;
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
        updateProfile,
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
