import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import { LiquidButton, Button } from "@/components/ui/liquid-glass-button";

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    clearError();
  }, []);

  const validate = useCallback((data) => {
    const next = {};
    const emailRegex = /\S+@\S+\.\S+/;
    if (!data.firstName) next.firstName = "First name is required";
    if (!data.lastName) next.lastName = "Last name is required";
    if (!data.email || !emailRegex.test(data.email))
      next.email = "Enter a valid email address";
    if (!data.password || data.password.length < 6)
      next.password = "Password must be at least 6 characters";
    return next;
  }, []);

  const isFormValid = useMemo(() => {
    return (
      Object.keys(errors).length === 0 &&
      form.firstName &&
      form.lastName &&
      form.email &&
      form.password
    );
  }, [errors, form]);

  const onChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setForm((prev) => {
        const next = { ...prev, [name]: value };
        const touchedKeys = Object.keys(touched);
        if (touchedKeys.length > 0) {
          const allErrors = validate(next);
          const filtered = {};
          for (const key of touchedKeys) {
            if (allErrors[key]) filtered[key] = allErrors[key];
          }
          setErrors(filtered);
        } else {
          setErrors({});
        }
        return next;
      });
    },
    [touched, validate],
  );

  const onBlur = (e) => setTouched((p) => ({ ...p, [e.target.name]: true }));

  const onSubmit = async (e) => {
    e.preventDefault();
    const clientErrors = validate(form);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    const res = await registerUser({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
    });
    if (res?.success) navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-neutral-800">
          Create an account
        </h2>
        <p className="mt-1 text-sm text-neutral-600">It’s quick and easy</p>

        {error && (
          <div className="mt-4 mb-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-black">
                First name
              </label>
              <input
                id="firstName"
                name="firstName"
                value={form.firstName}
                onChange={onChange}
                onBlur={onBlur}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none ring-0 transition focus:border-blue-500"
              />
              {errors.firstName && (
                <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-black">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                value={form.lastName}
                onChange={onChange}
                onBlur={onBlur}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none ring-0 transition focus:border-blue-500"
              />
              {errors.lastName && (
                <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-black">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                onBlur={onBlur}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none ring-0 transition focus:border-blue-500"
              />
              {errors.email && (
                <p className="text-xs text-red-600 mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-black">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={onChange}
                onBlur={onBlur}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black outline-none ring-0 transition focus:border-blue-500"
              />
              {errors.password && (
                <p className="text-xs text-red-600 mt-1">{errors.password}</p>
              )}
            </div>
          </div>

          <LiquidButton
            type="submit"
            disabled={
              isLoading || Object.keys(touched).length === 0 || !isFormValid
            }>
            {isLoading ? "Creating account…" : "Sign up →"}
          </LiquidButton>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
