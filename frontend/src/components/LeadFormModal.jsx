import React, { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { LiquidButton, Button } from "@/components/ui/liquid-glass-button";
import leadService from "../services/leadService";

const LeadFormModal = ({ isOpen, onClose, leadData = null, onSuccess }) => {
  const isEditMode = !!leadData;

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    city: "",
    state: "",
    source: "website",
    status: "new",
    score: 0,
    leadValue: 0,
    lastActivityAt: "",
    isQualified: false,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Source and status options
  const sourceOptions = [
    { value: "website", label: "Website" },
    { value: "facebook_ads", label: "Facebook Ads" },
    { value: "google_ads", label: "Google Ads" },
    { value: "referral", label: "Referral" },
    { value: "events", label: "Events" },
    { value: "other", label: "Other" },
  ];

  const statusOptions = [
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "lost", label: "Lost" },
    { value: "won", label: "Won" },
  ];

  // Initialize form data when modal opens or leadData changes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && leadData) {
        setFormData({
          firstName: leadData.firstName || "",
          lastName: leadData.lastName || "",
          email: leadData.email || "",
          phone: leadData.phone || "",
          company: leadData.company || "",
          city: leadData.city || "",
          state: leadData.state || "",
          source: leadData.source || "website",
          status: leadData.status || "new",
          score: leadData.score || 0,
          leadValue: leadData.lead_value || leadData.leadValue || 0,
          lastActivityAt: leadData.lastActivityAt
            ? new Date(leadData.lastActivityAt).toISOString().split("T")[0]
            : "",
          isQualified: leadData.isQualified || false,
        });
      } else {
        // Reset form for create mode
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          company: "",
          city: "",
          state: "",
          source: "website",
          status: "new",
          score: 0,
          leadValue: 0,
          lastActivityAt: "",
          isQualified: false,
        });
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, isEditMode, leadData]);

  // Validation function
  const validateForm = () => {
    const newErrors = {};

    // Required field validations
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    } else if (formData.firstName.length > 50) {
      newErrors.firstName = "First name cannot exceed 50 characters";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    } else if (formData.lastName.length > 50) {
      newErrors.lastName = "Last name cannot exceed 50 characters";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation
    const phoneRegex = /^\+?[1-9]\d{0,15}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!phoneRegex.test(formData.phone.replace(/[\s()-]/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.company.trim()) {
      newErrors.company = "Company is required";
    } else if (formData.company.length > 100) {
      newErrors.company = "Company name cannot exceed 100 characters";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    } else if (formData.city.length > 50) {
      newErrors.city = "City name cannot exceed 50 characters";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    } else if (formData.state.length > 50) {
      newErrors.state = "State name cannot exceed 50 characters";
    }

    if (!formData.source) {
      newErrors.source = "Source is required";
    }

    if (!formData.status) {
      newErrors.status = "Status is required";
    }

    // Score validation (integer only)
    const score = Number(formData.score);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      newErrors.score = "Score must be an integer between 0 and 100";
    }

    // Lead value validation
    const leadValue = parseFloat(formData.leadValue);
    if (isNaN(leadValue) || leadValue < 0) {
      newErrors.leadValue = "Lead value must be a positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Clear submit error
    if (submitError) {
      setSubmitError(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prepare data for API (convert leadValue and handle date)
      const apiData = {
        ...formData,
        leadValue: parseFloat(formData.leadValue),
        score: parseInt(formData.score),
        lastActivityAt: formData.lastActivityAt
          ? new Date(formData.lastActivityAt).toISOString()
          : null,
      };

      let result;
      if (isEditMode) {
        result = await leadService.updateLead(leadData._id, apiData);
      } else {
        result = await leadService.createLead(apiData);
      }

      if (result.success) {
        onSuccess(result.lead, isEditMode ? "updated" : "created");
        onClose();
      } else {
        // Handle validation errors from backend
        if (result.errors && result.errors.length > 0) {
          const backendErrors = {};
          result.errors.forEach((error) => {
            if (error.path) {
              backendErrors[error.path] = error.msg || error.message;
            }
          });
          setErrors(backendErrors);
        } else {
          setSubmitError(
            result.message ||
              `Failed to ${isEditMode ? "update" : "create"} lead`,
          );
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmitError(
        `Failed to ${isEditMode ? "update" : "create"} lead. Please try again.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}>
      <div className="glass-modal rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200/70">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditMode ? "Edit Lead" : "Create New Lead"}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-10 w-10 inline-flex items-center justify-center rounded-lg bg-black/80 text-white hover:bg-black/70 disabled:opacity-50">
            ×
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Submit Error */}
          {submitError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {submitError}
            </div>
          )}

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.firstName ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter first name"
                disabled={isSubmitting}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.lastName ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter last name"
                disabled={isSubmitting}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter email address"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.phone ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter phone number"
                disabled={isSubmitting}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Company */}
            <div>
              <label
                htmlFor="company"
                className="block text-sm font-medium text-gray-700 mb-1">
                Company *
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.company ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter company name"
                disabled={isSubmitting}
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-600">{errors.company}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.city ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter city"
                disabled={isSubmitting}
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
            </div>

            {/* State */}
            <div>
              <label
                htmlFor="state"
                className="block text-sm font-medium text-gray-700 mb-1">
                State *
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.state ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter state"
                disabled={isSubmitting}
              />
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state}</p>
              )}
            </div>

            {/* Source */}
            <div>
              <label
                htmlFor="source"
                className="block text-sm font-medium text-gray-700 mb-1">
                Source *
              </label>
              <select
                id="source"
                name="source"
                value={formData.source}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.source ? "border-red-300" : "border-gray-300"
                }`}
                disabled={isSubmitting}>
                {sourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.source && (
                <p className="mt-1 text-sm text-red-600">{errors.source}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.status ? "border-red-300" : "border-gray-300"
                }`}
                disabled={isSubmitting}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status}</p>
              )}
            </div>

            {/* Score */}
            <div>
              <label
                htmlFor="score"
                className="block text sm font-medium text-gray-700 mb-1">
                Score (0-100) *
              </label>
              <input
                type="number"
                id="score"
                name="score"
                min="0"
                max="100"
                step="1"
                value={formData.score}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.score ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter score (0-100)"
                disabled={isSubmitting}
              />
              {errors.score && (
                <p className="mt-1 text-sm text-red-600">{errors.score}</p>
              )}
            </div>

            {/* Lead Value */}
            <div>
              <label
                htmlFor="leadValue"
                className="block text-sm font-medium text-gray-700 mb-1">
                Lead Value ($) *
              </label>
              <input
                type="number"
                id="leadValue"
                name="leadValue"
                min="0"
                step="0.01"
                value={formData.leadValue}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.leadValue ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Enter lead value"
                disabled={isSubmitting}
              />
              {errors.leadValue && (
                <p className="mt-1 text-sm text-red-600">{errors.leadValue}</p>
              )}
            </div>

            {/* Last Activity Date */}
            <div>
              <label
                htmlFor="lastActivityAt"
                className="block text-sm font-medium text-gray-700 mb-1">
                Last Activity Date
              </label>
              <input
                type="date"
                id="lastActivityAt"
                name="lastActivityAt"
                value={formData.lastActivityAt}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.lastActivityAt ? "border-red-300" : "border-gray-300"
                }`}
                disabled={isSubmitting}
              />
              {errors.lastActivityAt && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.lastActivityAt}
                </p>
              )}
            </div>

            {/* Is Qualified */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isQualified"
                name="isQualified"
                checked={formData.isQualified}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isSubmitting}
              />
              <label
                htmlFor="isQualified"
                className="ml-2 block text-sm text-gray-700">
                Is Qualified
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200/70">
            <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <LiquidButton
              type="submit"
              disabled={isSubmitting || Object.keys(errors).some((key) => errors[key])}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <LoadingSpinner size="small" message="" /> Processing…
                </span>
              ) : isEditMode ? (
                "Update Lead"
              ) : (
                "Create Lead"
              )}
            </LiquidButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadFormModal;
