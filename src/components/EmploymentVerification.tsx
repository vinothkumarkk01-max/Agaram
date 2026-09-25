"use client";

import { useActionState, useState, type CSSProperties } from "react";
import {
  requestWorkEmailOtp,
  confirmWorkEmailOtp,
  submitEmployerAttestation,
} from "@/app/actions/employment";
import type { Dictionary } from "@/lib/i18n/dictionary";

const inputStyle: CSSProperties = {
  background: "var(--bg-sunken)",
  border: "1px solid var(--line)",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "15px",
  color: "var(--text)",
  width: "100%",
};

type Status = "pending" | "verified" | "unable_to_verify";
type Method = "work_email" | "employer_attestation";

export function EmploymentVerification({
  t,
  status,
  method,
  workEmail,
}: {
  t: Dictionary;
  status: Status | null;
  method: Method | null;
  workEmail: string | null;
}) {
  // null = no method chosen yet in THIS session; a pending work_email
  // row from an earlier session still routes straight to the confirm
  // step below without needing `choice` set at all.
  const [choice, setChoice] = useState<Method | null>(null);

  const [otpState, otpAction, otpPending] = useActionState(requestWorkEmailOtp, undefined);
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmWorkEmailOtp,
    undefined
  );
  const [attestState, attestAction, attestPending] = useActionState(
    submitEmployerAttestation,
    undefined
  );

  if (status === "verified") {
    return (
      <p className="text-sm font-semibold" style={{ color: "var(--ok)" }}>
        {method === "work_email"
          ? t.account.employmentStatusVerifiedWorkEmail
          : t.account.employmentStatusVerifiedEmployer}
      </p>
    );
  }

  if (status === "pending" && method === "employer_attestation" && choice === null) {
    return (
      <p className="text-sm" style={{ color: "var(--text-soft)" }}>
        {t.account.employmentStatusPending}
      </p>
    );
  }

  // A code was already requested (this session or an earlier one) and
  // hasn't been confirmed yet — always show the confirm-code step
  // until it either succeeds or the member explicitly switches method.
  const awaitingCode =
    choice === "work_email"
      ? true
      : choice === null && status === "pending" && method === "work_email";

  if (awaitingCode) {
    return (
      <div className="flex flex-col gap-3">
        {status === "unable_to_verify" && (
          <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
            {t.account.employmentStatusUnable}
          </p>
        )}
        {!otpState?.success && choice === "work_email" && !workEmail ? (
          <form action={otpAction} className="flex flex-col gap-3">
            <input
              name="work_email"
              type="email"
              required
              placeholder={t.account.employmentWorkEmailLabel}
              style={inputStyle}
            />
            {otpState?.error && (
              <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
                {otpState.error}
              </p>
            )}
            <div className="flex gap-3 items-center">
              <button
                type="submit"
                disabled={otpPending}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                }}
              >
                {otpPending ? t.account.employmentSending : t.account.employmentSendCode}
              </button>
              <button
                type="button"
                onClick={() => setChoice(null)}
                className="text-xs font-semibold"
                style={{ color: "var(--text-soft)" }}
              >
                {t.common.cancel}
              </button>
            </div>
          </form>
        ) : (
          <form action={confirmAction} className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: "var(--text-soft)" }}>
              {otpState?.success ?? `${t.account.employmentCodeLabel} — ${workEmail ?? ""}`}
            </p>
            <input
              name="code"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder={t.account.employmentCodeLabel}
              style={inputStyle}
            />
            {confirmState?.error && (
              <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
                {confirmState.error}
              </p>
            )}
            <div className="flex gap-3 items-center flex-wrap">
              <button
                type="submit"
                disabled={confirmPending}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
                }}
              >
                {confirmPending ? t.account.employmentConfirming : t.account.employmentConfirmCode}
              </button>
              <button
                type="button"
                onClick={() => setChoice("employer_attestation")}
                className="text-xs font-semibold"
                style={{ color: "var(--text-soft)" }}
              >
                {t.account.employmentTryDifferentMethod}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  if (choice === "employer_attestation") {
    return (
      <form action={attestAction} className="flex flex-col gap-3">
        <input
          name="employer_name"
          required
          placeholder={t.account.employmentEmployerNameLabel}
          style={inputStyle}
        />
        <input
          name="employer_contact_email"
          type="email"
          required
          placeholder={t.account.employmentEmployerContactLabel}
          style={inputStyle}
        />
        <label className="flex items-start gap-2.5 text-xs" style={{ color: "var(--text-soft)" }}>
          <input type="checkbox" name="consent" required className="mt-0.5" />
          <span>{t.account.employmentConsentLabel}</span>
        </label>
        {attestState?.error && (
          <p className="text-xs" style={{ color: "var(--accent-strong)" }}>
            {attestState.error}
          </p>
        )}
        {attestState?.success && (
          <p className="text-xs" style={{ color: "var(--ok)" }}>
            {attestState.success}
          </p>
        )}
        {!attestState?.success && (
          <div className="flex gap-3 items-center">
            <button
              type="submit"
              disabled={attestPending}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, var(--accent), var(--accent-strong))",
              }}
            >
              {attestPending ? t.account.employmentSubmitting : t.account.employmentSubmitRequest}
            </button>
            <button
              type="button"
              onClick={() => setChoice(null)}
              className="text-xs font-semibold"
              style={{ color: "var(--text-soft)" }}
            >
              {t.common.cancel}
            </button>
          </div>
        )}
      </form>
    );
  }

  if (status === "unable_to_verify") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm" style={{ color: "var(--accent-strong)" }}>
          {t.account.employmentStatusUnable}
        </p>
        <MethodButtons />
      </div>
    );
  }

  return <MethodButtons />;

  function MethodButtons() {
    return (
      <div className="flex gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={() => setChoice("work_email")}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{
            background: "var(--bg-sunken)",
            border: "1px solid var(--line)",
            color: "var(--text)",
          }}
        >
          {t.account.employmentMethodWorkEmail}
        </button>
        <button
          type="button"
          onClick={() => setChoice("employer_attestation")}
          className="rounded-xl px-4 py-2.5 text-sm font-bold"
          style={{
            background: "var(--bg-sunken)",
            border: "1px solid var(--line)",
            color: "var(--text)",
          }}
        >
          {t.account.employmentMethodEmployer}
        </button>
      </div>
    );
  }
}
