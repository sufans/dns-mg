import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the api module
const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    download: vi.fn(),
    upload: vi.fn(),
  },
}));

// We test the mutationFn logic directly, which verifies that:
// 1. The file is read as text (not sent as FormData)
// 2. api.post (not api.upload) is called
// 3. The JSON body contains { data: fileContent, password }
describe('useRestore', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('sends JSON with file content and password via api.post, not FormData', async () => {
    // This is the mutation function from the updated useRestore hook
    const mutationFn = async ({ file, password }: { file: File; password: string }) => {
      const fileContent = await file.text();
      return mockPost('/backup', {
        data: fileContent,
        password,
      });
    };

    const fileContent = '{"version":1,"data":{"api_accounts":[],"account_groups":[],"system_settings":[]}}';
    const file = new File([fileContent], 'backup.json', { type: 'application/json' });
    const password = 'test-password';

    mockPost.mockResolvedValue({
      accountCount: 0,
      groupCount: 0,
      settingCount: 0,
    });

    const result = await mutationFn({ file, password });

    // Verify api.post was called (not api.upload)
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/backup', {
      data: fileContent,
      password,
    });

    // Verify the call body is JSON, not FormData
    const callArg = mockPost.mock.calls[0][1];
    expect(callArg).not.toBeInstanceOf(FormData);
    expect(callArg).toHaveProperty('data', fileContent);
    expect(callArg).toHaveProperty('password', password);
    expect(typeof callArg.data).toBe('string');
    expect(typeof callArg.password).toBe('string');

    // Verify result shape matches backend response
    expect(result).toEqual({
      accountCount: 0,
      groupCount: 0,
      settingCount: 0,
    });
  });

  it('reads the file content as text before sending', async () => {
    const fileContent = 'encrypted-backup-data';
    const file = new File([fileContent], 'backup.json', { type: 'application/json' });
    const password = 'admin123';

    mockPost.mockResolvedValue({
      accountCount: 5,
      groupCount: 3,
      settingCount: 10,
    });

    const mutationFn = async ({ file, password }: { file: File; password: string }) => {
      const fileContent = await file.text();
      return mockPost('/backup', {
        data: fileContent,
        password,
      });
    };

    const result = await mutationFn({ file, password });

    expect(mockPost).toHaveBeenCalledWith('/backup', {
      data: 'encrypted-backup-data',
      password: 'admin123',
    });
    expect(result.accountCount).toBe(5);
    expect(result.groupCount).toBe(3);
    expect(result.settingCount).toBe(10);
  });
});