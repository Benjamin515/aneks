import { useEffect, useMemo, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Box,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Download,
  FileBarChart2,
  Filter,
  LayoutDashboard,
  MapPin,
  Menu,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  Route,
  Search,
  Settings2,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Operations from "./Operations"
import { activeAssignment, parcelBalance, seedRules, seedStops, seedRoutes, seedVehicles, seedDrivers, seedHandlers, seedTrips, seedSchedules } from "./operations-data"
import {
  dateTime,
  initialStore,
  money,
  routeFor,
  shortDate,
} from "./data"
import type {
  Customer,
  Incident,
  Page,
  Parcel,
  ParcelStatus,
  Store,
} from "./data"

const menu: { title: string, items: { name: Page, icon: LucideIcon }[] }[] = [
  {
    title: "WORKSPACE",
    items: [
      { name: "Overview", icon: LayoutDashboard },
      { name: "Parcels", icon: Package },
      { name: "Customers", icon: Users },
      { name: "Fleet & drivers", icon: Truck },
      { name: "Routes & trips", icon: Route },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { name: "Finance", icon: Wallet },
      { name: "Incidents", icon: AlertCircle },
      { name: "Reports", icon: FileBarChart2 },
    ],
  },
]

const nextStatus: Partial<Record<ParcelStatus, ParcelStatus[]>> = {
  Registered: ["Sorted", "Held"],
  Sorted: ["In transit", "Held"],
  "In transit": ["Arrived", "Held"],
  Arrived: ["Ready for collection", "Out for delivery", "Held"],
  "Ready for collection": ["Collected", "Held"],
  "Out for delivery": ["Delivered", "Held"],
  Held: ["Sorted", "In transit", "Arrived"],
}

function loadStore(): Store {
  try {
    const saved = localStorage.getItem("aneks-workspace-demo-v1")
    if (saved) {
      const parsed = JSON.parse(saved)
      if (
        Array.isArray(parsed.customers) &&
        Array.isArray(parsed.parcels) &&
        Array.isArray(parsed.incidents)
      )
        return {
          ...parsed,
          stops: parsed.stops ?? seedStops,
          routes: parsed.routes ?? seedRoutes,
          vehicles: parsed.vehicles ?? seedVehicles,
          drivers: parsed.drivers ?? seedDrivers,
          handlers: parsed.handlers ?? seedHandlers,
          trips: parsed.trips ?? seedTrips,
          schedules: parsed.schedules ?? seedSchedules,
          assignments: parsed.assignments ?? [],
          movements: parsed.movements ?? [],
          availability: parsed.availability ?? [],
          payments: parsed.payments ?? [],
          operatingRules: parsed.operatingRules ?? seedRules,
          audit: parsed.audit ?? [],
        }
    }
  } catch {
    /* Use sample data when browser storage is unavailable. */
  }
  return initialStore
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "teal" | "amber" | "red" | "blue" | "neutral" | "purple"
}) {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="badge-dot" />
      {children}
    </span>
  )
}

function statusTone(
  status: string,
): "teal" | "amber" | "red" | "blue" | "neutral" | "purple" {
  if (
    [
      "Delivered",
      "Collected",
      "Paid",
      "Resolved",
      "Ready for collection",
    ].includes(status)
  )
    return "teal"
  if (["Held", "Pending", "Investigating", "Out for delivery"].includes(status))
    return "amber"
  if (["In transit", "Scheduled"].includes(status)) return "blue"
  if (["Arrived", "Sorted"].includes(status)) return "purple"
  if (status === "Open") return "red"
  return "neutral"
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  )
}

