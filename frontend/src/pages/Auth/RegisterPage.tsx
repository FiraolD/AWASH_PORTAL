import * as React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const logoUrl = "./src/assets/awash_logo.jpg";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error('Registration failed. Please check your email address.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 bg-[#1a3668] lg:block overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
          alt="Trust and Protection"
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a3668]/90 to-[#e31e24]/20"></div>
        <div className="absolute inset-0 flex items-center justify-center p-12 text-white">
          <div className="max-w-md text-center space-y-6">
            <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="inline-block bg-white p-4 rounded-3xl shadow-2xl"
            >
               <img src={logoUrl} alt="Awash Logo" className="h-20 w-auto" />
            </motion.div>
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">We Flow With You.</h1>
            <p className="text-xl text-blue-100/90 font-medium">
              Join the most trusted insurance provider in Ethiopia.
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-4 md:w-1/2 lg:px-12 xl:px-24">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mx-auto w-full max-w-md space-y-8"
        >
          <div className="text-center md:text-left">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg p-1.5 border border-slate-100 overflow-hidden">
              <img src={logoUrl} alt="Awash Logo" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#111827]">Create your account</h2>
            <p className="mt-2 text-sm text-[#6B7280]">
              "Where There Is Awash, There Is Peace Of Mind"
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="john@example.com" {...register('email')} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="password" {...register('password')} />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="password" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <Button type="submit" className="w-full mt-6 bg-[#1a3668] text-white hover:bg-[#1a3668]/90" isLoading={isLoading}>
              Register Account
            </Button>
          </form>

          <p className="text-center text-sm text-[#6B7280]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#1a3668] hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}