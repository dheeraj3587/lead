const express = require("express");
const { body, param, validationResult } = require("express-validator");
const { query } = require("express-validator");
const Lead = require("../models/Lead");
const auth = require("../middleware/auth");

const router = express.Router();

// Validation rules for lead creation/update
const leadValidationRules = () => {
  return [
    body("firstName")
      .trim()
      .notEmpty()
      .withMessage("First name is required")
      .isLength({ max: 50 })
      .withMessage("First name cannot exceed 50 characters"),
    body("lastName")
      .trim()
      .notEmpty()
      .withMessage("Last name is required")
      .isLength({ max: 50 })
      .withMessage("Last name cannot exceed 50 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please enter a valid email"),
    body("phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required")
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage("Please enter a valid phone number"),
    body("company")
      .trim()
      .notEmpty()
      .withMessage("Company is required")
      .isLength({ max: 100 })
      .withMessage("Company name cannot exceed 100 characters"),
    body("city")
      .trim()
      .notEmpty()
      .withMessage("City is required")
      .isLength({ max: 50 })
      .withMessage("City name cannot exceed 50 characters"),
    body("state")
      .trim()
      .notEmpty()
      .withMessage("State is required")
      .isLength({ max: 50 })
      .withMessage("State name cannot exceed 50 characters"),
    body("source")
      .isIn([
        "website",
        "facebook_ads",
        "google_ads",
        "referral",
        "events",
        "other",
      ])
      .withMessage(
        "Source must be one of: website, facebook_ads, google_ads, referral, events, other",
      ),
    body("status")
      .optional()
      .isIn(["new", "contacted", "qualified", "lost", "won"])
      .withMessage(
        "Status must be one of: new, contacted, qualified, lost, won",
      ),
    body("score")
      .isInt({ min: 0, max: 100 })
      .withMessage("Score must be an integer between 0 and 100"),
    // Accept either leadValue or lead_value
    body("leadValue")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Lead value must be a positive number"),
    body("lead_value")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Lead value must be a positive number"),
    body("lastActivityAt")
      .optional()
      .isISO8601()
      .withMessage("Last activity date must be a valid date"),
    body("isQualified")
      .optional()
      .isBoolean()
      .withMessage("Is qualified must be a boolean value"),
  ];
};

// Validation for MongoDB ObjectId
const validateObjectId = () => {
  return [param("id").isMongoId().withMessage("Invalid lead ID format")];
};

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Pagination validation rules
const paginationValidationRules = () => {
  return [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer")
      .toInt(),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100")
      .toInt(),
  ];
};

