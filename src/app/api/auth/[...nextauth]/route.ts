import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';

// Define custom session and JWT types
interface CustomSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  expires: string;
}

interface CustomJWT extends JWT {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        // This is a placeholder - actual authentication happens in the custom login API
        // NextAuth is used here primarily for session management
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        // Return a minimal user object - the real auth is handled by our custom API
        return {
          id: 'placeholder',
          email: credentials.email,
          name: 'User',
          role: 'user'
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours to match expireToken
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      const customSession = session as CustomSession;
      const customToken = token as CustomJWT;
      
      if (customToken) {
        customSession.user = {
          id: customToken.userId || 'unknown',
          email: customToken.email || '',
          name: customToken.name || '',
          role: customToken.role || 'user'
        };
      }
      
      return customSession;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };