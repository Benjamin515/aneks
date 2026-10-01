export interface StopPoint {
  id: string
  name: string
  active: boolean
  notes: string
}
export interface Corridor {
  id: string
  name: string
  type: "Primary route" | "Conditional route"
  stopIds: string[]
  active: boolean
  note: string
  color: string
}
export interface Vehicle {
  id: string
  plate: string
  category: string
  model: string
  status: "Available" | "Unavailable"
  capacity: number
  defaultDriverId: string
  defaultRouteId: string
  notes: string
}
export interface Driver {
  id: string
  name: string
  phone: string
  email: string
  status: "Active" | "Unavailable"
  defaultVehicleId: string
  notes: string
}
export interface Handler {
  id: string
  name: string
  phone: string
  role: string
}
export interface Schedule {
  id: string
  vehicleId: string
  day: string
  originId: string
  destinationId: string
  routeId: string
  departure: string
  arrival: string
  recurrence: string
  active: boolean
}
export interface Trip {
  id: string
  routeId: string
  vehicleId: string
  driverId: string
  handlerId: string
  originId: string
  destinationId: string
  departureAt: string
  expectedArrivalAt: string
  actualArrivalAt: string
  status: "Scheduled" | "Loading" | "In transit" | "Arrived" | "Cancelled"
  notes: string
  overrideReason: string
}
export interface Assignment {
  id: string
  parcelId: string
  tripId: string
  status: "Planned" | "Loaded" | "Reassigned"
  assignedAt: string
  actor: string
  reason: string
  replacementTripId: string
}
export interface Movement {
  id: string
  parcelId: string
  tripId: string
  vehicleId: string
  driverId: string
  handlerId: string
  action: string
  location: string
  occurredAt: string
  actor: string
  note: string
}
export interface Availability {
  id: string
  vehicleId: string
  from: string
  until: string
  reason: string
  recordedBy: string
  resolution: string
  replacementVehicleId: string
}
export interface Payment {
  id: string
  parcelId: string
  method: "Cash" | "M-Pesa"
  amount: number
  reference: string
  payer: string
  recordedAt: string
  recordedBy: string
  status: "Recorded" | "Voided"
}
export interface OperationAudit {
  id: string
  entity: string
  entityId: string
  action: string
  before: string
  after: string
  reason: string
  actor: string
  at: string
}
export interface OperatingRules {
  saturdayEveningNairobi: boolean
  sundayMeruReturn: boolean
  overnightJourneys: boolean
}

export const seedStops: StopPoint[] = [
  "Meru Town",
  "Nkubu",
  "Gacibi",
  "Mitunguu",
  "Tunyai",
  "Ishiara",
  "Kanyuambora",
  "Embu",
  "Mwea",
  "Nairobi",
  "Chuka",
  "Chogoria",
].map((name, index) => ({
  id: `ST-${String(index + 1).padStart(3, "0")}`,
  name,
  active: true,
  notes: "",
}))

const stopId = (name: string) =>
  seedStops.find((stop) => stop.name === name)!.id