// Filter validation rules
const filterValidationRules = () => {
  return [
    // String field filters
    query("firstName").optional().trim(),
    query("firstName_contains").optional().trim().isLength({ max: 100 }),
    query("lastName").optional().trim(),
    query("lastName_contains").optional().trim().isLength({ max: 100 }),
    query("email").optional().isEmail().normalizeEmail(),
    query("email_contains").optional().trim().isLength({ max: 100 }),
    query("company").optional().trim(),
    query("company_contains").optional().trim().isLength({ max: 100 }),
    query("city").optional().trim(),
    query("city_contains").optional().trim().isLength({ max: 100 }),
    query("state").optional().trim(),
    query("state_contains").optional().trim().isLength({ max: 100 }),

    // Enum filters
    query("status")
      .optional()
      .isIn(["new", "contacted", "qualified", "lost", "won"]),
    query("status_in")
      .optional()
      .custom((value) => {
        const statuses = value.split(",");
        const validStatuses = ["new", "contacted", "qualified", "lost", "won"];
        return statuses.every((status) =>
          validStatuses.includes(status.trim()),
        );
      })
      .withMessage("Invalid status values"),
    query("source")
      .optional()
      .isIn([
        "website",
        "facebook_ads",
        "google_ads",
        "referral",
        "events",
        "other",
      ]),
    query("source_in")
      .optional()
      .custom((value) => {
        const sources = value.split(",");
        const validSources = [
          "website",
          "facebook_ads",
          "google_ads",
          "referral",
          "events",
          "other",
        ];
        return sources.every((source) => validSources.includes(source.trim()));
      })
      .withMessage("Invalid source values"),

    // Number filters
    query("score").optional().isInt({ min: 0, max: 100 }).toInt(),
    query("score_gt").optional().isInt({ min: 0, max: 100 }).toInt(),
    query("score_lt").optional().isInt({ min: 0, max: 100 }).toInt(),
    query("score_between")
      .optional()
      .custom((value) => {
        const [min, max] = value.split(",").map((v) => parseInt(v.trim()));
        return (
          !isNaN(min) && !isNaN(max) && min >= 0 && max <= 100 && min <= max
        );
      })
      .withMessage("Score between must be two valid integers (min,max)"),

    query("leadValue").optional().isFloat({ min: 0 }).toFloat(),
    query("leadValue_gt").optional().isFloat({ min: 0 }).toFloat(),
    query("leadValue_lt").optional().isFloat({ min: 0 }).toFloat(),
    query("leadValue_between")
      .optional()
      .custom((value) => {
        const [min, max] = value.split(",").map((v) => parseFloat(v.trim()));
        return !isNaN(min) && !isNaN(max) && min >= 0 && max >= 0 && min <= max;
      })
      .withMessage("Lead value between must be two valid numbers (min,max)"),

    // Date filters
    query("createdAt_on")
      .optional()
      .isISO8601()
      .withMessage("Created date must be valid ISO8601 date"),
    query("createdAt_before")
      .optional()
      .isISO8601()
      .withMessage("Created before date must be valid ISO8601 date"),
    query("createdAt_after")
      .optional()
      .isISO8601()
      .withMessage("Created after date must be valid ISO8601 date"),
    query("createdAt_between")
      .optional()
      .custom((value) => {
        const [startRaw, endRaw] = value.split(",").map((v) => v.trim());
        const start = new Date(startRaw);
        const end = new Date(endRaw);
        return (
          start.toString() !== "Invalid Date" &&
          end.toString() !== "Invalid Date" &&
          start <= end
        );
      })
      .withMessage(
        "Created between must be two valid dates in order (start,end)",
      ),

    query("lastActivityAt_on")
      .optional()
      .isISO8601()
      .withMessage("Last activity date must be valid ISO8601 date"),
    query("lastActivityAt_before")
      .optional()
      .isISO8601()
      .withMessage("Last activity before date must be valid ISO8601 date"),
    query("lastActivityAt_after")
      .optional()
      .isISO8601()
      .withMessage("Last activity after date must be valid ISO8601 date"),
    query("lastActivityAt_between")
      .optional()
      .custom((value) => {
        const [startRaw, endRaw] = value.split(",").map((v) => v.trim());
        const start = new Date(startRaw);
        const end = new Date(endRaw);
        return (
          start.toString() !== "Invalid Date" &&
          end.toString() !== "Invalid Date" &&
          start <= end
        );
      })
      .withMessage(
        "Last activity between must be two valid dates in order (start,end)",
      ),

    // Boolean filters
    query("isQualified").optional().isBoolean().toBoolean(),
  ];
};

