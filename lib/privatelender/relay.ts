import { z } from 'zod';
import crypto from 'node:crypto';

export const internalSubmissionSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(7),
  role: z.string().min(1),
  fico: z.string().min(1),
  propertyAddress: z.string().min(5).regex(/\b\d{5}(?:-\d{4})?\b/),
  propertyType: z.string().min(1),
  purchaseOrRefi: z.string().min(1),
  refi6Months: z.string().optional(),
  loanType: z.string().min(1),
  purchasePrice: z.number().optional(),
  rehabCost: z.number().optional(),
  fixFlipArv: z.number().optional(),
  rentalMonthlyIncome: z.number().optional(),
  rentalAnnualTaxes: z.number().optional(),
  rentalAnnualInsurance: z.number().optional(),
  rentalMonthlyHoa: z.number().optional(),
  rentalLeasedAtClosing: z.string().optional(),
  inputLandCost: z.number().optional(),
  inputGUCPurchaseConstructionCost: z.number().optional(),
  inputGUCARV: z.number().optional(),
  experience: z.string().optional(),
  preferredClosing: z.string().min(1),
  brokerFee: z.string().min(1),
  leadSource: z.string().min(1),
}).superRefine((data, ctx) => {
  if (data.purchaseOrRefi.toLowerCase() === 'refinance') {
    if (!data.refi6Months || data.refi6Months.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['refi6Months'], message: 'Required' });
    }
  }

  const loanType = data.loanType.toLowerCase();
  if (loanType === 'bridge' || loanType === 'rental' || loanType === 'fix and flip') {
    if (!data.purchasePrice || data.purchasePrice <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['purchasePrice'], message: 'Required' });
    }
  }

  if (loanType === 'fix and flip') {
    if (!data.rehabCost || data.rehabCost <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rehabCost'], message: 'Required' });
    }
    if (!data.fixFlipArv || data.fixFlipArv <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fixFlipArv'], message: 'Required' });
    }
    if (!data.experience || data.experience.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['experience'], message: 'Required' });
    }
  }

  if (loanType === 'rental') {
    if (!data.rentalMonthlyIncome || data.rentalMonthlyIncome <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rentalMonthlyIncome'], message: 'Required' });
    }
    if (!data.rentalAnnualTaxes || data.rentalAnnualTaxes <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rentalAnnualTaxes'], message: 'Required' });
    }
    if (!data.rentalAnnualInsurance || data.rentalAnnualInsurance <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rentalAnnualInsurance'], message: 'Required' });
    }
    if (data.rentalMonthlyHoa === undefined || data.rentalMonthlyHoa === null || data.rentalMonthlyHoa < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rentalMonthlyHoa'], message: 'Required' });
    }
    if (!data.rentalLeasedAtClosing || data.rentalLeasedAtClosing.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rentalLeasedAtClosing'], message: 'Required' });
    }
  }

  if (loanType === 'ground-up construction') {
    if (!data.inputLandCost || data.inputLandCost <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['inputLandCost'], message: 'Required' });
    }
    if (!data.inputGUCPurchaseConstructionCost || data.inputGUCPurchaseConstructionCost <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['inputGUCPurchaseConstructionCost'], message: 'Required' });
    }
    if (!data.inputGUCARV || data.inputGUCARV <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['inputGUCARV'], message: 'Required' });
    }

    if (!data.experience || data.experience.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['experience'], message: 'Required' });
    }
  }
});

export type InternalSubmission = z.infer<typeof internalSubmissionSchema>;

function safeJsonEnv<T>(value: string | undefined, schema: z.ZodType<T>): T | undefined {
  if (!value) return undefined;
  try {
    return schema.parse(JSON.parse(value));
  } catch {
    return undefined;
  }
}

const stringRecord = z.record(z.string());
const unknownRecord = z.record(z.unknown());

