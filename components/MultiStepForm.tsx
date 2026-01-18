"use client";
import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Steps derived from OCR of screenshots in questions folder
const ficoOptions = [
  "Below 600",
  "600-619",
  "620-639",
  "640-659",
  "660-679",
  "680-699",
  "700-719",
  "720-739",
  "740-749",
  "750-759",
  "760-769",
  "770-779",
  "780 or Above",
  "Foreign National",
];
const propertyTypeOptions = [
  "Single Family",
  "Condo",
  "Townhouse",
  "2-4 Unit",
  "Multi-Family (5+ Units)",
  "Land",
  "Commercial",
];
const purchaseOrRefiOptions = ["Purchase", "Refinance"];
const refi6MonthsOptions = [
  "Yes - Purchased Within 6 Months",
  "No - Owned Longer Than 6 Months",
];
const loanTypeOptions = [
  "Bridge",
  "Rental",
  "Fix and Flip",
  "Ground-Up Construction",
];
const experienceOptions = [
  "None",
  "1 Property",
  "2 Properties",
  "3 Properties",
  "4-5 Properties",
  "6-9 Properties",
  "10-19 Properties",
  "20+ Properties",
];
const preferredClosingOptions = [
  "7 - 13 Days",
  "More Than 14 Days",
  "No preference",
];
const leadSourceSuggestions = ["BiggerPockets", "Email From Us"];

const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    firstName: z.string().min(1, "Required"),
    lastName: z.string().min(1, "Required"),
    phone: z.string().min(7, "Enter a valid phone"),
    role: z.enum([
      "Real Estate Investor",
      "Borrower",
      "Broker or Representative",
    ]),
    fico: z.enum([
      "Below 600",
      "600-619",
      "620-639",
      "640-659",
      "660-679",
      "680-699",
      "700-719",
      "720-739",
      "740-749",
      "750-759",
      "760-769",
      "770-779",
      "780 or Above",
      "Foreign National",
    ]),
    propertyAddress: z
      .string()
      .min(5, "Enter a valid address")
      .regex(/\b\d{5}(?:-\d{4})?\b/, "Include ZIP code"),
    propertyType: z.enum([
      "Single Family",
      "Condo",
      "Townhouse",
      "2-4 Unit",
      "Multi-Family (5+ Units)",
      "Land",
      "Commercial",
    ]),
    purchaseOrRefi: z.enum(["Purchase", "Refinance"]),
    refi6Months: z.string().optional(),
    loanType: z.enum([
      "Bridge",
      "Rental",
      "Fix and Flip",
      "Ground-Up Construction",
    ]),
    purchasePrice: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .optional(),
    // Fix & Flip
    rehabCost: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .optional(),
    fixFlipArv: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .optional(),
    // Rental
    rentalMonthlyIncome: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .optional(),
    rentalAnnualTaxes: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .optional(),
    rentalAnnualInsurance: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .optional(),
    rentalMonthlyHoa: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .optional(),
    rentalLeasedAtClosing: z.string().optional(),
    inputLandCost: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .optional(),
    inputGUCPurchaseConstructionCost: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .optional(),
    inputGUCARV: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .optional(),
    experience: z
      .enum([
        "None",
        "1 Property",
        "2 Properties",
        "3 Properties",
        "4-5 Properties",
        "6-9 Properties",
        "10-19 Properties",
        "20+ Properties",
      ])
      .optional(),
    preferredClosing: z.string().min(1, "Required"),
    brokerFee: z.string().min(1, "Required"),
    leadSource: z.string().min(1, "Required"),
  })
  .superRefine((data, ctx) => {
    if (data.purchaseOrRefi === "Refinance") {
      if (!data.refi6Months || data.refi6Months.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["refi6Months"],
          message: "Required",
        });
      }
    }

    if (
      data.loanType === "Bridge" ||
      data.loanType === "Rental" ||
      data.loanType === "Fix and Flip"
    ) {
      if (!data.purchasePrice || data.purchasePrice <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["purchasePrice"],
          message: "Required",
        });
      }
    }

    if (data.loanType === "Fix and Flip") {
      if (!data.rehabCost || data.rehabCost <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rehabCost"],
          message: "Required",
        });
      }
      if (!data.fixFlipArv || data.fixFlipArv <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fixFlipArv"],
          message: "Required",
        });
      }
    }

    if (data.loanType === "Rental") {
      if (!data.rentalMonthlyIncome || data.rentalMonthlyIncome <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rentalMonthlyIncome"],
          message: "Required",
        });
      }
      if (!data.rentalAnnualTaxes || data.rentalAnnualTaxes <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rentalAnnualTaxes"],
          message: "Required",
        });
      }
      if (!data.rentalAnnualInsurance || data.rentalAnnualInsurance <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rentalAnnualInsurance"],
          message: "Required",
        });
      }
      if (
        data.rentalMonthlyHoa === undefined ||
        data.rentalMonthlyHoa === null ||
        data.rentalMonthlyHoa < 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rentalMonthlyHoa"],
          message: "Required",
        });
      }
      if (
        !data.rentalLeasedAtClosing ||
        data.rentalLeasedAtClosing.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rentalLeasedAtClosing"],
          message: "Required",
        });
      }
    }

    if (data.loanType === "Ground-Up Construction") {
      if (!data.inputLandCost || data.inputLandCost <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inputLandCost"],
          message: "Required",
        });
      }
      if (
        !data.inputGUCPurchaseConstructionCost ||
        data.inputGUCPurchaseConstructionCost <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inputGUCPurchaseConstructionCost"],
          message: "Required",
        });
      }
      if (!data.inputGUCARV || data.inputGUCARV <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["inputGUCARV"],
          message: "Required",
        });
      }
    }

    if (
      data.loanType === "Fix and Flip" ||
      data.loanType === "Ground-Up Construction"
    ) {
      if (!data.experience || data.experience.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["experience"],
          message: "Required",
        });
      }
    }
  });

