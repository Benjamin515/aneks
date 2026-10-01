import { seedDrivers, seedHandlers, seedRoutes, seedRules, seedSchedules, seedStops, seedTrips, seedVehicles } from './operations-data'
import type { Assignment, Availability, Corridor, Driver, Handler, Movement, OperatingRules, OperationAudit, Payment, Schedule, StopPoint, Trip, Vehicle } from './operations-data'

export type ParcelStatus = "Registered" | "Sorted" | "Assigned" | "Loaded" | "In transit" | "Arrived" | "Ready for collection" | "Out for delivery" | "Delivered" | "Collected" | "Held"
export type PaymentStatus = "Paid" | "Pending"
export type Page = "Overview" | "Parcels" | "Customers" | "Fleet & drivers" | "Routes & trips" | "Finance" | "Incidents" | "Reports" | "Settings"

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  type: "Individual" | "Business" | "Corporate"
  location: string
  joined: string
  preferredChannel: "SMS" | "Email" | "Phone"
  notes: string
}

export interface Event {
  id: string
  date: string
  action: string
  location: string
  actor: string
  note?: string
}

export interface Parcel {
  id: string
  customerId: string
  senderName: string
  senderPhone: string
  recipient: string
  recipientPhone: string
  origin: string
  destination: string
  route: string
  trip: string
  description: string
  category?: string
  additionalDescription?: string
  service: string
  status: ParcelStatus
  payment: PaymentStatus
  amount: number
  createdAt: string
  events: Event[]
}

export interface Incident {
  id: string
  parcelId: string
  category: string
  description: string
  status: "Open" | "Investigating" | "Resolved"
  reportedAt: string
}

export interface Store {
  customers: Customer[]
  parcels: Parcel[]
  incidents: Incident[]
  stops: StopPoint[]
  routes: Corridor[]
  vehicles: Vehicle[]
  drivers: Driver[]
  handlers: Handler[]
  trips: Trip[]
  schedules: Schedule[]
  assignments: Assignment[]
  movements: Movement[]
  availability: Availability[]
  payments: Payment[]
  operatingRules: OperatingRules
  audit: OperationAudit[]
}

export const routes = [
  {
    id: "ishiara",
    name: "Ishiara corridor",
    type: "Primary route",
    path: "Meru → Ishiara → Nairobi",
    stops: ["Meru", "Ishiara", "Embu", "Nairobi"],
    color: "teal",
    note: "Default corridor for Meru–Nairobi consignments.",
  },
  {
    id: "chuka",
    name: "Chuka corridor",
    type: "Conditional route",
    path: "Meru → Chuka → Nairobi",
    stops: ["Meru", "Chuka", "Chogoria", "Nairobi"],
    color: "amber",
    note: "Used when a consignment requires service along the Chuka highway.",
  },
]

export const trips = [
  {
    id: "TR-2408",
    route: "Ishiara corridor",
    direction: "Meru → Nairobi",
    vehicle: "KDK 482M",
    driver: "Daniel Mwiti",
    departure: "08:30",
    arrival: "16:45",
    state: "In transit",
    capacity: "68%",
  },
  {
    id: "TR-2409",
    route: "Chuka corridor",
    direction: "Meru → Nairobi",
    vehicle: "KCY 615P",
    driver: "Grace Karimi",
    departure: "10:15",
    arrival: "18:30",
    state: "Scheduled",
    capacity: "42%",
  },
  {
    id: "TR-2410",
    route: "Ishiara corridor",
    direction: "Nairobi → Meru",
    vehicle: "KDB 927R",
    driver: "Peter Mutuma",
    departure: "19:00",
    arrival: "04:30",
    state: "Scheduled",
    capacity: "54%",
  },
]

const daysAgo = (days: number, hour = 9) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

const event = (
  days: number,
  action: string,
  location: string,
  actor: string,
): Event => ({
  id: crypto.randomUUID(),
  date: daysAgo(days),
  action,
  location,
  actor,
})

