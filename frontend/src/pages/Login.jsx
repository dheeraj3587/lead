import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

// It's often cleaner to define pure helper functions outside the component.
const validateForm = (data) => {
  const errors = {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  if (!data.email || !emailRegex.test(data.email))
    errors.email = "Enter a valid email address";
  if (!data.password) errors.password = "Password is required";
  return errors;
};

const Login = () => {
  const { login, error, clearError, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Clear any global errors from the context when the component mounts.
    clearError();

    // Cleanup function to prevent state updates on unmounted component.
    return () => {
      isMountedRef.current = false;
    };
  }, [clearError]); // Added dependency per linter rules

  // The form is valid if the validation function returns no errors.
  // This is a more direct and reliable calculation.
  const isFormValid = useMemo(() => {
    return Object.keys(validateForm(form)).length === 0;
  }, [form]);

  // onChange is now simpler: it just updates the form state.
  const onChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      // As a user types to fix an error, we can clear it.
      if (fieldErrors[name]) {
        setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [fieldErrors],
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    // Clear all previous errors at the start of a submission.
    clearError();
    setFieldErrors({});

    // Validate the form on submit.
    const clientErrors = validateForm(form);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(form);
      if (!isMountedRef.current) return;

      if (res.success) {
        navigate(location.state?.from?.pathname || "/", { replace: true });
      } else {
        // Let the AuthContext handle setting the general error.
        // We only handle field-specific errors here.
        if (Array.isArray(res.errors)) {
          const nextFieldErrors = {};
          res.errors.forEach((err) => {
            const field = err.field || err.param || err.path;
            const message = err.message || err.msg;
            if (field) nextFieldErrors[field] = message;
          });
          setFieldErrors(nextFieldErrors);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("Login error:", err);
      // The `login` function in the context should catch this and set the global error.
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  if (isLoading) return null; // Simplified loading state check

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-neutral-800">Sign in</h2>
        <p className="mt-1 text-sm text-neutral-600">Access your account</p>

        {/* Displaying only the error from the context */}
        {error && (
          <div className="mt-4 mb-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md">
            {error}
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
              autoComplete="email"
              autoFocus
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none ring-0 transition focus:border-blue-500"
              aria-invalid={!!fieldErrors.email}
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
              autoComplete="current-password"
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none ring-0 transition focus:border-blue-500"
              aria-invalid={!!fieldErrors.password}
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
