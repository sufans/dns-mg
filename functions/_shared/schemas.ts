import { z } from 'zod';

export const CreateAccountGroupSchema = z.object({
  name: z.string().min(1, '分组名称不能为空').max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, '颜色格式无效').default('#6366f1'),
  sortOrder: z.number().int().min(0).default(0),
});

export const UpdateAccountGroupSchema = CreateAccountGroupSchema.partial();

export const RefreshIntervalSchema = z.number().min(900).max(86400); // 15min - 24h in seconds
export const LogRetentionDaysSchema = z.number().min(1).max(365);
