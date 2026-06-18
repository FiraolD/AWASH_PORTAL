import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = React.useState(false);

  const logoUrl = "./src/assets/awash_logo.jpg";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await login(data.email, data.password);
      toast.success('Successfully logged in!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-4 md:w-1/2 lg:px-12 xl:px-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-md space-y-8"
        >
          <div className="text-center md:text-left">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-xl p-2 border border-slate-100 overflow-hidden">
              <img src={logoUrl} alt="Awash Insurance Logo" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827]">Welcome back</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              "Where There Is Awash, There Is Peace Of Mind"
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="#"
                    className="text-sm font-medium text-[#1A3668] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
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
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-[#1A3668] focus:ring-[#1A3668]"
                {...register('rememberMe')}
              />
              <Label htmlFor="rememberMe" className="ml-2 block text-sm text-[#111827]">
                Remember me
              </Label>
            </div>

            <Button type="submit" className="w-full bg-[#1A3668] hover:bg-[#1A3668]/90 text-white" isLoading={isLoading}>
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-[#6B7280]">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[#1A3668] hover:underline">
              Register your policy
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="relative hidden w-1/2 bg-[#1A3668] lg:block overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1454165833767-027ffea10c4d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
          alt="Awash Insurance Protection"
          className="h-full w-full object-cover opacity-40 scale-105 transform group-hover:scale-110 transition-transform duration-10000"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A3668]/90 to-[#E31E24]/30"></div>
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
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">We Flow With You.</h1>
            <p className="text-xl text-blue-100/90 font-medium">
              "Where There Is Awash, There Is Peace Of Mind"
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