export const seedRoutes: Corridor[] = [
  {
    id: "ishiara",
    name: "Ishiara corridor",
    type: "Primary route",
    stopIds: [
      "Meru Town",
      "Nkubu",
      "Gacibi",
      "Mitunguu",
      "Tunyai",
      "Ishiara",
      "Kanyuambora",
      "Embu",
      "Mwea",
      "Nairobi",
    ].map(stopId),
    active: true,
    note: "Normal Meru–Nairobi corridor; stops ordered from Meru towards Nairobi.",
    color: "teal",
  },
  {
    id: "chuka",
    name: "Chuka corridor",
    type: "Conditional route",
    stopIds: ["Meru Town", "Chuka", "Chogoria", "Embu", "Mwea", "Nairobi"].map(
      stopId,
    ),
    active: true,
    note: "Used when consignments need the Chuka highway.",
    color: "amber",
  },
]
export const seedVehicles: Vehicle[] = [
  {
    id: "VEH-001",
    plate: "KDK 482M",
    category: "Parcel lorry",
    model: "Isuzu FVR",
    status: "Available",
    capacity: 12,
    defaultDriverId: "DRV-001",
    defaultRouteId: "ishiara",
    notes: "Primary Meru–Nairobi service.",
  },
  {
    id: "VEH-002",
    plate: "KCY 615P",
    category: "Parcel lorry",
    model: "Mitsubishi Fuso",
    status: "Available",
    capacity: 10,
    defaultDriverId: "DRV-002",
    defaultRouteId: "chuka",
    notes: "Chuka corridor service.",
  },
  {
    id: "VEH-003",
    plate: "KDB 927R",
    category: "Parcel lorry",
    model: "Isuzu NPR",
    status: "Available",
    capacity: 10,
    defaultDriverId: "DRV-003",
    defaultRouteId: "ishiara",
    notes: "Nairobi return service.",
  },
]
export const seedDrivers: Driver[] = [
  {
    id: "DRV-001",
    name: "Daniel Mwiti",
    phone: "+254 711 430 210",
    email: "",
    status: "Active",
    defaultVehicleId: "VEH-001",
    notes: "",
  },
  {
    id: "DRV-002",
    name: "Grace Karimi",
    phone: "+254 722 514 330",
    email: "",
    status: "Active",
    defaultVehicleId: "VEH-002",
    notes: "",
  },
  {
    id: "DRV-003",
    name: "Peter Mutuma",
    phone: "+254 733 691 802",
    email: "",
    status: "Active",
    defaultVehicleId: "VEH-003",
    notes: "",
  },
  {
    id: "DRV-004",
    name: "Joseph Kirimi",
    phone: "+254 701 428 311",
    email: "",
    status: "Active",
    defaultVehicleId: "",
    notes: "Relief driver.",
  },
]
export const seedHandlers: Handler[] = [
  {
    id: "STAFF-001",
    name: "Alice Kendi",
    phone: "+254 710 220 334",
    role: "Parcel handler",
  },
  {
    id: "STAFF-002",
    name: "Brian Mutegi",
    phone: "+254 726 451 081",
    role: "Loading & dispatch",
  },
  {
    id: "STAFF-003",
    name: "Mercy Nkirote",
    phone: "+254 734 610 275",
    role: "Station operations",
  },
]
const localDay = (offset = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
export const seedTrips: Trip[] = [
  {
    id: "TR-2408",
    routeId: "ishiara",
    vehicleId: "VEH-001",
    driverId: "DRV-001",
    handlerId: "STAFF-001",
    originId: stopId("Meru Town"),
    destinationId: stopId("Nairobi"),
    departureAt: `${localDay()}T20:30`,
    expectedArrivalAt: `${localDay(1)}T04:45`,
    actualArrivalAt: "",
    status: "In transit",
    notes: "Sample overnight trunk movement.",
    overrideReason: "",
  },
  {
    id: "TR-2409",
    routeId: "chuka",
    vehicleId: "VEH-002",
    driverId: "DRV-002",
    handlerId: "STAFF-002",
    originId: stopId("Meru Town"),
    destinationId: stopId("Nairobi"),
    departureAt: `${localDay(1)}T20:15`,
    expectedArrivalAt: `${localDay(2)}T04:30`,
    actualArrivalAt: "",
    status: "Scheduled",
    notes: "Conditional Chuka service.",
    overrideReason: "",
  },
  {
    id: "TR-2410",
    routeId: "ishiara",
    vehicleId: "VEH-003",
    driverId: "DRV-003",
    handlerId: "STAFF-003",
    originId: stopId("Nairobi"),
    destinationId: stopId("Meru Town"),
    departureAt: `${localDay()}T19:00`,
    expectedArrivalAt: `${localDay(1)}T04:30`,
    actualArrivalAt: "",
    status: "Scheduled",
    notes: "Sample return movement.",
    overrideReason: "",
  },
]
export const seedSchedules: Schedule[] = [
  {
    id: "SCH-001",
    vehicleId: "VEH-001",
    day: "Monday",
    originId: stopId("Meru Town"),
    destinationId: stopId("Nairobi"),
    routeId: "ishiara",
    departure: "20:30",
    arrival: "04:45",
    recurrence: "Weekly",
    active: true,
  },
  {
    id: "SCH-002",
    vehicleId: "VEH-001",
    day: "Tuesday",
    originId: stopId("Nairobi"),
    destinationId: stopId("Meru Town"),
    routeId: "ishiara",
    departure: "20:30",
    arrival: "04:45",
    recurrence: "Weekly",
    active: true,
  },
  {
    id: "SCH-003",
    vehicleId: "VEH-002",
    day: "Wednesday",
    originId: stopId("Meru Town"),
    destinationId: stopId("Nairobi"),
    routeId: "chuka",
    departure: "20:15",
    arrival: "04:30",
    recurrence: "Weekly",
    active: true,
  },
]
export const seedRules: OperatingRules = {
  saturdayEveningNairobi: false,
  sundayMeruReturn: true,
  overnightJourneys: true,
}

export const nextId = (prefix: string, ids: string[]) =>
  `${prefix}-${String(Math.max(0, ...ids.map((id) => Number(id.split("-").at(-1)) || 0)) + 1).padStart(3, "0")}`
export const stopName = (stops: StopPoint[], id: string) =>
  stops.find((stop) => stop.id === id)?.name || id
export const activeAssignment = (assignments: Assignment[], parcelId: string) =>
  [...assignments]
    .reverse()
    .find((a) => a.parcelId === parcelId && a.status !== "Reassigned")
export const parcelBalance = (
  amount: number,
  payments: Payment[],
  parcelId: string,
) =>
  Math.max(
    0,
    amount -
      payments
        .filter((p) => p.parcelId === parcelId && p.status === "Recorded")
        .reduce((sum, p) => sum + p.amount, 0),
  )
