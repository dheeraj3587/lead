import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { LiquidButton, Button } from "@/components/ui/liquid-glass-button";

const Login = () => {
  const { login, error, clearError, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    clearError();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const validate = useCallback((data) => {
    const next = {};
    // Simple but stricter email check; deeper validation is handled server-side
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    if (!data.email || !emailRegex.test(data.email))
      next.email = "Enter a valid email address";
    if (!data.password) next.password = "Password is required";
    return next;
  }, []);

  const isFormValid = useMemo(() => {
    return Object.keys(fieldErrors).length === 0 && form.email && form.password;
  }, [fieldErrors, form]);

  const onChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setForm((prev) => {
        const next = { ...prev, [name]: value };
        setFieldErrors(validate(next));
        return next;
      });
    },
    [validate],
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setGeneralError("");
    const clientErrors = validate(form);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await login({ email: form.email, password: form.password });
      if (!isMountedRef.current) return;
      if (res.success) {
        navigate(location.state?.from?.pathname || "/", { replace: true });
      } else {
        const nextFieldErrors = {};
        if (Array.isArray(res.errors)) {
          res.errors.forEach((err) => {
            const field = err.field || err.param || err.path;
            const message = err.message || err.msg;
            if (field && message) nextFieldErrors[field] = message;
          });
        }
        setFieldErrors(nextFieldErrors);
        if (res.message && Object.keys(nextFieldErrors).length === 0)
          setGeneralError(res.message);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("Login error:", err);
      setGeneralError(
        "Unable to sign in. Check your connection and try again.",
      );
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  if (isLoading && !error) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-neutral-800">Sign in</h2>
        <p className="mt-1 text-sm text-neutral-600">Access your account</p>

        {(error || generalError) && (
          <div className="mt-4 mb-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md">
            {error || generalError}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-black">
              Email
            </label>
            <input
              id="email"
              name="email"
              placeholder="you@example.com"
              type="email"
              value={form.email}
              onChange={onChange}
              onInput={onChange}
              autoComplete="email"
              autoFocus
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none ring-0 transition focus:border-blue-500"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-black">
              Password
            </label>
            <input
              id="password"
              name="password"
              placeholder="••••••••"
              type="password"
              value={form.password}
              onChange={onChange}
              onInput={onChange}
              autoComplete="current-password"
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none ring-0 transition focus:border-blue-500"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "password-error" : undefined
              }
            />
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <LiquidButton type="submit" disabled={submitting || !isFormValid}>
            {submitting ? "Signing in…" : "Sign in"}
          </LiquidButton>

          <div className="text-center text-sm text-gray-600">
            No account?{" "}
            <Link to="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
