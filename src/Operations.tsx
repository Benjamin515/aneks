import { useState } from "react"
import type { Dispatch, FormEvent, SetStateAction } from "react"
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  Package,
  Phone,
  Plus,
  Route as RouteIcon,
  Search,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react"
import type { Parcel, Store } from "./data"
import { dateTime, shortDate } from "./data"
import { activeAssignment, nextId, stopName } from "./operations-data"
import type {
  Assignment,
  Availability,
  Corridor,
  Driver,
  Movement,
  OperationAudit,
  Schedule,
  StopPoint,
  Trip,
  Vehicle,
} from "./operations-data"

type Props = {
  mode: "Fleet & drivers" | "Routes & trips"
  store: Store
  setStore: Dispatch<SetStateAction<Store>>
  onOpenParcel: (id: string) => void
  onToast: (message: string) => void
}
type Editor = "vehicle" | "driver" | "availability" | "stop" | "route" | "trip" | "schedule" | null
const actor = "Workspace operator"
const now = () => new Date().toISOString()
const audit = (
  entity: string,
  entityId: string,
  action: string,
  before = "",
  after = "",
  reason = "",
): OperationAudit => ({
  id: crypto.randomUUID(),
  entity,
  entityId,
  action,
  before,
  after,
  reason,
  actor,
  at: now(),
})
const event = (action: string, location: string, note = "") => ({
  id: crypto.randomUUID(),
  date: now(),
  action,
  location,
  actor,
  note,
})
const call = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`
const isUnavailable = (store: Store, vehicleId: string, departureAt: string) =>
  store.vehicles.find((v) => v.id === vehicleId)?.status === "Unavailable" ||
  store.availability.some(
    (a) =>
      a.vehicleId === vehicleId &&
      !a.resolution &&
      new Date(a.from).getTime() <= new Date(departureAt).getTime() &&
      (!a.until ||
        new Date(a.until).getTime() >= new Date(departureAt).getTime()),
  )
const tripRoute = (store: Store, trip: Trip) =>
  store.routes.find((r) => r.id === trip.routeId)
const parcelEligible = (store: Store, parcel: Parcel, trip: Trip) => {
  const route = tripRoute(store, trip)
  const names = route?.stopIds.map((id) => stopName(store.stops, id)) || []
  const origin = parcel.origin === "Meru" ? "Meru Town" : parcel.origin
  const destination =
    parcel.destination === "Meru" ? "Meru Town" : parcel.destination
  const start = names.indexOf(stopName(store.stops, trip.originId))
  const end = names.indexOf(stopName(store.stops, trip.destinationId))
  const from = names.indexOf(origin),
    to = names.indexOf(destination)
  return (
    start >= 0 &&
    end >= 0 &&
    from >= 0 &&
    to >= 0 &&
    (start < end
      ? from >= start && to > from && to <= end
      : from <= start && to < from && to >= end)
  )
}

export default function Operations({
  mode,
  store,
  setStore,
  onOpenParcel,
  onToast,
}: Props) {
  const [tab, setTab] = useState(
    mode === "Fleet & drivers" ? "Vehicles" : "Trips",
  )
  const [editor, setEditor] = useState<Editor>(null)
  const [selectedTripId, setSelectedTripId] = useState("")
  const [selectedVehicleId, setSelectedVehicleId] = useState("")
  const [selectedRouteId, setSelectedRouteId] = useState("")
  const [routeStops, setRouteStops] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [parcelChoice, setParcelChoice] = useState("")
  const [reassignId, setReassignId] = useState("")
  const [reassignTripId, setReassignTripId] = useState("")
  const [reassignReason, setReassignReason] = useState("")
  const [substitutionReason, setSubstitutionReason] = useState("")
  const trip = store.trips.find((t) => t.id === selectedTripId)
  const selectedRoute = store.routes.find((r) => r.id === selectedRouteId)
  const tripVehicle =
    trip && store.vehicles.find((v) => v.id === trip.vehicleId)
  const tripDriver = trip && store.drivers.find((d) => d.id === trip.driverId)
  const tripHandler =
    trip && store.handlers.find((h) => h.id === trip.handlerId)
  const manifest = trip
    ? store.assignments.filter(
        (a) => a.tripId === trip.id && a.status !== "Reassigned",
      )
    : []
  const vehicleName = (id: string) =>
    store.vehicles.find((v) => v.id === id)?.plate || id
  const driverName = (id: string) =>
    store.drivers.find((d) => d.id === id)?.name || id
  const closeEditor = () => {
    setEditor(null)
    setSelectedVehicleId("")
  }
  const selectTrip = (id: string) => {
    setSelectedTripId(id)
    setParcelChoice("")
    setReassignId("")
    setReassignReason("")
    setSubstitutionReason("")
  }

  function saveEntity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const values = new FormData(e.currentTarget)
    const str = (key: string) => String(values.get(key) || "").trim()
    if (editor === "vehicle") {
      if (
        store.vehicles.some(
          (v) => v.plate.toLowerCase() === str("plate").toLowerCase(),
        )
      )
        return onToast("That registration already exists.")
      const vehicle: Vehicle = {
        id: nextId(
          "VEH",
          store.vehicles.map((v) => v.id),
        ),
        plate: str("plate").toUpperCase(),
        category: str("category"),
        model: str("model"),
        status: "Available",
        capacity: Number(str("capacity")),
        defaultDriverId: str("defaultDriverId"),
        defaultRouteId: str("routeId"),
        notes: str("notes"),
      }
      setStore((s) => ({
        ...s,
        vehicles: [...s.vehicles, vehicle],
        audit: [
          ...s.audit,
          audit("Vehicle", vehicle.id, "Vehicle created", "", vehicle.plate),
        ],
      }))
    } else if (editor === "driver") {
      const driver: Driver = {
        id: nextId(
          "DRV",
          store.drivers.map((d) => d.id),
        ),
        name: str("name"),
        phone: str("phone"),
        email: str("email"),
        status: "Active",
        defaultVehicleId: str("defaultVehicleId"),
        notes: str("notes"),
      }
      setStore((s) => ({
        ...s,
        drivers: [...s.drivers, driver],
        audit: [
          ...s.audit,
          audit("Driver", driver.id, "Driver created", "", driver.name),
        ],
      }))
    } else if (editor === "stop") {
      if (
        store.stops.some(
          (s) => s.name.toLowerCase() === str("name").toLowerCase(),
        )
      )
        return onToast("That stop already exists.")
      const stop: StopPoint = {
        id: nextId(
          "ST",
          store.stops.map((s) => s.id),
        ),
        name: str("name"),
        active: true,
        notes: str("notes"),
      }
      setStore((s) => ({
        ...s,
        stops: [...s.stops, stop],
        audit: [
          ...s.audit,
          audit("Stop", stop.id, "Stop created", "", stop.name),
        ],
      }))
    } else if (editor === "route") {
      if (routeStops.length < 2)
        return onToast("Select at least two ordered stops for a corridor.")
      const route: Corridor = {
        id: nextId(
          "RT",
          store.routes.map((r) => r.id),
        ),
        name: str("name"),
        type: str("type") as Corridor["type"],
        stopIds: routeStops,
        active: true,
        note: str("note"),
        color: "teal",
      }
      setStore((s) => ({
        ...s,
        routes: [...s.routes, route],
        audit: [
          ...s.audit,
          audit("Route", route.id, "Route created", "", route.name),
        ],
      }))
      setRouteStops([])
    } else if (editor === "schedule") {
      const route = store.routes.find((r) => r.id === str("routeId"))
      if (
        !route ||
        !route.stopIds.includes(str("originId")) ||
        !route.stopIds.includes(str("destinationId")) ||
        str("originId") === str("destinationId")
      )
        return onToast(
          "Choose distinct stops that belong to the selected route.",
        )
      const schedule: Schedule = {
        id: nextId(
          "SCH",
          store.schedules.map((s) => s.id),
        ),
        vehicleId: str("vehicleId"),
        day: str("day"),
        originId: str("originId"),
        destinationId: str("destinationId"),
        routeId: route.id,
        departure: str("departure"),
        arrival: str("arrival"),
        recurrence: "Weekly",
        active: true,
      }
      setStore((s) => ({
        ...s,
        schedules: [...s.schedules, schedule],
        audit: [
          ...s.audit,
          audit(
            "Schedule",
            schedule.id,
            "Schedule created",
            "",
            `${schedule.day} ${schedule.departure}`,
          ),
        ],
      }))
    } else if (editor === "trip") {
      const route = store.routes.find((r) => r.id === str("routeId"))
      if (
        !route ||
        !route.stopIds.includes(str("originId")) ||
        !route.stopIds.includes(str("destinationId")) ||
        str("originId") === str("destinationId")
      )
        return onToast("Choose distinct stops on the selected corridor.")
      const departureAt = str("departureAt")
      if (new Date(str("expectedArrivalAt")) <= new Date(departureAt))
        return onToast("Expected arrival must be after departure.")
      if (isUnavailable(store, str("vehicleId"), departureAt))
        return onToast("This lorry is unavailable for the selected departure.")
      if (
        store.drivers.find((d) => d.id === str("driverId"))?.status !== "Active"
      )
        return onToast("Select an available driver.")
      const departure = new Date(departureAt)
      const saturdayException =
        departure.getDay() === 6 &&
        departure.getHours() >= 17 &&
        stopName(store.stops, str("destinationId")) === "Nairobi" &&
        !store.operatingRules.saturdayEveningNairobi
      const sundayException =
        departure.getDay() === 0 &&
        store.operatingRules.sundayMeruReturn &&
        stopName(store.stops, str("destinationId")) !== "Meru Town"
      const overnightException =
        !store.operatingRules.overnightJourneys &&
        new Date(str("expectedArrivalAt")).toDateString() !==
          departure.toDateString()
      if (
        (saturdayException || sundayException || overnightException) &&
        !str("overrideReason")
      )
        return onToast(
          "This journey differs from the configured operating pattern; enter an exception reason.",
        )
      const trip: Trip = {
        id: nextId(
          "TR",
          store.trips.map((t) => t.id),
        ),
        routeId: route.id,
        vehicleId: str("vehicleId"),
        driverId: str("driverId"),
        handlerId: str("handlerId"),
        originId: str("originId"),
        destinationId: str("destinationId"),
        departureAt,
        expectedArrivalAt: str("expectedArrivalAt"),
        actualArrivalAt: "",
        status: "Scheduled",
        notes: str("notes"),
        overrideReason: str("overrideReason"),
      }
      setStore((s) => ({
        ...s,
        trips: [...s.trips, trip],
        audit: [
          ...s.audit,
          audit(
            "Trip",
            trip.id,
            "Trip scheduled",
            "",
            vehicleName(trip.vehicleId),
            trip.overrideReason,
          ),
        ],
      }))
      selectTrip(trip.id)
    } else if (editor === "availability") {
      if (!selectedVehicleId || !str("reason")) return
      const from = str("from")
      if (str("until") && new Date(str("until")) < new Date(from))
        return onToast("End time must be after start time.")
      const availability: Availability = {
        id: nextId(
          "AVL",
          store.availability.map((a) => a.id),
        ),
        vehicleId: selectedVehicleId,
        from,
        until: str("until"),
        reason: str("reason"),
        recordedBy: actor,
        resolution: "",
        replacementVehicleId: str("replacementVehicleId"),
      }
      setStore((s) => ({
        ...s,
        vehicles: s.vehicles.map((v) =>
          v.id === selectedVehicleId ? { ...v, status: "Unavailable" } : v,
        ),
        availability: [...s.availability, availability],
        audit: [
          ...s.audit,
          audit(
            "Vehicle",
            selectedVehicleId,
            "Marked unavailable",
            "Available",
            "Unavailable",
            availability.reason,
          ),
        ],
      }))
    }
    closeEditor()
    onToast("Operational record saved in this preview.")
  }

  function assign(parcelId: string, tripId: string, reason = "") {
    const target = store.trips.find((t) => t.id === tripId)
    const parcel = store.parcels.find((p) => p.id === parcelId)
    if (!target || !parcel || !["Scheduled", "Loading"].includes(target.status))
      return onToast("Select a scheduled or loading trip.")
    if (!parcelEligible(store, parcel, target))
      return onToast(
        "Parcel origin and destination must be on this trip in travel order.",
      )
    if (isUnavailable(store, target.vehicleId, target.departureAt))
      return onToast("Target lorry is unavailable. Choose another trip.")
    const current = activeAssignment(store.assignments, parcelId)
    if (current?.status === "Loaded")
      return onToast("Unload the parcel before reassigning it.")
    if (current?.tripId === tripId)
      return onToast("Parcel is already assigned to this trip.")
    if (current && !reason.trim())
      return onToast("A reassignment reason is required.")
    const assignment: Assignment = {
      id: crypto.randomUUID(),
      parcelId,
      tripId,
      status: "Planned",
      assignedAt: now(),
      actor,
      reason,
      replacementTripId: "",
    }
    setStore((s) => ({
      ...s,
      assignments: [
        ...s.assignments.map((a) =>
          a.id === current?.id
            ? {
                ...a,
                status: "Reassigned" as const,
                reason,
                replacementTripId: tripId,
              }
            : a,
        ),
        assignment,
      ],
      parcels: s.parcels.map((p) =>
        p.id === parcelId
          ? {
              ...p,
              trip: tripId,
              status: "Assigned",
              events: [
                ...p.events,
                event(
                  current ? "Reassigned" : "Assigned",
                  stopName(s.stops, target.originId),
                  `${current?.tripId || "Unassigned"} → ${tripId}${
                    reason ? ` · ${reason}` : ""
                  }`,
                ),
              ],
            }
          : p,
      ),
      audit: [
        ...s.audit,
        audit(
          "Parcel",
          parcelId,
          current ? "Trip reassigned" : "Trip assigned",
          current?.tripId || "Unassigned",
          tripId,
          reason,
        ),
      ],
    }))
    setParcelChoice("")
    setReassignId("")
    setReassignTripId("")
    setReassignReason("")
    onToast(
      current
        ? "Parcel reassigned; original plan retained."
        : "Parcel added to planned manifest.",
    )
  }

  function move(parcelId: string, action: "Loaded" | "Unloaded" | "Received") {
    if (!trip) return
    const assignment = activeAssignment(store.assignments, parcelId)
    if (!assignment || assignment.tripId !== trip.id)
      return onToast("Parcel is not on this trip manifest.")
    if (action === "Loaded" && assignment.status !== "Planned")
      return onToast("Parcel is already loaded.")
    if (
      action === "Loaded" &&
      isUnavailable(store, trip.vehicleId, trip.departureAt)
    )
      return onToast("Lorry unavailable; select a replacement before loading.")
    const capacity = tripVehicle?.capacity || 0
    const loaded = manifest.filter((a) => a.status === "Loaded").length
    if (action === "Loaded" && loaded >= capacity)
      return onToast(
        "Lorry capacity reached. Reassign remaining planned parcels.",
      )
    if (
      action === "Unloaded" &&
      (assignment.status !== "Loaded" || trip.status === "In transit")
    )
      return onToast("Unload is only available before dispatch.")
    if (
      action === "Received" &&
      (assignment.status !== "Loaded" ||
        !["In transit", "Arrived"].includes(trip.status) ||
        store.movements.some(
          (m) =>
            m.parcelId === parcelId &&
            m.tripId === trip.id &&
            m.action === "Received",
        ))
    )
      return onToast("Receive a loaded parcel only once after dispatch.")
    const location =
      action === "Received"
        ? store.parcels.find((p) => p.id === parcelId)?.destination ||
          stopName(store.stops, trip.destinationId)
        : stopName(store.stops, trip.originId)
    const record: Movement = {
      id: crypto.randomUUID(),
      parcelId,
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      handlerId: trip.handlerId,
      action,
      location,
      occurredAt: now(),
      actor: tripHandler?.name || actor,
      note:
        action === "Unloaded"
          ? "Returned to planned manifest before departure"
          : "",
    }
    setStore((s) => ({
      ...s,
      movements: [...s.movements, record],
      assignments: s.assignments.map((a) =>
        a.id === assignment.id
          ? { ...a, status: action === "Unloaded" ? "Planned" : "Loaded" }
          : a,
      ),
      parcels: s.parcels.map((p) =>
        p.id === parcelId
          ? {
              ...p,
              status:
                action === "Loaded"
                  ? "Loaded"
                  : action === "Received"
                    ? [
                        "Delivered",
                        "Collected",
                        "Out for delivery",
                        "Ready for collection",
                      ].includes(p.status)
                      ? p.status
                      : "Arrived"
                    : "Assigned",
              events: [
                ...p.events,
                event(
                  action,
                  location,
                  `${trip.id} · ${vehicleName(trip.vehicleId)} · ${tripHandler?.name || actor}`,
                ),
              ],
            }
          : p,
      ),
      audit: [
        ...s.audit,
        audit(
          "Parcel",
          parcelId,
          action,
          "",
          `${trip.id} · ${vehicleName(trip.vehicleId)}`,
        ),
      ],
    }))
    onToast(`${parcelId} ${action.toLowerCase()} on ${trip.id}.`)
  }

  function updateTrip(action: "In transit" | "Arrived") {
    if (!trip) return
    if (
      action === "In transit" &&
      (!["Scheduled", "Loading"].includes(trip.status) ||
        isUnavailable(store, trip.vehicleId, trip.departureAt))
    )
      return onToast(
        "Trip cannot depart while the lorry is unavailable or the trip is not loading.",
      )
    if (action === "Arrived" && trip.status !== "In transit")
      return onToast("Only a trip in transit can arrive.")
    const loaded = manifest.filter((a) => a.status === "Loaded")
    if (action === "In transit" && !loaded.length)
      return onToast("Load at least one parcel before dispatch.")
    const location = stopName(
      store.stops,
      action === "In transit" ? trip.originId : trip.destinationId,
    )
    setStore((s) => ({
      ...s,
      trips: s.trips.map((t) =>
        t.id === trip.id
          ? {
              ...t,
              status: action,
              actualArrivalAt: action === "Arrived" ? now() : t.actualArrivalAt,
            }
          : t,
      ),
      movements: [
        ...s.movements,
        ...loaded.map((a) => ({
          id: crypto.randomUUID(),
          parcelId: a.parcelId,
          tripId: trip.id,
          vehicleId: trip.vehicleId,
          driverId: trip.driverId,
          handlerId: trip.handlerId,
          action: action === "In transit" ? "Dispatched" : "Trip arrived",
          location,
          occurredAt: now(),
          actor: tripHandler?.name || actor,
          note: "",
        })),
      ],
      parcels: s.parcels.map((p) =>
        loaded.some((a) => a.parcelId === p.id) && action === "In transit"
          ? {
              ...p,
              status: "In transit",
              events: [
                ...p.events,
                event(
                  "Dispatched",
                  location,
                  `${trip.id} · ${vehicleName(trip.vehicleId)}`,
                ),
              ],
            }
          : p,
      ),
      audit: [
        ...s.audit,
        audit(
          "Trip",
          trip.id,
          action === "In transit" ? "Trip dispatched" : "Trip arrived",
          trip.status,
          action,
        ),
      ],
    }))
    onToast(`Trip ${trip.id} marked ${action.toLowerCase()}.`)
  }

  function substitute(field: "driverId" | "vehicleId", value: string) {
    if (!trip || !value || !substitutionReason.trim())
      return onToast("Enter a reason for the substitution.")
    if (trip.status === "In transit" || trip.status === "Arrived")
      return onToast(
        "In-transit changes require a transfer workflow; this preview only changes trips before dispatch.",
      )
    if (field === "vehicleId" && isUnavailable(store, value, trip.departureAt))
      return onToast("Replacement lorry is unavailable.")
    if (
      field === "vehicleId" &&
      store.vehicles.find((v) => v.id === value)!.capacity <
        manifest.filter((a) => a.status === "Loaded").length
    )
      return onToast(
        "Replacement lorry lacks capacity for already loaded parcels.",
      )
    if (
      field === "driverId" &&
      store.drivers.find((d) => d.id === value)?.status !== "Active"
    )
      return onToast("Replacement driver is unavailable.")
    const previous = trip[field]
    if (previous === value) return
    setStore((s) => ({
      ...s,
      trips: s.trips.map((t) =>
        t.id === trip.id ? { ...t, [field]: value } : t,
      ),
      audit: [
        ...s.audit,
        audit(
          "Trip",
          trip.id,
          field === "driverId" ? "Driver substituted" : "Vehicle substituted",
          previous,
          value,
          substitutionReason,
        ),
      ],
      parcels: s.parcels.map((p) =>
        manifest.some((a) => a.parcelId === p.id)
          ? {
              ...p,
              events: [
                ...p.events,
                event(
                  field === "driverId"
                    ? "Driver substituted"
                    : "Vehicle substituted",
                  stopName(s.stops, trip.originId),
                  `${previous} → ${value} · ${substitutionReason}`,
                ),
              ],
            }
          : p,
      ),
    }))
    setSubstitutionReason("")
    onToast("Trip substitution recorded; normal assignment unchanged.")
  }

  function updateRouteStop(
    routeId: string,
    stopId: string,
    direction: "up" | "down" | "remove" | "add",
  ) {
    const route = store.routes.find((r) => r.id === routeId)
    if (!route) return
    const order = [...route.stopIds]
    const index = order.indexOf(stopId)
    if (direction === "remove") {
      if (
        store.trips.some(
          (t) =>
            t.routeId === routeId &&
            [t.originId, t.destinationId].includes(stopId),
        ) ||
        store.schedules.some(
          (s) =>
            s.routeId === routeId &&
            [s.originId, s.destinationId].includes(stopId),
        )
      )
        return onToast(
          "Stop is used by a trip or schedule. Resolve dependencies first.",
        )
      order.splice(index, 1)
    }
    if (direction === "add" && index < 0) order.push(stopId)
    if (direction === "up" && index > 0)
      [order[index - 1], order[index]] = [order[index], order[index - 1]]
    if (direction === "down" && index < order.length - 1)
      [order[index + 1], order[index]] = [order[index], order[index + 1]]
    setStore((s) => ({
      ...s,
      routes: s.routes.map((r) =>
        r.id === routeId ? { ...r, stopIds: order } : r,
      ),
      audit: [
        ...s.audit,
        audit(
          "Route",
          routeId,
          `Stop ${direction}`,
          route.stopIds.join(","),
          order.join(","),
        ),
      ],
    }))
  }

  const tabs =
    mode === "Fleet & drivers"
      ? ["Vehicles", "Drivers", "Personnel", "Schedules"]
      : ["Trips", "Corridors", "Stop points", "Schedules"]
  const currentTab = tabs.includes(tab) ? tab : tabs[0]
  return (
    <>
      <div className="page-intro">
        <div>
          <div className="intro-kicker">OPERATIONS / {mode.toUpperCase()}</div>
          <h1>{mode}</h1>
          <p>
            {mode === "Fleet & drivers"
              ? "Lorries, people, availability, and normal assignments."
              : "Journey planning, ordered stops, manifests, and actual movement."}
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setRouteStops([])
            setEditor(mode === "Fleet & drivers" ? "vehicle" : "trip")
          }}
        >
          <Plus size={17} />{" "}
          {mode === "Fleet & drivers" ? "Add lorry" : "Schedule trip"}
        </button>
      </div>
      <div className="ops-notice">
        <AlertCircle size={17} />
        <span>
          Operational preview · All edits are browser-local. Staff actions are
          attributed to a demo operator, not authenticated users.
        </span>
      </div>
      <div className="ops-stats">
        <div>
          <strong>{store.vehicles.length}</strong>
          <span>Fleet lorries</span>
        </div>
        <div>
          <strong>{store.drivers.length}</strong>
          <span>Drivers</span>
        </div>
        <div>
          <strong>
            {
              store.trips.filter((t) =>
                ["Scheduled", "Loading", "In transit"].includes(t.status),
              ).length
            }
          </strong>
          <span>Active trips</span>
        </div>
        <div>
          <strong>
            {store.assignments.filter((a) => a.status === "Loaded").length}
          </strong>
          <span>Loaded parcels</span>
        </div>
      </div>
      <div className="ops-tabs">
        {tabs.map((name) => (
          <button
            className={currentTab === name ? "selected" : ""}
            onClick={() => {
              setTab(name)
              setQuery("")
            }}
            key={name}
          >
            {name}
          </button>
        ))}
      </div>

      {currentTab === "Vehicles" && (
        <>
          <div className="ops-section-title">
            <div>
              <span className="eyebrow">FLEET REGISTER</span>
              <h2>Company lorries</h2>
            </div>
            <button
              className="button secondary"
              onClick={() => setEditor("vehicle")}
            >
              <Plus size={15} /> Add vehicle
            </button>
          </div>
          <div className="ops-card-grid">
            {store.vehicles.map((v) => {
              const driver = store.drivers.find(
                (d) => d.id === v.defaultDriverId,
              )
              const unavailable = v.status === "Unavailable"
              const activeTrips = store.trips.filter(
                (t) =>
                  t.vehicleId === v.id &&
                  ["Scheduled", "Loading", "In transit"].includes(t.status),
              )
              return (
                <div className="card ops-card" key={v.id}>
                  <div className="ops-card-head">
                    <span className="ops-icon">
                      <Truck size={21} />
                    </span>
                    <span
                      className={`badge ${
                        unavailable ? "badge-amber" : "badge-teal"
                      }`}
                    >
                      {unavailable ? "Unavailable" : "Available"}
                    </span>
                  </div>
                  <span className="eyebrow">
                    {v.id} · {v.category}
                  </span>
                  <h3>{v.plate}</h3>
                  <p>
                    {v.model || "Model not specified"} · Capacity {v.capacity}{" "}
                    parcels
                  </p>
                  <div className="ops-fact">
                    <UserRound size={15} />
                    <span>Normal driver</span>
                    <strong>{driver?.name || "Unassigned"}</strong>
                  </div>
                  <div className="ops-fact">
                    <RouteIcon size={15} />
                    <span>Normal route</span>
                    <strong>
                      {store.routes.find((r) => r.id === v.defaultRouteId)
                        ?.name || "Unassigned"}
                    </strong>
                  </div>
                  <div className="ops-fact">
                    <CalendarDays size={15} />
                    <span>Active trips</span>
                    <strong>{activeTrips.length}</strong>
                  </div>
                  {v.notes && <p className="ops-card-note">{v.notes}</p>}
                  {store.availability
                    .filter((a) => a.vehicleId === v.id)
                    .slice(-2)
                    .map((a) => (
                      <p className="ops-card-note" key={a.id}>
                        {a.reason} · {dateTime(a.from)} ·{" "}
                        {a.resolution ? `Resolved: ${a.resolution}` : "Open"}
                        {a.replacementVehicleId
                          ? ` · Replacement ${vehicleName(a.replacementVehicleId)}`
                          : ""}
                      </p>
                    ))}
                  <div className="ops-card-actions">
                    <button
                      onClick={() => {
                        setSelectedVehicleId(v.id)
                        setEditor("availability")
                      }}
                    >
                      Mark unavailable
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVehicleId(v.id)
                        setTab("Schedules")
                      }}
                    >
                      Schedule <ArrowRight size={14} />
                    </button>
                  </div>
                  {unavailable && (
                    <button
                      className="ops-resolve"
                      onClick={() => {
                        const reason = window.prompt(
                          "Resolution notes for this lorry:",
                        )
                        if (!reason?.trim()) return
                        setStore((s) => ({
                          ...s,
                          vehicles: s.vehicles.map((item) =>
                            item.id === v.id
                              ? { ...item, status: "Available" }
                              : item,
                          ),
                          availability: s.availability.map((a) =>
                            a.vehicleId === v.id && !a.resolution
                              ? { ...a, resolution: reason.trim() }
                              : a,
                          ),
                          audit: [
                            ...s.audit,
                            audit(
                              "Vehicle",
                              v.id,
                              "Availability restored",
                              "Unavailable",
                              "Available",
                              reason.trim(),
                            ),
                          ],
                        }))
                        onToast("Lorry marked available; resolution recorded.")
                      }}
                    >
                      Resolve unavailability
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {currentTab === "Drivers" && (
        <>
          <div className="ops-section-title">
            <div>
              <span className="eyebrow">PERSONNEL REGISTER</span>
              <h2>Drivers</h2>
            </div>
            <button
              className="button secondary"
              onClick={() => setEditor("driver")}
            >
              <Plus size={15} /> Add driver
            </button>
          </div>
          <div className="card ops-list">
            {store.drivers.map((d) => (
              <div className="ops-person" key={d.id}>
                <span className="ops-person-avatar">
                  {d.name
                    .split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div>
                  <strong>{d.name}</strong>
                  <small>
                    {d.id} · Normal lorry{" "}
                    {vehicleName(d.defaultVehicleId) || "Unassigned"} ·{" "}
                    {store.trips.filter((t) => t.driverId === d.id).length}{" "}
                    trip(s) in history
                  </small>
                </div>
                <span
                  className={`badge ${
                    d.status === "Active" ? "badge-teal" : "badge-amber"
                  }`}
                >
                  {d.status}
                </span>
                <a className="ops-call" href={call(d.phone)}>
                  <Phone size={14} /> Call
                </a>
                <button
                  className="small-action"
                  onClick={() => {
                    const next =
                      d.status === "Active" ? "Unavailable" : "Active"
                    setStore((s) => ({
                      ...s,
                      drivers: s.drivers.map((item) =>
                        item.id === d.id ? { ...item, status: next } : item,
                      ),
                      audit: [
                        ...s.audit,
                        audit(
                          "Driver",
                          d.id,
                          "Availability changed",
                          d.status,
                          next,
                        ),
                      ],
                    }))
                    onToast("Driver status updated in preview.")
                  }}
                >
                  {d.status === "Active" ? "Mark unavailable" : "Restore"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {currentTab === "Personnel" && (
        <>
          <div className="ops-section-title">
            <div>
              <span className="eyebrow">TRIP RESPONSIBILITY</span>
              <h2>Parcel-handling personnel</h2>
            </div>
          </div>
          <div className="card ops-list">
            {store.handlers.map((h) => (
              <div className="ops-person" key={h.id}>
                <span className="ops-person-avatar">
                  <Users size={16} />
                </span>
                <div>
                  <strong>{h.name}</strong>
                  <small>
                    {h.id} · {h.role} ·{" "}
                    {store.trips.filter((t) => t.handlerId === h.id).length}{" "}
                    trip(s)
                  </small>
                </div>
                <a className="ops-call" href={call(h.phone)}>
                  <Phone size={14} /> Call
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      {currentTab === "Trips" && (
        <>
          <div className="ops-section-title">
            <div>
              <span className="eyebrow">TRANSPORT CONTROL</span>
              <h2>Trips & manifests</h2>
            </div>
            <button
              className="button secondary"
              onClick={() => setEditor("trip")}
            >
              <Plus size={15} /> New trip
            </button>
          </div>
          <div className="ops-search">
            <Search size={16} />
            <input
              placeholder="Search trip ID, lorry, driver or route..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ops-trip-grid">
            {store.trips
              .filter((t) =>
                [
                  t.id,
                  vehicleName(t.vehicleId),
                  driverName(t.driverId),
                  tripRoute(store, t)?.name || "",
                ].some((x) => x.toLowerCase().includes(query.toLowerCase())),
              )
              .map((t) => {
                const assigned = store.assignments.filter(
                  (a) => a.tripId === t.id && a.status !== "Reassigned",
                )
                return (
                  <button
                    className="card ops-trip-card"
                    key={t.id}
                    onClick={() => selectTrip(t.id)}
                  >
                    <div className="ops-trip-top">
                      <span className="tracking-id">{t.id}</span>
                      <span
                        className={`badge ${
                          t.status === "In transit"
                            ? "badge-blue"
                            : t.status === "Arrived"
                              ? "badge-teal"
                              : "badge-neutral"
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <strong>
                      {stopName(store.stops, t.originId)}{" "}
                      <ArrowRight size={15} />{" "}
                      {stopName(store.stops, t.destinationId)}
                    </strong>
                    <small>
                      {tripRoute(store, t)?.name} ·{" "}
                      {new Date(t.departureAt).toLocaleString("en-KE", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                    <div className="ops-trip-bottom">
                      <span>
                        <Truck size={15} /> {vehicleName(t.vehicleId)}
                      </span>
                      <span>
                        <Package size={15} />{" "}
                        {assigned.filter((a) => a.status === "Loaded").length}/
                        {assigned.length} loaded
                      </span>
                      <ChevronRight size={17} />
                    </div>
                  </button>
                )
              })}
          </div>
        </>
      )}

      {currentTab === "Corridors" && (
        <>
          <div className="ops-section-title">
            <div>
              <span className="eyebrow">CONFIGURABLE NETWORK</span>
              <h2>Route corridors</h2>
            </div>
            <button
              className="button secondary"
              onClick={() => {
                setRouteStops([])
                setEditor("route")
              }}
            >
              <Plus size={15} /> Add corridor
            </button>
          </div>
          <div className="ops-card-grid">
            {store.routes.map((r) => (
              <button
                className="card ops-route-card"
                key={r.id}
                onClick={() => setSelectedRouteId(r.id)}
              >
                <div className="ops-card-head">
                  <span className="ops-icon">
                    <RouteIcon size={20} />
                  </span>
                  <span
                    className={`badge ${
                      r.active
                        ? r.type === "Primary route"
                          ? "badge-teal"
                          : "badge-amber"
                        : "badge-neutral"
                    }`}
                  >
                    {r.active ? r.type : "Inactive"}
                  </span>
                </div>
                <h3>{r.name}</h3>
                <p>{r.note}</p>
                <div className="ops-route-stops">
                  {r.stopIds
                    .map((id) => stopName(store.stops, id))
                    .join("  →  ")}
                </div>
                <div className="ops-route-footer">
                  {r.stopIds.length} ordered stops <ArrowRight size={15} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {currentTab === "Stop points" && (
        <>
          <div className="ops-section-title">
            <div>
              <span className="eyebrow">LOCATION CONFIGURATION</span>
              <h2>Stop points</h2>
            </div>
            <button
              className="button secondary"
              onClick={() => setEditor("stop")}
            >
              <Plus size={15} /> Add stop
            </button>
          </div>
          <div className="card ops-list">
            {store.stops.map((stop) => (
              <div className="ops-person" key={stop.id}>
                <span className="ops-icon small">
                  <MapPin size={17} />
                </span>
                <div>
                  <strong>{stop.name}</strong>
                  <small>
                    {stop.id} ·{" "}
                    {store.routes
                      .filter((r) => r.stopIds.includes(stop.id))
                      .map((r) => r.name)
                      .join(", ") || "Not assigned to a route"}
                  </small>
                </div>
                <span
                  className={`badge ${
                    stop.active ? "badge-teal" : "badge-neutral"
                  }`}
                >
                  {stop.active ? "Active" : "Inactive"}
                </span>
                <button
                  className="small-action"
                  onClick={() => {
                    if (
                      stop.active &&
                      store.trips.some(
                        (t) =>
                          [t.originId, t.destinationId].includes(stop.id) &&
                          ["Scheduled", "Loading", "In transit"].includes(
                            t.status,
                          ),
                      )
                    )
                      return onToast(
                        "Resolve active trips before deactivating this stop.",
                      )
                    setStore((s) => ({
                      ...s,
                      stops: s.stops.map((item) =>
                        item.id === stop.id
                          ? { ...item, active: !item.active }
                          : item,
                      ),
                      audit: [
                        ...s.audit,
                        audit(
                          "Stop",
                          stop.id,
                          "Availability changed",
                          String(stop.active),
                          String(!stop.active),
                        ),
                      ],
                    }))
                  }}
                >
                  {stop.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {currentTab === "Schedules" && (
        <>
          <div className="ops-section-title">
            <div>
              <span className="eyebrow">RECURRING OPERATIONS</span>
              <h2>Vehicle schedules</h2>
            </div>
            <button
              className="button secondary"
              onClick={() => setEditor("schedule")}
            >
              <Plus size={15} /> Add schedule
            </button>
          </div>
          <div className="ops-notice subtle">
            <Clock3 size={16} />
            <span>
              Normal pattern: overnight Meru ↔ Nairobi; no Saturday evening
              Nairobi departure; lorries usually return to Meru on Sunday.
              Exceptions need a reason in trip scheduling. These rules can be
              changed in Settings.
            </span>
          </div>
          <div className="card ops-list">
            {store.schedules
              .filter(
                (s) => !selectedVehicleId || s.vehicleId === selectedVehicleId,
              )
              .map((s) => (
                <div className="ops-person" key={s.id}>
                  <span className="ops-icon small">
                    <CalendarDays size={16} />
                  </span>
                  <div>
                    <strong>
                      {s.day} · {vehicleName(s.vehicleId)} · {s.departure}
                    </strong>
                    <small>
                      {stopName(store.stops, s.originId)} →{" "}
                      {stopName(store.stops, s.destinationId)} via{" "}
                      {store.routes.find((r) => r.id === s.routeId)?.name} ·{" "}
                      {s.recurrence}
                    </small>
                  </div>
                  <span
                    className={`badge ${
                      s.active ? "badge-teal" : "badge-neutral"
                    }`}
                  >
                    {s.active ? "Active" : "Paused"}
                  </span>
                  <button
                    className="small-action"
                    onClick={() =>
                      setStore((x) => ({
                        ...x,
                        schedules: x.schedules.map((item) =>
                          item.id === s.id
                            ? { ...item, active: !item.active }
                            : item,
                        ),
                        audit: [
                          ...x.audit,
                          audit(
                            "Schedule",
                            s.id,
                            "Schedule availability changed",
                            String(s.active),
                            String(!s.active),
                          ),
                        ],
                      }))
                    }
                  >
                    {s.active ? "Pause" : "Resume"}
                  </button>
                </div>
              ))}
            {selectedVehicleId && (
              <button
                className="text-button ops-clear"
                onClick={() => setSelectedVehicleId("")}
              >
                Show all schedules
              </button>
            )}
          </div>
        </>
      )}

      {trip && (
        <div className="drawer-overlay" onMouseDown={() => selectTrip("")}>
          <aside
            className="detail-drawer ops-drawer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span className="eyebrow">
                  TRIP CONTROL / {trip.status.toUpperCase()}
                </span>
                <h2>{trip.id}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => selectTrip("")}
                aria-label="Close trip"
              >
                <X size={20} />
              </button>
            </div>
            <div className="drawer-body">
              <div className="ops-trip-summary">
                <strong>
                  {stopName(store.stops, trip.originId)} →{" "}
                  {stopName(store.stops, trip.destinationId)}
                </strong>
                <span>
                  {tripRoute(store, trip)?.name} · {dateTime(trip.departureAt)}{" "}
                  planned departure
                </span>
                <span>
                  Expected {dateTime(trip.expectedArrivalAt)}
                  {trip.actualArrivalAt
                    ? ` · Arrived ${dateTime(trip.actualArrivalAt)}`
                    : ""}
                </span>
              </div>
              <div className="detail-section">
                <h3>People & vehicle</h3>
                <div className="detail-pair">
                  <span>Actual lorry</span>
                  <strong>
                    {tripVehicle?.plate} · {tripVehicle?.id}
                  </strong>
                </div>
                <div className="detail-pair">
                  <span>Actual driver</span>
                  <strong>
                    {tripDriver?.name}{" "}
                    {tripDriver?.phone && (
                      <a
                        className="ops-call inline"
                        href={call(tripDriver.phone)}
                      >
                        <Phone size={13} /> Call
                      </a>
                    )}
                  </strong>
                </div>
                <div className="detail-pair">
                  <span>Parcel handler</span>
                  <strong>
                    {tripHandler?.name}{" "}
                    {tripHandler?.phone && (
                      <a
                        className="ops-call inline"
                        href={call(tripHandler.phone)}
                      >
                        <Phone size={13} /> Call
                      </a>
                    )}
                  </strong>
                </div>
                <div className="detail-pair">
                  <span>Normal driver</span>
                  <strong>
                    {driverName(tripVehicle?.defaultDriverId || "")}
                  </strong>
                </div>
                <div className="detail-pair">
                  <span>Capacity</span>
                  <strong>
                    {manifest.filter((a) => a.status === "Loaded").length}/
                    {tripVehicle?.capacity || 0} loaded · {manifest.length}{" "}
                    planned
                  </strong>
                </div>
                {trip.notes && <p className="muted-note">{trip.notes}</p>}
                {trip.overrideReason && (
                  <p className="muted-note">
                    Scheduling exception: {trip.overrideReason}
                  </p>
                )}
              </div>
              {["Scheduled", "Loading"].includes(trip.status) && (
                <div className="detail-section">
                  <h3>Substitute for this trip</h3>
                  <label className="field-label">
                    Reason
                    <input
                      placeholder="Required for an auditable change"
                      value={substitutionReason}
                      onChange={(e) => setSubstitutionReason(e.target.value)}
                    />
                  </label>
                  <div className="ops-inline-form">
                    <select
                      defaultValue=""
                      key={`${trip.id}-driver-${trip.driverId}`}
                      onChange={(e) => {
                        if (e.target.value)
                          substitute("driverId", e.target.value)
                        e.target.value = ""
                      }}
                    >
                      <option value="">Replace driver...</option>
                      {store.drivers
                        .filter(
                          (d) =>
                            d.status === "Active" && d.id !== trip.driverId,
                        )
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                    <select
                      defaultValue=""
                      key={`${trip.id}-vehicle-${trip.vehicleId}`}
                      onChange={(e) => {
                        if (e.target.value)
                          substitute("vehicleId", e.target.value)
                        e.target.value = ""
                      }}
                    >
                      <option value="">Replace lorry...</option>
                      {store.vehicles
                        .filter((v) => v.id !== trip.vehicleId)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plate}
                          </option>
                        ))}
                    </select>
                  </div>
                  <p className="muted-note">
                    Normal vehicle–driver assignments remain unchanged.
                  </p>
                </div>
              )}
              <div className="detail-section">
                <div className="ops-section-title compact">
                  <h3>Manifest</h3>
                  <span className="table-hint">
                    {manifest.length} planned ·{" "}
                    {manifest.filter((a) => a.status === "Loaded").length}{" "}
                    loaded
                  </span>
                </div>
                {manifest.map((a) => {
                  const p = store.parcels.find((item) => item.id === a.parcelId)
                  if (!p) return null
                  return (
                    <div className="ops-manifest-row" key={a.id}>
                      <button
                        className="inline-link"
                        onClick={() => {
                          selectTrip("")
                          onOpenParcel(p.id)
                        }}
                      >
                        {p.id}
                      </button>
                      <span>
                        {p.origin} → {p.destination}
                        <small>{p.recipient}</small>
                      </span>
                      <span
                        className={`badge ${
                          a.status === "Loaded" ? "badge-teal" : "badge-amber"
                        }`}
                      >
                        {a.status}
                      </span>
                      {a.status === "Planned" && (
                        <div className="ops-manifest-actions">
                          <button onClick={() => move(p.id, "Loaded")}>
                            Load
                          </button>
                          <button
                            onClick={() => {
                              setReassignId(p.id)
                              setReassignTripId("")
                            }}
                          >
                            Reassign
                          </button>
                        </div>
                      )}
                      {a.status === "Loaded" && (
                        <div className="ops-manifest-actions">
                          {["Scheduled", "Loading"].includes(trip.status) && (
                            <button onClick={() => move(p.id, "Unloaded")}>
                              Unload
                            </button>
                          )}
                          {["In transit", "Arrived"].includes(trip.status) &&
                            !store.movements.some(
                              (m) =>
                                m.parcelId === p.id &&
                                m.tripId === trip.id &&
                                m.action === "Received",
                            ) && (
                              <button onClick={() => move(p.id, "Received")}>
                                Receive at stop
                              </button>
                            )}
                        </div>
                      )}
                    </div>
                  )
                })}
                {!manifest.length && (
                  <p className="muted-note">
                    No parcels planned for this trip yet.
                  </p>
                )}
                {["Scheduled", "Loading"].includes(trip.status) && (
                  <div className="ops-assign">
                    <label className="field-label">
                      Add a parcel to planned manifest
                      <select
                        value={parcelChoice}
                        onChange={(e) => setParcelChoice(e.target.value)}
                      >
                        <option value="">Select eligible parcel...</option>
                        {store.parcels
                          .filter(
                            (p) =>
                              !activeAssignment(store.assignments, p.id) &&
                              !["Delivered", "Collected"].includes(p.status) &&
                              parcelEligible(store, p, trip),
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.id} · {p.origin} → {p.destination}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      className="button secondary"
                      disabled={!parcelChoice}
                      onClick={() => assign(parcelChoice, trip.id)}
                    >
                      Plan assignment
                    </button>
                  </div>
                )}
                {reassignId && (
                  <div className="ops-reassign">
                    <strong>Reassign {reassignId}</strong>
                    <select
                      value={reassignTripId}
                      onChange={(e) => setReassignTripId(e.target.value)}
                    >
                      <option value="">Choose a replacement trip...</option>
                      {store.trips
                        .filter(
                          (t) =>
                            t.id !== trip.id &&
                            ["Scheduled", "Loading"].includes(t.status) &&
                            parcelEligible(
                              store,
                              store.parcels.find((p) => p.id === reassignId)!,
                              t,
                            ),
                        )
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id} · {vehicleName(t.vehicleId)} ·{" "}
                            {shortDate(t.departureAt)}
                          </option>
                        ))}
                    </select>
                    <input
                      placeholder="Reason (e.g. lorry full)"
                      value={reassignReason}
                      onChange={(e) => setReassignReason(e.target.value)}
                    />
                    <div>
                      <button
                        className="button secondary"
                        onClick={() => setReassignId("")}
                      >
                        Cancel
                      </button>
                      <button
                        className="button primary"
                        onClick={() =>
                          assign(reassignId, reassignTripId, reassignReason)
                        }
                      >
                        Confirm reassignment
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="detail-section">
                <h3>Manifest reconciliation</h3>
                <div className="ops-reconcile">
                  <span>
                    Planned <strong>{manifest.length}</strong>
                  </span>
                  <span>
                    Loaded{" "}
                    <strong>
                      {manifest.filter((a) => a.status === "Loaded").length}
                    </strong>
                  </span>
                  <span>
                    Redirected{" "}
                    <strong>
                      {
                        store.assignments.filter(
                          (a) =>
                            a.tripId === trip.id && a.status === "Reassigned",
                        ).length
                      }
                    </strong>
                  </span>
                  <span>
                    Received{" "}
                    <strong>
                      {
                        manifest.filter((a) =>
                          store.movements.some(
                            (m) =>
                              m.parcelId === a.parcelId &&
                              m.tripId === trip.id &&
                              m.action === "Received",
                          ),
                        ).length
                      }
                    </strong>
                  </span>
                  <span>
                    Unaccounted after dispatch{" "}
                    <strong>
                      {["In transit", "Arrived"].includes(trip.status)
                        ? manifest.filter(
                            (a) =>
                              a.status === "Loaded" &&
                              !store.movements.some(
                                (m) =>
                                  m.parcelId === a.parcelId &&
                                  m.tripId === trip.id &&
                                  m.action === "Received",
                              ),
                          ).length
                        : 0}
                    </strong>
                  </span>
                </div>
                <p className="muted-note">
                  Counts reflect manual preview records, not physical scans or
                  signed custody.
                </p>
              </div>
              <div className="detail-section">
                <h3>Trip progression</h3>
                {["Scheduled", "Loading"].includes(trip.status) && (
                  <button
                    className="button primary full-width"
                    onClick={() => updateTrip("In transit")}
                  >
                    Dispatch loaded parcels <ArrowRight size={15} />
                  </button>
                )}
                {trip.status === "In transit" && (
                  <button
                    className="button primary full-width"
                    onClick={() => updateTrip("Arrived")}
                  >
                    Mark trip arrived <Check size={15} />
                  </button>
                )}
                <p className="muted-note">
                  Receiving each parcel at a stop is recorded separately from
                  the trip’s arrival.
                </p>
                <button
                  className="button secondary full-width"
                  onClick={() => {
                    const note = window.prompt(
                      "Record delay, exception or journey note:",
                    )
                    if (!note?.trim()) return
                    setStore((s) => ({
                      ...s,
                      trips: s.trips.map((t) =>
                        t.id === trip.id
                          ? {
                              ...t,
                              notes: [t.notes, note.trim()]
                                .filter(Boolean)
                                .join(" · "),
                            }
                          : t,
                      ),
                      audit: [
                        ...s.audit,
                        audit(
                          "Trip",
                          trip.id,
                          "Journey note recorded",
                          "",
                          note.trim(),
                        ),
                      ],
                    }))
                    onToast("Journey note recorded locally.")
                  }}
                >
                  Record delay / exception note
                </button>
              </div>
              <div className="detail-section">
                <h3>Trip audit</h3>
                {store.audit
                  .filter((a) => a.entity === "Trip" && a.entityId === trip.id)
                  .slice()
                  .reverse()
                  .map((a) => (
                    <p className="ops-audit" key={a.id}>
                      <strong>{a.action}</strong>
                      <span>
                        {dateTime(a.at)} · {a.actor}
                        {a.reason ? ` · ${a.reason}` : ""}
                      </span>
                    </p>
                  ))}
                {!store.audit.some(
                  (a) => a.entity === "Trip" && a.entityId === trip.id,
                ) && (
                  <p className="muted-note">
                    Sample trip; new changes appear here.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {selectedRoute && (
        <div
          className="drawer-overlay"
          onMouseDown={() => setSelectedRouteId("")}
        >
          <aside
            className="detail-drawer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <span className="eyebrow">CORRIDOR CONFIGURATION</span>
                <h2>{selectedRoute.name}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setSelectedRouteId("")}
                aria-label="Close corridor"
              >
                <X size={20} />
              </button>
            </div>
            <div className="drawer-body">
              <p className="muted-note">
                Stops are ordered from the Meru end. Reverse trips use the same
                sequence in reverse. Changes are recorded in the preview audit.
              </p>
              <div className="detail-section">
                <h3>Ordered stop points</h3>
                {selectedRoute.stopIds.map((id, i) => (
                  <div className="ops-stop-row" key={id}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <strong>{stopName(store.stops, id)}</strong>
                    <button
                      aria-label={`Move ${stopName(store.stops, id)} up`}
                      disabled={i === 0}
                      onClick={() =>
                        updateRouteStop(selectedRoute.id, id, "up")
                      }
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${stopName(store.stops, id)} down`}
                      disabled={i === selectedRoute.stopIds.length - 1}
                      onClick={() =>
                        updateRouteStop(selectedRoute.id, id, "down")
                      }
                    >
                      ↓
                    </button>
                    <button
                      aria-label={`Remove ${stopName(store.stops, id)}`}
                      disabled={selectedRoute.stopIds.length <= 2}
                      onClick={() =>
                        updateRouteStop(selectedRoute.id, id, "remove")
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <label className="field-label ops-add-stop">
                  Add stop
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value)
                        updateRouteStop(selectedRoute.id, e.target.value, "add")
                    }}
                  >
                    <option value="">Select a stop...</option>
                    {store.stops
                      .filter(
                        (s) =>
                          s.active && !selectedRoute.stopIds.includes(s.id),
                      )
                      .map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="detail-section">
                <h3>Availability</h3>
                <button
                  className="button secondary full-width"
                  onClick={() => {
                    if (
                      selectedRoute.active &&
                      store.trips.some(
                        (t) =>
                          t.routeId === selectedRoute.id &&
                          ["Scheduled", "Loading", "In transit"].includes(
                            t.status,
                          ),
                      )
                    )
                      return onToast(
                        "Resolve active trips before deactivating this corridor.",
                      )
                    setStore((s) => ({
                      ...s,
                      routes: s.routes.map((r) =>
                        r.id === selectedRoute.id
                          ? { ...r, active: !r.active }
                          : r,
                      ),
                      audit: [
                        ...s.audit,
                        audit(
                          "Route",
                          selectedRoute.id,
                          "Availability changed",
                          String(selectedRoute.active),
                          String(!selectedRoute.active),
                        ),
                      ],
                    }))
                  }}
                >
                  {selectedRoute.active
                    ? "Deactivate corridor"
                    : "Reactivate corridor"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {editor && (
        <div className="modal-overlay" onMouseDown={closeEditor}>
          <div className="modal-panel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">OPERATIONS / CONFIGURATION</span>
                <h2>
                  {
                    {
                      vehicle: "Add a lorry",
                      driver: "Add a driver",
                      availability: `Mark ${vehicleName(selectedVehicleId)} unavailable`,
                      stop: "Add a stop point",
                      route: "Add a corridor",
                      trip: "Schedule a trip",
                      schedule: "Add recurring schedule",
                    }[editor]
                  }
                </h2>
                <p>Changes are recorded in this browser-local workspace.</p>
              </div>
              <button
                className="icon-button"
                onClick={closeEditor}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={saveEntity} className="modal-form">
              {editor === "vehicle" && (
                <>
                  <div className="field-grid">
                    <label className="field-label">
                      Registration plate
                      <input name="plate" required placeholder="KXX 123X" />
                    </label>
                    <label className="field-label">
                      Vehicle category
                      <input
                        name="category"
                        required
                        defaultValue="Parcel lorry"
                      />
                    </label>
                  </div>
                  <div className="field-grid">
                    <label className="field-label">
                      Make / model
                      <input name="model" placeholder="Optional" />
                    </label>
                    <label className="field-label">
                      Parcel capacity
                      <input
                        name="capacity"
                        required
                        type="number"
                        min="1"
                        placeholder="Number of parcels"
                      />
                    </label>
                  </div>
                  <div className="field-grid">
                    <label className="field-label">
                      Normal driver
                      <select name="defaultDriverId">
                        <option value="">Unassigned</option>
                        {store.drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field-label">
                      Normal corridor
                      <select name="routeId">
                        <option value="">Unassigned</option>
                        {store.routes
                          .filter((r) => r.active)
                          .map((r) => (
                            <option value={r.id} key={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  <label className="field-label">
                    Operational notes
                    <textarea name="notes" rows={2} placeholder="Optional" />
                  </label>
                </>
              )}
              {editor === "driver" && (
                <>
                  <div className="field-grid">
                    <label className="field-label">
                      Full name
                      <input name="name" required />
                    </label>
                    <label className="field-label">
                      Phone number
                      <input
                        name="phone"
                        required
                        type="tel"
                        placeholder="+254..."
                      />
                    </label>
                  </div>
                  <div className="field-grid">
                    <label className="field-label">
                      Email
                      <input name="email" type="email" placeholder="Optional" />
                    </label>
                    <label className="field-label">
                      Normal lorry
                      <select name="defaultVehicleId">
                        <option value="">Relief / unassigned</option>
                        {store.vehicles.map((v) => (
                          <option value={v.id} key={v.id}>
                            {v.plate}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="field-label">
                    Notes
                    <textarea name="notes" rows={2} />
                  </label>
                </>
              )}
              {editor === "availability" && (
                <>
                  <label className="field-label">
                    Reason
                    <select name="reason" required>
                      <option>Mechanical problem</option>
                      <option>Puncture</option>
                      <option>Maintenance</option>
                      <option>Accident</option>
                      <option>Breakdown</option>
                      <option>Driver-related</option>
                      <option>Operational issue</option>
                      <option>Other</option>
                    </select>
                  </label>
                  <div className="field-grid">
                    <label className="field-label">
                      From
                      <input
                        name="from"
                        type="datetime-local"
                        required
                        defaultValue={new Date(
                          Date.now() - new Date().getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 16)}
                      />
                    </label>
                    <label className="field-label">
                      Until (optional)
                      <input name="until" type="datetime-local" />
                    </label>
                  </div>
                  <label className="field-label">
                    Replacement lorry (optional)
                    <select name="replacementVehicleId">
                      <option value="">None yet</option>
                      {store.vehicles
                        .filter(
                          (v) =>
                            v.id !== selectedVehicleId &&
                            v.status === "Available",
                        )
                        .map((v) => (
                          <option value={v.id} key={v.id}>
                            {v.plate}
                          </option>
                        ))}
                    </select>
                  </label>
                  <p className="form-helper">
                    Marking a lorry unavailable blocks new loading and trip
                    scheduling. Existing manifests remain visible for
                    reassignment.
                  </p>
                </>
              )}
              {editor === "stop" && (
                <>
                  <label className="field-label">
                    Stop name
                    <input
                      name="name"
                      required
                      placeholder="Town or collection point"
                    />
                  </label>
                  <label className="field-label">
                    Notes
                    <textarea name="notes" rows={2} placeholder="Optional" />
                  </label>
                </>
              )}
              {editor === "route" && (
                <>
                  <div className="field-grid">
                    <label className="field-label">
                      Corridor name
                      <input
                        name="name"
                        required
                        placeholder="e.g. Eastern corridor"
                      />
                    </label>
                    <label className="field-label">
                      Type
                      <select name="type">
                        <option>Primary route</option>
                        <option>Conditional route</option>
                      </select>
                    </label>
                  </div>
                  <label className="field-label">
                    Operational notes
                    <textarea name="note" rows={2} />
                  </label>
                  <label className="field-label">
                    Add ordered stops
                    <select
                      value=""
                      onChange={(e) => {
                        if (
                          e.target.value &&
                          !routeStops.includes(e.target.value)
                        )
                          setRouteStops([...routeStops, e.target.value])
                      }}
                    >
                      <option value="">Select a stop...</option>
                      {store.stops
                        .filter((s) => s.active && !routeStops.includes(s.id))
                        .map((s) => (
                          <option value={s.id} key={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="ops-selected-stops">
                    {routeStops.map((id, i) => (
                      <span key={id}>
                        {i + 1}. {stopName(store.stops, id)}{" "}
                        <button
                          type="button"
                          onClick={() =>
                            setRouteStops(
                              routeStops.filter((item) => item !== id),
                            )
                          }
                          aria-label={`Remove ${stopName(store.stops, id)}`}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="form-helper">
                    Select stops in travel order. At least two are required.
                  </p>
                </>
              )}
              {(editor === "trip" || editor === "schedule") && (
                <>
                  <div className="field-grid">
                    <label className="field-label">
                      Lorry
                      <select name="vehicleId" required>
                        <option value="">Select...</option>
                        {store.vehicles
                          .filter((v) => v.status === "Available")
                          .map((v) => (
                            <option value={v.id} key={v.id}>
                              {v.plate}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="field-label">
                      Corridor
                      <select name="routeId" required>
                        <option value="">Select...</option>
                        {store.routes
                          .filter((r) => r.active)
                          .map((r) => (
                            <option value={r.id} key={r.id}>
                              {r.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  <div className="field-grid">
                    <label className="field-label">
                      Origin stop
                      <select name="originId" required>
                        <option value="">Select...</option>
                        {store.stops
                          .filter((s) => s.active)
                          .map((s) => (
                            <option value={s.id} key={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="field-label">
                      Destination stop
                      <select name="destinationId" required>
                        <option value="">Select...</option>
                        {store.stops
                          .filter((s) => s.active)
                          .map((s) => (
                            <option value={s.id} key={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  {editor === "trip" ? (
                    <>
                      <div className="field-grid">
                        <label className="field-label">
                          Actual driver for trip
                          <select name="driverId" required>
                            <option value="">Select...</option>
                            {store.drivers
                              .filter((d) => d.status === "Active")
                              .map((d) => (
                                <option value={d.id} key={d.id}>
                                  {d.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label className="field-label">
                          Parcel handler
                          <select name="handlerId" required>
                            <option value="">Select...</option>
                            {store.handlers.map((h) => (
                              <option value={h.id} key={h.id}>
                                {h.name} · {h.role}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="field-grid">
                        <label className="field-label">
                          Departure
                          <input
                            name="departureAt"
                            type="datetime-local"
                            required
                          />
                        </label>
                        <label className="field-label">
                          Expected arrival
                          <input
                            name="expectedArrivalAt"
                            type="datetime-local"
                            required
                          />
                        </label>
                      </div>
                      <label className="field-label">
                        Schedule exception reason (if applicable)
                        <input
                          name="overrideReason"
                          placeholder="Required for Saturday evening to Nairobi"
                        />
                      </label>
                      <label className="field-label">
                        Trip notes
                        <textarea name="notes" rows={2} />
                      </label>
                    </>
                  ) : (
                    <>
                      <div className="field-grid">
                        <label className="field-label">
                          Day of week
                          <select name="day">
                            {[
                              "Monday",
                              "Tuesday",
                              "Wednesday",
                              "Thursday",
                              "Friday",
                              "Saturday",
                              "Sunday",
                            ].map((day) => (
                              <option key={day}>{day}</option>
                            ))}
                          </select>
                        </label>
                        <label className="field-label">
                          Departure time
                          <input name="departure" type="time" required />
                        </label>
                      </div>
                      <label className="field-label">
                        Expected arrival time
                        <input name="arrival" type="time" required />
                      </label>
                    </>
                  )}
                </>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  className="button secondary"
                  onClick={closeEditor}
                >
                  Cancel
                </button>
                <button type="submit" className="button primary">
                  Save record <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