export const initialStore: Store = {
  stops: seedStops,
  routes: seedRoutes,
  vehicles: seedVehicles,
  drivers: seedDrivers,
  handlers: seedHandlers,
  trips: seedTrips,
  schedules: seedSchedules,
  operatingRules: seedRules,
  audit: [],
  availability: [],
  assignments: [
    { id: 'ASN-001', parcelId: 'ANK-240801', tripId: 'TR-2408', status: 'Loaded', assignedAt: daysAgo(0, 8), actor: 'Alice Kendi', reason: '', replacementTripId: '' },
    { id: 'ASN-002', parcelId: 'ANK-240802', tripId: 'TR-2410', status: 'Planned', assignedAt: daysAgo(0, 9), actor: 'Mercy Nkirote', reason: '', replacementTripId: '' },
    { id: 'ASN-003', parcelId: 'ANK-240804', tripId: 'TR-2408', status: 'Loaded', assignedAt: daysAgo(1), actor: 'Alice Kendi', reason: '', replacementTripId: '' },
    { id: 'ASN-004', parcelId: 'ANK-240805', tripId: 'TR-2410', status: 'Planned', assignedAt: daysAgo(0, 10), actor: 'Mercy Nkirote', reason: '', replacementTripId: '' },
  ],
  movements: [
    { id: 'MOV-001', parcelId: 'ANK-240801', tripId: 'TR-2408', vehicleId: 'VEH-001', driverId: 'DRV-001', handlerId: 'STAFF-001', action: 'Loaded', location: 'Meru Town', occurredAt: daysAgo(0, 8), actor: 'Alice Kendi', note: 'Sample loading event' },
    { id: 'MOV-002', parcelId: 'ANK-240804', tripId: 'TR-2408', vehicleId: 'VEH-001', driverId: 'DRV-001', handlerId: 'STAFF-001', action: 'Loaded', location: 'Meru Town', occurredAt: daysAgo(1), actor: 'Alice Kendi', note: 'Sample loading event' },
  ],
  payments: [],
  customers: [
    {
      id: "CUS-001",
      name: "Mary Wanjiku",
      phone: "+254 712 456 890",
      email: "mary.wanjiku@example.com",
      type: "Individual",
      location: "Meru",
      joined: daysAgo(170),
      preferredChannel: "SMS",
      notes: "",
    },
    {
      id: "CUS-002",
      name: "Kijani Home Supplies",
      phone: "+254 722 391 044",
      email: "orders@kijani.example",
      type: "Business",
      location: "Nairobi",
      joined: daysAgo(250),
      preferredChannel: "Email",
      notes: "Contact: Alice Njeri",
    },
    {
      id: "CUS-003",
      name: "James Muriuki",
      phone: "+254 733 582 671",
      email: "james.m@example.com",
      type: "Individual",
      location: "Chuka",
      joined: daysAgo(32),
      preferredChannel: "SMS",
      notes: "",
    },
    {
      id: "CUS-004",
      name: "Maua Medical Distributors",
      phone: "+254 701 892 334",
      email: "logistics@maua.example",
      type: "Corporate",
      location: "Meru",
      joined: daysAgo(410),
      preferredChannel: "Email",
      notes: "Handle with care.",
    },
    {
      id: "CUS-005",
      name: "Faith Njeri",
      phone: "+254 748 612 903",
      email: "faith.n@example.com",
      type: "Individual",
      location: "Nairobi",
      joined: daysAgo(8),
      preferredChannel: "Phone",
      notes: "",
    },
    {
      id: "CUS-006",
      name: "Peter Kioko",
      phone: "+254 711 234 876",
      email: "peter.k@example.com",
      type: "Individual",
      location: "Embu",
      joined: daysAgo(86),
      preferredChannel: "SMS",
      notes: "",
    },
  ],
  parcels: [
    {
      id: "ANK-240801",
      customerId: "CUS-001",
      senderName: "Mary Wanjiku",
      senderPhone: "+254 712 456 890",
      recipient: "John Kamau",
      recipientPhone: "+254 722 101 992",
      origin: "Meru",
      destination: "Nairobi",
      route: "Ishiara corridor",
      trip: "TR-2408",
      description: "Personal package",
      service: "Branch collection",
      status: "In transit",
      payment: "Paid",
      amount: 850,
      createdAt: daysAgo(0, 8),
      events: [
        event(0, "Registered", "Meru branch", "Front desk"),
        event(0, "Loaded on TR-2408", "Meru branch", "Dispatch team"),
        event(0, "Dispatched", "Meru branch", "Daniel Mwiti"),
      ],
    },
    {
      id: "ANK-240802",
      customerId: "CUS-002",
      senderName: "Kijani Home Supplies",
      senderPhone: "+254 722 391 044",
      recipient: "Beatrice Muthoni",
      recipientPhone: "+254 710 640 331",
      origin: "Nairobi",
      destination: "Meru",
      route: "Ishiara corridor",
      trip: "TR-2410",
      description: "Homeware cartons",
      service: "Branch collection",
      status: "Sorted",
      payment: "Paid",
      amount: 2400,
      createdAt: daysAgo(0, 9),
      events: [
        event(0, "Registered", "Nairobi branch", "Front desk"),
        event(0, "Sorted for dispatch", "Nairobi branch", "Sorting team"),
      ],
    },
    {
      id: "ANK-240803",
      customerId: "CUS-003",
      senderName: "James Muriuki",
      senderPhone: "+254 733 582 671",
      recipient: "Lucy Kendi",
      recipientPhone: "+254 725 460 778",
      origin: "Meru",
      destination: "Chuka",
      route: "Chuka corridor",
      trip: "TR-2409",
      description: "Documents",
      service: "Branch collection",
      status: "Ready for collection",
      payment: "Paid",
      amount: 450,
      createdAt: daysAgo(1),
      events: [
        event(1, "Registered", "Meru branch", "Front desk"),
        event(0, "Arrived at collection point", "Chuka", "Receiving team"),
      ],
    },
    {
      id: "ANK-240804",
      customerId: "CUS-004",
      senderName: "Maua Medical Distributors",
      senderPhone: "+254 701 892 334",
      recipient: "Meru Health Clinic",
      recipientPhone: "+254 734 920 122",
      origin: "Meru",
      destination: "Nairobi",
      route: "Ishiara corridor",
      trip: "TR-2408",
      description: "Medical supplies",
      service: "Door delivery",
      status: "Out for delivery",
      payment: "Pending",
      amount: 3200,
      createdAt: daysAgo(1),
      events: [
        event(1, "Registered", "Meru branch", "Front desk"),
        event(0, "Out for delivery", "Nairobi branch", "Delivery team"),
      ],
    },
    {
      id: "ANK-240805",
      customerId: "CUS-005",
      senderName: "Faith Njeri",
      senderPhone: "+254 748 612 903",
      recipient: "Ann Nyambura",
      recipientPhone: "+254 720 117 551",
      origin: "Nairobi",
      destination: "Meru",
      route: "Ishiara corridor",
      trip: "TR-2410",
      description: "Clothing",
      service: "Branch collection",
      status: "Registered",
      payment: "Pending",
      amount: 650,
      createdAt: daysAgo(0, 10),
      events: [event(0, "Registered", "Nairobi branch", "Front desk")],
    },
    {
      id: "ANK-240806",
      customerId: "CUS-006",
      senderName: "Peter Kioko",
      senderPhone: "+254 711 234 876",
      recipient: "Samuel Gitonga",
      recipientPhone: "+254 711 590 433",
      origin: "Embu",
      destination: "Meru",
      route: "Ishiara corridor",
      trip: "TR-2410",
      description: "Electronics",
      service: "Branch collection",
      status: "Held",
      payment: "Paid",
      amount: 1200,
      createdAt: daysAgo(2),
      events: [
        event(2, "Registered", "Embu collection point", "Front desk"),
        event(0, "Held for review", "Embu collection point", "Branch manager"),
      ],
    },
    {
      id: "ANK-240807",
      customerId: "CUS-002",
      senderName: "Kijani Home Supplies",
      senderPhone: "+254 722 391 044",
      recipient: "David Mugo",
      recipientPhone: "+254 723 483 614",
      origin: "Nairobi",
      destination: "Meru",
      route: "Ishiara corridor",
      trip: "TR-2410",
      description: "Household goods",
      service: "Door delivery",
      status: "Delivered",
      payment: "Paid",
      amount: 1750,
      createdAt: daysAgo(3),
      events: [
        event(3, "Registered", "Nairobi branch", "Front desk"),
        event(1, "Delivered to recipient", "Meru", "Delivery team"),
      ],
    },
    {
      id: "ANK-240808",
      customerId: "CUS-004",
      senderName: "Maua Medical Distributors",
      senderPhone: "+254 701 892 334",
      recipient: "City Pharmacy",
      recipientPhone: "+254 701 130 985",
      origin: "Meru",
      destination: "Nairobi",
      route: "Ishiara corridor",
      trip: "TR-2408",
      description: "Health supplies",
      service: "Door delivery",
      status: "Arrived",
      payment: "Paid",
      amount: 2800,
      createdAt: daysAgo(1),
      events: [
        event(1, "Registered", "Meru branch", "Front desk"),
        event(0, "Arrived at destination", "Nairobi branch", "Receiving team"),
      ],
    },
  ],
  incidents: [
    {
      id: "INC-0042",
      parcelId: "ANK-240806",
      category: "Parcel held",
      description:
        "Parcel held at Embu collection point pending branch review.",
      status: "Investigating",
      reportedAt: daysAgo(0, 11),
    },
    {
      id: "INC-0041",
      parcelId: "ANK-240803",
      category: "Delivery delay",
      description: "Chuka collection arrival delayed due to road conditions.",
      status: "Resolved",
      reportedAt: daysAgo(1),
    },
  ],
}