// Escape user-provided regex patterns
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Build MongoDB filter object from query parameters
// When allAccess is true (e.g. development/demo), do not scope by createdBy
const buildFilterQuery = (queryParams, userId, allAccess = false) => {
  const filter = allAccess ? {} : { createdBy: userId };

  // String field filters with equals and contains
  const stringFields = [
    "firstName",
    "lastName",
    "email",
    "company",
    "city",
    "state",
  ];
  stringFields.forEach((field) => {
    if (queryParams[field]) {
      filter[field] = queryParams[field];
    }
    if (queryParams[`${field}_contains`]) {
      filter[field] = {
        $regex: escapeRegex(queryParams[`${field}_contains`]),
        $options: "i",
      };
    }
  });

  // Enum filters with equals and in
  const enumFields = ["status", "source"];
  enumFields.forEach((field) => {
    if (queryParams[field]) {
      filter[field] = queryParams[field];
    }
    if (queryParams[`${field}_in`]) {
      filter[field] = {
        $in: queryParams[`${field}_in`].split(",").map((v) => v.trim()),
      };
    }
  });

  // Number filters with equals, gt, lt, between
  const numberFields = ["score", "leadValue"];
  numberFields.forEach((field) => {
    const equals = queryParams[field];
    const gt = queryParams[`${field}_gt`];
    const lt = queryParams[`${field}_lt`];
    const between = queryParams[`${field}_between`];

    if (between) {
      const [min, max] = between
        .split(",")
        .map((v) =>
          field === "score" ? parseInt(v.trim()) : parseFloat(v.trim()),
        );
      filter[field] = { $gte: min, $lte: max };
      return;
    }

    const op = {};
    if (gt !== undefined) op.$gt = gt;
    if (lt !== undefined) op.$lt = lt;
    if (Object.keys(op).length > 0) {
      filter[field] = op;
    } else if (equals !== undefined) {
      filter[field] = equals;
    }
  });

  // Date filters with on, before, after, between
  const dateFields = ["createdAt", "lastActivityAt"];
  dateFields.forEach((field) => {
    if (queryParams[`${field}_on`]) {
      const d = new Date(queryParams[`${field}_on`]);
      const start = new Date(
        Date.UTC(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
      const end = new Date(
        Date.UTC(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate() + 1,
          0,
          0,
          0,
          0,
        ),
      );
      filter[field] = { $gte: start, $lt: end };
    }
    if (queryParams[`${field}_before`]) {
      filter[field] = {
        ...filter[field],
        $lt: new Date(queryParams[`${field}_before`]),
      };
    }
    if (queryParams[`${field}_after`]) {
      filter[field] = {
        ...filter[field],
        $gt: new Date(queryParams[`${field}_after`]),
      };
    }
    if (queryParams[`${field}_between`]) {
      const [start, end] = queryParams[`${field}_between`]
        .split(",")
        .map((v) => new Date(v.trim()));
      filter[field] = { $gte: start, $lte: end };
    }
  });

  // Boolean filters
  if (queryParams.isQualified !== undefined) {
    filter.isQualified = queryParams.isQualified;
  }

  return filter;
};

// @route   GET /api/leads
// @desc    Get leads with pagination and filtering
// @access  Private
router.get(
  "/",
  auth,
  paginationValidationRules(),
  filterValidationRules(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      // Allow global view only in development unless explicitly enabled
      const allowAll =
        process.env.ALLOW_ALL_LEADS === "true" ||
        process.env.NODE_ENV !== "production";
      const allAccess = allowAll && req.query.scope === "all";
      // Extract pagination parameters
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const skip = (page - 1) * limit;

      // Build filter query
      const filter = buildFilterQuery(req.query, req.user._id, allAccess);

      // Execute queries in parallel for better performance
      const [leadsRaw, total] = await Promise.all([
        Lead.find(filter)
          .sort({ createdAt: -1 }) // Most recent first
          .skip(skip)
          .limit(limit)
          .lean(), // Use lean() for better performance
        Lead.countDocuments(filter),
      ]);
      const leads = leadsRaw.map(({ leadValue, ...rest }) => ({
        ...rest,
        lead_value: leadValue,
      }));

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        data: leads,
        page,
        limit,
        total,
        totalPages,
      });
    } catch (error) {
      next(error);
    }
  },
);

// @route   POST /api/leads
// @desc    Create a new lead
// @access  Private
router.post(
  "/",
  auth,
  leadValidationRules(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      // Normalize email and map lead_value -> leadValue
      const email = req.body.email
        ? String(req.body.email).toLowerCase()
        : undefined;
      const leadValue = req.body.leadValue ?? req.body.lead_value;
      const leadData = {
        ...req.body,
        email,
        leadValue,
        createdBy: req.user._id,
      };

      // Check if lead with this email already exists for this user
      const existingLead = await Lead.findOne({
        email,
        createdBy: req.user._id,
      });

      if (existingLead) {
        return res.status(400).json({
          message: "A lead with this email already exists",
        });
      }

      const lead = new Lead(leadData);
      await lead.save();

      res.status(201).json({
        message: "Lead created successfully",
        lead,
      });
    } catch (error) {
      // Handle duplicate key errors for compound unique index
      if (error && error.code === 11000) {
        return res.status(400).json({
          message: "A lead with this email already exists for this user",
        });
      }
      next(error);
    }
  },
);

// @route   GET /api/leads/:id
// @desc    Get a single lead by ID
// @access  Private
router.get(
  "/:id",
  auth,
  validateObjectId(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const lead = await Lead.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      res.status(200).json({ lead });
    } catch (error) {
      next(error);
    }
  },
);

