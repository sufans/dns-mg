import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';

const STEPS = [
  { id: 1, title: '欢迎' },
  { id: 2, title: '创建账户' },
  { id: 3, title: '基本信息' },
  { id: 4, title: '安全配置' },
];

const TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Singapore',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'UTC',
];

export function SetupWizard() {
  const navigate = useNavigate();
  const { initialize } = useAuthStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2: Account form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  // Step 3: Basic info
  const [systemName, setSystemName] = useState('DNS Manager');
  const [timezone, setTimezone] = useState('Asia/Shanghai');
  const [language, setLanguage] = useState('zh-CN');

  // Step 4: Security config
  const [storageMethod, setStorageMethod] = useState<'cloudflare' | 'local'>('local');

  const validateStep2 = (): boolean => {
    if (!username.trim()) {
      setError('请输入用户名');
      return false;
    }
    if (username.trim().length < 3) {
      setError('用户名至少3个字符');
      return false;
    }
    if (!password.trim()) {
      setError('请输入密码');
      return false;
    }
    if (password.length < 6) {
      setError('密码至少6个字符');
      return false;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }
    if (!displayName.trim()) {
      setError('请输入显示名称');
      return false;
    }
    if (!email.trim()) {
      setError('请输入邮箱');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
      return false;
    }
    setError('');
    return true;
  };

  const goNext = () => {
    if (currentStep === 2 && !validateStep2()) return;
    setDirection('forward');
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const goPrev = () => {
    setError('');
    setDirection('backward');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      const success = await initialize({
        username: username.trim(),
        password,
        displayName: displayName.trim(),
        email: email.trim(),
      });
      if (success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError('初始化失败，请重试');
      }
    } catch {
      setError('初始化失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const slideClass =
    direction === 'forward'
      ? 'animate-[slideInRight_0.3s_ease-out]'
      : 'animate-[slideInLeft_0.3s_ease-out]';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        currentStep > step.id
                          ? 'bg-blue-600 text-white'
                          : currentStep === step.id
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step.id
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${
                        currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 w-16 sm:w-24 mx-2 mt-[-1.25rem] transition-colors duration-300 ${
                        currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div key={currentStep} className={slideClass}>
            {currentStep === 1 && <WelcomeStep />}
            {currentStep === 2 && (
              <AccountStep
                username={username}
                setUsername={setUsername}
                password={password}
                setPassword={setPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                displayName={displayName}
                setDisplayName={setDisplayName}
                email={email}
                setEmail={setEmail}
              />
            )}
            {currentStep === 3 && (
              <BasicInfoStep
                systemName={systemName}
                setSystemName={setSystemName}
                timezone={timezone}
                setTimezone={setTimezone}
                language={language}
                setLanguage={setLanguage}
              />
            )}
            {currentStep === 4 && (
              <SecurityStep
                storageMethod={storageMethod}
                setStorageMethod={setStorageMethod}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            {currentStep > 1 ? (
              <button
                onClick={goPrev}
                className="px-5 py-2.5 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                上一步
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                onClick={goNext}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {currentStep === 1 ? '开始配置' : '下一步'}
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={loading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? '配置中...' : '完成配置'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          DNS Manager &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

function WelcomeStep() {
  return (
    <div className="text-center py-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 mb-6">
        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">欢迎使用 DNS Manager</h2>
      <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
        DNS Manager 是一个强大的 DNS 域名管理工具，支持多平台 DNS 服务商的统一管理、
        自动同步和操作审计。接下来我们将引导您完成初始配置。
      </p>
      <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs text-gray-500">多域名管理</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-xs text-gray-500">自动同步</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <p className="text-xs text-gray-500">安全审计</p>
        </div>
      </div>
    </div>
  );
}

interface AccountStepProps {
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
}

function AccountStep({
  username,
  setUsername,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  displayName,
  setDisplayName,
  email,
  setEmail,
}: AccountStepProps) {
  return (
    <div className="py-2">
      <h2 className="text-xl font-bold text-gray-900 mb-1">创建管理员账户</h2>
      <p className="text-gray-500 text-sm mb-6">设置系统管理员账户信息</p>

      <div className="space-y-4">
        <div>
          <label htmlFor="setup-username" className="block text-sm font-medium text-gray-700 mb-1.5">
            用户名 <span className="text-red-500">*</span>
          </label>
          <input
            id="setup-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="至少3个字符"
            autoComplete="username"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="setup-password" className="block text-sm font-medium text-gray-700 mb-1.5">
              密码 <span className="text-red-500">*</span>
            </label>
            <input
              id="setup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="至少6个字符"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="setup-confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
              确认密码 <span className="text-red-500">*</span>
            </label>
            <input
              id="setup-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="再次输入密码"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div>
          <label htmlFor="setup-displayname" className="block text-sm font-medium text-gray-700 mb-1.5">
            显示名称 <span className="text-red-500">*</span>
          </label>
          <input
            id="setup-displayname"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="例如：张三"
          />
        </div>

        <div>
          <label htmlFor="setup-email" className="block text-sm font-medium text-gray-700 mb-1.5">
            邮箱 <span className="text-red-500">*</span>
          </label>
          <input
            id="setup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="admin@example.com"
            autoComplete="email"
          />
        </div>
      </div>
    </div>
  );
}

interface BasicInfoStepProps {
  systemName: string;
  setSystemName: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
}

function BasicInfoStep({
  systemName,
  setSystemName,
  timezone,
  setTimezone,
  language,
  setLanguage,
}: BasicInfoStepProps) {
  return (
    <div className="py-2">
      <h2 className="text-xl font-bold text-gray-900 mb-1">基本信息</h2>
      <p className="text-gray-500 text-sm mb-6">配置系统基本信息（可选）</p>

      <div className="space-y-4">
        <div>
          <label htmlFor="system-name" className="block text-sm font-medium text-gray-700 mb-1.5">
            系统名称
          </label>
          <input
            id="system-name"
            type="text"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            placeholder="DNS Manager"
          />
          <p className="text-xs text-gray-400 mt-1">显示在浏览器标签页和系统标题中</p>
        </div>

        <div>
          <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1.5">
            时区
          </label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">影响日志时间和定时任务执行时间</p>
        </div>

        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1.5">
            语言
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
          >
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </div>
    </div>
  );
}

interface SecurityStepProps {
  storageMethod: 'cloudflare' | 'local';
  setStorageMethod: (v: 'cloudflare' | 'local') => void;
}

function SecurityStep({ storageMethod, setStorageMethod }: SecurityStepProps) {
  return (
    <div className="py-2">
      <h2 className="text-xl font-bold text-gray-900 mb-1">安全配置</h2>
      <p className="text-gray-500 text-sm mb-6">选择 API 凭据的存储方式</p>

      <div className="space-y-4">
        <div
          onClick={() => setStorageMethod('local')}
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            storageMethod === 'local'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                storageMethod === 'local' ? 'border-blue-500' : 'border-gray-300'
              }`}
            >
              {storageMethod === 'local' && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">本地加密存储</h3>
              <p className="text-sm text-gray-500 mt-1">
                API 凭据使用 AES-256 加密后存储在本地浏览器中。适合个人使用或小型部署场景，
                无需额外配置外部服务。
              </p>
              <div className="mt-2 flex gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                  无需额外配置
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                  仅限当前浏览器
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => setStorageMethod('cloudflare')}
          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
            storageMethod === 'cloudflare'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                storageMethod === 'cloudflare' ? 'border-blue-500' : 'border-gray-300'
              }`}
            >
              {storageMethod === 'cloudflare' && (
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Cloudflare Secrets</h3>
              <p className="text-sm text-gray-500 mt-1">
                使用 Cloudflare Workers Secrets 管理凭据，通过加密通道安全存储。
                适合团队协作和多设备访问场景，需要配置 Cloudflare 账户。
              </p>
              <div className="mt-2 flex gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  跨设备同步
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  需要 Cloudflare 账户
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
