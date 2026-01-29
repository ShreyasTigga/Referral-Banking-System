"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Section =
  | "overview"
  | "users"
  | "withdrawals"
  | "transactions"
  | "referrals";

interface WithdrawalItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedAmount: number;
  dateOfRequest: string;
  withdrawalAmount: number | null;
  dateOfWithdrawal: string | null;
  status: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  referredBy: string | null;
  currentBalance: number;
  createdAt: string;
}

interface ReferralInfo {
  user: { id: string; name: string; email: string };
  ancestors: { id: string; name: string; email: string }[];
  children: { id: string; name: string; email: string }[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For transactions filter
  const [transactionFilter, setTransactionFilter] = useState<
    "all" | "approved" | "rejected"
  >("all");

  // Users search
  const [userSearch, setUserSearch] = useState("");

  // For referral explorer
  const [refUserId, setRefUserId] = useState("");
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);

  async function fetchAllData() {
    try {
      setLoading(true);
      setError(null);

      // Get all users
      const usersRes = await fetch("/api/admin/users");
      if (usersRes.status === 401) {
        setError("Not authorized. Please login as admin again.");
        setLoading(false);
        setTimeout(() => router.push("/admin/login"), 1500);
        return;
      }
      const usersJson = await usersRes.json();
      if (!usersRes.ok) {
        setError(usersJson.error || "Failed to load users");
        setLoading(false);
        return;
      }

      // Get all withdrawals (all statuses)
      const wRes = await fetch("/api/admin/withdrawals?status=all");
      if (wRes.status === 401) {
        setError("Not authorized. Please login as admin again.");
        setLoading(false);
        setTimeout(() => router.push("/admin/login"), 1500);
        return;
      }
      const wJson = await wRes.json();
      if (!wRes.ok) {
        setError(wJson.error || "Failed to load withdrawals");
        setLoading(false);
        return;
      }

      setUsers(usersJson);
      setWithdrawals(wJson);
      setLoading(false);
    } catch (err) {
      console.error("Error loading admin dashboard data:", err);
      setError("Something went wrong while loading admin data.");
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAction(requestId: string, action: "approve" | "reject") {
    try {
      setError(null);

      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      if (res.status === 401) {
        setError("Not authorized. Please login as admin again.");
        setTimeout(() => router.push("/admin/login"), 1500);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Failed to ${action} request`);
        return;
      }

      // Refresh all data so balances and lists update
      await fetchAllData();
    } catch (err) {
      console.error(`Error during ${action}:`, err);
      setError("Something went wrong while processing the action.");
    }
  }

  // Derived data
  const totalUsers = users.length;
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const approvedWithdrawals = withdrawals.filter(
    (w) => w.status === "approved"
  );
  const rejectedWithdrawals = withdrawals.filter(
    (w) => w.status === "rejected"
  );

  const totalApprovedAmount = approvedWithdrawals.reduce(
    (sum, w) => sum + (w.withdrawalAmount || 0),
    0
  );

  // Transactions list (exclude pending, then filter by status)
  let transactionList = withdrawals.filter((w) => w.status !== "pending");
  if (transactionFilter === "approved") {
    transactionList = transactionList.filter((w) => w.status === "approved");
  } else if (transactionFilter === "rejected") {
    transactionList = transactionList.filter((w) => w.status === "rejected");
  }

  // Filtered users (search by name or email)
  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const term = userSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  async function handleReferralSearch(e: FormEvent) {
    e.preventDefault();
    setReferralError(null);
    setReferralInfo(null);

    if (!refUserId || refUserId.length !== 24) {
      setReferralError("Please enter a valid 24-character userId.");
      return;
    }

    try {
      setReferralLoading(true);
      const res = await fetch(`/api/admin/referrals/${refUserId}`);
      const data = await res.json();

      if (!res.ok) {
        setReferralError(data.error || "Failed to fetch referral info");
        setReferralLoading(false);
        return;
      }

      setReferralInfo(data);
      setReferralLoading(false);
    } catch (err) {
      console.error("Referral lookup error:", err);
      setReferralError("Something went wrong while fetching referral data.");
      setReferralLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-100">Loading admin dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-xs font-bold">
            RB
          </div>
          <div>
            <p className="text-sm font-semibold">Admin Console</p>
            <p className="text-[11px] text-slate-400">Referral Banking System</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 text-xs">
          <button
            onClick={() => setActiveSection("overview")}
            className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
              activeSection === "overview"
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Overview
          </button>

          <button
            onClick={() => setActiveSection("users")}
            className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
              activeSection === "users"
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Users
          </button>

          <button
            onClick={() => setActiveSection("withdrawals")}
            className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
              activeSection === "withdrawals"
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Withdrawal Requests
          </button>

          <button
            onClick={() => setActiveSection("transactions")}
            className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
              activeSection === "transactions"
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Transaction History
          </button>

          <button
            onClick={() => setActiveSection("referrals")}
            className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 ${
              activeSection === "referrals"
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Referral Explorer
          </button>
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <button
            onClick={async () => {
              try {
                await fetch("/api/admin/auth/logout", {
                  method: "POST",
                });
                window.location.href = "/admin/login";
              } catch (err) {
                console.error("Admin logout failed", err);
              }
            }}
            className="w-full px-3 py-2 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-6 py-5">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Top header */}
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-xs text-slate-400">
                Monitor users, referrals, and withdrawal activity in real time.
              </p>
            </div>
            <div className="text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-700 px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live environment (MongoDB Atlas)
              </span>
            </div>
          </header>

          {error && (
            <p className="text-xs text-red-300 bg-red-950/40 border border-red-900 rounded-md p-2">
              {error}
            </p>
          )}

          {/* OVERVIEW */}
          {activeSection === "overview" && (
            <section className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-[11px] text-slate-400">Total Users</p>
                  <p className="text-2xl font-semibold mt-1 text-slate-50">
                    {totalUsers}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Active in referral network
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-[11px] text-slate-400">
                    Pending Withdrawals
                  </p>
                  <p className="text-2xl font-semibold mt-1 text-amber-300">
                    {pendingWithdrawals.length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Awaiting admin action
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-[11px] text-slate-400">
                    Approved Requests
                  </p>
                  <p className="text-2xl font-semibold mt-1 text-emerald-300">
                    {approvedWithdrawals.length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Successfully processed
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <p className="text-[11px] text-slate-400">
                    Total Approved Amount
                  </p>
                  <p className="text-2xl font-semibold mt-1 text-blue-300">
                    ₹{totalApprovedAmount}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Payouts completed
                  </p>
                </div>
              </div>

              {/* Just-for-show "activity" card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h2 className="text-sm font-semibold mb-2">
                  Recent System Snapshot
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-slate-300">
                  <div>
                    <p className="text-slate-400 mb-1">Approval Ratio</p>
                    <p>
                      {approvedWithdrawals.length} approved /{" "}
                      {withdrawals.length} total requests
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Rejected Requests</p>
                    <p>{rejectedWithdrawals.length} total rejected</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">
                      Pending Queue Health
                    </p>
                    <p>
                      {pendingWithdrawals.length === 0
                        ? "No backlog — all clear ✅"
                        : pendingWithdrawals.length < 5
                        ? "Low queue — manageable"
                        : "High queue — review needed"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* USERS */}
          {activeSection === "users" && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-lg font-semibold">Users</h1>
                  <p className="text-[11px] text-slate-400">
                    View all registered users and their balances.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No users match this search.
                  </p>
                ) : (
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-left">
                        <th className="border-b border-slate-700 px-2 py-1">
                          Name
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Email
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Referred By
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Current Balance
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Created At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-800/80">
                          <td className="border-b border-slate-800 px-2 py-1">
                            {u.name}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            {u.email}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            {u.referredBy ?? "-"}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            ₹{u.currentBalance}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleString()
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* WITHDRAWALS */}
          {activeSection === "withdrawals" && (
            <section className="space-y-4">
              <div>
                <h1 className="text-lg font-semibold">
                  Pending Withdrawal Requests
                </h1>
                <p className="text-[11px] text-slate-400">
                  Approve or reject payout requests from users.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
                {pendingWithdrawals.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No pending requests at the moment.
                  </p>
                ) : (
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-left">
                        <th className="border-b border-slate-700 px-2 py-1">
                          User
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Email
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Amount
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Requested At
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingWithdrawals.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-800/80">
                          <td className="border-b border-slate-800 px-2 py-1">
                            {req.userName}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            {req.userEmail}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            ₹{req.requestedAmount}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            {new Date(req.dateOfRequest).toLocaleString()}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1 space-x-2">
                            <button
                              onClick={() => handleAction(req.id, "approve")}
                              className="px-3 py-1 rounded-md text-[11px] bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(req.id, "reject")}
                              className="px-3 py-1 rounded-md text-[11px] bg-red-600 text-white hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          )}

          {/* TRANSACTIONS */}
          {activeSection === "transactions" && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h1 className="text-lg font-semibold">
                    Transaction History
                  </h1>
                  <p className="text-[11px] text-slate-400">
                    Completed (approved or rejected) withdrawal requests.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-400">Filter:</span>
                  <select
                    value={transactionFilter}
                    onChange={(e) =>
                      setTransactionFilter(
                        e.target.value as "all" | "approved" | "rejected"
                      )
                    }
                    className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1"
                  >
                    <option value="all">All (Approved + Rejected)</option>
                    <option value="approved">Approved Only</option>
                    <option value="rejected">Rejected Only</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-x-auto">
                {transactionList.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No transactions found for this filter.
                  </p>
                ) : (
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-left">
                        <th className="border-b border-slate-700 px-2 py-1">
                          User
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Email
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Requested
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Amount
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Status
                        </th>
                        <th className="border-b border-slate-700 px-2 py-1">
                          Processed
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionList.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-800/80">
                          <td className="border-b border-slate-800 px-2 py-1">
                            {w.userName}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            {w.userEmail}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            {new Date(w.dateOfRequest).toLocaleString()}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            ₹{w.requestedAmount}
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full capitalize ${
                                w.status === "approved"
                                  ? "bg-emerald-900/60 text-emerald-200 border border-emerald-700"
                                  : "bg-red-900/60 text-red-200 border border-red-700"
                              }`}
                            >
                              {w.status}
                            </span>
                          </td>
                          <td className="border-b border-slate-800 px-2 py-1">
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
                )}
              </div>
            </section>
          )}