// You will replace these keys once we extract the exact request from a HAR.
// Until then, this is only a best-effort mapping.
export function buildPrivatelenderPayload(input: InternalSubmission, injectedEmail: string) {
  const payloadMode = (process.env.PRIVATELENDER_PAYLOAD_MODE ?? 'flat').toLowerCase();

  const formatUsd = (value: number | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '';
    const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(value));
    return `$${formatted}`;
  };

  const buildAddressInput = (raw: string): Record<string, unknown> => {
    const trimmed = raw.trim();
    const postalMatch = trimmed.match(/\b\d{5}(?:-\d{4})?\b/);
    const postalCode = postalMatch?.[0];

    // Tries to match: ", City, ST 12345" (best-effort)
    const cityStateZip = trimmed.match(/,\s*([^,]+),\s*([A-Z]{2})\s+\d{5}(?:-\d{4})?\b/);
    const city = cityStateZip?.[1]?.trim();
    const subdivision = cityStateZip?.[2]?.trim();

    const out: Record<string, unknown> = {
      formatted: trimmed,
      country: 'US',
    };

    if (postalCode) out.postalCode = postalCode;
    if (subdivision) out.subdivision = subdivision;
    if (city) out.city = city;

    const subdivisions: Array<Record<string, unknown>> = [];
    if (subdivision) {
      subdivisions.push({ code: subdivision, name: subdivision, type: 'ADMINISTRATIVE_AREA_LEVEL_1' });
    }
    subdivisions.push({ code: 'US', name: 'United States', type: 'COUNTRY' });
    out.subdivisions = subdivisions;

    return out;
  };

  // Captured from Playwright: https://surecaplenders.net/privatelender/intake-form-update.php
  // Shape: { session_id, form_data: {...}, sent_timestamp, complete }
  if (payloadMode === 'surecap-intake-form-update') {
    const staticFormFields = safeJsonEnv(process.env.PRIVATELENDER_STATIC_FIELDS_JSON, unknownRecord) ?? {};
    const roleTag = input.role.toLowerCase().includes('broker') ? 'Broker' : 'Borrower';

    const formData: Record<string, unknown> = {
      utm: { source: null, medium: null, campaign: null, content: null, term: null },
      email: injectedEmail,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNum: input.phone,
      selectionTagsBorrowerBroker: roleTag,
      selectionTagsFICO: input.fico,
      addressInput: buildAddressInput(input.propertyAddress),
      selectionTagsPropertyType: input.propertyType,
      // Captured payload uses loanPurpose="Purchase" even when selectionTagsPurchaseRefinance="Refinance".
      // Keep loanPurpose stable to better match captured behavior.
      loanPurpose: 'Purchase',
      selectionTagsPurchaseRefinance: input.purchaseOrRefi,
      selectionTagsLoanType: input.loanType,
      selectionTagsBorrowerExperience: input.experience,

      ...staticFormFields,
    };

    if (input.refi6Months && input.refi6Months.trim().length > 0) {
      formData.selectionTagsRefi6Months = input.refi6Months;
    }

    const loanTypeLower = input.loanType.toLowerCase();

    // Best-effort additions for other loan types. We don't have capture-confirmed key names
    // for these yet, but including them is harmless if the backend ignores unknown keys.
    // Once we capture those flows, we should rename keys to match exactly.
    if (loanTypeLower === 'fix and flip') {
      if (typeof input.rehabCost === 'number') formData.inputRehabCost = formatUsd(input.rehabCost);
      if (typeof input.fixFlipArv === 'number') formData.inputARV = formatUsd(input.fixFlipArv);
    }

    if (loanTypeLower === 'rental') {
      if (typeof input.rentalMonthlyIncome === 'number') formData.inputMonthlyRentalIncome = formatUsd(input.rentalMonthlyIncome);
      if (typeof input.rentalAnnualTaxes === 'number') formData.inputAnnualPropertyTaxes = formatUsd(input.rentalAnnualTaxes);
      if (typeof input.rentalAnnualInsurance === 'number') formData.inputAnnualInsurance = formatUsd(input.rentalAnnualInsurance);
      if (typeof input.rentalMonthlyHoa === 'number') formData.inputMonthlyHOAFees = formatUsd(input.rentalMonthlyHoa);
      if (input.rentalLeasedAtClosing && input.rentalLeasedAtClosing.trim().length > 0) {
        formData.selectionTagsLeasedAtClosing = input.rentalLeasedAtClosing;
      }
    }

    if (input.loanType.toLowerCase() === 'ground-up construction') {
      if (typeof input.inputLandCost === 'number') formData.inputLandCost = formatUsd(input.inputLandCost);
      if (typeof input.inputGUCPurchaseConstructionCost === 'number') {
        formData.inputGUCPurchaseConstructionCost = formatUsd(input.inputGUCPurchaseConstructionCost);
      }
      if (typeof input.inputGUCARV === 'number') formData.inputGUCARV = formatUsd(input.inputGUCARV);
    }

    // Final-stage fields
    formData.selectionTagsPreferredClosing = input.preferredClosing;
    formData.selectionTagsBrokerFee = input.brokerFee;
    formData.radioGroupLeadSource = input.leadSource;

    if (input.experience && input.experience.trim().length > 0) {
      formData.selectionTagsBorrowerExperience = input.experience;
    }

    return {
      session_id: crypto.randomUUID(),
      form_data: formData,
      sent_timestamp: Date.now(),
      complete: true,
    };
  }

  const fieldMap = safeJsonEnv(process.env.PRIVATELENDER_FIELD_MAP_JSON, stringRecord);
  const staticFields = safeJsonEnv(process.env.PRIVATELENDER_STATIC_FIELDS_JSON, stringRecord) ?? {};

  const internal = {
    email: injectedEmail,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    role: input.role,
    fico: input.fico,
    propertyAddress: input.propertyAddress,
    propertyType: input.propertyType,
    purchaseOrRefi: input.purchaseOrRefi,
    loanType: input.loanType,
    purchasePrice: String(input.purchasePrice),
    experience: input.experience,
    refi6Months: input.refi6Months ?? '',
    inputLandCost: String(input.inputLandCost ?? ''),
    inputGUCPurchaseConstructionCost: String(input.inputGUCPurchaseConstructionCost ?? ''),
    inputGUCARV: String(input.inputGUCARV ?? ''),
    preferredClosing: input.preferredClosing,
    brokerFee: input.brokerFee,
    leadSource: input.leadSource,
  };

  const defaultMap: Record<string, string> = {
    email: 'email',
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    role: 'role',
    fico: 'fico_estimate',
    propertyAddress: 'property_address',
    propertyType: 'property_type',
    purchaseOrRefi: 'intent',
    loanType: 'loan_type',
    purchasePrice: 'purchase_price',
    experience: 'experience_36m',
    refi6Months: 'refi_6_months',
    inputLandCost: 'land_cost',
    inputGUCPurchaseConstructionCost: 'guc_construction_cost',
    inputGUCARV: 'guc_arv',
    preferredClosing: 'preferred_closing',
    brokerFee: 'broker_fee',
    leadSource: 'lead_source',
  };

  const map = { ...defaultMap, ...(fieldMap ?? {}) };
  const out: Record<string, string> = { ...staticFields };

  (Object.keys(internal) as Array<keyof typeof internal>).forEach((k) => {
    const externalKey = map[String(k)];
    if (externalKey) out[externalKey] = String(internal[k] ?? '');
  });

  return out;
}
