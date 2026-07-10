// ClaimForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';

const claimSchema = z.object({
  policyId: z.string().min(1, 'Policy is required'),
  incidentDate: z.string().min(1, 'Incident date is required'),
  incidentDescription: z.string().min(10, 'Description must be at least 10 characters'),
  location: z.string().min(3, 'Location is required'),
  estimatedAmount: z.number().optional(),
  natureOfLoss: z.string().min(1, 'Nature of loss is required'),
  // ... all other fields from the page
});

type ClaimFormValues = z.infer<typeof claimSchema>;

interface ClaimFormProps {
  defaultValues?: Partial<ClaimFormValues>;
  policies: { id: string; policyNumber: string }[];
  onSubmit: (data: ClaimFormValues) => void;
  isLoading?: boolean;
}

export function ClaimForm({ defaultValues, policies, onSubmit, isLoading }: ClaimFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Policy selection */}
      <div>
        <label>Policy</label>
        <select {...register('policyId')} className="w-full border p-2 rounded">
          <option value="">Select a policy</option>
          {policies.map(p => <option key={p.id} value={p.id}>{p.policyNumber}</option>)}
        </select>
        {errors.policyId && <p className="text-red-500">{errors.policyId.message}</p>}
      </div>
      {/* ... other fields */}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Submitting...' : 'Submit Claim'}
      </Button>
    </form>
  );
}