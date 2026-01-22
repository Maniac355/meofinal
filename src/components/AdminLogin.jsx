import { useState } from "react";

const DEFAULT_ERROR = "Sai tài khoản hoặc mật khẩu";

export default function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const success = onLogin({
      username: form.username.trim(),
      password: form.password
    });
    if (!success) {
      setError(DEFAULT_ERROR);
      setSubmitting(false);
      return;
    }
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Đăng nhập quản trị</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Vui lòng nhập thông tin để tiếp tục.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={form.username}
            onChange={event => setForm({ ...form, username: event.target.value })}
            placeholder="Tên đăng nhập"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
            required
          />
          <input
            type="password"
            value={form.password}
            onChange={event => setForm({ ...form, password: event.target.value })}
            placeholder="Mật khẩu"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-sm"
            required
          />
          {error && (
            <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Đang kiểm tra..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