// @route   PUT /api/leads/:id
// @desc    Update a lead
// @access  Private
router.put(
  "/:id",
  auth,
  validateObjectId(),
  leadValidationRules(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      // Check if lead exists and belongs to the user
      const existingLead = await Lead.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });

      if (!existingLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Build update data, prevent ownership change, normalize email, and map lead_value
      const { createdBy, ...rest } = req.body;
      const nextEmailRaw = rest.email ?? undefined;
      const nextEmail = nextEmailRaw
        ? String(nextEmailRaw).toLowerCase()
        : undefined;
      if (nextEmail) {
        rest.email = nextEmail;
      }
      if (rest.lead_value !== undefined && rest.leadValue === undefined) {
        rest.leadValue = rest.lead_value;
        delete rest.lead_value;
      }

      // Check if email is being changed and if it conflicts with another lead
      if (nextEmail && nextEmail !== existingLead.email) {
        const emailConflict = await Lead.findOne({
          email: nextEmail,
          createdBy: req.user._id,
          _id: { $ne: req.params.id },
        });

        if (emailConflict) {
          return res.status(400).json({
            message: "A lead with this email already exists",
          });
        }
      }

      const lead = await Lead.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user._id },
        rest,
        { new: true, runValidators: true },
      );

      res.status(200).json({
        message: "Lead updated successfully",
        lead,
      });
    } catch (error) {
      if (error && error.code === 11000) {
        return res.status(400).json({
          message: "A lead with this email already exists for this user",
        });
      }
      next(error);
    }
  },
);

// @route   PATCH /api/leads/:id
// @desc    Partially update a lead
// @access  Private
router.patch(
  "/:id",
  auth,
  validateObjectId(),
  [
    body("firstName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("First name cannot exceed 50 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Last name cannot exceed 50 characters"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please enter a valid email"),
    body("phone")
      .optional()
      .trim()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage("Please enter a valid phone number"),
    body("company")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Company name cannot exceed 100 characters"),
    body("city")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("City name cannot exceed 50 characters"),
    body("state")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("State name cannot exceed 50 characters"),
    body("source")
      .optional()
      .isIn([
        "website",
        "facebook_ads",
        "google_ads",
        "referral",
        "events",
        "other",
      ])
      .withMessage(
        "Source must be one of: website, facebook_ads, google_ads, referral, events, other",
      ),
    body("status")
      .optional()
      .isIn(["new", "contacted", "qualified", "lost", "won"])
      .withMessage(
        "Status must be one of: new, contacted, qualified, lost, won",
      ),
    body("score")
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage("Score must be an integer between 0 and 100"),
    body("leadValue")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Lead value must be a positive number"),
    body("lead_value")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Lead value must be a positive number"),
    body("lastActivityAt")
      .optional()
      .isISO8601()
      .withMessage("Last activity date must be a valid date"),
    body("isQualified")
      .optional()
      .isBoolean()
      .withMessage("Is qualified must be a boolean value"),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const existingLead = await Lead.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });
      if (!existingLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const { createdBy, ...patch } = req.body;
      if (patch.email) patch.email = String(patch.email).toLowerCase();
      if (patch.lead_value !== undefined && patch.leadValue === undefined) {
        patch.leadValue = patch.lead_value;
        delete patch.lead_value;
      }

      if (patch.email && patch.email !== existingLead.email) {
        const emailConflict = await Lead.findOne({
          email: patch.email,
          createdBy: req.user._id,
          _id: { $ne: req.params.id },
        });
        if (emailConflict) {
          return res
            .status(400)
            .json({ message: "A lead with this email already exists" });
        }
      }

      const lead = await Lead.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user._id },
        patch,
        { new: true, runValidators: true },
      );

      res.status(200).json({ message: "Lead updated successfully", lead });
    } catch (error) {
      if (error && error.code === 11000) {
        return res.status(400).json({
          message: "A lead with this email already exists for this user",
        });
      }
      next(error);
    }
  },
);

// @route   DELETE /api/leads/:id
// @desc    Delete a lead
// @access  Private
router.delete(
  "/:id",
  auth,
  validateObjectId(),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const lead = await Lead.findOneAndDelete({
        _id: req.params.id,
        createdBy: req.user._id,
      });

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      res.status(200).json({
        message: "Lead deleted successfully",
        deletedLead: lead,
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
