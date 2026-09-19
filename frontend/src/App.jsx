import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "https://campusfind-d0mg.onrender.com/api";
function App() {
  const [page, setPage] = useState("home");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [selectedAdminItem, setSelectedAdminItem] = useState(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");

  const [form, setForm] = useState({
    type: "LOST",
    title: "",
    category: "Electronics",
    description: "",
    color: "",
    brand: "",
    location: "",
    item_date: new Date().toISOString().split("T")[0],
    reporter_name: "",
    reporter_phone: "",
    reporter_department: "",
  });

  // ========================================
  // LOAD ITEMS
  // ========================================

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/items`);

      if (!response.ok) {
        throw new Error("Failed to load items.");
      }

      const data = await response.json();

      setItems(data);
    } catch (error) {
      console.error(error);

      showNotification(
        "Backend connection failed. Make sure the server is running.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // NOTIFICATION
  // ========================================

  const showNotification = (
    message,
    type = "success"
  ) => {
    setNotification({
      message,
      type,
    });

    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // ========================================
  // NAVIGATION
  // ========================================

  const navigate = (targetPage) => {
    setPage(targetPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ========================================
  // FORM INPUT
  // ========================================

  const handleInputChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ========================================
  // SUBMIT REPORT
  // ========================================

  const submitItem = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      showNotification(
        "Please enter an item title.",
        "error"
      );
      return;
    }

    if (!form.location.trim()) {
      showNotification(
        "Please enter the location.",
        "error"
      );
      return;
    }

    if (!form.reporter_name.trim()) {
      showNotification(
        "Please enter your name.",
        "error"
      );
      return;
    }

    if (
      !/^[0-9]{10}$/.test(
        form.reporter_phone
      )
    ) {
      showNotification(
        "Please enter a valid 10-digit phone number.",
        "error"
      );
      return;
    }

    if (!form.reporter_department.trim()) {
      showNotification(
        "Please enter your department.",
        "error"
      );
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Unable to submit item."
        );
      }

      showNotification(
        `${
          form.type === "LOST"
            ? "Lost"
            : "Found"
        } item reported successfully!`
      );

      setForm({
        type: "LOST",
        title: "",
        category: "Electronics",
        description: "",
        color: "",
        brand: "",
        location: "",
        item_date:
          new Date()
            .toISOString()
            .split("T")[0],
        reporter_name: "",
        reporter_phone: "",
        reporter_department: "",
      });

      await loadItems();

      navigate("explore");
    } catch (error) {
      console.error(error);

      showNotification(
        error.message,
        "error"
      );
    }
  };

  // ========================================
  // CLOSE REPORT
  // ========================================

  const closeReport = async (itemId) => {
    const confirmed = window.confirm(
      "Close this report? It will be marked as CLOSED."
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/items/${itemId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "CLOSED",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to close report."
        );
      }

      setSelectedAdminItem(null);

      await loadItems();

      showNotification(
        "Report closed successfully.",
        "success"
      );
    } catch (error) {
      console.error(error);

      showNotification(
        error.message,
        "error"
      );
    }
  };

  // ========================================
  // DELETE REPORT
  // ========================================

  const deleteReport = async (itemId) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this report?\n\nThis action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/items/${itemId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to delete report."
        );
      }

      setSelectedAdminItem(null);

      await loadItems();

      showNotification(
        "Report deleted successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Delete report error:",
        error
      );

      showNotification(
        error.message,
        "error"
      );
    }
  };

  // ========================================
  // FILTERED ITEMS
  // ========================================

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const text = `
        ${item.title || ""}
        ${item.category || ""}
        ${item.description || ""}
        ${item.color || ""}
        ${item.brand || ""}
        ${item.location || ""}
      `.toLowerCase();

      const matchesSearch =
        text.includes(
          search.toLowerCase()
        );

      const matchesType =
        filterType === "ALL" ||
        item.type === filterType;

      const matchesCategory =
        filterCategory === "ALL" ||
        item.category === filterCategory;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory
      );
    });
  }, [
    items,
    search,
    filterType,
    filterCategory,
  ]);

  // ========================================
  // STATISTICS
  // ========================================

  const stats = {
    total: items.length,

    lost: items.filter(
      (item) =>
        item.type === "LOST"
    ).length,

    found: items.filter(
      (item) =>
        item.type === "FOUND"
    ).length,

    active: items.filter(
      (item) =>
        (item.status || "ACTIVE") !==
        "CLOSED"
    ).length,
  };

  // ========================================
  // CATEGORIES
  // ========================================

  const categories = [
    "ALL",
    ...new Set(
      items
        .map(
          (item) =>
            item.category
        )
        .filter(Boolean)
    ),
  ];

  return (
    <div className="campus-app">

      {/* =====================================
          NOTIFICATION
      ====================================== */}

      {notification && (
        <div
          className={`notification ${notification.type}`}
        >
          <span>
            {notification.type === "error"
              ? "⚠️"
              : "✓"}
          </span>

          {notification.message}
        </div>
      )}


      {/* =====================================
          NAVBAR
      ====================================== */}

      <nav className="navbar">

        <div
          className="brand"
          onClick={() =>
            navigate("home")
          }
          style={{
            cursor: "pointer",
          }}
        >
          <div className="brand-icon">
            C
          </div>

          <div>
            <h2>CampusFind</h2>

            <span>
              Smart Item Recovery
            </span>
          </div>
        </div>


        <div className="nav-links">

          <button
            className={
              page === "home"
                ? "nav-active"
                : ""
            }
            onClick={() =>
              navigate("home")
            }
          >
            Home
          </button>


          <button
            className={
              page === "report"
                ? "nav-active"
                : ""
            }
            onClick={() =>
              navigate("report")
            }
          >
            Report Item
          </button>


          <button
            className={
              page === "explore"
                ? "nav-active"
                : ""
            }
            onClick={() =>
              navigate("explore")
            }
          >
            Explore
          </button>


          <button
            className={
              page === "admin"
                ? "nav-active"
                : ""
            }
            onClick={() =>
              navigate("admin")
            }
          >
            Admin
          </button>

        </div>


        <button
          className="nav-report-btn"
          onClick={() =>
            navigate("report")
          }
        >
          + Report Item
        </button>

      </nav>


      {/* =====================================
          HOME PAGE
      ====================================== */}

      {page === "home" && (
        <main>

          <section className="hero">

            <div className="hero-content">

              <div className="status-pill">
                <span className="status-dot"></span>

                Smart Campus Recovery Platform
              </div>


              <h1>
                Lost something?

                <br />

                <span>
                  Let's find it.
                </span>
              </h1>


              <p>
                CampusFind connects students,
                faculty and campus security
                through one intelligent platform
                for reporting, discovering and
                recovering lost items.
              </p>


              <div className="hero-buttons">

                <button
                  className="primary-btn"
                  onClick={() =>
                    navigate("report")
                  }
                >
                  Report an Item →
                </button>


                <button
                  className="secondary-btn"
                  onClick={() =>
                    navigate("explore")
                  }
                >
                  Explore Items
                </button>

              </div>


              <div className="hero-mini-stats">

                <div>
                  <strong>
                    {stats.total}
                  </strong>

                  <span>
                    Total Reports
                  </span>
                </div>


                <div>
                  <strong>
                    {stats.lost}
                  </strong>

                  <span>
                    Lost Items
                  </span>
                </div>


                <div>
                  <strong>
                    {stats.found}
                  </strong>

                  <span>
                    Found Items
                  </span>
                </div>

              </div>

            </div>


            <div className="tech-visual">

              <div className="orbit orbit-one"></div>

              <div className="orbit orbit-two"></div>

              <div className="orbit orbit-three"></div>


              <div className="tech-center">

                <div className="center-icon">
                  ⌕
                </div>

                <strong>
                  SMART
                </strong>

                <span>
                  MATCH
                </span>

              </div>


              <div className="floating-node node-one">
                <span>📱</span>
                Phone
              </div>


              <div className="floating-node node-two">
                <span>🎧</span>
                Earbuds
              </div>


              <div className="floating-node node-three">
                <span>🎒</span>
                Bag
              </div>


              <div className="floating-node node-four">
                <span>🪪</span>
                ID Card
              </div>

            </div>

          </section>


          {/* =====================================
              HOME STATS
          ====================================== */}

          <section className="stats-section">

            <div className="section-heading">

              <span className="eyebrow">
                LIVE CAMPUS DATA
              </span>

              <h2>
                One platform.
                <br />
                Complete visibility.
              </h2>

              <p>
                Everything related to lost
                and found items, organized
                in one intelligent system.
              </p>

            </div>


            <div className="stats-grid">

              <div className="stat-card">

                <div className="stat-icon blue">
                  ◎
                </div>

                <strong>
                  {stats.total}
                </strong>

                <span>
                  Total Reports
                </span>

                <small>
                  All campus reports
                </small>

              </div>


              <div className="stat-card">

                <div className="stat-icon red">
                  !
                </div>

                <strong>
                  {stats.lost}
                </strong>

                <span>
                  Lost Items
                </span>

                <small>
                  Items waiting to be found
                </small>

              </div>


              <div className="stat-card">

                <div className="stat-icon green">
                  ✓
                </div>

                <strong>
                  {stats.found}
                </strong>

                <span>
                  Found Items
                </span>

                <small>
                  Items reported by users
                </small>

              </div>


              <div className="stat-card">

                <div className="stat-icon cyan">
                  ⌁
                </div>

                <strong>
                  {stats.active}
                </strong>

                <span>
                  Active Reports
                </span>

                <small>
                  Currently being tracked
                </small>

              </div>

            </div>

          </section>


          {/* =====================================
              FEATURES
          ====================================== */}

          <section className="feature-section">

            <div className="section-heading center">

              <span className="eyebrow">
                WHY CAMPUSFIND?
              </span>

              <h2>
                More than just a
                <br />
                Lost & Found board.
              </h2>

              <p>
                Designed to make item recovery
                faster, smarter and more organized.
              </p>

            </div>


            <div className="feature-grid">

              <div className="feature-card">

                <div className="feature-number">
                  01
                </div>

                <div className="feature-icon">
                  📢
                </div>

                <h3>
                  Easy Reporting
                </h3>

                <p>
                  Report lost or found items
                  with important details such
                  as category, color, brand,
                  location and date.
                </p>

              </div>


              <div className="feature-card highlight">

                <div className="feature-number">
                  02
                </div>

                <div className="feature-icon">
                  🤖
                </div>

                <h3>
                  Smart Matching
                </h3>

                <p>
                  The system compares item
                  details and identifies possible
                  connections between lost and
                  found reports.
                </p>

                <div className="feature-tag">
                  SMART TECHNOLOGY
                </div>

              </div>


              <div className="feature-card">

                <div className="feature-number">
                  03
                </div>

                <div className="feature-icon">
                  🛡️
                </div>

                <h3>
                  Verified Recovery
                </h3>

                <p>
                  Ownership claims can be
                  reviewed by authorized campus
                  administrators before an item
                  is returned.
                </p>

              </div>

            </div>

          </section>


          {/* =====================================
              HOW IT WORKS
          ====================================== */}

          <section className="flow-section">

            <div className="section-heading center">

              <span className="eyebrow">
                HOW IT WORKS
              </span>

              <h2>
                From lost to recovered.
              </h2>

              <p>
                A simple four-step recovery process.
              </p>

            </div>


            <div className="flow-grid">

              <div className="flow-step">

                <div className="flow-circle">
                  01
                </div>

                <h3>
                  Report
                </h3>

                <p>
                  Submit details about the
                  lost or found item.
                </p>

              </div>


              <div className="flow-line"></div>


              <div className="flow-step">

                <div className="flow-circle">
                  02
                </div>

                <h3>
                  Discover
                </h3>

                <p>
                  Browse reports and search
                  for matching items.
                </p>

              </div>


              <div className="flow-line"></div>


              <div className="flow-step">

                <div className="flow-circle">
                  03
                </div>

                <h3>
                  Match
                </h3>

                <p>
                  Smart matching identifies
                  possible connections.
                </p>

              </div>


              <div className="flow-line"></div>


              <div className="flow-step">

                <div className="flow-circle">
                  04
                </div>

                <h3>
                  Recover
                </h3>

                <p>
                  Verify ownership and safely
                  return the item.
                </p>

              </div>

            </div>

          </section>


          {/* =====================================
              CTA
          ====================================== */}

          <section className="cta-section">

            <div>

              <span className="eyebrow">
                READY TO START?
              </span>

              <h2>
                Help someone recover
                what they lost.
              </h2>

              <p>
                Every report increases the
                chance of reconnecting an item
                with its owner.
              </p>

            </div>


            <button
              className="primary-btn"
              onClick={() =>
                navigate("report")
              }
            >
              Report Lost / Found Item →
            </button>

          </section>

        </main>
      )}


      {/* =====================================
          REPORT PAGE
      ====================================== */}

      {page === "report" && (
        <main className="inner-page">

          <div className="page-header">

            <span className="eyebrow">
              ITEM REPORT
            </span>

            <h1>
              Tell us what happened.
            </h1>

            <p>
              Provide the details below so
              CampusFind can help connect
              the item with its owner.
            </p>

          </div>


          <div className="report-layout">

            <form
              className="modern-form"
              onSubmit={submitItem}
            >

              {/* TYPE */}

              <div className="type-selector">

                <button
                  type="button"
                  className={
                    form.type === "LOST"
                      ? "type-btn selected lost"
                      : "type-btn"
                  }
                  onClick={() =>
                    setForm({
                      ...form,
                      type: "LOST",
                    })
                  }
                >

                  <span>
                    🔴
                  </span>

                  <div>

                    <strong>
                      I Lost Something
                    </strong>

                    <small>
                      Report an item you lost
                    </small>

                  </div>

                </button>


                <button
                  type="button"
                  className={
                    form.type === "FOUND"
                      ? "type-btn selected found"
                      : "type-btn"
                  }
                  onClick={() =>
                    setForm({
                      ...form,
                      type: "FOUND",
                    })
                  }
                >

                  <span>
                    🟢
                  </span>

                  <div>

                    <strong>
                      I Found Something
                    </strong>

                    <small>
                      Report an item you found
                    </small>

                  </div>

                </button>

              </div>


              {/* REPORTER */}

              <div className="form-section">

                <div className="form-section-title">

                  <span>
                    01
                  </span>

                  Your Information

                </div>


                <div className="form-grid">

                  <div className="input-group">

                    <label>
                      Your Name *
                    </label>

                    <input
                      name="reporter_name"
                      value={
                        form.reporter_name
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Example: Ankit Kumar Singh"
                    />

                  </div>


                  <div className="input-group">

                    <label>
                      Phone Number *
                    </label>

                    <input
                      type="tel"
                      name="reporter_phone"
                      value={
                        form.reporter_phone
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="10-digit phone number"
                      maxLength="10"
                      inputMode="numeric"
                    />

                  </div>


                  <div className="input-group full">

                    <label>
                      Department *
                    </label>

                    <input
                      name="reporter_department"
                      value={
                        form.reporter_department
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Example: BCA / Computer Science"
                    />

                  </div>

                </div>

              </div>


              {/* BASIC INFORMATION */}

              <div className="form-section">

                <div className="form-section-title">

                  <span>
                    02
                  </span>

                  Basic Information

                </div>


                <div className="form-grid">

                  <div className="input-group full">

                    <label>
                      Item Title *
                    </label>

                    <input
                      name="title"
                      value={
                        form.title
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Example: Black Boat Earbuds"
                    />

                  </div>


                  <div className="input-group">

                    <label>
                      Category
                    </label>

                    <select
                      name="category"
                      value={
                        form.category
                      }
                      onChange={
                        handleInputChange
                      }
                    >

                      <option>
                        Electronics
                      </option>

                      <option>
                        ID / Documents
                      </option>

                      <option>
                        Wallet
                      </option>

                      <option>
                        Bag
                      </option>

                      <option>
                        Books
                      </option>

                      <option>
                        Keys
                      </option>

                      <option>
                        Clothing
                      </option>

                      <option>
                        Accessories
                      </option>

                      <option>
                        Other
                      </option>

                    </select>

                  </div>


                  <div className="input-group">

                    <label>
                      Brand
                    </label>

                    <input
                      name="brand"
                      value={
                        form.brand
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Example: Boat"
                    />

                  </div>


                  <div className="input-group">

                    <label>
                      Color
                    </label>

                    <input
                      name="color"
                      value={
                        form.color
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Example: Black"
                    />

                  </div>


                  <div className="input-group">

                    <label>
                      Date
                    </label>

                    <input
                      type="date"
                      name="item_date"
                      value={
                        form.item_date
                      }
                      onChange={
                        handleInputChange
                      }
                    />

                  </div>

                </div>

              </div>


              {/* LOCATION */}

              <div className="form-section">

                <div className="form-section-title">

                  <span>
                    03
                  </span>

                  Location & Description

                </div>


                <div className="form-grid">

                  <div className="input-group full">

                    <label>
                      Location *
                    </label>

                    <input
                      name="location"
                      value={
                        form.location
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Example: Central Library"
                    />

                  </div>


                  <div className="input-group full">

                    <label>
                      Description
                    </label>

                    <textarea
                      name="description"
                      value={
                        form.description
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Describe scratches, stickers, unique marks, contents or anything that can help identify the item..."
                      rows="6"
                    ></textarea>

                  </div>

                </div>

              </div>


              <button
                type="submit"
                className="submit-btn"
              >

                Submit{" "}

                {form.type === "LOST"
                  ? "Lost"
                  : "Found"}

                {" "}Report

                <span>
                  →
                </span>

              </button>

            </form>


            {/* SIDE INFORMATION */}

            <aside className="report-side">

              <div className="side-card smart-card">

                <div className="side-icon">
                  🤖
                </div>

                <h3>
                  Smart Matching
                </h3>

                <p>
                  CampusFind compares your
                  report with existing reports
                  using item details such as
                  category, color, brand and
                  location.
                </p>


                <div className="match-demo">

                  <div>

                    <span>
                      YOUR REPORT
                    </span>

                    <strong>
                      Black Earbuds
                    </strong>

                  </div>


                  <div className="match-arrow">
                    ↕
                  </div>


                  <div>

                    <span>
                      POSSIBLE MATCH
                    </span>

                    <strong>
                      Boat Earbuds
                    </strong>

                  </div>


                  <b>
                    SMART MATCH
                  </b>

                </div>

              </div>


              <div className="side-card tip-card">

                <div className="side-icon">
                  💡
                </div>

                <h3>
                  Tip for faster recovery
                </h3>

                <p>
                  Add specific details such as
                  scratches, stickers, serial
                  numbers, case color or unique
                  marks.
                </p>

              </div>

            </aside>

          </div>

        </main>
      )}


      {/* =====================================
          EXPLORE PAGE
      ====================================== */}

      {page === "explore" && (
        <main className="inner-page">

          <div className="page-header">

            <span className="eyebrow">
              CAMPUS DATABASE
            </span>

            <h1>
              Explore reported items.
            </h1>

            <p>
              Search through lost and found
              reports from the campus community.
            </p>

          </div>


          <div className="explore-toolbar">

            <div className="search-box">

              <span>
                ⌕
              </span>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search item, brand, location..."
              />

            </div>


            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(
                  e.target.value
                )
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


            <select
              value={filterCategory}
              onChange={(e) =>
                setFilterCategory(
                  e.target.value
                )
              }
            >

              {categories.map(
                (category) => (

                  <option
                    key={category}
                    value={category}
                  >
                    {category === "ALL"
                      ? "All Categories"
                      : category}
                  </option>

                )
              )}

            </select>


            <button
              className="refresh-btn"
              onClick={loadItems}
            >
              ↻ Refresh
            </button>

          </div>


          <div className="explore-summary">

            <strong>
              {filteredItems.length}
            </strong>

            <span>
              items matching your search
            </span>

          </div>


          {loading ? (

            <div className="empty-state">

              <div className="loading-spinner"></div>

              <h3>
                Loading campus reports...
              </h3>

              <p>
                Connecting to the CampusFind database.
              </p>

            </div>

          ) : filteredItems.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                🔎
              </div>

              <h3>
                No matching items found
              </h3>

              <p>
                Try another search or report a new item.
              </p>

              <button
                className="primary-btn"
                onClick={() =>
                  navigate("report")
                }
              >
                Report Item
              </button>

            </div>

          ) : (

            <div className="item-grid">

              {filteredItems.map(
                (item) => (

                  <ItemCard
                    key={item.id}
                    item={item}
                    onClaim={() =>
                      showNotification(
                        "Claim system is ready for the next phase."
                      )
                    }
                  />

                )
              )}

            </div>

          )}

        </main>
      )}


      {/* =====================================
          ADMIN PAGE
      ====================================== */}

      {page === "admin" && (
        <main className="inner-page admin-page">

          <div className="page-header">

            <span className="eyebrow">
              CONTROL CENTER
            </span>

            <h1>
              CampusFind Admin Dashboard
            </h1>

            <p>
              Monitor reports, review activity
              and manage the campus recovery system.
            </p>

          </div>


          {/* ADMIN STATS */}

          <div className="admin-stats">

            <div>
              <span>
                Total Reports
              </span>

              <strong>
                {stats.total}
              </strong>

              <small>
                All submitted items
              </small>
            </div>


            <div>
              <span>
                Lost
              </span>

              <strong>
                {stats.lost}
              </strong>

              <small>
                Lost reports
              </small>
            </div>


            <div>
              <span>
                Found
              </span>

              <strong>
                {stats.found}
              </strong>

              <small>
                Found reports
              </small>
            </div>


            <div>
              <span>
                Active
              </span>

              <strong>
                {stats.active}
              </strong>

              <small>
                Active cases
              </small>
            </div>

          </div>


          {/* ADMIN PANEL */}

          <div className="admin-panel">

            <div className="admin-panel-header">

              <div>

                <span className="eyebrow">
                  RECENT ACTIVITY
                </span>

                <h2>
                  Latest Reports
                </h2>

              </div>


              <button
                className="refresh-btn"
                onClick={loadItems}
              >
                ↻ Refresh
              </button>

            </div>


            <div className="admin-table">

              <div className="table-row table-head">

                <span>
                  ITEM
                </span>

                <span>
                  TYPE
                </span>

                <span>
                  LOCATION
                </span>

                <span>
                  DATE
                </span>

                <span>
                  STATUS
                </span>

              </div>


              {items
                .slice(0, 10)
                .map((item) => (

                  <div
                    className="table-row"
                    key={item.id}
                  >

                    <span>

                      <strong>
                        {item.title}
                      </strong>

                      <small>
                        {item.category ||
                          "Other"}
                      </small>

                    </span>


                    <span>

                      <b
                        className={
                          item.type === "LOST"
                            ? "table-badge lost"
                            : "table-badge found"
                        }
                      >
                        {item.type}
                      </b>

                    </span>


                    <span>
                      {item.location ||
                        "Not specified"}
                    </span>


                    <span>
                      {item.item_date
                        ? new Date(
                            item.item_date
                          ).toLocaleDateString()
                        : "—"}
                    </span>


                    <span>

                      <b
                        className="active-badge"
                        style={
                          (item.status ||
                            "ACTIVE") ===
                          "CLOSED"
                            ? {
                                background:
                                  "#e2e8f0",
                                color:
                                  "#475569",
                              }
                            : {}
                        }
                      >
                        {item.status ||
                          "ACTIVE"}
                      </b>


                      {/* ADMIN ACTION BUTTONS */}

                      <div
                        style={{
                          display:
                            "flex",
                          gap:
                            "7px",
                          flexWrap:
                            "wrap",
                          marginTop:
                            "8px",
                        }}
                      >

                        {/* VIEW */}

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAdminItem(
                              item
                            )
                          }
                          style={{
                            padding:
                              "7px 10px",
                            border:
                              "1px solid rgba(37, 99, 235, 0.25)",
                            borderRadius:
                              "10px",
                            background:
                              "rgba(37, 99, 235, 0.08)",
                            color:
                              "#2563eb",
                            fontWeight:
                              700,
                            cursor:
                              "pointer",
                            fontSize:
                              "12px",
                          }}
                        >
                          View Details
                        </button>


                        {/* CLOSE */}

                        {(item.status ||
                          "ACTIVE") !==
                          "CLOSED" && (

                          <button
                            type="button"
                            onClick={() =>
                              closeReport(
                                item.id
                              )
                            }
                            style={{
                              padding:
                                "7px 10px",
                              border:
                                "1px solid rgba(22, 163, 74, 0.25)",
                              borderRadius:
                                "10px",
                              background:
                                "rgba(22, 163, 74, 0.08)",
                              color:
                                "#15803d",
                              fontWeight:
                                700,
                              cursor:
                                "pointer",
                              fontSize:
                                "12px",
                            }}
                          >
                            ✓ Close Report
                          </button>

                        )}


                        {/* DELETE */}

                        <button
                          type="button"
                          onClick={() =>
                            deleteReport(
                              item.id
                            )
                          }
                          style={{
                            padding:
                              "7px 10px",
                            border:
                              "1px solid rgba(220, 38, 38, 0.25)",
                            borderRadius:
                              "10px",
                            background:
                              "rgba(220, 38, 38, 0.08)",
                            color:
                              "#dc2626",
                            fontWeight:
                              700,
                            cursor:
                              "pointer",
                            fontSize:
                              "12px",
                          }}
                        >
                          🗑 Delete
                        </button>

                      </div>

                    </span>

                  </div>

                ))}


              {items.length === 0 && (

                <div className="table-empty">
                  No reports available.
                </div>

              )}

            </div>

          </div>


          {/* =====================================
              ADMIN DETAILS MODAL
          ====================================== */}

          {selectedAdminItem && (

            <div
              onClick={() =>
                setSelectedAdminItem(
                  null
                )
              }
              style={{
                position:
                  "fixed",
                inset: 0,
                background:
                  "rgba(15, 23, 42, 0.48)",
                backdropFilter:
                  "blur(6px)",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                padding:
                  "20px",
                zIndex:
                  9999,
              }}
            >

              <div
                onClick={(event) =>
                  event.stopPropagation()
                }
                style={{
                  width:
                    "min(680px, 100%)",
                  maxHeight:
                    "90vh",
                  overflowY:
                    "auto",
                  background:
                    "#ffffff",
                  borderRadius:
                    "24px",
                  padding:
                    "28px",
                  boxShadow:
                    "0 25px 70px rgba(15, 23, 42, 0.25)",
                }}
              >

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "flex-start",
                    gap:
                      "15px",
                  }}
                >

                  <div>

                    <span className="eyebrow">
                      ADMIN • REPORT DETAILS
                    </span>

                    <h2
                      style={{
                        margin:
                          "6px 0 4px",
                      }}
                    >
                      {selectedAdminItem.title}
                    </h2>

                    <p
                      style={{
                        margin: 0,
                        color:
                          "#64748b",
                      }}
                    >
                      Complete report
                      and reporter
                      information
                    </p>

                  </div>


                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAdminItem(
                        null
                      )
                    }
                    style={{
                      width:
                        "38px",
                      height:
                        "38px",
                      border:
                        "none",
                      borderRadius:
                        "12px",
                      background:
                        "#f1f5f9",
                      color:
                        "#334155",
                      fontSize:
                        "20px",
                      cursor:
                        "pointer",
                    }}
                    aria-label="Close details"
                  >
                    ×
                  </button>

                </div>


                {/* REPORTER INFORMATION */}

                <div
                  style={{
                    marginTop:
                      "24px",
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap:
                      "14px",
                  }}
                >

                  <div className="side-card">

                    <strong>
                      Reporter Name
                    </strong>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {selectedAdminItem.reporter_name ||
                        "Not provided"}
                    </p>

                  </div>


                  <div className="side-card">

                    <strong>
                      Phone Number
                    </strong>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {selectedAdminItem.reporter_phone ||
                        "Not provided"}
                    </p>

                  </div>


                  <div className="side-card">

                    <strong>
                      Department
                    </strong>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {selectedAdminItem.reporter_department ||
                        "Not provided"}
                    </p>

                  </div>


                  <div className="side-card">

                    <strong>
                      Report Type
                    </strong>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {selectedAdminItem.type}
                    </p>

                  </div>


                  <div className="side-card">

                    <strong>
                      Category
                    </strong>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {selectedAdminItem.category ||
                        "Other"}
                    </p>

                  </div>


                  <div className="side-card">

                    <strong>
                      Brand
                    </strong>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {selectedAdminItem.brand ||
                        "Not specified"}
                    </p>

                  </div>


                  <div className="side-card">

                    <strong>
                      Color
                    </strong>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {selectedAdminItem.color ||
                        "Not specified"}
                    </p>

                  </div>


                  <div className="side-card">

                    <strong>
                      Location
                    </strong>

                    <p
                      style={{
                        margin:
                          "6px 0 0",
                      }}
                    >
                      {selectedAdminItem.location ||
                        "Not specified"}
                    </p>

                  </div>

                </div>


                {/* DESCRIPTION */}

                <div
                  style={{
                    marginTop:
                      "16px",
                    padding:
                      "18px",
                    borderRadius:
                      "16px",
                    background:
                      "#f8fafc",
                  }}
                >

                  <strong>
                    Description
                  </strong>

                  <p
                    style={{
                      margin:
                        "8px 0 0",
                      color:
                        "#475569",
                      lineHeight:
                        1.6,
                    }}
                  >
                    {selectedAdminItem.description ||
                      "No description provided."}
                  </p>

                </div>


                {/* ACTION BUTTONS */}

                <div
                  style={{
                    marginTop:
                      "18px",
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap:
                      "12px",
                    flexWrap:
                      "wrap",
                  }}
                >

                  <div
                    style={{
                      display:
                        "flex",
                      gap:
                        "10px",
                      flexWrap:
                        "wrap",
                    }}
                  >

                    {/* CLOSE REPORT */}

                    {(selectedAdminItem.status ||
                      "ACTIVE") !==
                      "CLOSED" && (

                      <button
                        type="button"
                        onClick={() =>
                          closeReport(
                            selectedAdminItem.id
                          )
                        }
                        style={{
                          padding:
                            "11px 16px",
                          border:
                            "none",
                          borderRadius:
                            "12px",
                          background:
                            "#16a34a",
                          color:
                            "#ffffff",
                          fontWeight:
                            800,
                          cursor:
                            "pointer",
                        }}
                      >
                        ✓ Mark Report as Closed
                      </button>

                    )}


                    {/* DELETE REPORT */}

                    <button
                      type="button"
                      onClick={() =>
                        deleteReport(
                          selectedAdminItem.id
                        )
                      }
                      style={{
                        padding:
                          "11px 16px",
                        border:
                          "none",
                        borderRadius:
                          "12px",
                        background:
                          "#dc2626",
                        color:
                          "#ffffff",
                        fontWeight:
                          800,
                        cursor:
                          "pointer",
                      }}
                    >
                      🗑 Delete Report
                    </button>

                  </div>


                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() =>
                      setSelectedAdminItem(
                        null
                      )
                    }
                  >
                    Close Details
                  </button>

                </div>

              </div>

            </div>

          )}


          {/* ADMIN INFORMATION */}

          <div className="admin-bottom-grid">

            <div className="admin-info-card">

              <div className="admin-info-icon">
                🤖
              </div>

              <h3>
                Smart Matching Engine
              </h3>

              <p>
                The matching engine compares
                category, title, description,
                color, brand and location to
                identify possible item matches.
              </p>

              <span className="system-status">
                ● SYSTEM READY
              </span>

            </div>


            <div className="admin-info-card">

              <div className="admin-info-icon">
                🛡️
              </div>

              <h3>
                Verification System
              </h3>

              <p>
                Administrators can verify
                ownership claims before an item
                is officially returned.
              </p>

              <span className="system-status">
                ● SECURITY ACTIVE
              </span>

            </div>

          </div>

        </main>
      )}


      {/* =====================================
          FOOTER
      ====================================== */}

      <footer className="footer">

        <div className="footer-brand">

          <div className="brand-icon">
            C
          </div>

          <div>

            <strong>
              CampusFind
            </strong>

            <span>
              Smart Campus Item Recovery
            </span>

          </div>

        </div>


        <div className="footer-center">
          Built for a smarter and more connected campus.
        </div>


        <div className="footer-right">
          <span>
            Prototype • 2026
          </span>
        </div>

      </footer>

    </div>
  );
}


/* =====================================================
   ITEM CARD
   REAL SMART MATCHING
===================================================== */

function ItemCard({
  item,
  onClaim,
}) {

  const [
    matches,
    setMatches,
  ] = useState([]);

  const [
    loadingMatches,
    setLoadingMatches,
  ] = useState(true);


  const isLost =
    item.type === "LOST";


  // ========================================
  // ICON MAP
  // ========================================

  const iconMap = {
    Electronics: "📱",
    "ID / Documents": "🪪",
    Wallet: "👛",
    Bag: "🎒",
    Books: "📚",
    Keys: "🔑",
    Clothing: "👕",
    Accessories: "⌚",
    Other: "📦",
  };


  const icon =
    iconMap[item.category] ||
    "📦";


  // ========================================
  // LOAD SMART MATCHES
  // ========================================

  useEffect(() => {

    const loadMatches = async () => {

      try {

        setLoadingMatches(true);

        const response =
          await fetch(
            `${API_URL}/items/${item.id}/matches`
          );


        if (!response.ok) {

          throw new Error(
            "Failed to load matches"
          );

        }


        const data =
          await response.json();


        setMatches(
          data.matches || []
        );

      } catch (error) {

        console.error(
          "Smart Match Error:",
          error
        );

        setMatches([]);

      } finally {

        setLoadingMatches(false);

      }

    };


    loadMatches();

  }, [item.id]);


  // ========================================
  // BEST MATCH
  // ========================================

  const bestMatch =
    matches.length > 0
      ? matches[0]
      : null;


  return (

    <article className="item-card">


      {/* ITEM TOP */}

      <div className="item-top">

        <div className="item-visual">
          {icon}
        </div>


        <span
          className={
            isLost
              ? "item-status lost"
              : "item-status found"
          }
        >
          {isLost
            ? "LOST"
            : "FOUND"}
        </span>

      </div>


      {/* CONTENT */}

      <div className="item-content">

        <span className="item-category">
          {item.category ||
            "Other"}
        </span>


        <h3>
          {item.title}
        </h3>


        <p>
          {item.description ||
            "No additional description provided."}
        </p>


        {/* DETAILS */}

        <div className="item-details">

          <span>
            📍{" "}
            {item.location ||
              "Unknown location"}
          </span>


          <span>
            🎨{" "}
            {item.color ||
              "Color not specified"}
          </span>


          {item.brand && (

            <span>
              🏷️{" "}
              {item.brand}
            </span>

          )}

        </div>


        {/* ==================================
            REAL SMART MATCH
        =================================== */}

        <div className="item-match">

          <div>

            <span>
              SMART MATCH
            </span>


            {loadingMatches ? (

              <strong>
                Analyzing...
              </strong>

            ) : bestMatch ? (

              <strong>
                {bestMatch.title}
              </strong>

            ) : (

              <strong>
                No strong match yet
              </strong>

            )}

          </div>


          <div className="match-percent">

            {loadingMatches
              ? "..."
              : bestMatch
                ? `${bestMatch.match_score}%`
                : "—"}

          </div>

        </div>


        {/* ==================================
            MATCH DETAILS
        =================================== */}

        {!loadingMatches &&
          bestMatch && (

            <div
              style={{
                marginTop:
                  "12px",
                padding:
                  "12px",
                borderRadius:
                  "12px",
                background:
                  "rgba(37, 99, 235, 0.06)",
                border:
                  "1px solid rgba(37, 99, 235, 0.12)",
              }}
            >

              <div
                style={{
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap:
                    "10px",
                  marginBottom:
                    "8px",
                }}
              >

                <strong
                  style={{
                    color:
                      "#2563eb",
                    fontSize:
                      "13px",
                  }}
                >
                  POSSIBLE MATCH
                </strong>


                <span
                  style={{
                    fontSize:
                      "12px",
                    fontWeight:
                      700,
                    color:
                      "#475569",
                  }}
                >
                  {bestMatch.type}
                </span>

              </div>


              <div
                style={{
                  display:
                    "flex",
                  flexWrap:
                    "wrap",
                  gap:
                    "6px",
                }}
              >

                {(
                  bestMatch.matched_fields ||
                  []
                ).map(
                  (field) => (

                    <span
                      key={field}
                      style={{
                        padding:
                          "5px 8px",
                        borderRadius:
                          "999px",
                        background:
                          "#ffffff",
                        border:
                          "1px solid rgba(37, 99, 235, 0.15)",
                        color:
                          "#334155",
                        fontSize:
                          "11px",
                        fontWeight:
                          700,
                      }}
                    >
                      ✓ {field}
                    </span>

                  )
                )}

              </div>

            </div>

          )}


        {/* CLAIM BUTTON */}

        <button
          className="claim-btn"
          onClick={onClaim}
        >

          {isLost
            ? "I Found This Item"
            : "This Might Be Mine"}

          →

        </button>

      </div>

    </article>

  );
}


export default App;