function Empty({
  icon: Icon = Search,
  title = "Nothing found",
  text = "Try a different search or filter.",
}: {
  icon?: LucideIcon
  title?: string
  text?: string
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}

export default function App() {
  const [store, setStore] = useState<Store>(loadStore)
  const [page, setPage] = useState<Page>("Overview")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All statuses")
  const [modal, setModal] =
    useState<"shipment" | "customer" | "incident" | null>(null)
  const [selectedParcel, setSelectedParcel] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
  const [shipmentCustomerId, setShipmentCustomerId] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState("")
  const [period, setPeriod] = useState("30 days")
  const [recipientProof, setRecipientProof] = useState("")

  useEffect(() => {
    try {
      localStorage.setItem("aneks-workspace-demo-v1", JSON.stringify(store))
    } catch {
      /* Preview remains usable without storage. */
    }
  }, [store])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(""), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const customers = store.customers
  const parcels = store.parcels
  const incidents = store.incidents
  const selected = parcels.find((p) => p.id === selectedParcel)
  const customer = customers.find((c) => c.id === selectedCustomer)
  const paidRevenue = store.payments.filter(p => p.status === "Recorded").reduce((sum, p) => sum + p.amount, 0)
  const pendingRevenue = parcels.reduce((sum, p) => sum + parcelBalance(p.amount, store.payments, p.id), 0)
  const inTransit = parcels.filter((p) => p.status === "In transit").length
  const awaiting = parcels.filter((p) =>
    ["Arrived", "Ready for collection", "Out for delivery"].includes(p.status),
  ).length
  const filteredParcels = parcels.filter((p) => {
    const matchesSearch = [
      p.id,
      p.senderName,
      p.senderPhone,
      p.recipient,
      p.recipientPhone,
      p.destination,
      p.category || "",
      p.additionalDescription || "",
      p.route,
      p.trip,
      store.vehicles.find(v => v.id === store.trips.find(t => t.id === activeAssignment(store.assignments, p.id)?.tripId)?.vehicleId)?.plate || "",
      store.drivers.find(d => d.id === store.trips.find(t => t.id === activeAssignment(store.assignments, p.id)?.tripId)?.driverId)?.name || "",
      p.status,
    ].some((v) => v.toLowerCase().includes(search.toLowerCase()))
    return (
      matchesSearch &&
      (statusFilter === "All statuses" || p.status === statusFilter)
    )
  })
  const filteredCustomers = customers.filter((c) =>
    [c.id, c.name, c.phone, c.email, c.location, c.type].some((v) =>
      v.toLowerCase().includes(search.toLowerCase()),
    ),
  )
  const chart = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - (6 - i))
        const count = parcels.filter(
          (p) => new Date(p.createdAt).toDateString() === d.toDateString(),
        ).length
        return {
          label: d.toLocaleDateString("en-KE", { weekday: "short" }),
          count,
        }
      }),
    [parcels],
  )

  function navigate(target: Page) {
    setPage(target)
    setSearch("")
    setStatusFilter("All statuses")
    setMobileOpen(false)
    setSelectedParcel(null)
    setSelectedCustomer(null)
  }
  function openParcel(id: string) {
    setSelectedCustomer(null)
    setSelectedParcel(id)
    setRecipientProof("")
  }
  function openShipment(customerId = "") {
    setShipmentCustomerId(customerId)
    setSelectedCustomer(null)
    setModal("shipment")
  }
  function createCustomer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const values = Object.fromEntries(new FormData(e.currentTarget))
    const phone = String(values.phone).trim()
    if (
      customers.some(
        (c) => c.phone.replace(/\s/g, "") === phone.replace(/\s/g, ""),
      )
    ) {
      setToast("A customer with this phone number already exists.")
      return
    }
    const newCustomer: Customer = {
      id: `CUS-${String(Math.max(0, ...customers.map((c) => Number(c.id.split("-")[1]) || 0)) + 1).padStart(3, "0")}`,
      name: String(values.name).trim(),
      phone,
      email: String(values.email).trim(),
      location: String(values.location).trim(),
      type: values.type as Customer["type"],
      preferredChannel: values.channel as Customer["preferredChannel"],
      notes: String(values.notes).trim(),
      joined: new Date().toISOString(),
    }
    setStore((s) => ({ ...s, customers: [newCustomer, ...s.customers] }))
    setModal(null)
    navigate("Customers")
    setSelectedCustomer(newCustomer.id)
    setToast("Customer profile created.")
  }
  function createShipment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const values = Object.fromEntries(new FormData(e.currentTarget))
    const sender = customers.find((c) => c.id === values.customerId)
    if (!sender) return
    const destination = String(values.destination)
    const id = `ANK-${String(Date.now()).slice(-8)}`
    const parcel: Parcel = {
      id,
      customerId: sender.id,
      senderName: sender.name,
      senderPhone: sender.phone,
      recipient: String(values.recipient).trim(),
      recipientPhone: String(values.recipientPhone).trim(),
      origin: String(values.origin),
      destination,
      route: routeFor(destination, String(values.origin), store.routes, store.stops),
      trip: "Unassigned",
      description: String(values.description).trim(),
      category: String(values.category || "General"),
      additionalDescription: String(values.additionalDescription || "").trim(),
      service: String(values.service),
      status: "Registered",
      payment: "Pending",
      amount: Number(values.amount),
      createdAt: new Date().toISOString(),
      events: [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          action: "Registered",
          location: `${values.origin} branch`,
          actor: "Workspace operator",
          note: "Shipment created in preview workspace",
        },
      ],
    }
    setStore((s) => ({ ...s, parcels: [parcel, ...s.parcels] }))
    setModal(null)
    navigate("Parcels")
    openParcel(id)
    setToast("Parcel registered. Payment remains pending.")
  }
  function createIncident(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const values = Object.fromEntries(new FormData(e.currentTarget))
    const incident: Incident = {
      id: `INC-${String(Math.max(0, ...incidents.map((i) => Number(i.id.split("-")[1]) || 0)) + 1).padStart(4, "0")}`,
      parcelId: String(values.parcelId),
      category: String(values.category),
      description: String(values.description).trim(),
      status: "Open",
      reportedAt: new Date().toISOString(),
    }
    setStore((s) => ({ ...s, incidents: [incident, ...s.incidents] }))
    setModal(null)
    navigate("Incidents")
    setToast("Incident recorded for review.")
  }
  function advanceParcel(parcel: Parcel, status: ParcelStatus) {
    if (["Delivered", "Collected"].includes(status) && !recipientProof.trim()) {
      setToast("Enter the receiving person’s name before completion.")
      return
    }
    setStore((s) => ({
      ...s,
      audit: [...s.audit, { id: crypto.randomUUID(), entity: "Parcel", entityId: parcel.id, action: "Delivery status changed", before: parcel.status, after: status, reason: recipientProof.trim(), actor: "Workspace operator", at: new Date().toISOString() }],
      parcels: s.parcels.map((p) =>
        p.id === parcel.id
          ? {
              ...p,
              status,
              events: [
                ...p.events,
                {
                  id: crypto.randomUUID(),
                  date: new Date().toISOString(),
                  action: status,
                  location: p.destination,
                  actor: "Workspace operator",
                  note: recipientProof.trim()
                    ? `Received by ${recipientProof.trim()}`
                    : undefined,
                },
              ],
            }
          : p,
      ),
    }))
    setRecipientProof("")
    setToast(`Parcel updated to ${status}.`)
  }
  function markPaid(parcel: Parcel) {
    const outstanding = parcelBalance(parcel.amount, store.payments, parcel.id)
    if (!outstanding) return
    const method = window.prompt("Record a preview payment method: Cash or M-Pesa", "M-Pesa")
    if (method !== "Cash" && method !== "M-Pesa") return setToast("Choose Cash or M-Pesa.")
    const reference = window.prompt("Enter the cash receipt or M-Pesa reference:")?.trim()
    if (!reference) return setToast("A transaction reference is required.")
    const payer = window.prompt("Payer name:", parcel.senderName)?.trim()
    if (!payer) return setToast("A payer name is required.")
    const amount = Number(window.prompt(`Amount received (outstanding ${outstanding} KES):`, String(outstanding)))
    if (!Number.isFinite(amount) || amount <= 0 || amount > outstanding) return setToast("Enter an amount greater than zero and no more than the balance.")
    setStore((s) => ({
      ...s,
      payments: [...s.payments, { id: crypto.randomUUID(), parcelId: parcel.id, method, amount, reference, payer, recordedAt: new Date().toISOString(), recordedBy: "Workspace operator", status: "Recorded" }],
      audit: [...s.audit, { id: crypto.randomUUID(), entity: "Payment", entityId: parcel.id, action: "Payment recorded", before: String(outstanding), after: String(outstanding - amount), reason: `${method} · ${reference}`, actor: "Workspace operator", at: new Date().toISOString() }],
      parcels: s.parcels.map((p) =>
        p.id === parcel.id
          ? {
              ...p,
              payment: amount === outstanding ? "Paid" : "Pending",
              events: [
                ...p.events,
                {
                  id: crypto.randomUUID(),
                  date: new Date().toISOString(),
                  action: "Payment recorded (preview)",
                  location: p.origin,
                  actor: "Workspace operator",
                  note: `${method} · ${reference} · ${money(amount)} · not independently verified`,
                },
              ],
            }
          : p,
      ),
    }))
    setToast("Payment recorded locally. No payment was processed or verified.")
  }
  function exportCsv() {
    const rows = [
      [
        "Tracking ID",
        "Sender",
        "Recipient",
        "Origin",
        "Destination",
        "Route",
        "Status",
        "Payment",
        "Amount (KES)",
        "Registered",
      ],
      ...parcels.map((p) => [
        p.id,
        p.senderName,
        p.recipient,
        p.origin,
        p.destination,
        p.route,
        p.status,
        p.payment,
        String(p.amount),
        p.createdAt,
      ]),
    ]
    const csv = rows
      .map((row) =>
        row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n")
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    )
    const link = document.createElement("a")
    link.href = url
    link.download = "aneks-parcels-demo.csv"
    link.click()
    URL.revokeObjectURL(url)
    setToast("Preview parcel report exported.")
  }

  return (
    <div className="app-shell">
      {mobileOpen && (
        <div className="mobile-scrim" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <span className="brand-mark-line" />
          </div>
          <div className="brand-text">
            <strong>
              aneks<span>.</span>
            </strong>
            <small>PARCEL SERVICES</small>
          </div>
          <button
            className="mobile-close icon-button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-icon">A</div>
          <div className="workspace-text">
            <strong>Aneks Workspace</strong>
            <span>Operations dashboard</span>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav className="side-nav">
          {menu.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-label">{group.title}</div>
              {group.items.map((item) => (
                <button
                  key={item.name}
                  className={`nav-item ${page === item.name ? "active" : ""}`}
                  onClick={() => navigate(item.name)}
                >
                  <item.icon size={18} strokeWidth={1.8} />
                  <span>{item.name}</span>
                  {item.name === "Incidents" &&
                    incidents.filter((i) => i.status !== "Resolved").length >
                      0 && (
                      <span className="nav-count">
                        {
                          incidents.filter((i) => i.status !== "Resolved")
                            .length
                        }
                      </span>
                    )}
                </button>
              ))}
            </div>
          ))}
          <div className="nav-group">
            <div className="nav-label">PREFERENCES</div>
            <button
              className={`nav-item ${page === "Settings" ? "active" : ""}`}
              onClick={() => navigate("Settings")}
            >
              <Settings2 size={18} strokeWidth={1.8} />
              <span>Settings</span>
            </button>
          </div>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-symbol">
              <CircleHelp size={19} />
            </span>
            <strong>Need a hand?</strong>
            <p>Explore the workspace and its operational workflows.</p>
            <button onClick={() => navigate("Settings")}>
              View setup notes <ArrowRight size={14} />
            </button>
          </div>
          <div className="sidebar-profile">
            <span className="profile-avatar">AO</span>
            <div>
              <strong>Aneks Operator</strong>
              <small>Preview workspace</small>
            </div>
            <MoreHorizontal size={18} />
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu icon-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb-root">Workspace</span>
            <ChevronRight size={15} className="breadcrumb-chevron" />
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <button
              className="top-search"
              onClick={() => {
                navigate("Parcels")
                window.setTimeout(
                  () => document.getElementById("parcel-search")?.focus(),
                  0,
                )
              }}
            >
              <Search size={17} />
              <span>Search parcels...</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <button
              className="icon-button top-icon"
              onClick={() => setToast("You’re all caught up in this preview.")}
              aria-label="Notifications"
            >
              <Bell size={19} />
            </button>
            <span className="top-avatar">AO</span>
          </div>
        </header>
        <main className="content">
          {page === "Overview" && (
            <>
              <div className="page-intro overview-intro">
                <div>
                  <div className="intro-kicker">
                    <span className="live-dot" /> OPERATIONS OVERVIEW{" "}
                    <span className="intro-kicker-sep">/</span>{" "}
                    {new Date().toLocaleDateString("en-KE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <h1>
                    Good{" "}
                    {new Date().getHours() < 12
                      ? "morning"
                      : new Date().getHours() < 17
                        ? "afternoon"
                        : "evening"}
                    , team
                  </h1>
                  <p>
                    Here’s what’s happening across your parcel network today.
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() => openShipment()}
                >
                  <Plus size={18} /> New shipment
                </button>
              </div>
              <div className="preview-note">
                <ShieldCheck size={17} />
                <span>
                  <strong>Preview workspace</strong> · Sample records and
                  browser-local changes only. Do not enter real customer data.
                  No live payments, notifications, or dispatches are connected.
                </span>
              </div>
              <div className="metric-grid">
                <Metric
                  icon={Package}
                  label="Total parcels"
                  value={parcels.length.toString().padStart(2, "0")}
                  detail="All registered shipments"
                  tone="blue"
                  trend="Network-wide"
                />
                <Metric
                  icon={Truck}
                  label="In transit"
                  value={String(inTransit).padStart(2, "0")}
                  detail="Currently on the move"
                  tone="purple"
                  trend="Live workflow"
                />
                <Metric
                  icon={MapPin}
                  label="At destination"
                  value={String(awaiting).padStart(2, "0")}
                  detail="Arrived or awaiting handover"
                  tone="amber"
                  trend="Needs attention"
                />
                <Metric
                  icon={Wallet}
                  label="Recorded payments"
                  value={money(paidRevenue)}
                  detail="Paid parcel charges"
                  tone="teal"
                  trend="From records"
                />
              </div>
              <div className="dashboard-grid">
                <div className="card activity-card">
                  <SectionHeading
                    eyebrow="VOLUME & ACTIVITY"
                    title="Parcel activity"
                    action={
                      <span className="soft-select">
                        <CalendarDays size={15} /> Last 7 days{" "}
                        <ChevronDown size={14} />
                      </span>
                    }
                  />
                  <div className="chart-summary">
                    <strong>
                      {
                        parcels.filter(
                          (p) =>
                            Date.now() - new Date(p.createdAt).getTime() <
                            7 * 86400000,
                        ).length
                      }
                    </strong>
                    <span>parcels registered this week</span>
                    <span className="chart-pill">
                      <TrendingUp size={13} /> Based on records
                    </span>
                  </div>
                  <div className="bar-chart">
                    {chart.map((d, i) => (
                      <div className="bar-col" key={i}>
                        <div
                          className="bar-track"
                          title={`${d.count} parcel${d.count === 1 ? "" : "s"}`}
                        >
                          <div
                            className={`bar-fill ${i === 6 ? "highlight" : ""}`}
                            style={{
                              height: `${(d.count / Math.max(4, ...chart.map((item) => item.count))) * 100}%`,
                              display: d.count ? undefined : "none",
                            }}
                          />
                        </div>
                        <span>{d.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="chart-footer">
                    <span>
                      <span className="legend-dot" /> Registered parcels
                    </span>
                    <span>Last 7 days</span>
                  </div>
                </div>
                <div className="card corridor-card">
                  <SectionHeading
                    eyebrow="ROUTE NETWORK"
                    title="Corridor status"
                    action={
                      <button
                        className="text-button"
                        onClick={() => navigate("Routes & trips")}
                      >
                        View routes <ArrowRight size={15} />
                      </button>
                    }
                  />
                  <div className="corridor-map">
                    <div className="map-node">
                      <span className="node-circle" />
                      <span>MERU</span>
                    </div>
                    <div className="map-lines">
                      <div className="map-line">
                        <span>Ishiara · Primary</span>
                      </div>
                      <div className="map-line amber">
                        <span>Chuka · Conditional</span>
                      </div>
                    </div>
                    <div className="map-node right">
                      <span className="node-circle" />
                      <span>NAIROBI</span>
                    </div>
                  </div>
                  <div className="corridor-list">
                    <div className="corridor-row">
                      <span className="route-indicator teal" />
                      <div>
                        <strong>Ishiara corridor</strong>
                        <small>Default Meru ↔ Nairobi</small>
                      </div>
                      <Badge tone="teal">Primary</Badge>
                    </div>
                    <div className="corridor-row">
                      <span className="route-indicator amber" />
                      <div>
                        <strong>Chuka corridor</strong>
                        <small>For Chuka highway deliveries</small>
                      </div>
                      <Badge tone="amber">Conditional</Badge>
                    </div>
                  </div>
                  <div className="corridor-foot">
                    <Activity size={16} /> {store.trips.length} trips in this preview
                    schedule
                  </div>
                </div>
              </div>
              <div className="dashboard-grid lower-grid">
                <div className="card recent-card">
                  <SectionHeading
                    eyebrow="LATEST MOVEMENTS"
                    title="Recent parcels"
                    action={
                      <button
                        className="text-button"
                        onClick={() => navigate("Parcels")}
                      >
                        View all parcels <ArrowRight size={15} />
                      </button>
                    }
                  />
                  <div className="table-scroll">
                    <ParcelTable
                      rows={parcels.slice(0, 5)}
                      onOpen={openParcel}
                      compact
                    />
                  </div>
                </div>
                <div className="card attention-card">
                  <SectionHeading
                    eyebrow="ACTION CENTER"
                    title="Needs your attention"
                    action={
                      <span className="attention-count">
                        {incidents.filter((i) => i.status !== "Resolved")
                          .length +
                          parcels.filter((p) => p.payment === "Pending").length}
                      </span>
                    }
                  />
                  <div className="attention-items">
                    <button
                      className="attention-item"
                      onClick={() => navigate("Incidents")}
                    >
                      <span className="attention-icon amber">
                        <AlertCircle size={19} />
                      </span>
                      <span>
                        <strong>Open incidents</strong>
                        <small>
                          {
                            incidents.filter((i) => i.status !== "Resolved")
                              .length
                          }{" "}
                          case(s) need follow-up
                        </small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                    <button
                      className="attention-item"
                      onClick={() => navigate("Finance")}
                    >
                      <span className="attention-icon blue">
                        <CreditCard size={19} />
                      </span>
                      <span>
                        <strong>Pending payments</strong>
                        <small>
                          {
                            parcels.filter((p) => p.payment === "Pending")
                              .length
                          }{" "}
                          parcel(s) · {money(pendingRevenue)}
                        </small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                    <button
                      className="attention-item"
                      onClick={() => navigate("Parcels")}
                    >
                      <span className="attention-icon teal">
                        <Box size={19} />
                      </span>
                      <span>
                        <strong>Destination handovers</strong>
                        <small>{awaiting} parcel(s) awaiting next step</small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  </div>
                  <div className="attention-footer">
                    <Clock3 size={15} /> Based on current preview records
                  </div>
                </div>
              </div>
            </>
          )}

          {page === "Parcels" && (
            <>
              <PageHeader
                kicker="OPERATIONS / PARCELS"
                title="Parcels"
                description="Track every consignment from registration to handover."
                action={
                  <button
                    className="button primary"
                    onClick={() => openShipment()}
                  >
                    <Plus size={18} /> New shipment
                  </button>
                }
              />
              <div className="mini-stats">
                <MiniStat label="All parcels" value={parcels.length} />
                <MiniStat label="In transit" value={inTransit} />
                <MiniStat label="At destination" value={awaiting} />
                <MiniStat
                  label="Completed"
                  value={
                    parcels.filter((p) =>
                      ["Delivered", "Collected"].includes(p.status),
                    ).length
                  }
                />
              </div>
              <div className="card list-card">
                <div className="list-toolbar">
                  <div className="input-search">
                    <Search size={18} />
                    <input
                      id="parcel-search"
                      placeholder="Search tracking ID, customer, recipient, route..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="toolbar-actions">
                    <div className="select-wrap">
                      <Filter size={16} />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option>All statuses</option>
                        {[
                          "Registered",
                          "Sorted",
                          "In transit",
                          "Arrived",
                          "Ready for collection",
                          "Out for delivery",
                          "Delivered",
                          "Collected",
                          "Held",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </div>
                    <button className="button secondary" onClick={exportCsv}>
                      <Download size={16} /> Export
                    </button>
                  </div>
                </div>
                <div className="table-scroll">
                  {filteredParcels.length ? (
                    <ParcelTable rows={filteredParcels} onOpen={openParcel} />
                  ) : (
                    <Empty />
                  )}
                </div>
                <div className="table-foot">
                  Showing {filteredParcels.length} of {parcels.length} parcels{" "}
                  <span>
                    Click any row to see its journey <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </>
          )}

          {page === "Customers" && (
            <>
              <PageHeader
                kicker="RELATIONSHIPS / CUSTOMER INTELLIGENCE"
                title="Customers"
                description="Reusable profiles, shipment history, and activity in one place."
                action={
                  <button
                    className="button primary"
                    onClick={() => setModal("customer")}
                  >
                    <Plus size={18} /> Add customer
                  </button>
                }
              />
              <div className="mini-stats">
                <MiniStat label="Total customers" value={customers.length} />
                <MiniStat
                  label="Returning customers"
                  value={
                    customers.filter(
                      (c) =>
                        parcels.filter((p) => p.customerId === c.id).length > 1,
                    ).length
                  }
                />
                <MiniStat
                  label="Business accounts"
                  value={
                    customers.filter((c) => c.type !== "Individual").length
                  }
                />
                <MiniStat label="Total shipments" value={parcels.length} />
              </div>
              <div className="card list-card">
                <div className="list-toolbar">
                  <div className="input-search">
                    <Search size={18} />
                    <input
                      placeholder="Search name, phone, email, location..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <span className="table-hint">
                    {filteredCustomers.length} customer profiles
                  </span>
                </div>
                <div className="table-scroll">
                  {filteredCustomers.length ? (
                    <table className="data-table customer-table">
                      <thead>
                        <tr>
                          <th>CUSTOMER</th>
                          <th>TYPE</th>
                          <th>LOCATION</th>
                          <th>SHIPMENTS</th>
                          <th>RECORDED SPEND</th>
                          <th>JOINED</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.map((c) => {
                          const history = parcels.filter(
                            (p) => p.customerId === c.id,
                          )
                          return (
                            <tr
                              key={c.id}
                              onClick={() => setSelectedCustomer(c.id)}
                            >
                              <td>
                                <div className="customer-cell">
                                  <span className="customer-avatar">
                                    {initials(c.name)}
                                  </span>
                                  <div>
                                    <strong>{c.name}</strong>
                                    <small>{c.phone}</small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <Badge
                                  tone={
                                    c.type === "Individual"
                                      ? "neutral"
                                      : "purple"
                                  }
                                >
                                  {c.type}
                                </Badge>
                              </td>
                              <td>{c.location}</td>
                              <td>{history.length}</td>
                              <td className="strong-cell">
                                {money(
                                  history.reduce((sum, p) => sum + p.amount, 0),
                                )}
                              </td>
                              <td>{shortDate(c.joined)}</td>
                              <td>
                                <ChevronRight
                                  size={17}
                                  className="row-chevron"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <Empty />
                  )}
                </div>
                <div className="table-foot">
                  Customer insights are calculated from linked parcel records.
                </div>
              </div>
            </>
          )}

          {(page === "Routes & trips" || page === "Fleet & drivers") && (
            <Operations key={page} mode={page} store={store} setStore={setStore}
              onOpenParcel={setSelectedParcel} onToast={setToast} />
          )}

          {page === "Finance" && (
            <>
              <PageHeader
                kicker="MANAGEMENT / FINANCE"
                title="Finance"
                description="Parcel charges, payment records, and balances at a glance."
              />
              <div className="metric-grid finance-metrics">
                <Metric
                  icon={Wallet}
                  label="Recorded payments"
                  value={money(paidRevenue)}
                  detail="Marked paid in workspace"
                  tone="teal"
                />
                <Metric
                  icon={Clock3}
                  label="Outstanding balance"
                  value={money(pendingRevenue)}
                  detail="Pending parcel charges"
                  tone="amber"
                />
                <Metric
                  icon={CreditCard}
                  label="Paid parcels"
                  value={String(
                    parcels.filter((p) => p.payment === "Paid").length,
                  ).padStart(2, "0")}
                  detail="Of all registered parcels"
                  tone="blue"
                />
                <Metric
                  icon={TrendingUp}
                  label="Total charges"
                  value={money(paidRevenue + pendingRevenue)}
                  detail="Across all parcel records"
                  tone="purple"
                />
              </div>
              <div className="finance-warning">
                <AlertCircle size={18} />
                <span>
                  Preview ledger only. Payment confirmation here does not verify
                  cash, M-Pesa, or bank settlement. Reconciliation, refunds,
                  receipts, and integrations require a secured backend.
                </span>
              </div>
              <div className="card ops-report-panel"><SectionHeading eyebrow="MANUAL PAYMENT ENTRIES" title="Cash & M-Pesa records" /><div className="table-scroll"><table className="data-table"><thead><tr><th>PARCEL</th><th>METHOD</th><th>REFERENCE / PAYER</th><th>RECORDED BY / DATE</th><th>AMOUNT</th></tr></thead><tbody>{store.payments.slice().reverse().map(p => <tr key={p.id}><td><button className="inline-link" onClick={() => openParcel(p.parcelId)}>{p.parcelId}</button></td><td>{p.method}</td><td>{p.reference}<small className="ops-subline">{p.payer}</small></td><td>{p.recordedBy}<small className="ops-subline">{dateTime(p.recordedAt)}</small></td><td>{money(p.amount)}</td></tr>)}</tbody></table></div></div>
              <div className="card list-card">
                <div className="list-toolbar">
                  <div>
                    <div className="eyebrow">TRANSACTION RECORDS</div>
                    <h2>Parcel charges</h2>
                  </div>
                  <button className="button secondary" onClick={exportCsv}>
                    <Download size={16} /> Export records
                  </button>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>REFERENCE</th>
                        <th>CUSTOMER</th>
                        <th>DATE</th>
                        <th>AMOUNT</th>
                        <th>STATUS</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {parcels.map((p) => (
                        <tr key={p.id} onClick={() => openParcel(p.id)}>
                          <td className="tracking-id">{p.id}</td>
                          <td>{p.senderName}</td>
                          <td>{shortDate(p.createdAt)}</td>
                          <td className="strong-cell">{money(p.amount)}</td>
                          <td>
                            <Badge tone={statusTone(p.payment)}>
                              {p.payment}
                            </Badge>
                          </td>
                          <td>
                            <ChevronRight size={17} className="row-chevron" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {page === "Incidents" && (
            <>
              <PageHeader
                kicker="OPERATIONS / EXCEPTIONS"
                title="Incidents"
                description="Record, investigate, and follow up on operational exceptions."
                action={
                  <button
                    className="button primary"
                    onClick={() => setModal("incident")}
                  >
                    <Plus size={18} /> Report incident
                  </button>
                }
              />
              <div className="mini-stats">
                <MiniStat label="Total cases" value={incidents.length} />
                <MiniStat
                  label="Open"
                  value={incidents.filter((i) => i.status === "Open").length}
                />
                <MiniStat
                  label="Investigating"
                  value={
                    incidents.filter((i) => i.status === "Investigating").length
                  }
                />
                <MiniStat
                  label="Resolved"
                  value={
                    incidents.filter((i) => i.status === "Resolved").length
                  }
                />
              </div>
              <div className="card list-card">
                <div className="list-toolbar">
                  <div>
                    <div className="eyebrow">CASE REGISTER</div>
                    <h2>Reported exceptions</h2>
                  </div>
                </div>
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>CASE</th>
                        <th>ISSUE</th>
                        <th>PARCEL</th>
                        <th>REPORTED</th>
                        <th>STATUS</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((i) => (
                        <tr key={i.id}>
                          <td className="tracking-id">{i.id}</td>
                          <td>
                            <div className="cell-stack">
                              <strong>{i.category}</strong>
                              <small className="truncate-note">
                                {i.description}
                              </small>
                            </div>
                          </td>
                          <td>
                            <button
                              className="inline-link"
                              onClick={() => openParcel(i.parcelId)}
                            >
                              {i.parcelId}
                            </button>
                          </td>
                          <td>{shortDate(i.reportedAt)}</td>
                          <td>
                            <Badge tone={statusTone(i.status)}>
                              {i.status}
                            </Badge>
                          </td>
                          <td>
                            {i.status !== "Resolved" && (
                              <button
                                className="small-action"
                                onClick={() => {
                                  setStore((s) => ({
                                    ...s,
                                    incidents: s.incidents.map((item) =>
                                      item.id === i.id
                                        ? {
                                            ...item,
                                            status:
                                              item.status === "Open"
                                                ? "Investigating"
                                                : "Resolved",
                                          }
                                        : item,
                                    ),
                                  }))
                                  setToast("Case status updated in preview.")
                                }}
                              >
                                {i.status === "Open"
                                  ? "Investigate"
                                  : "Resolve"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {page === "Reports" && (
            <>
              <PageHeader
                kicker="INTELLIGENCE / REPORTING"
                title="Reports & insights"
                description="Operational indicators derived from the records in this workspace."
                action={
                  <button className="button primary" onClick={exportCsv}>
                    <Download size={17} /> Export parcel CSV
                  </button>
                }
              />
              <div className="report-controls">
                <span>
                  <CalendarDays size={17} /> Reporting period
                </span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <option>7 days</option>
                  <option>30 days</option>
                  <option>All time</option>
                </select>
              </div>
              {(() => {
                const scoped = parcels.filter(
                  (p) =>
                    period === "All time" ||
                    Date.now() - new Date(p.createdAt).getTime() <=
                      (period === "7 days" ? 7 : 30) * 86400000,
                )
                const revenue = store.payments.filter(p => p.status === "Recorded" && scoped.some(item => item.id === p.parcelId)).reduce((sum, p) => sum + p.amount, 0)
                return (
                  <>
                    <div className="metric-grid">
                      <Metric
                        icon={Package}
                        label="Shipments"
                        value={String(scoped.length).padStart(2, "0")}
                        detail="In selected period"
                        tone="blue"
                      />
                      <Metric
                        icon={Users}
                        label="Active senders"
                        value={String(
                          new Set(scoped.map((p) => p.customerId)).size,
                        ).padStart(2, "0")}
                        detail="Unique customer profiles"
                        tone="purple"
                      />
                      <Metric
                        icon={Wallet}
                        label="Recorded payments"
                        value={money(revenue)}
                        detail="Paid charges in period"
                        tone="teal"
                      />
                      <Metric
                        icon={CheckCircle2}
                        label="Completed"
                        value={String(
                          scoped.filter((p) =>
                            ["Delivered", "Collected"].includes(p.status),
                          ).length,
                        ).padStart(2, "0")}
                        detail="Delivered or collected"
                        tone="amber"
                      />
                    </div>
                    <div className="report-grid">
                      <div className="card report-card">
                        <SectionHeading
                          eyebrow="DESTINATION MIX"
                          title="Popular destinations"
                        />
                        {[...new Set(scoped.map((p) => p.destination))].map(
                          (dest) => {
                            const count = scoped.filter(
                              (p) => p.destination === dest,
                            ).length
                            return (
                              <div className="report-bar-row" key={dest}>
                                <div>
                                  <strong>{dest}</strong>
                                  <span>
                                    {count} parcel{count === 1 ? "" : "s"}
                                  </span>
                                </div>
                                <div className="report-bar-bg">
                                  <span
                                    style={{
                                      width: `${(count / Math.max(1, scoped.length)) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )
                          },
                        )}
                        {!scoped.length && <Empty />}
                      </div>
                      <div className="card report-card">
                        <SectionHeading
                          eyebrow="CUSTOMER INTELLIGENCE"
                          title="Top senders"
                        />
                        {customers
                          .map((c) => ({
                            customer: c,
                            history: scoped.filter(
                              (p) => p.customerId === c.id,
                            ),
                          }))
                          .filter((x) => x.history.length)
                          .sort((a, b) => b.history.length - a.history.length)
                          .slice(0, 5)
                          .map((x, i) => (
                            <button
                              className="rank-row"
                              key={x.customer.id}
                              onClick={() => setSelectedCustomer(x.customer.id)}
                            >
                              <span className="rank-number">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span className="customer-avatar small">
                                {initials(x.customer.name)}
                              </span>
                              <span>
                                <strong>{x.customer.name}</strong>
                                <small>
                                  {x.history.length} shipment
                                  {x.history.length === 1 ? "" : "s"}
                                </small>
                              </span>
                              <strong>
                                {money(
                                  x.history.reduce((s, p) => s + p.amount, 0),
                                )}
                              </strong>
                            </button>
                          ))}
                      </div>
                    </div>
                  </>
                )
              })()}
              <div className="report-disclaimer">
                <ShieldCheck size={17} /> Figures are calculated from preview
                parcel records, not a production accounting or analytics system.
              </div>
              <div className="card ops-report-panel"><SectionHeading eyebrow="FLEET & OPERATIONS" title="Transport reconciliation (browser-local)" /><div className="ops-reconcile"><span>Trips <strong>{store.trips.length}</strong></span><span>Active lorries <strong>{store.vehicles.filter(v => v.status === "Available").length}</strong></span><span>Planned manifests <strong>{store.assignments.filter(a => a.status !== "Reassigned").length}</strong></span><span>Loaded parcels <strong>{store.assignments.filter(a => a.status === "Loaded").length}</strong></span><span>Outstanding charges <strong>{money(pendingRevenue)}</strong></span><span>Open fleet issues <strong>{store.availability.filter(a => !a.resolution).length}</strong></span></div><p className="muted-note">Operational totals span all local records; the parcel reporting period above does not filter this reconciliation.</p></div>
            </>
          )}

          {page === "Settings" && (
            <>
              <PageHeader
                kicker="WORKSPACE / CONFIGURATION"
                title="Workspace settings"
                description="Preview configuration and implementation readiness."
              />
              <div className="settings-grid">
                <div className="card settings-card">
                  <span className="settings-icon">
                    <Route size={22} />
                  </span>
                  <h3>Routing policy</h3>
                  <p>
                    Ishiara and Kanyuambora belong to the primary Ishiara corridor.
                    Chuka and Chogoria belong to the conditional Chuka corridor.
                    Edit ordered stops in Routes & trips. Suggestions are not dispatch approvals.
                  </p>
                  <div className="settings-tag">{store.routes.filter(r => r.active).length} active corridors · {store.stops.filter(s => s.active).length} stops</div>
                  <div className="ops-settings-rules">
                    {([['saturdayEveningNairobi', 'Permit Saturday evening Nairobi departures'], ['sundayMeruReturn', 'Normally return to Meru on Sunday'], ['overnightJourneys', 'Overnight journeys are normal']] as const).map(([key, label]) => <label key={key}><input type="checkbox" checked={store.operatingRules[key]} onChange={e => setStore(s => ({ ...s, operatingRules: { ...s.operatingRules, [key]: e.target.checked }, audit: [...s.audit, { id: crypto.randomUUID(), entity: "Operating rules", entityId: key, action: "Rule changed", before: String(s.operatingRules[key]), after: String(e.target.checked), reason: "", actor: "Workspace operator", at: new Date().toISOString() }] }))} /> {label}</label>)}
                  </div>
                </div>
                <div className="card settings-card">
                  <span className="settings-icon">
                    <Users size={22} />
                  </span>
                  <h3>Customer records</h3>
                  <p>
                    Customer profiles are reusable across shipments. Sender name
                    and phone are snapshotted on registration so later profile
                    edits do not rewrite history.
                  </p>
                  <div className="settings-tag">Browser-local preview</div>
                </div>
                <div className="card settings-card">
                  <span className="settings-icon">
                    <ShieldCheck size={22} />
                  </span>
                  <h3>Production readiness</h3>
                  <p>
                    Before live operations: implement authenticated roles,
                    server-side audit trails, encrypted database storage,
                    verified payment integrations, evidence capture, and
                    retention controls.
                  </p>
                  <p>{store.audit.length} operational edits attributed to a demo operator. Browser storage can be modified or erased and is not an immutable audit log.</p>
                  <div className="settings-tag caution">Backend required</div>
                </div>
              </div>
              <div className="card decision-card">
                <SectionHeading
                  eyebrow="OPEN BUSINESS DECISIONS"
                  title="Confirm before rollout"
                />
                <div className="decision-list">
                  <div>
                    <span>01</span>
                    <p>
                      Official tariffs, service levels, discounts, and corporate
                      credit policy
                    </p>
                  </div>
                  <div>
                    <span>02</span>
                    <p>
                      Approved handover verification, proof-of-delivery, and
                      dispute procedures
                    </p>
                  </div>
                  <div>
                    <span>03</span>
                    <p>
                      Role permissions, branch responsibilities, and
                      reconciliation sign-off
                    </p>
                  </div>
                  <div>
                    <span>04</span>
                    <p>
                      Data-retention periods, communication consent, and Kenyan
                      regulatory review
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {selected && (
        <div
          className="drawer-overlay"
          onMouseDown={() => setSelectedParcel(null)}
        >
          <aside
            className="detail-drawer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span className="eyebrow">PARCEL DETAILS</span>
                <h2>{selected.id}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedParcel(null)}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>
            <div className="drawer-body">
              <div className="drawer-status">
                <span className="drawer-status-icon">
                  <Package size={21} />
                </span>
                <div>
                  <span>CURRENT STATUS</span>
                  <strong>{selected.status}</strong>
                </div>
                <Badge tone={statusTone(selected.status)}>
                  {selected.payment}
                </Badge>
              </div>
              <div className="detail-section">
                <h3>Journey</h3>
                <div className="journey-line">
                  <div>
                    <small>FROM</small>
                    <strong>{selected.origin}</strong>
                  </div>
                  <span>
                    <ArrowRight size={18} />
                  </span>
                  <div>
                    <small>TO</small>
                    <strong>{selected.destination}</strong>
                  </div>
                </div>
                <div className="detail-pair">
                  <span>Corridor</span>
                  <strong>{selected.route}</strong>
                </div>
                <div className="detail-pair">
                  <span>Trip</span>
                  <strong>{activeAssignment(store.assignments, selected.id)?.tripId || selected.trip || "Not assigned"}</strong>
                </div>
                <div className="detail-pair">
                  <span>Service</span>
                  <strong>{selected.service}</strong>
                </div>
                <div className="detail-pair">
                  <span>Contents</span>
                  <strong>{selected.description}</strong>
                </div>
                <div className="detail-pair"><span>Category / handling</span><strong>{selected.category || "General"}{selected.additionalDescription ? ` · ${selected.additionalDescription}` : ""}</strong></div>
                {(() => { const a = activeAssignment(store.assignments, selected.id); const t = store.trips.find(item => item.id === a?.tripId); const v = store.vehicles.find(item => item.id === t?.vehicleId); const d = store.drivers.find(item => item.id === t?.driverId); return <><div className="detail-pair"><span>Actual lorry / driver</span><strong>{v?.plate || "Unassigned"} · {d?.name || "Unassigned"}</strong></div>{d?.phone && <a className="ops-call" href={`tel:${d.phone.replace(/[^+\d]/g, "")}`}><Phone size={14} /> Call driver</a>}<div className="detail-pair"><span>Assignment history</span><strong>{store.assignments.filter(item => item.parcelId === selected.id).map(item => `${item.tripId} (${item.status})`).join(" → ") || "None yet"}</strong></div><div className="ops-movement-list">{store.movements.filter(item => item.parcelId === selected.id).slice().reverse().map(m => <p key={m.id}><strong>{m.action}</strong> · {m.tripId} · {store.vehicles.find(v => v.id === m.vehicleId)?.plate || m.vehicleId} · {m.location}<small>{dateTime(m.occurredAt)} · {m.actor} · {store.drivers.find(d => d.id === m.driverId)?.name || m.driverId}</small></p>)}</div></> })()}
              </div>
              <div className="detail-section">
                <h3>People & payment</h3>
                <div className="detail-pair">
                  <span>Sender at registration</span>
                  <strong>{selected.senderName}</strong>
                </div>
                <div className="detail-pair">
                  <span>Sender phone snapshot</span>
                  <a href={`tel:${selected.senderPhone.replace(/[^+\d]/g, "")}`}>{selected.senderPhone} · Call</a>
                </div>
                <div className="detail-pair">
                  <span>Recipient</span>
                  <strong>{selected.recipient}</strong>
                </div>
                <div className="detail-pair">
                  <span>Recipient phone</span>
                  <a href={`tel:${selected.recipientPhone.replace(/[^+\d]/g, "")}`}>{selected.recipientPhone} · Call</a>
                </div>
                <div className="detail-pair">
                  <span>Charge</span>
                  <strong>{money(selected.amount)}</strong>
                </div>
                <div className="detail-pair"><span>Outstanding balance</span><strong>{money(parcelBalance(selected.amount, store.payments, selected.id))}</strong></div>
                {store.payments.filter(p => p.parcelId === selected.id).map(p => <div className="ops-payment-row" key={p.id}><strong>{p.method} · {money(p.amount)}</strong><small>{p.reference} · {p.payer} · {dateTime(p.recordedAt)} · {p.status}</small></div>)}
                <p className="muted-note">Delivery status and payment records are separate. Cash and M-Pesa entries are manual browser-local records, not settlement proof.</p>
                {parcelBalance(selected.amount, store.payments, selected.id) > 0 && (
                  <button
                    className="button secondary full-width"
                    onClick={() => markPaid(selected)}
                  >
                    <Check size={16} /> Record manual payment (preview)
                  </button>
                )}
              </div>
              <div className="detail-section">
                <h3>Chain of custody</h3>
                <div className="timeline">
                  {[...selected.events].reverse().map((ev, i) => (
                    <div className="timeline-item" key={ev.id}>
                      <span
                        className={`timeline-dot ${i === 0 ? "latest" : ""}`}
                      />
                      <strong>{ev.action}</strong>
                      <small>
                        {dateTime(ev.date)} · {ev.location}
                      </small>
                      <small>
                        {ev.actor}
                        {ev.note ? ` · ${ev.note}` : ""}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
              {(nextStatus[selected.status]?.length || 0) > 0 && (
                <div className="detail-section status-actions">
                  <h3>Next action</h3>
                  {nextStatus[selected.status]?.some((s) =>
                    ["Delivered", "Collected"].includes(s),
                  ) && (
                    <label className="field-label">
                      Receiving person’s name
                      <input
                        value={recipientProof}
                        onChange={(e) => setRecipientProof(e.target.value)}
                        placeholder="Required for handover"
                      />
                    </label>
                  )}
                  <div className="status-buttons">
                    {nextStatus[selected.status]?.map((s) => (
                      <button
                        className="button secondary"
                        key={s}
                        onClick={() => advanceParcel(selected, s)}
                      >
                        {s === "Held" ? (
                          <AlertCircle size={15} />
                        ) : (
                          <ArrowRight size={15} />
                        )}
                        {s}
                      </button>
                    ))}
                  </div>
                  <p className="muted-note">
                    Preview status updates are browser-local and not
                    authenticated handover evidence.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {customer && (
        <div
          className="drawer-overlay"
          onMouseDown={() => setSelectedCustomer(null)}
        >
          <aside
            className="detail-drawer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span className="eyebrow">CUSTOMER PROFILE</span>
                <h2>{customer.name}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedCustomer(null)}
                aria-label="Close profile"
              >
                <X size={20} />
              </button>
            </div>
            <div className="drawer-body">
              <div className="profile-summary">
                <span className="customer-avatar large">
                  {initials(customer.name)}
                </span>
                <div>
                  <strong>{customer.name}</strong>
                  <span>
                    {customer.id} · {customer.type}
                  </span>
                </div>
              </div>
              <div className="profile-kpis">
                <div>
                  <strong>
                    {parcels.filter((p) => p.customerId === customer.id).length}
                  </strong>
                  <span>Shipments</span>
                </div>
                <div>
                  <strong>
                    {money(
                      parcels
                        .filter((p) => p.customerId === customer.id)
                        .reduce((sum, p) => sum + p.amount, 0),
                    )}
                  </strong>
                  <span>Total charges</span>
                </div>
              </div>
              <div className="detail-section">
                <h3>Contact & preferences</h3>
                <div className="detail-pair">
                  <span>Phone</span>
                  <strong>{customer.phone}</strong>
                </div>
                <div className="detail-pair">
                  <span>Email</span>
                  <strong>{customer.email || "Not provided"}</strong>
                </div>
                <div className="detail-pair">
                  <span>Location</span>
                  <strong>{customer.location}</strong>
                </div>
                <div className="detail-pair">
                  <span>Preferred channel</span>
                  <strong>{customer.preferredChannel}</strong>
                </div>
                <div className="detail-pair">
                  <span>Customer since</span>
                  <strong>{shortDate(customer.joined)}</strong>
                </div>
                {customer.notes && (
                  <div className="profile-note">{customer.notes}</div>
                )}
              </div>
              <div className="detail-section">
                <div className="section-heading">
                  <h3>Shipment history</h3>
                  <span className="table-hint">
                    {parcels.filter((p) => p.customerId === customer.id).length}{" "}
                    records
                  </span>
                </div>
                {parcels.filter((p) => p.customerId === customer.id).length ? (
                  parcels
                    .filter((p) => p.customerId === customer.id)
                    .map((p) => (
                      <button
                        className="history-item"
                        key={p.id}
                        onClick={() => openParcel(p.id)}
                      >
                        <span className="history-icon">
                          <Package size={17} />
                        </span>
                        <span>
                          <strong>{p.id}</strong>
                          <small>
                            {p.destination} · {shortDate(p.createdAt)}
                          </small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))
                ) : (
                  <Empty
                    icon={Package}
                    title="No shipments yet"
                    text="New shipments for this customer will appear here."
                  />
                )}
              </div>
              <button
                className="button primary full-width"
                onClick={() => {
                  openShipment(customer.id)
                }}
              >
                <Plus size={17} /> Create shipment
              </button>
            </div>
          </aside>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onMouseDown={() => setModal(null)}>
          <div className="modal-panel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">ANEKS OPERATIONS</span>
                <h2>
                  {modal === "shipment"
                    ? "Register a shipment"
                    : modal === "customer"
                      ? "Add a customer"
                      : "Report an incident"}
                </h2>
                <p>
                  {modal === "shipment"
                    ? "Capture the sender, recipient, and parcel details."
                    : modal === "customer"
                      ? "Create a reusable profile for future shipments."
                      : "Document an exception for follow-up."}
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setModal(null)}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>
            {modal === "shipment" && (
              <form onSubmit={createShipment} className="modal-form">
                <div className="form-section-label">
                  01 <span>SENDER & RECIPIENT</span>
                </div>
                <label className="field-label">
                  Existing customer
                  <select
                    name="customerId"
                    required
                    defaultValue={shipmentCustomerId}
                  >
                    <option value="" disabled>
                      Select a customer
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.phone}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-helper">
                  Customers are reusable; the sender details are snapshotted at
                  registration.{" "}
                  <button type="button" onClick={() => setModal("customer")}>
                    Add customer
                  </button>
                </div>
                <div className="field-grid">
                  <label className="field-label">
                    Recipient name
                    <input name="recipient" required placeholder="Full name" />
                  </label>
                  <label className="field-label">
                    Recipient phone
                    <input
                      name="recipientPhone"
                      required
                      type="tel"
                      placeholder="+254 7XX XXX XXX"
                    />
                  </label>
                </div>
                <div className="form-section-label">
                  02 <span>PARCEL & ROUTE</span>
                </div>
                <div className="field-grid">
                  <label className="field-label">
                    Origin
                    <select name="origin" defaultValue="Meru Town">
                      {store.stops.filter(stop => stop.active).map(stop => <option key={stop.id}>{stop.name}</option>)}
                    </select>
                  </label>
                  <label className="field-label">
                    Destination
                    <select name="destination" defaultValue="Nairobi">
                      {store.stops.filter(stop => stop.active).map(stop => <option key={stop.id}>{stop.name}</option>)}
                    </select>
                  </label>
                </div>
                <label className="field-label">
                  Parcel description
                  <input
                    name="description"
                    required
                    placeholder="e.g. Documents, clothing, household goods"
                  />
                </label>
                <div className="field-grid"><label className="field-label">Category<select name="category"><option>General</option><option>Documents</option><option>Fragile</option><option>Medical supplies</option><option>Other</option></select></label><label className="field-label">Additional description<input name="additionalDescription" placeholder="Optional handling details" /></label></div>
                <div className="field-grid">
                  <label className="field-label">
                    Service
                    <select name="service">
                      <option>Branch collection</option>
                      <option>Door delivery</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Approved charge (KES)
                    <input
                      name="amount"
                      type="number"
                      min="0"
                      step="1"
                      required
                      placeholder="Enter approved amount"
                    />
                  </label>
                </div>
                <p className="form-helper">
                  Charge must be entered by the operator; no tariff has been
                  assumed. Route is suggested from destination. Payment starts
                  pending.
                </p>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button className="button primary" type="submit">
                    Register parcel <ArrowRight size={17} />
                  </button>
                </div>
              </form>
            )}
            {modal === "customer" && (
              <form onSubmit={createCustomer} className="modal-form">
                <div className="field-grid">
                  <label className="field-label">
                    Customer name
                    <input
                      name="name"
                      required
                      placeholder="Full legal name or business name"
                    />
                  </label>
                  <label className="field-label">
                    Customer type
                    <select name="type">
                      <option>Individual</option>
                      <option>Business</option>
                      <option>Corporate</option>
                    </select>
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field-label">
                    Phone number
                    <input
                      name="phone"
                      type="tel"
                      required
                      placeholder="+254 7XX XXX XXX"
                    />
                  </label>
                  <label className="field-label">
                    Email address
                    <input name="email" type="email" placeholder="Optional" />
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field-label">
                    Location
                    <input
                      name="location"
                      required
                      placeholder="Town or area"
                    />
                  </label>
                  <label className="field-label">
                    Preferred contact
                    <select name="channel">
                      <option>SMS</option>
                      <option>Email</option>
                      <option>Phone</option>
                    </select>
                  </label>
                </div>
                <label className="field-label">
                  Internal notes
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Optional operational notes"
                  />
                </label>
                <p className="form-helper">
                  Please enter only information needed for the shipment
                  relationship. Duplicate phone numbers are checked in this
                  preview.
                </p>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button className="button primary" type="submit">
                    Save customer <ArrowRight size={17} />
                  </button>
                </div>
              </form>
            )}
            {modal === "incident" && (
              <form onSubmit={createIncident} className="modal-form">
                <label className="field-label">
                  Related parcel
                  <select name="parcelId" required defaultValue="">
                    <option value="" disabled>
                      Select a parcel
                    </option>
                    {parcels.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} · {p.senderName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field-label">
                  Incident category
                  <select name="category">
                    <option>Delivery delay</option>
                    <option>Parcel held</option>
                    <option>Damaged parcel</option>
                    <option>Missing parcel</option>
                    <option>Misrouted parcel</option>
                    <option>Failed delivery</option>
                    <option>Customer complaint</option>
                    <option>Other exception</option>
                  </select>
                </label>
                <label className="field-label">
                  Description
                  <textarea
                    name="description"
                    rows={4}
                    required
                    placeholder="What happened? Include relevant location and context."
                  />
                </label>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button className="button primary" type="submit">
                    Record incident <ArrowRight size={17} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}
function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="intro-kicker">{kicker}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}
function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  trend,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  tone: string
  trend?: string
}) {
  return (
    <div className="card metric">
      <div className="metric-top">
        <span className={`metric-icon ${tone}`}>
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <ArrowUpRight size={17} className="metric-arrow" />
      </div>
      <div className="metric-label">{label}</div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-bottom">
        <span>{detail}</span>
        {trend && <small>{trend}</small>}
      </div>
    </div>
  )
}
function MiniStat({ label, value }: { label: string, value: number }) {
  return (
    <div className="mini-stat">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
      <ArrowUpRight size={16} />
    </div>
  )
}
function ParcelTable({
  rows,
  onOpen,
  compact = false,
}: {
  rows: Parcel[]
  onOpen: (id: string) => void
  compact?: boolean
}) {
  return (
    <table className={`data-table ${compact ? "compact-table" : ""}`}>
      <thead>
        <tr>
          <th>TRACKING ID</th>
          <th>SENDER / RECIPIENT</th>
          <th>ROUTE</th>
          <th>STATUS</th>
          {!compact && <th>PAYMENT</th>}
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={p.id} onClick={() => onOpen(p.id)}>
            <td className="tracking-id">{p.id}</td>
            <td>
              <div className="cell-stack">
                <strong>{p.senderName}</strong>
                <small>To {p.recipient}</small>
              </div>
            </td>
            <td>
              <div className="cell-stack">
                <strong>
                  {p.origin} → {p.destination}
                </strong>
                <small>{p.route}</small>
              </div>
            </td>
            <td>
              <Badge tone={statusTone(p.status)}>{p.status}</Badge>
            </td>
            {!compact && (
              <td>
                <Badge tone={statusTone(p.payment)}>{p.payment}</Badge>
              </td>
            )}
            <td>
              <ChevronRight size={17} className="row-chevron" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
