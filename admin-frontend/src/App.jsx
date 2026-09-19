import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "https://campusfind-d0mg.onrender.com/api";

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [selectedItem, setSelectedItem] = useState(null);

  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const [message, setMessage] = useState("");

  /* =========================
     LOAD ITEMS
  ========================= */

  const loadItems = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/items`);

      if (!response.ok) {
        throw new Error("Failed to load items");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.log("Items error:", error);
      setMessage("Unable to load reports.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     LOAD USERS
  ========================= */

  const loadUsers = async () => {
    setUsersLoading(true);

    try {
      const response = await fetch(`${API_URL}/users`);

      if (!response.ok) {
        throw new Error("Users endpoint unavailable");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.log("Users endpoint:", error);

      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  /* =========================
     INITIAL LOAD
  ========================= */

  useEffect(() => {
    loadItems();
    loadUsers();
  }, []);

  /* =========================
     STATISTICS
  ========================= */

  const totalItems = items.length;

  const lostItems = items.filter(
    (item) => item.type === "LOST"
  ).length;

  const foundItems = items.filter(
    (item) => item.type === "FOUND"
  ).length;

  const activeItems = items.filter(
    (item) => item.status === "ACTIVE"
  ).length;

  const closedItems = items.filter(
    (item) => item.status !== "ACTIVE"
  ).length;

  /* =========================
     FILTER REPORTS
  ========================= */

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const text = `
        ${item.title || ""}
        ${item.category || ""}
        ${item.location || ""}
        ${item.reporter_name || ""}
        ${item.brand || ""}
        ${item.color || ""}
      `.toLowerCase();

      const matchesSearch = text.includes(
        search.toLowerCase()
      );

      const matchesType =
        typeFilter === "ALL" ||
        item.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [items, search, typeFilter]);

  /* =========================
     VIEW ITEM
  ========================= */

  const viewItem = (item) => {
    setSelectedItem(item);
  };

  /* =========================
     CLOSE / REOPEN
  ========================= */

  const changeItemStatus = async (item) => {
    const newStatus =
      item.status === "ACTIVE"
        ? "CLOSED"
        : "ACTIVE";

    try {
      const response = await fetch(
        `${API_URL}/items/${item.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Status update failed");
      }

      setMessage(
        newStatus === "CLOSED"
          ? "Report closed successfully."
          : "Report reopened successfully."
      );

      setSelectedItem(null);

      await loadItems();
    } catch (error) {
      console.log("Status error:", error);
      setMessage("Could not update report status.");
    }
  };

  /* =========================
     DELETE ITEM
  ========================= */

  const deleteItem = async (item) => {
    const confirmed = window.confirm(
      `Delete "${item.title}" permanently?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/items/${item.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setMessage("Report deleted successfully.");

      setSelectedItem(null);

      await loadItems();
    } catch (error) {
      console.log("Delete error:", error);

      setMessage(
        "Delete endpoint is not available yet."
      );
    }
  };

  /* =========================
     LOAD SMART MATCHES
  ========================= */

  const loadMatches = async (item) => {
    setSelectedItem(item);
    setMatches([]);
    setMatchesLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/items/${item.id}/matches`
      );

      if (!response.ok) {
        throw new Error(
          `Match API error: ${response.status}`
        );
      }

      const data = await response.json();

      console.log("Smart Match API response:", data);

      /*
        Backend may return:

        [
          {...}
        ]

        OR

        {
          matches: [...]
        }

        OR

        {
          results: [...]
        }

        OR

        {
          data: [...]
        }
      */

      let matchData = [];

      if (Array.isArray(data)) {
        matchData = data;
      } else if (Array.isArray(data.matches)) {
        matchData = data.matches;
      } else if (Array.isArray(data.results)) {
        matchData = data.results;
      } else if (Array.isArray(data.data)) {
        matchData = data.data;
      }

      /*
        Normalize backend fields
      */

      const normalizedMatches = matchData.map(
        (match) => {
          const score =
            match.score ??
            match.match_score ??
            match.matchScore ??
            0;

          const matchedFields =
            match.matchedFields ??
            match.matched_fields ??
            [];

          return {
            ...match,
            score,
            matchedFields,
          };
        }
      );

      setMatches(normalizedMatches);

      if (normalizedMatches.length === 0) {
        setMessage(
          "No matching items found for this report."
        );
      } else {
        setMessage(
          `${normalizedMatches.length} possible ${
            normalizedMatches.length === 1
              ? "match"
              : "matches"
          } found.`
        );
      }
    } catch (error) {
      console.log(
        "Smart matching error:",
        error
      );

      setMatches([]);

      setMessage(
        "Unable to calculate matches. Please check the backend."
      );
    } finally {
      setMatchesLoading(false);
    }
  };

  /* =========================
     NAVIGATION
  ========================= */

  const changePage = (page) => {
    setActivePage(page);

    setSelectedItem(null);
    setMatches([]);
    setMessage("");
  };

  /* =========================
     DASHBOARD
  ========================= */

  const renderDashboard = () => {
    return (
      <>
        <PageHeader
          title="Dashboard"
          subtitle="Monitor and manage CampusFind reports."
          onRefresh={() => {
            loadItems();
            loadUsers();
          }}
        />

        <section className="stats-grid">

          <StatCard
            icon="📦"
            title="Total Reports"
            value={totalItems}
            className="blue"
          />

          <StatCard
            icon="🔴"
            title="Lost Items"
            value={lostItems}
            className="red"
          />

          <StatCard
            icon="🟢"
            title="Found Items"
            value={foundItems}
            className="green"
          />

          <StatCard
            icon="⚡"
            title="Active Reports"
            value={activeItems}
            className="purple"
          />

        </section>

        <section className="quick-grid">

          <div
            className="quick-card"
            onClick={() =>
              changePage("reports")
            }
          >
            <div className="quick-icon">
              📦
            </div>

            <div>
              <h3>Manage Reports</h3>

              <p>
                View, search and manage lost and
                found reports.
              </p>
            </div>

            <span>→</span>
          </div>

          <div
            className="quick-card"
            onClick={() =>
              changePage("matches")
            }
          >
            <div className="quick-icon">
              🔍
            </div>

            <div>
              <h3>Smart Matches</h3>

              <p>
                Check possible matches between
                lost and found items.
              </p>
            </div>

            <span>→</span>
          </div>

        </section>

        <ReportTable
          items={items.slice(0, 6)}
          loading={loading}
          onView={viewItem}
          onStatus={changeItemStatus}
          onDelete={deleteItem}
        />
      </>
    );
  };

  /* =========================
     REPORTS
  ========================= */

  const renderReports = () => {
    return (
      <>
        <PageHeader
          title="Reports"
          subtitle="Manage all lost and found reports."
          onRefresh={loadItems}
        />

        <div className="filter-bar">

          <div className="search-box">
            🔎

            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value)
            }
          >
            <option value="ALL">
              All Reports
            </option>

            <option value="LOST">
              Lost Items
            </option>

            <option value="FOUND">
              Found Items
            </option>
          </select>

        </div>

        <ReportTable
          items={filteredItems}
          loading={loading}
          onView={viewItem}
          onStatus={changeItemStatus}
          onDelete={deleteItem}
          full
        />
      </>
    );
  };

  /* =========================
     USERS
  ========================= */

  const renderUsers = () => {
    return (
      <>
        <PageHeader
          title="Users"
          subtitle="Registered CampusFind users."
          onRefresh={loadUsers}
        />

        <section className="content-card">

          {usersLoading ? (
            <div className="loading">
              Loading users...
            </div>
          ) : users.length === 0 ? (

            <div className="empty-state">

              <div>👥</div>

              <h3>
                User management is ready
              </h3>

              <p>
                Your current backend does not expose
                the users API yet.
              </p>

              <small>
                The Users section will automatically
                display users after the backend
                endpoint is added.
              </small>

            </div>

          ) : (

            <div className="table-container">

              <table>

                <thead>

                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>

                </thead>

                <tbody>

                  {users.map((user) => (

                    <tr key={user.id}>

                      <td>
                        #{user.id}
                      </td>

                      <td>
                        <strong>
                          {user.name}
                        </strong>
                      </td>

                      <td>
                        {user.email}
                      </td>

                      <td>
                        <span className="role-badge">
                          {user.role || "STUDENT"}
                        </span>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>
      </>
    );
  };

  /* =========================
     MATCHES
  ========================= */

  const renderMatches = () => {
    return (
      <>
        <PageHeader
          title="Smart Matches"
          subtitle="Find possible connections between lost and found reports."
          onRefresh={loadItems}
        />

        <section className="content-card">

          <div className="match-intro">

            <div className="match-intro-icon">
              🧠
            </div>

            <div>
              <h2>
                Smart Matching Engine
              </h2>

              <p>
                Select a report to check its
                possible matches using category,
                brand, location, color, title,
                description and date.
              </p>
            </div>

          </div>

          <div className="match-list">

            {items.length === 0 ? (

              <div className="empty-state">

                <div>🔍</div>

                <h3>
                  No reports available
                </h3>

                <p>
                  Reports are required before
                  matches can be calculated.
                </p>

              </div>

            ) : (

              items.map((item) => (

                <div
                  className="match-item"
                  key={item.id}
                >

                  <div className="match-item-info">

                    <div className="match-item-icon">
                      {item.type === "LOST"
                        ? "🔴"
                        : "🟢"}
                    </div>

                    <div>

                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {item.type} •{" "}
                        {item.category ||
                          "Uncategorized"}
                      </span>

                    </div>

                  </div>

                  <button
                    className="primary-small"
                    onClick={() =>
                      loadMatches(item)
                    }
                    disabled={matchesLoading}
                  >
                    {matchesLoading &&
                    selectedItem?.id === item.id
                      ? "Finding..."
                      : "Find Matches"}
                  </button>

                </div>

              ))

            )}

          </div>

        </section>

        {/* MATCH RESULTS */}

        {selectedItem &&
          activePage === "matches" &&
          !matchesLoading &&
          matches.length > 0 && (

            <section className="content-card matches-result">

              <div className="section-title">

                <div>

                  <h2>
                    Matches for{" "}
                    {selectedItem.title}
                  </h2>

                  <p>
                    Possible matching reports
                  </p>

                </div>

                <span className="report-count">
                  {matches.length}{" "}
                  {matches.length === 1
                    ? "match"
                    : "matches"}
                </span>

              </div>

              <div className="results-list">

                {matches.map(
                  (match, index) => {

                    const matchTitle =
                      match.title ||
                      match.item?.title ||
                      match.found_item?.title ||
                      match.lost_item?.title ||
                      "Possible Match";

                    const matchType =
                      match.type ||
                      match.item?.type ||
                      match.found_item?.type ||
                      match.lost_item?.type ||
                      "ITEM";

                    const score =
                      match.score ??
                      match.match_score ??
                      match.matchScore ??
                      0;

                    const fields =
                      match.matchedFields ||
                      match.matched_fields ||
                      [];

                    return (
                      <div
                        className="result-match"
                        key={
                          match.id ||
                          match.item_id ||
                          index
                        }
                      >

                        <div className="result-match-info">

                          <div
                            className={
                              matchType === "LOST"
                                ? "match-result-icon lost-icon"
                                : "match-result-icon found-icon"
                            }
                          >
                            {matchType === "LOST"
                              ? "🔴"
                              : "🟢"}
                          </div>

                          <div>

                            <strong>
                              {matchTitle}
                            </strong>

                            <p>
                              {matchType}
                            </p>

                            {fields.length >
                              0 && (

                              <div className="matched-fields">

                                {fields.map(
                                  (
                                    field,
                                    fieldIndex
                                  ) => (

                                    <span
                                      key={
                                        fieldIndex
                                      }
                                    >
                                      ✓ {field}
                                    </span>

                                  )
                                )}

                              </div>

                            )}

                          </div>

                        </div>

                        <div className="match-score">

                          <div className="score-circle">
                            {score}%
                          </div>

                          <span>
                            Match Score
                          </span>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </section>

          )}

        {/* NO MATCH */}

        {selectedItem &&
          activePage === "matches" &&
          !matchesLoading &&
          matches.length === 0 &&
          message && (

            <section className="content-card">

              <div className="empty-state">

                <div>🔎</div>

                <h3>
                  No matching reports found
                </h3>

                <p>
                  The smart matching engine did
                  not find a suitable opposite
                  report for:
                </p>

                <strong>
                  {selectedItem.title}
                </strong>

              </div>

            </section>

          )}

      </>
    );
  };

  /* =========================
     SETTINGS
  ========================= */

  const renderSettings = () => {
    return (
      <>
        <PageHeader
          title="Settings"
          subtitle="Manage your CampusFind admin panel."
        />

        <section className="content-card">

          <div className="settings-row">

            <div>
              <h3>
                Application
              </h3>

              <p>
                CampusFind Smart Campus Lost &
                Found
              </p>
            </div>

            <span className="settings-value">
              v1.0
            </span>

          </div>

          <div className="settings-row">

            <div>
              <h3>
                Backend API
              </h3>

              <p>
                Connected to CampusFind backend
              </p>
            </div>

            <span className="connection-badge">
              ● Connected
            </span>

          </div>

          <div className="settings-row">

            <div>
              <h3>
                Database
              </h3>

              <p>
                PostgreSQL / Neon
              </p>
            </div>

            <span className="connection-badge">
              ● Active
            </span>

          </div>

          <div className="settings-row">

            <div>
              <h3>
                Reports in database
              </h3>

              <p>
                Total reports currently stored
              </p>
            </div>

            <strong>
              {totalItems}
            </strong>

          </div>

          <div className="settings-row">

            <div>
              <h3>
                Closed reports
              </h3>

              <p>
                Reports that are no longer active
              </p>
            </div>

            <strong>
              {closedItems}
            </strong>

          </div>

        </section>
      </>
    );
  };

  /* =========================
     MAIN PAGE
  ========================= */

  const renderPage = () => {

    if (activePage === "dashboard") {
      return renderDashboard();
    }

    if (activePage === "reports") {
      return renderReports();
    }

    if (activePage === "users") {
      return renderUsers();
    }

    if (activePage === "matches") {
      return renderMatches();
    }

    if (activePage === "settings") {
      return renderSettings();
    }

    return renderDashboard();
  };

  return (
    <div className="admin-app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo-area">

          <div className="logo-icon">
            C
          </div>

          <div>
            <h2>
              CampusFind
            </h2>

            <span>
              Admin Panel
            </span>
          </div>

        </div>

        <nav className="sidebar-nav">

          <button
            className={`sidebar-item ${
              activePage === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changePage("dashboard")
            }
          >
            <span>📊</span>
            Dashboard
          </button>

          <button
            className={`sidebar-item ${
              activePage === "reports"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changePage("reports")
            }
          >
            <span>📦</span>
            Reports
          </button>

          <button
            className={`sidebar-item ${
              activePage === "users"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changePage("users")
            }
          >
            <span>👥</span>
            Users
          </button>

          <button
            className={`sidebar-item ${
              activePage === "matches"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changePage("matches")
            }
          >
            <span>🔍</span>
            Matches
          </button>

          <button
            className={`sidebar-item ${
              activePage === "settings"
                ? "active"
                : ""
            }`}
            onClick={() =>
              changePage("settings")
            }
          >
            <span>⚙️</span>
            Settings
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="admin-profile">

            <div className="profile-circle">
              A
            </div>

            <div>

              <strong>
                Administrator
              </strong>

              <small>
                CampusFind Admin
              </small>

            </div>

          </div>

        </div>

      </aside>

      {/* MAIN CONTENT */}

      <main className="main-content">

        {message && (

          <div className="message-bar">

            <span>
              {message}
            </span>

            <button
              onClick={() =>
                setMessage("")
              }
            >
              ×
            </button>

          </div>

        )}

        {renderPage()}

      </main>

      {/* ITEM DETAILS MODAL */}

      {selectedItem &&
        activePage !== "matches" && (

          <div
            className="modal-overlay"
            onClick={() =>
              setSelectedItem(null)
            }
          >

            <div
              className="modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <div className="modal-header">

                <div>

                  <span
                    className={
                      selectedItem.type ===
                      "LOST"
                        ? "type-badge lost"
                        : "type-badge found"
                    }
                  >
                    {selectedItem.type}
                  </span>

                  <h2>
                    {selectedItem.title}
                  </h2>

                </div>

                <button
                  className="close-modal"
                  onClick={() =>
                    setSelectedItem(null)
                  }
                >
                  ×
                </button>

              </div>

              <div className="details-grid">

                <Detail
                  label="Category"
                  value={
                    selectedItem.category
                  }
                />

                <Detail
                  label="Brand"
                  value={
                    selectedItem.brand
                  }
                />

                <Detail
                  label="Color"
                  value={
                    selectedItem.color
                  }
                />

                <Detail
                  label="Location"
                  value={
                    selectedItem.location
                  }
                />

                <Detail
                  label="Date"
                  value={
                    selectedItem.item_date
                  }
                />

                <Detail
                  label="Status"
                  value={
                    selectedItem.status
                  }
                />

                <Detail
                  label="Reporter"
                  value={
                    selectedItem.reporter_name
                  }
                />

                <Detail
                  label="Phone"
                  value={
                    selectedItem.reporter_phone
                  }
                />

                <Detail
                  label="Department"
                  value={
                    selectedItem.reporter_department
                  }
                />

              </div>

              <div className="description-box">

                <strong>
                  Description
                </strong>

                <p>
                  {selectedItem.description ||
                    "No description provided."}
                </p>

              </div>

              <div className="modal-actions">

                <button
                  className="secondary-button"
                  onClick={() =>
                    changeItemStatus(
                      selectedItem
                    )
                  }
                >
                  {selectedItem.status ===
                  "ACTIVE"
                    ? "✓ Close Report"
                    : "↻ Reopen Report"}
                </button>

                <button
                  className="danger-button"
                  onClick={() =>
                    deleteItem(
                      selectedItem
                    )
                  }
                >
                  🗑 Delete
                </button>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}

/* =========================
   PAGE HEADER
========================= */

function PageHeader({
  title,
  subtitle,
  onRefresh,
}) {
  return (
    <header className="topbar">

      <div>

        <h1>
          {title}
        </h1>

        <p>
          {subtitle}
        </p>

      </div>

      {onRefresh && (

        <button
          className="refresh-button"
          onClick={onRefresh}
        >
          ↻ Refresh
        </button>

      )}

    </header>
  );
}

/* =========================
   STAT CARD
========================= */

function StatCard({
  icon,
  title,
  value,
  className,
}) {
  return (
    <div className="stat-card">

      <div
        className={`stat-icon ${className}`}
      >
        {icon}
      </div>

      <div>

        <span>
          {title}
        </span>

        <h2>
          {value}
        </h2>

      </div>

    </div>
  );
}

/* =========================
   REPORT TABLE
========================= */

function ReportTable({
  items,
  loading,
  onView,
  onStatus,
  onDelete,
  full = false,
}) {
  return (
    <section className="reports-section">

      <div className="section-header">

        <div>

          <h2>
            {full
              ? "All Reports"
              : "Recent Reports"}
          </h2>

          <p>
            {full
              ? "Manage all CampusFind reports."
              : "Latest lost and found reports."}
          </p>

        </div>

        <span className="report-count">
          {items.length} reports
        </span>

      </div>

      {loading ? (

        <div className="loading">
          Loading reports...
        </div>

      ) : items.length === 0 ? (

        <div className="empty-state">

          <div>📭</div>

          <h3>
            No reports found
          </h3>

          <p>
            Lost and found reports will appear
            here.
          </p>

        </div>

      ) : (

        <div className="table-container">

          <table>

            <thead>

              <tr>
                <th>ID</th>
                <th>Item</th>
                <th>Type</th>
                <th>Category</th>
                <th>Location</th>
                <th>Reporter</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {items.map((item) => (

                <tr key={item.id}>

                  <td>
                    #{item.id}
                  </td>

                  <td>
                    <strong>
                      {item.title}
                    </strong>
                  </td>

                  <td>

                    <span
                      className={
                        item.type === "LOST"
                          ? "type-badge lost"
                          : "type-badge found"
                      }
                    >
                      {item.type}
                    </span>

                  </td>

                  <td>
                    {item.category || "—"}
                  </td>

                  <td>
                    {item.location || "—"}
                  </td>

                  <td>
                    {item.reporter_name ||
                      "—"}
                  </td>

                  <td>

                    <span
                      className={
                        item.status ===
                        "ACTIVE"
                          ? "status-badge active-status"
                          : "status-badge"
                      }
                    >
                      {item.status}
                    </span>

                  </td>

                  <td>

                    <div className="action-buttons">

                      <button
                        className="view-button"
                        onClick={() =>
                          onView(item)
                        }
                      >
                        View
                      </button>

                      <button
                        className="mini-button"
                        onClick={() =>
                          onStatus(item)
                        }
                      >
                        {item.status ===
                        "ACTIVE"
                          ? "Close"
                          : "Open"}
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          onDelete(item)
                        }
                      >
                        Delete
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </section>
  );
}

/* =========================
   DETAIL
========================= */

function Detail({
  label,
  value,
}) {
  return (
    <div className="detail">

      <span>
        {label}
      </span>

      <strong>
        {value || "—"}
      </strong>

    </div>
  );
}

export default App;