          {/* REFERRALS */}
          {activeSection === "referrals" && (
            <section className="space-y-4">
              <div>
                <h1 className="text-lg font-semibold">Referral Explorer</h1>
                <p className="text-[11px] text-slate-400">
                  Inspect a user&apos;s ancestors and direct children in the
                  referral tree.
                </p>
              </div>

              <form
                onSubmit={handleReferralSearch}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div>
                  <label className="block text-xs mb-1">
                    Enter User ID (MongoDB ObjectId)
                  </label>
                  <input
                    type="text"
                    value={refUserId}
                    onChange={(e) => setRefUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. 692817df647397399fbaf3ec"
                  />
                </div>
                <button
                  type="submit"
                  disabled={referralLoading}
                  className="px-4 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-60"
                >
                  {referralLoading ? "Searching..." : "Find Referral Chain"}
                </button>

                {referralError && (
                  <p className="text-xs text-red-300 bg-red-950/40 border border-red-900 rounded-md p-2">
                    {referralError}
                  </p>
                )}
              </form>

              {referralInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <h2 className="text-sm font-semibold mb-2">
                      Selected User
                    </h2>
                    <p className="text-sm">
                      <span className="font-semibold">
                        {referralInfo.user.name}
                      </span>{" "}
                      ({referralInfo.user.email})
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      ID: {referralInfo.user.id}
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <h2 className="text-sm font-semibold mb-2">Ancestors</h2>
                    {referralInfo.ancestors.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        No ancestors (root user or broken chain).
                      </p>
                    ) : (
                      <ul className="text-[11px] space-y-1">
                        {referralInfo.ancestors.map((a) => (
                          <li key={a.id}>
                            <span className="font-semibold">{a.name}</span> (
                            {a.email}) — ID: {a.id}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:col-span-2">
                    <h2 className="text-sm font-semibold mb-2">
                      Direct Children (Referred Users)
                    </h2>
                    {referralInfo.children.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        This user has not referred anyone yet.
                      </p>
                    ) : (
                      <ul className="text-[11px] space-y-1">
                        {referralInfo.children.map((c) => (
                          <li key={c.id}>
                            <span className="font-semibold">{c.name}</span> (
                            {c.email}) — ID: {c.id}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
