import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Card, CardContent, CardDescription, CardTitle } from '../../components/ui/Card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import axiosInstance from '../../lib/axios';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const logoUrl = './src/assets/awash_logo.png';

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const password = watch('password');

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsLoading(true);

    try {
      await axiosInstance.post('/v1/profile/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.password,
      });

      setIsSuccess(true);
      toast.success('Password changed successfully');

      setTimeout(() => {
        navigate('/profile');
      }, 1800);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Your current password is incorrect or the request failed.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
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
              <CardTitle className="text-2xl mb-2">Password Updated</CardTitle>
              <CardDescription className="text-base mb-6">
                Your password has been changed successfully.
              </CardDescription>
              <Button onClick={() => navigate('/profile')} className="w-full bg-[#1A3668] hover:bg-[#1A3668]/90">
                Back to Profile
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-4 md:w-1/2 lg:px-12 xl:px-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-md space-y-8"
        >
          <div className="text-center md:text-left">
            <Link to="/profile" className="inline-flex items-center text-sm text-[#1A3668] hover:underline mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Link>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg p-1.5 border border-slate-100 overflow-hidden">
              <img src={logoUrl} alt="Awash Insurance Logo" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827]">Change Password</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              Enter your current password and choose a strong new one.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter your current password"
                  className="pl-10"
                  {...register('currentPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A3668]"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A3668]"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500">Password requirements:</p>
                <ul className="text-xs text-gray-500 space-y-1 ml-4">
                  <li className={password?.length >= 8 ? 'text-green-600' : ''}>• At least 8 characters</li>
                  <li className={/[A-Z]/.test(password || '') ? 'text-green-600' : ''}>• At least one uppercase letter</li>
                  <li className={/[0-9]/.test(password || '') ? 'text-green-600' : ''}>• At least one number</li>
                  <li className={/[^A-Za-z0-9]/.test(password || '') ? 'text-green-600' : ''}>• At least one special character</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A3668]"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-[#1A3668] hover:bg-[#1A3668]/90 text-white" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        </motion.div>
      </div>

      <div className="relative hidden w-1/2 bg-[#1A3668] lg:block overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80"
          alt="Secure account"
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
              <ShieldCheck className="h-16 w-16 text-[#1A3668]" />
            </motion.div>
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">Protect Your Account</h1>
            <p className="text-xl text-blue-100/90 font-medium">
              Use a strong, unique password and keep your profile secure.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <div className="h-1 w-12 bg-white/20 rounded-full" />
              <div className="h-1 w-12 bg-white rounded-full" />
              <div className="h-1 w-12 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
