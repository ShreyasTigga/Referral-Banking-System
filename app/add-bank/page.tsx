"use client";

import { useState, FormEvent, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface BankAccount {
  id?: string;
  fullName: string;
  aadhaar: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  pan?: string;
  upi?: string;
}

export default function AddBankAccountPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("userId");

  const [form, setForm] = useState<BankAccount>({
    fullName: "",
    aadhaar: "",
    bankName: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    pan: "",
    upi: "",
  });

  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load existing bank account if any
  useEffect(() => {
    async function loadExisting() {
      if (!userId) {
        setInitialLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/bank/user/${userId}`);
        if (!res.ok) {
          // no account or error, ignore for now
          setInitialLoading(false);
          return;
        }
        const data = await res.json();
        setForm({
          id: data.id,
          fullName: data.fullName,
          aadhaar: data.aadhaar,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          ifsc: data.ifsc,
          branch: data.branch,
          pan: data.pan ?? "",
          upi: data.upi ?? "",
        });
        setConfirmAccountNumber(data.accountNumber);
        setInitialLoading(false);
      } catch (err) {
        console.error("Error fetching bank account:", err);
        setInitialLoading(false);
      }
    }
    loadExisting();
  }, [userId]);

  // Helper to mask Aadhaar as XXXX XXXX XXXX
  const handleAadhaarChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const masked = cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
    setForm((prev) => ({ ...prev, aadhaar: masked.trim() }));
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!userId) {
      setError("Missing userId in URL. Please login again.");
      return;
    }

    if (form.accountNumber !== confirmAccountNumber) {
      setError("Account numbers do not match.");
      return;
    }

    if (form.aadhaar.replace(/\s/g, "").length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fullName: form.fullName,
          aadhaar: form.aadhaar,
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          ifsc: form.ifsc,
          branch: form.branch,
          pan: form.pan,
          upi: form.upi,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save bank account.");
        setLoading(false);
        return;
      }

      setSuccess("Bank account saved successfully!");
      setLoading(false);

      // Redirect back to dashboard in a moment
      setTimeout(() => {
        router.push(`/dashboard?userId=${userId}`);
      }, 1500);
    } catch (err) {
      console.error("Error saving bank account:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Loading bank details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <p className="text-[12px] tracking-wide uppercase text-blue-100">
            Referral Banking System
          </p>
          <h1 className="text-xl font-semibold text-white mt-1">
            {form.id ? "Update Bank Account" : "Add Bank Account"}
          </h1>
          <p className="text-[11px] text-blue-100 mt-1">
            Your earnings will be credited to this bank account.
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-4">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md">
              {success}
            </p>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div>
              <label className="block text-sm mb-1">Full Name</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                value={form.fullName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
                placeholder="As per bank records"
                required
              />
            </div>

            {/* Aadhaar */}
            <div>
              <label className="block text-sm mb-1">Aadhaar Number</label>
              <input
                type="text"
                maxLength={14}
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                value={form.aadhaar}
                onChange={(e) => handleAadhaarChange(e.target.value)}
                placeholder="XXXX XXXX XXXX"
                required
              />
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-sm mb-1">Bank Name</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                value={form.bankName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, bankName: e.target.value }))
                }
                required
              >
                <option value="">Select your bank</option>
                <option value="SBI">State Bank of India</option>
                <option value="HDFC">HDFC Bank</option>
                <option value="ICICI">ICICI Bank</option>
                <option value="AXIS">Axis Bank</option>
                <option value="PNB">Punjab National Bank</option>
                <option value="BOB">Bank of Baroda</option>
              </select>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm mb-1">Account Number</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.accountNumber}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    accountNumber: e.target.value,
                  }))
                }
                required
              />
            </div>

            {/* Confirm Account Number */}
            <div>
              <label className="block text-sm mb-1">
                Confirm Account Number
              </label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={confirmAccountNumber}
                onChange={(e) => setConfirmAccountNumber(e.target.value)}
                required
              />
            </div>

            {/* IFSC */}
            <div>
              <label className="block text-sm mb-1">IFSC Code</label>
              <input
                type="text"
                className="w-full uppercase border rounded-md px-3 py-2 text-sm"
                value={form.ifsc}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ifsc: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g. SBIN0001234"
                required
              />
            </div>

            {/* Branch */}
            <div>
              <label className="block text-sm mb-1">Bank Branch</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.branch}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, branch: e.target.value }))
                }
                placeholder="Branch name"
                required
              />
            </div>

            {/* PAN (optional) */}
            <div>
              <label className="block text-sm mb-1">
                PAN Number (optional)
              </label>
              <input
                type="text"
                className="w-full uppercase border rounded-md px-3 py-2 text-sm"
                value={form.pan}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))
                }
                placeholder="ABCDE1234F"
              />
            </div>

            {/* UPI ID (optional) */}
            <div>
              <label className="block text-sm mb-1">
                UPI ID (optional)
              </label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={form.upi}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, upi: e.target.value }))
                }
                placeholder="yourupi@bank"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-60 flex justify-center"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : form.id ? (
                "Update Bank Account"
              ) : (
                "Add Bank Account"
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() =>
              userId
                ? router.push(`/dashboard?userId=${userId}`)
                : router.push("/login")
            }
            className="w-full mt-2 text-[12px] text-slate-500 hover:text-blue-600"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