initialStore.payments = initialStore.parcels.filter(p => p.payment === 'Paid').map((p, i) => ({ id: `PAY-${String(i + 1).padStart(3, '0')}`, parcelId: p.id, method: i % 2 ? 'Cash' : 'M-Pesa', amount: p.amount, reference: i % 2 ? `CASH-DEMO-${i + 1}` : `MPESA-DEMO-${i + 1}`, payer: p.senderName, recordedAt: p.createdAt, recordedBy: 'Sample operator', status: 'Recorded' }))

export const money = (value: number) => `KES ${value.toLocaleString("en-KE")}`
export const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
export const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

export function routeFor(destination: string, origin: string, corridors: Corridor[] = seedRoutes, stops: StopPoint[] = seedStops) {
  const normalize = (name: string) => name === 'Meru' ? 'Meru Town' : name
  const matches = corridors.filter(route => route.active && [destination, origin].every(name => route.stopIds.some(id => { const stop = stops.find(s => s.id === id); return stop?.active && stop.name === normalize(name) })))
  const primary = matches.find(route => route.type === 'Primary route')
  const conditional = matches.find(route => route.type === 'Conditional route' && [destination, origin].some(name => !primary?.stopIds.some(id => stops.find(s => s.id === id)?.name === normalize(name))))
  return (conditional || primary || matches[0])?.name || ''
}
