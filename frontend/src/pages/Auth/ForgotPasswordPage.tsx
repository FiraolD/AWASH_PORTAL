import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import axios from 'axios';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState('');

  const logoUrl = "./src/assets/awash_logo.png";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      // Call your backend API
      await axios.post(`${API_URL}/auth/forgot-password`, { email: data.email });
      
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
      toast.success('Reset link sent to your email!');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      toast.error(error.response?.data?.error || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1A3668]/5 to-[#E31E24]/5 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-2xl rounded-2xl">
            <CardContent className="pt-12 pb-8 text-center">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl mb-2">Check Your Email</CardTitle>
              <CardDescription className="text-base mb-6">
                We've sent a password reset link to <br />
                <span className="font-semibold text-[#1A3668]">{submittedEmail}</span>
              </CardDescription>
              <p className="text-sm text-gray-500 mb-8">
                Click the link in the email to reset your password. 
                The link will expire in 1 hour.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/login')} 
                  className="w-full bg-[#1A3668] hover:bg-[#1A3668]/90"
                >
                  Back to Login
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsSubmitted(false)}
                  className="w-full"
                >
                  Try another email
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex w-full flex-col justify-center px-4 md:w-1/2 lg:px-12 xl:px-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-md space-y-8"
        >
          <div className="text-center md:text-left">
            <Link to="/login" className="inline-flex items-center text-sm text-[#1A3668] hover:underline mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg p-1.5 border border-slate-100 overflow-hidden">
              <img src={logoUrl} alt="Awash Insurance Logo" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827]">Forgot Password?</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              No worries! Enter your email address and we'll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@awashinsurance.com"
                  className="pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#1A3668] hover:bg-[#1A3668]/90 text-white" 
              isLoading={isLoading}
            >
              Send Reset Link
            </Button>
          </form>

          <p className="text-center text-sm text-[#6B7280]">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-[#1A3668] hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Hero Image */}
      <div className="relative hidden w-1/2 bg-[#1A3668] lg:block overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1454165833767-027ffea10c4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
          alt="Awash Insurance Protection"
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A3668]/90 to-[#E31E24]/30" />
        <div className="absolute inset-0 flex items-center justify-center p-12 text-white">
          <div className="max-w-md text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block bg-white p-4 rounded-3xl shadow-2xl mb-4"
            >
              <img src={logoUrl} alt="Awash Logo" className="h-24 w-auto" />
            </motion.div>
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">Reset Your Password</h1>
            <p className="text-xl text-blue-100/90 font-medium">
              We'll help you get back into your account.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <div className="h-1 w-12 bg-white/20 rounded-full"></div>
              <div className="h-1 w-12 bg-white rounded-full"></div>
              <div className="h-1 w-12 bg-white/20 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}