"use client";

import { useEffect, useState, FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Child {
  id: string;
  name: string;
  email: string;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
  currentBalance: number;
  referredBy: string | null;
  children: Child[];
}

interface WithdrawalItem {
  id: string;
  requestedAmount: number;
  dateOfRequest: string;
  withdrawalAmount: number | null;
  dateOfWithdrawal: string | null;
  status: string;
}

interface BankAccount {
  id?: string;
  fullName: string;
  aadhaar: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  pan?: string | null;
  upi?: string | null;
  isActive?: boolean;
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("userId");

  const [user, setUser] = useState<UserDetails | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [hasBankAccount, setHasBankAccount] = useState(false);

  const [loading, setLoading] = useState(true);
  const [bankLoading, setBankLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Withdrawal form states
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<string | null>(null);

  // Change Password states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState<string | null>(null);

  // -------------------------------------------------
  // Load user, withdrawals, and bank account
  // -------------------------------------------------
  async function fetchData() {
    if (!userId) {
      setError("No userId provided in URL");
      setLoading(false);
      setBankLoading(false);
      return;
    }

    try {
      setLoading(true);
      setBankLoading(true);
      setError(null);

      // 1) User details
      const userRes = await fetch(`/api/users/${userId}`);
      const userJson = await userRes.json();

      if (!userRes.ok) {
        setError(userJson.error || "Failed to load user details");
        setLoading(false);
        setBankLoading(false);
        return;
      }

      // 2) Withdrawal history
      const wRes = await fetch(`/api/withdrawals/user/${userId}`);
      const wJson = await wRes.json();

      if (!wRes.ok) {
        setError(wJson.error || "Failed to load withdrawal history");
        setLoading(false);
        setBankLoading(false);
        return;
      }

      setUser(userJson);
      setWithdrawals(wJson);
      setLoading(false);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Something went wrong while loading dashboard.");
      setLoading(false);
    }

    // 3) Bank account info (separate try so user still loads if bank fails)
    try {
      if (!userId) {
        setBankLoading(false);
        return;
      }

      const bankRes = await fetch(`/api/bank/user/${userId}`);
      if (!bankRes.ok) {
        // 404 -> no bank account yet
        setHasBankAccount(false);
        setBankAccount(null);
        setBankLoading(false);
        return;
      }

      const bankJson = await bankRes.json();
      setHasBankAccount(true);
      setBankAccount(bankJson);
      setBankLoading(false);
    } catch (err) {
      console.error("Error loading bank account:", err);
      setHasBankAccount(false);
      setBankAccount(null);
      setBankLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // -------------------------------------------------
  // Computed values
  // -------------------------------------------------
  const currentBalance = user?.currentBalance ?? 0;

  const approvedWithdrawals = withdrawals.filter(
    (w) => w.status === "approved" && typeof w.withdrawalAmount === "number"
  );

  const totalWithdrawn = approvedWithdrawals.reduce(
    (sum, w) => sum + (w.withdrawalAmount || 0),
    0
  );

  const totalEarnings = currentBalance + totalWithdrawn;
  const referralsCount = user?.children.length ?? 0;

  // -------------------------------------------------
  // Handle Withdrawal Request
  // -------------------------------------------------
  async function handleWithdrawalRequest(e: FormEvent) {
    e.preventDefault();
    setWithdrawMessage(null);
    setError(null);

    if (!userId) {
      setError("Missing userId.");
      return;
    }

    if (!hasBankAccount) {
      setError("Please add a bank account before requesting withdrawal.");
      return;
    }

    const amountNum = Number(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setWithdrawLoading(true);

    try {
      const res = await fetch("/api/withdrawals/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: amountNum }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create withdrawal request");
        setWithdrawLoading(false);
        return;
      }

      setWithdrawMessage("Withdrawal request submitted successfully!");
      setWithdrawAmount("");
      setWithdrawLoading(false);

      // refresh data
      fetchData();
    } catch (err) {
      console.error("Withdrawal request error:", err);
      setError("Something went wrong while requesting withdrawal.");
      setWithdrawLoading(false);
    }
  }

  // -------------------------------------------------
  // Change Password
  // -------------------------------------------------
  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setCpError(null);
    setCpSuccess(null);

    if (!userId) {
      setCpError("Missing userId in URL.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setCpError("New password and confirm password do not match.");
      return;
    }

    setCpLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          oldPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCpError(data.error || "Failed to change password.");
        setCpLoading(false);
        return;
      }

      setCpSuccess("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCpLoading(false);
    } catch (err) {
      console.error("Change password error:", err);
      setCpError("Something went wrong.");
      setCpLoading(false);
    }
  }

  // -------------------------------------------------
  // Loading / error states
  // -------------------------------------------------
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-600">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if ((error && !user) || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white shadow-md rounded-xl p-5 max-w-md w-full border border-red-100">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            Unable to load dashboard
          </h2>
          <p className="text-sm text-red-600 mb-3">
            {error || "No user data available."}
          </p>
          <p className="text-xs text-slate-500 mb-3">
            Try logging in again or contact support if the problem persists.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="px-3 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------
  // Main UI
  // -------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Global error for actions */}
        {error && user && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-white">
          <div>
            <p className="text-xs uppercase tracking-wide text-blue-100">
              Referral Banking
            </p>
            <h1 className="text-2xl font-semibold leading-tight">
              Welcome, {user.name}
            </h1>
            <p className="text-xs text-blue-100 mt-1">{user.email}</p>
            <p className="text-[11px] text-blue-100 mt-1">
              Referred By:{" "}
              <span className="font-medium">
                {user.referredBy ?? "No referrer (root user)"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3 justify-between md:justify-end">
            <div className="text-right text-xs">
              <p className="text-blue-100">User ID</p>
              <p className="font-mono text-[11px] bg-blue-700/40 rounded px-2 py-1 inline-block">
                {user.id.slice(0, 6)}…{user.id.slice(-4)}
              </p>
            </div>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="px-3 py-2 bg-white/10 border border-white/30 text-xs rounded-md hover:bg-white/20 transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-[11px] text-slate-500">Current Balance</p>
            <p className="text-2xl font-semibold text-emerald-600 mt-1">
              ₹{currentBalance}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Available for withdrawal
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-[11px] text-slate-500">Total Withdrawn</p>
            <p className="text-2xl font-semibold text-amber-600 mt-1">
              ₹{totalWithdrawn}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Amount already paid out
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-[11px] text-slate-500">Total Earnings</p>
            <p className="text-2xl font-semibold text-blue-700 mt-1">
              ₹{totalEarnings}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Balance + withdrawn
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
            <p className="text-[11px] text-slate-500">People You Referred</p>
            <p className="text-2xl font-semibold text-purple-700 mt-1">
              {referralsCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Active direct referrals
            </p>
          </div>
        </section>

        {/* Main layout */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Side: referrals + history */}
          <div className="md:col-span-2 space-y-4">
            {/* Referrals */}
            <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">People You Referred</h2>
                <span className="text-[11px] text-slate-400">
                  Direct children in the referral tree
                </span>
              </div>
              {user.children.length === 0 ? (
                <p className="text-sm text-slate-500">
                  You haven&apos;t referred anyone yet. Share your referral link
                  to start earning.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {user.children.map((child) => (
                    <li
                      key={child.id}
                      className="flex justify-between items-center border-b border-slate-100 pb-1 last:border-b-0"
                    >
                      <div>
                        <span className="font-medium">{child.name}</span>
                        <p className="text-[11px] text-slate-500">
                          {child.email}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {child.id.slice(0, 6)}…{child.id.slice(-4)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Withdrawal history */}
            <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4">
              <h2 className="text-sm font-semibold mb-2">
                Withdrawal History
              </h2>

              {withdrawals.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No withdrawal requests yet. Once you request a withdrawal, it
                  will appear here.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-left">
                        <th className="border-b border-slate-200 px-2 py-1">
                          Requested
                        </th>
                        <th className="border-b border-slate-200 px-2 py-1">
                          Amount
                        </th>
                        <th className="border-b border-slate-200 px-2 py-1">
                          Status
                        </th>
                        <th className="border-b border-slate-200 px-2 py-1">
                          Processed
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="border-b border-slate-100 px-2 py-1">
                            {new Date(w.dateOfRequest).toLocaleString()}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1">
                            ₹{w.requestedAmount}
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full capitalize ${
                                w.status === "approved"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  : w.status === "rejected"
                                  ? "bg-red-50 text-red-700 border border-red-100"
                                  : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td className="border-b border-slate-100 px-2 py-1">
                            {w.dateOfWithdrawal
                              ? new Date(
                                  w.dateOfWithdrawal
                                ).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: bank + withdrawal + password */}
          <div className="space-y-4">
            {/* Bank Status Card */}
            <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Bank Account</h2>
                {bankLoading && (
                  <span className="text-[11px] text-slate-400">
                    Loading…
                  </span>
                )}
              </div>

              {!hasBankAccount || !bankAccount ? (
                <>
                  <p className="text-sm text-slate-500 mb-2">
                    No bank account linked to your profile.
                  </p>
                  <p className="text-[11px] text-slate-500 mb-3">
                    You must add a bank account before you can request
                    withdrawals.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        userId ? `/add-bank?userId=${userId}` : "/add-bank"
                      )
                    }
                    className="w-full bg-blue-600 text-white py-2 rounded-md text-sm hover:bg-blue-700"
                  >
                    Add Bank Account
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-700 font-medium mb-1">
                    {bankAccount.bankName} — {bankAccount.branch}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    A/C ending with{" "}
                    <span className="font-mono">
                      {bankAccount.accountNumber.slice(-4)}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    IFSC: {bankAccount.ifsc}
                  </p>
                  {bankAccount.upi && (
                    <p className="text-[11px] text-slate-500">
                      UPI: {bankAccount.upi}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        userId ? `/add-bank?userId=${userId}` : "/add-bank"
                      )
                    }
                    className="w-full mt-3 bg-slate-900 text-white py-2 rounded-md text-sm hover:bg-black"
                  >
                    Edit Bank Details
                  </button>
                </>
              )}
            </div>

            {/* Withdrawal Request */}
            <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4">
              <h2 className="text-sm font-semibold mb-2">
                Request Withdrawal
              </h2>
              <p className="text-[11px] text-slate-500 mb-3">
                You can request a withdrawal up to your current balance. Your
                request will be reviewed by the admin.
              </p>

              <form onSubmit={handleWithdrawalRequest} className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">
                    Amount to Withdraw (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    disabled={!hasBankAccount}
                  />
                  {!hasBankAccount && (
                    <p className="text-[11px] text-red-500 mt-1">
                      Add a bank account to enable withdrawals.
                    </p>
                  )}
                </div>

                {withdrawMessage && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md p-2">
                    {withdrawMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={withdrawLoading || !hasBankAccount}
                  className="w-full bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center"
                >
                  {withdrawLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting…
                    </span>
                  ) : (
                    "Submit Withdrawal Request"
                  )}
                </button>
              </form>
            </div>

            {/* Change Password Section */}
            <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4">
              <h2 className="text-sm font-semibold mb-2">Change Password</h2>
              <p className="text-[11px] text-slate-500 mb-3">
                Keep your account secure by regularly updating your password.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {cpError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md p-2">
                    {cpError}
                  </p>
                )}

                {cpSuccess && (
                  <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md p-2">
                    {cpSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={cpLoading}
                  className="w-full bg-slate-800 text-white py-2 rounded-md text-sm hover:bg-slate-900 disabled:opacity-60 flex items-center justify-center"
                >
                  {cpLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating…
                    </span>
                  ) : (
                    "Change Password"
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
