/**
 * Live form validation rules.
 *
 * IMPORTANT: these rules MIRROR the server rules in
 * scanom-backend/utils/validation.py. The server is authoritative; this file
 * exists only so the app can guide the user while typing. If you change a rule
 * here, change it there too (and vice versa).
 */

export const LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 50,
  EMAIL_MAX: 50,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 72,
  LOCATION_MAX: 100,
  PASSWORD_TYPES_REQUIRED: 3,
} as const;

export interface RuleChild { label: string; ok: boolean }

export interface Rule {
  id: string;
  label: string;
  ok: boolean;
  /**
   * live = the problem can't be fixed by typing more (e.g. an illegal character),
   * so flag it red immediately. Non-live rules stay neutral until the field is
   * left (blur) or the user taps the submit button.
   */
  live: boolean;
  children?: RuleChild[];
}

const NAME_RE   = /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'\-]*$/;
const EMAIL_RE  = /^([A-Za-z0-9._%+\-]+)@([A-Za-z0-9.\-]+)\.([A-Za-z]{2,})$/;
const REPEAT_RE = /(.)\1{3,}/i; // same character 4+ times in a row

export const allOk = (rules: Rule[]) => rules.every((r) => r.ok);

// ── NAME ─────────────────────────────────────────────────────────────────────
export function nameRules(raw: string): Rule[] {
  const v = raw.replace(/\s+/g, " ").trim();
  return [
    {
      id: "len",
      label: `${LIMITS.NAME_MIN}\u2013${LIMITS.NAME_MAX} characters`,
      ok: v.length >= LIMITS.NAME_MIN && v.length <= LIMITS.NAME_MAX,
      live: false,
    },
    {
      id: "chars",
      label: "Letters, spaces, apostrophes ('), hyphens (-) and periods (.) only",
      ok: v.length === 0 || NAME_RE.test(v),
      live: true,
    },
    {
      id: "repeat",
      label: "No character repeated 4 or more times in a row",
      ok: !REPEAT_RE.test(v),
      live: true,
    },
  ];
}

// ── LOCATION ─────────────────────────────────────────────────────────────────
export function locationRules(raw: string): Rule[] {
  const v = raw.replace(/\s+/g, " ").trim();
  return [
    {
      id: "repeat",
      label: "No character repeated 4 or more times in a row",
      ok: !REPEAT_RE.test(v),
      live: true,
    },
  ];
}

// ── EMAIL ────────────────────────────────────────────────────────────────────
export function isValidEmailFormat(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  if (v.length > LIMITS.EMAIL_MAX) return false;
  const m = EMAIL_RE.exec(v);
  if (!m) return false;
  const local = m[1];
  const domain = m[2];
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  return domain.split(".").every((lb) => lb.length > 0 && !lb.startsWith("-") && !lb.endsWith("-"));
}

export function emailRules(raw: string): Rule[] {
  const v = raw.trim().toLowerCase();
  const local = v.includes("@") ? v.split("@")[0] : v;
  return [
    {
      id: "format",
      label: "A valid email address (e.g. name@example.com)",
      ok: isValidEmailFormat(v),
      live: false,
    },
    {
      id: "repeat",
      label: "No character repeated 4 or more times in a row before the @",
      ok: !REPEAT_RE.test(local),
      live: true,
    },
  ];
}

// ── PASSWORD ─────────────────────────────────────────────────────────────────
export function passwordTypeFlags(pw: string) {
  return {
    lower:   /[a-z]/.test(pw),
    upper:   /[A-Z]/.test(pw),
    number:  /[0-9]/.test(pw),
    special: /[^A-Za-z0-9\s]/.test(pw),
  };
}

export function passwordRules(pw: string): Rule[] {
  const f = passwordTypeFlags(pw);
  const count = Object.values(f).filter(Boolean).length;
  return [
    {
      id: "len",
      label: `At least ${LIMITS.PASSWORD_MIN} characters`,
      ok: pw.length >= LIMITS.PASSWORD_MIN && pw.length <= LIMITS.PASSWORD_MAX,
      live: false,
    },
    {
      id: "types",
      label: `At least ${LIMITS.PASSWORD_TYPES_REQUIRED} of the following:`,
      ok: count >= LIMITS.PASSWORD_TYPES_REQUIRED,
      live: false,
      children: [
        { label: "Lowercase letters (a-z)",          ok: f.lower },
        { label: "Uppercase letters (A-Z)",          ok: f.upper },
        { label: "Numbers (0-9)",                    ok: f.number },
        { label: "Special characters (e.g. !@#$%^&*)", ok: f.special },
      ],
    },
  ];
}

export function confirmRules(pw: string, confirm: string): Rule[] {
  return [
    {
      id: "match",
      label: "Passwords match",
      ok: confirm.length > 0 && confirm === pw,
      live: false,
    },
  ];
}