type FormData = z.infer<typeof schema>;

export default function MultiStepForm() {
  const methods = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "Broker or Representative",
      brokerFee: "1.00%",
    },
  });
  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = methods;
  const [stepIndex, setStepIndex] = useState(0);

  const purchaseOrRefi = methods.watch("purchaseOrRefi");
  const loanType = methods.watch("loanType");
  const fico = methods.watch("fico");
  const propertyType = methods.watch("propertyType");
  const refi6Months = methods.watch("refi6Months");
  const preferredClosing = methods.watch("preferredClosing");
  const rentalLeasedAtClosing = methods.watch("rentalLeasedAtClosing");

  type StepId =
    | "profile"
    | "fico"
    | "address"
    | "propertyType"
    | "purchaseOrRefi"
    | "refi6Months"
    | "loanType"
    | "purchasePrice"
    | "rehabAndArv"
    | "rentalIncome"
    | "rentalExpenses"
    | "rentalLeased"
    | "landCost"
    | "gucConstructionCost"
    | "gucArv"
    | "experience"
    | "preferredClosing"
    | "leadSource"
    | "review"
    | "success";

  const stepIds: StepId[] = [
    "profile",
    "fico",
    "address",
    "propertyType",
    "purchaseOrRefi",
    ...(purchaseOrRefi === "Refinance" ? (["refi6Months"] as StepId[]) : []),
    "loanType",
    ...(loanType === "Bridge" ||
    loanType === "Rental" ||
    loanType === "Fix and Flip"
      ? (["purchasePrice"] as StepId[])
      : []),
    ...(loanType === "Fix and Flip" ? (["rehabAndArv"] as StepId[]) : []),
    ...(loanType === "Rental"
      ? (["rentalIncome", "rentalExpenses", "rentalLeased"] as StepId[])
      : []),
    ...(loanType === "Ground-Up Construction"
      ? (["landCost", "gucConstructionCost", "gucArv"] as StepId[])
      : []),
    ...(loanType === "Fix and Flip" || loanType === "Ground-Up Construction"
      ? (["experience"] as StepId[])
      : []),
    "preferredClosing",
    "leadSource",
    "review",
    "success",
  ];

  const step = stepIds[stepIndex];

  useEffect(() => {
    if (stepIndex > stepIds.length - 1) {
      setStepIndex(stepIds.length - 1);
    }
  }, [stepIndex, stepIds.length]);

  const goNext = async (fieldsToValidate: Array<keyof FormData>) => {
    const ok = await trigger(fieldsToValidate as any);
    if (ok) setStepIndex((i) => Math.min(i + 1, stepIds.length - 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const onSubmit = async (data: FormData) => {
    // Final stage: save to backend and prepare relay, but do not submit to lender
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.ok) {
      setStepIndex(stepIds.length - 1);
    } else {
      alert("Submission failed. Please try again.");
    }
  };

  const buildReviewItems = (values: FormData) => {
    const items: Array<{ label: string; value: string }> = [];
    const push = (label: string, value: unknown) => {
      if (value === undefined || value === null) return;
      const text = typeof value === "string" ? value.trim() : String(value);
      if (text.length === 0) return;
      items.push({ label, value: text });
    };

    push("Email", values.email);
    push("First name", values.firstName);
    push("Last name", values.lastName);
    push("Phone", values.phone);
    push("FICO", values.fico);
    push("Property address", values.propertyAddress);
    push("Property type", values.propertyType);
    push("Purchase or refinance", values.purchaseOrRefi);
    push("Purchased within 6 months", values.refi6Months);
    push("Loan type", values.loanType);
    push("Purchase price", values.purchasePrice);

    if (values.loanType === "Fix and Flip") {
      push("Estimated rehab cost", values.rehabCost);
      push("After-repair value (ARV)", values.fixFlipArv);
    }

    if (values.loanType === "Rental") {
      push("Monthly rental income", values.rentalMonthlyIncome);
      push("Annual property taxes", values.rentalAnnualTaxes);
      push("Annual insurance", values.rentalAnnualInsurance);
      push("Monthly HOA", values.rentalMonthlyHoa);
      push("Leased at closing", values.rentalLeasedAtClosing);
    }

    if (values.loanType === "Ground-Up Construction") {
      push("Land cost", values.inputLandCost);
      push("Construction cost", values.inputGUCPurchaseConstructionCost);
      push("After-repair value (ARV)", values.inputGUCARV);
    }

    push("Experience (last 36 months)", values.experience);
    push("Preferred closing timeline", values.preferredClosing);
    push("How did you hear about us?", values.leadSource);

    return items;
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit, () => {
          alert("Please complete all required fields before submitting.");
        })}
      >
        <div className="progress">
          {stepIds.map((_, i) => (
            <span key={i} className={i <= stepIndex ? "active" : ""}></span>
          ))}
        </div>

        {step === "profile" && (
          <fieldset>
            <h2 className="h2">Profile Details</h2>
            <p className="p">Takes less than 3 minutes.</p>

            <label>Email</label>
            <input type="email" {...register("email")} />
            {errors.email && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.email.message}
              </p>
            )}

            <label>First name</label>
            <input type="text" {...register("firstName")} />
            {errors.firstName && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.firstName.message}
              </p>
            )}

            <label>Last name</label>
            <input type="text" {...register("lastName")} />
            {errors.lastName && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.lastName.message}
              </p>
            )}

            <label>Phone number</label>
            <input type="tel" {...register("phone")} />
            {errors.phone && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.phone.message}
              </p>
            )}

            <div className="button-row">
              <button
                type="button"
                className="secondary"
                onClick={goBack}
                disabled
              >
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  goNext(["email", "firstName", "lastName", "phone"])
                }
              >
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "fico" && (
          <fieldset>
            <h2 className="h2">What's your estimated FICO score?</h2>
            <p className="p">
              If you're a foreign national, select "Foreign National".
            </p>
            <div className="select-grid">
              {ficoOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={fico === opt}
                  onClick={() => {
                    setValue("fico", opt as FormData["fico"], {
                      shouldValidate: true,
                    });
                    setStepIndex((i) => i + 1);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            {errors.fico && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.fico.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["fico"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "address" && (
          <fieldset>
            <h2 className="h2">What's the property address?</h2>
            <input
              type="text"
              placeholder="Street, City, State ZIP"
              {...register("propertyAddress")}
            />
            {errors.propertyAddress && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.propertyAddress.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["propertyAddress"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "propertyType" && (
          <fieldset>
            <h2 className="h2">What type of property is this?</h2>
            <div className="select-grid">
              {propertyTypeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={propertyType === opt}
                  onClick={() => {
                    setValue("propertyType", opt as FormData["propertyType"], {
                      shouldValidate: true,
                    });
                    setStepIndex((i) => i + 1);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            {errors.propertyType && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.propertyType.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["propertyType"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "purchaseOrRefi" && (
          <fieldset>
            <h2 className="h2">Are you purchasing or refinancing?</h2>
            <div className="select-grid">
              {purchaseOrRefiOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={purchaseOrRefi === opt}
                  onClick={() => {
                    setValue(
                      "purchaseOrRefi",
                      opt as FormData["purchaseOrRefi"],
                      { shouldValidate: true },
                    );
                    setStepIndex((i) => i + 1);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            {errors.purchaseOrRefi && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.purchaseOrRefi.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["purchaseOrRefi"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "refi6Months" && (
          <fieldset>
            <h2 className="h2">
              Did you purchase the property within the last 6 months?
            </h2>
            <div className="select-grid">
              {refi6MonthsOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={refi6Months === opt}
                  onClick={() => {
                    setValue("refi6Months", opt, { shouldValidate: true });
                    setStepIndex((i) => i + 1);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            {errors.refi6Months && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.refi6Months.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["refi6Months"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "loanType" && (
          <fieldset>
            <h2 className="h2">What type of loan are you looking for?</h2>
            <div className="select-grid">
              {loanTypeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={loanType === opt}
                  onClick={() => {
                    setValue("loanType", opt as FormData["loanType"], {
                      shouldValidate: true,
                    });
                    setStepIndex((i) => i + 1);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            {errors.loanType && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.loanType.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["loanType"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "purchasePrice" && (
          <fieldset>
            <h2 className="h2">What is the purchase price?</h2>
            <input type="number" step="0.01" {...register("purchasePrice")} />
            {errors.purchasePrice && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.purchasePrice.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["purchasePrice"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "rehabAndArv" && (
          <fieldset>
            <h2 className="h2">
              What are the estimated rehab costs and after-repair value (ARV)?
            </h2>
            <label>Estimated Rehab Cost</label>
            <input type="number" step="0.01" {...register("rehabCost")} />
            {errors.rehabCost && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.rehabCost.message}
              </p>
            )}

            <label>Est-Repair Value</label>
            <input type="number" step="0.01" {...register("fixFlipArv")} />
            {errors.fixFlipArv && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.fixFlipArv.message}
              </p>
            )}

            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                onClick={() => goNext(["rehabCost", "fixFlipArv"])}
              >
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "rentalIncome" && (
          <fieldset>
            <h2 className="h2">What is the estimated monthly rental income?</h2>
            <input
              type="number"
              step="0.01"
              {...register("rentalMonthlyIncome")}
            />
            {errors.rentalMonthlyIncome && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.rentalMonthlyIncome.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                onClick={() => goNext(["rentalMonthlyIncome"])}
              >
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "rentalExpenses" && (
          <fieldset>
            <h2 className="h2">What are the property’s estimated expenses?</h2>
            <label>Estimated Annual Property Taxes</label>
            <input
              type="number"
              step="0.01"
              {...register("rentalAnnualTaxes")}
            />
            {errors.rentalAnnualTaxes && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.rentalAnnualTaxes.message}
              </p>
            )}

            <label>Estimated Annual Insurance</label>
            <input
              type="number"
              step="0.01"
              {...register("rentalAnnualInsurance")}
            />
            {errors.rentalAnnualInsurance && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.rentalAnnualInsurance.message}
              </p>
            )}

            <label>Estimated Monthly HOA fees</label>
            <input
              type="number"
              step="0.01"
              {...register("rentalMonthlyHoa")}
            />
            {errors.rentalMonthlyHoa && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.rentalMonthlyHoa.message}
              </p>
            )}

            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                onClick={() =>
                  goNext([
                    "rentalAnnualTaxes",
                    "rentalAnnualInsurance",
                    "rentalMonthlyHoa",
                  ])
                }
              >
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "rentalLeased" && (
          <fieldset>
            <h2 className="h2">
              Will the property be leased at the time of closing?
            </h2>
            <div className="select-grid">
              {["Yes - Leased", "No - not Leased"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={rentalLeasedAtClosing === opt}
                  onClick={() => {
                    setValue("rentalLeasedAtClosing", opt, {
                      shouldValidate: true,
                    });
                    setStepIndex((i) => i + 1);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            {errors.rentalLeasedAtClosing && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.rentalLeasedAtClosing.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                onClick={() => goNext(["rentalLeasedAtClosing"])}
              >
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "landCost" && (
          <fieldset>
            <h2 className="h2">What is the land and construction cost?</h2>
            <p className="p">Enter the land cost first.</p>
            <input type="number" step="0.01" {...register("inputLandCost")} />
            {errors.inputLandCost && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.inputLandCost.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["inputLandCost"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "gucConstructionCost" && (
          <fieldset>
            <h2 className="h2">What are the estimated construction costs?</h2>
            <input
              type="number"
              step="0.01"
              {...register("inputGUCPurchaseConstructionCost")}
            />
            {errors.inputGUCPurchaseConstructionCost && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.inputGUCPurchaseConstructionCost.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                onClick={() => goNext(["inputGUCPurchaseConstructionCost"])}
              >
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "gucArv" && (
          <fieldset>
            <h2 className="h2">
              What is the estimated After-Repair Value(ARV)?
            </h2>
            <input type="number" step="0.01" {...register("inputGUCARV")} />
            {errors.inputGUCARV && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.inputGUCARV.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["inputGUCARV"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "experience" && (
          <fieldset>
            <h2 className="h2">Experience</h2>
            <p className="p">
              How many properties have you flipped or exited in the last 36
              months?
            </p>
            <div className="select-grid">
              {experienceOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={methods.watch("experience") === opt}
                  onClick={() => {
                    setValue("experience", opt as FormData["experience"], {
                      shouldValidate: true,
                    });
                    setStepIndex((i) => i + 1);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            {errors.experience && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.experience.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["experience"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "preferredClosing" && (
          <fieldset>
            <h2 className="h2">Preferred closing timeline?</h2>
            <div className="select-grid">
              {preferredClosingOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={preferredClosing === opt}
                  onClick={() => {
                    setValue("preferredClosing", opt, { shouldValidate: true });
                    setStepIndex((i) => i + 1);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
            {errors.preferredClosing && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.preferredClosing.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                onClick={() => goNext(["preferredClosing"])}
              >
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "leadSource" && (
          <fieldset>
            <h2 className="h2">How did you hear about us?</h2>
            <input
              type="text"
              list="leadSourceSuggestions"
              placeholder="e.g., BiggerPockets"
              {...register("leadSource")}
            />
            <datalist id="leadSourceSuggestions">
              {leadSourceSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {errors.leadSource && (
              <p className="p" style={{ color: "#b91c1c" }}>
                {errors.leadSource.message}
              </p>
            )}
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="button" onClick={() => goNext(["leadSource"])}>
                Next
              </button>
            </div>
          </fieldset>
        )}

        {step === "review" && (
          <fieldset>
            <h2 className="h2">Review & Confirm</h2>
            <p className="p">
              Review the information you entered before submitting.
            </p>

            <div
              style={{
                marginTop: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {buildReviewItems(methods.getValues()).map((item) => (
                    <tr
                      key={item.label}
                      style={{ borderTop: "1px solid #eef2f7" }}
                    >
                      <td
                        style={{
                          padding: 10,
                          width: "42%",
                          color: "#475569",
                          fontSize: 13,
                        }}
                      >
                        {item.label}
                      </td>
                      <td
                        style={{ padding: 10, color: "#0f172a", fontSize: 14 }}
                      >
                        {item.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="button-row">
              <button type="button" className="secondary" onClick={goBack}>
                Back
              </button>
              <button type="submit">Submit</button>
            </div>
          </fieldset>
        )}

        {step === "success" && (
          <fieldset>
            <h2 className="h2">Success</h2>
            <p className="p">Thanks — your information has been received.</p>
            <p className="p">If additional info is needed, we’ll follow up.</p>
          </fieldset>
        )}
      </form>
    </FormProvider>
  );
}
