"use client";
import { useEffect, useState } from "react";
import "./slot.css";

const clinicDoctors = [
  ["Dra. Valeria Gómez", "Medicina general", "Clínica Demo", "Hoy, 3:30 p.m.", "VG"],
  ["Dr. Daniel Pérez", "Pediatría", "Clínica Demo", "Mañana, 9:00 a.m.", "DP"],
  ["Dra. Elena Castillo", "Ginecología", "Clínica Demo", "Mañana, 2:15 p.m.", "EC"],
];

type CatalogDoctor = { id: number; clinicId: number; fullName: string; specialty: string; status: string };
type CatalogSlot = { id: number; doctorId: number; startsAt: string; endsAt: string; status: string };
type Catalog = {
  clinic: { id: number; name: string; address: string; whatsapp: string };
  doctors: CatalogDoctor[];
  availability: CatalogSlot[];
};

function formatSlot(startsAt: string) {
  return new Intl.DateTimeFormat("es-PA", {
    weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).format(new Date(startsAt));
}

function formatAppointmentStatus(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendiente de confirmación",
    confirmed: "Confirmada",
    cancelled: "Cancelada",
    reschedule_requested: "Reprogramación solicitada",
  };
  return labels[status] ?? "En gestión";
}

function formatLongSlot(startsAt: string) {
  return new Intl.DateTimeFormat("es-PA", {
    weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit",
  }).format(new Date(startsAt));
}

function statusClass(status: string) {
  return `status-${status.replaceAll("_", "-")}`;
}

type ClinicUser = { clinicId: number; fullName: string; email: string; role: string };

function ClinicAccess({ back, onAuthenticated }: { back: () => void; onAuthenticated: (user: ClinicUser) => void }) {
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setError(""); setSaving(true);
    try {
      const response = await fetch("/api/clinic/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, fullName, email, password, setupKey }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No fue posible acceder.");
      onAuthenticated(data.user);
    } catch (exception) { setError(exception instanceof Error ? exception.message : "No fue posible acceder."); }
    finally { setSaving(false); }
  };
  return <main><nav><b className="brand"><img src="/medicitas-mark.svg" alt="" />MediCitas</b><button onClick={back}>Ver sitio público</button></nav><section className="clinic patient-portal clinic-access">
    <small>ACCESO PARA CLÍNICAS</small><h1>{mode === "login" ? "Gestiona tu agenda" : "Crea el acceso inicial"}</h1><p>{mode === "login" ? "Entra con la cuenta autorizada de tu clínica." : "Solo la persona responsable puede activar la cuenta inicial de la clínica."}</p>
    <div className="settings">
      {mode === "setup" && <><label>Nombre completo<input value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Persona administradora" /></label><label>Clave de configuración<input type="password" value={setupKey} onChange={event => setSetupKey(event.target.value)} placeholder="Clave entregada por MediCitas" /></label></>}
      <label>Correo<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="correo@clinica.com" /></label>
      <label>Contraseña<input type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo 10 caracteres" /></label>
      {error && <p className="form-error">{error}</p>}
      <button className="primary" disabled={saving} onClick={submit}>{saving ? "Verificando..." : mode === "login" ? "Entrar a la agenda" : "Activar cuenta de clínica"}</button>
      <p><small>{mode === "login" ? "¿Es la primera vez?" : "¿Ya tienes una cuenta?"} <button className="text-button" onClick={() => { setMode(mode === "login" ? "setup" : "login"); setError(""); }}>{mode === "login" ? "Crear acceso inicial" : "Iniciar sesión"}</button></small></p>
    </div>
  </section></main>;
}

function Clinic({ back }: { back: () => void }) {
  const [tab,setTab]=useState("Agenda");
  const [staff,setStaff]=useState<ClinicUser | null>(null);
  const [checkingAccess,setCheckingAccess]=useState(true);
  const [realAppointments,setRealAppointments]=useState<Array<{id:number;patientName:string;doctorName:string;specialty:string;startsAt:string;status:string}>>([]);
  const [management,setManagement]=useState<{clinic:{name:string;address:string;whatsapp:string};doctors:Array<{id:number;fullName:string;specialty:string;status:string}>;availability:Array<{id:number;doctorId:number;doctorName:string;startsAt:string;status:string}>}|null>(null);
  const [doctorName,setDoctorName]=useState("");
  const [doctorSpecialty,setDoctorSpecialty]=useState("");
  const [slotDoctorId,setSlotDoctorId]=useState("");
  const [slotDate,setSlotDate]=useState("");
  const [slotTime,setSlotTime]=useState("");
  const [managementError,setManagementError]=useState("");
  const [managementSaving,setManagementSaving]=useState(false);
  const loadAppointments=()=>fetch("/api/appointments").then(r=>r.json()).then(data=>setRealAppointments(data.appointments??[])).catch(()=>undefined);
  const loadManagement=()=>fetch("/api/clinic/management").then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);setManagement(data);}).catch(error=>setManagementError(error instanceof Error?error.message:"No fue posible cargar la configuración."));
  useEffect(()=>{fetch("/api/clinic/session").then(response=>response.json()).then(data=>{if(data.authenticated)setStaff(data.user);}).finally(()=>setCheckingAccess(false));},[]);
  useEffect(()=>{if(staff){loadAppointments();loadManagement()}},[staff]);
  const updateAppointment=async(id:number,status:"cancelled"|"reschedule_requested")=>{await fetch("/api/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});loadAppointments()};
  const addDoctor=async()=>{setManagementError("");setManagementSaving(true);try{const response=await fetch("/api/clinic/management",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"doctor",fullName:doctorName,specialty:doctorSpecialty})});const data=await response.json();if(!response.ok)throw new Error(data.error);setDoctorName("");setDoctorSpecialty("");await loadManagement();}catch(error){setManagementError(error instanceof Error?error.message:"No fue posible agregar el médico.")}finally{setManagementSaving(false)}};
  const addAvailability=async()=>{setManagementError("");setManagementSaving(true);try{const startsAt=slotDate&&slotTime?new Date(`${slotDate}T${slotTime}:00`).toISOString():"";const response=await fetch("/api/clinic/management",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"availability",doctorId:Number(slotDoctorId),startsAt})});const data=await response.json();if(!response.ok)throw new Error(data.error);setSlotDate("");setSlotTime("");await loadManagement();}catch(error){setManagementError(error instanceof Error?error.message:"No fue posible abrir el horario.")}finally{setManagementSaving(false)}};
  const activeAppointments = realAppointments.filter(item => item.status !== "cancelled");
  const cancelledAppointments = realAppointments.filter(item => item.status === "cancelled");
  const content=tab==="Médicos"?<><h2>Médicos activos</h2><div className="management-layout"><div className="settings"><label>Nombre completo<input value={doctorName} onChange={event=>setDoctorName(event.target.value)} placeholder="Ej. Dra. Andrea Morales" /></label><label>Especialidad<input value={doctorSpecialty} onChange={event=>setDoctorSpecialty(event.target.value)} placeholder="Ej. Odontología" /></label><button className="primary" disabled={managementSaving} onClick={addDoctor}>{managementSaving?"Guardando...":"Agregar médico"}</button></div><div className="cards">{(management?.doctors??[]).map(doctor=><article key={doctor.id}><em>{doctor.fullName.split(" ").slice(-2).map(part=>part[0]).join("")}</em><div><small>{doctor.specialty}</small><h3>{doctor.fullName}</h3><p>{management?.clinic.name}<br/><strong>● Activo</strong></p></div></article>)}</div></div></>:tab==="Horarios"?<><h2>Horarios de atención</h2><div className="management-layout"><div className="settings"><label>Médico<select value={slotDoctorId} onChange={event=>setSlotDoctorId(event.target.value)}><option value="">Selecciona un médico</option>{(management?.doctors??[]).filter(doctor=>doctor.status==="active").map(doctor=><option value={doctor.id} key={doctor.id}>{doctor.fullName} · {doctor.specialty}</option>)}</select></label><label>Fecha<input type="date" min={new Date().toLocaleDateString("en-CA")} value={slotDate} onChange={event=>setSlotDate(event.target.value)} /></label><label>Hora<select value={slotTime} onChange={event=>setSlotTime(event.target.value)}><option value="">Selecciona una hora</option>{["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30"].map(time=><option key={time} value={time}>{new Intl.DateTimeFormat("es-PA",{hour:"numeric",minute:"2-digit"}).format(new Date(`2026-01-01T${time}:00`))}</option>)}</select></label><p><small>Se abrirá un cupo de 30 minutos.</small></p><button className="primary" disabled={managementSaving} onClick={addAvailability}>{managementSaving?"Guardando...":"Abrir horario"}</button></div><div className="cards">{(management?.availability??[]).map(slot=><article key={slot.id}><em>{new Date(slot.startsAt).getHours().toString().padStart(2,"0")}</em><div><small>{formatSlot(slot.startsAt)}</small><h3>{slot.doctorName}</h3><p><strong>● {slot.status==="available"?"Disponible":"Reservado"}</strong></p></div></article>)}</div></div></>:tab==="Configuración"?<><h2>Configuración de clínica</h2><div className="settings"><label>Nombre de la clínica<input value={management?.clinic.name??""} readOnly/></label><label>Teléfono WhatsApp<input value={management?.clinic.whatsapp??""} readOnly/></label><label>Dirección<input value={management?.clinic.address??""} readOnly/></label><p><small>La edición de información general se habilitará cuando agreguemos la configuración comercial de la clínica.</small></p></div></>:null;
  if (checkingAccess) return <main><nav><b className="brand"><img src="/medicitas-mark.svg" alt="" />MediCitas</b><button onClick={back}>Ver sitio público</button></nav><section className="clinic"><p>Comprobando acceso seguro...</p></section></main>;
  if (!staff) return <ClinicAccess back={back} onAuthenticated={setStaff} />;
  return <main>
    <nav><b className="brand"><img src="/medicitas-mark.svg" alt="" />MediCitas</b><div className="nav-actions"><span className="staff-name">{staff.fullName}</span><button onClick={async()=>{await fetch("/api/clinic/session",{method:"DELETE"});setStaff(null);setRealAppointments([])}}>Cerrar sesión</button><button onClick={back}>Ver sitio público</button></div></nav>
    <section className="clinic">
      <small>PANEL DE CLÍNICA · DEMOSTRACIÓN</small>
      <h1>{management?.clinic.name??"Clínica"}</h1><p>Resumen de la operación de hoy.</p>
      <div className="stats">
        <div><b>{activeAppointments.length}</b><span>Citas activas</span></div>
        <div><b>{activeAppointments.filter(item => item.status === "pending").length}</b><span>Pendientes</span></div>
        <div><b>{(management?.doctors??[]).filter(doctor=>doctor.status==="active").length}</b><span>Médicos activos</span></div>
      </div>
      {managementError&&<p className="form-error">{managementError}</p>}
      <h2>Módulos del MVP</h2>
      <div className="modules">{["Agenda","Médicos","Horarios","Configuración"].map(x=><button className={tab===x?"selected":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
      {tab==="Agenda"&&<section className="live-agenda"><h2>Agenda real</h2>{activeAppointments.length===0?<p>No hay citas activas por ahora.</p>:activeAppointments.map(item=><article key={item.id}><em>{new Date(item.startsAt).getHours().toString().padStart(2,"0")}</em><div><small>{new Date(item.startsAt).toLocaleString("es-PA")}</small><h3>{item.patientName}</h3><p>{item.doctorName} · {item.specialty}<br/><strong>● {formatAppointmentStatus(item.status)}</strong></p></div><button onClick={()=>updateAppointment(item.id,"reschedule_requested")}>Reprogramar</button><button onClick={()=>updateAppointment(item.id,"cancelled")}>Cancelar</button></article>)}{cancelledAppointments.length>0&&<><h2>Historial de cancelaciones</h2>{cancelledAppointments.map(item=><article key={item.id}><em>{new Date(item.startsAt).getHours().toString().padStart(2,"0")}</em><div><small>{new Date(item.startsAt).toLocaleString("es-PA")}</small><h3>{item.patientName}</h3><p>{item.doctorName} · {item.specialty}<br/><strong>● Cancelada</strong></p></div></article>)}</>}</section>}
      {content}
    </section>
  </main>;
}

type PatientAppointment = { id: number; status: string; reservationCode: string; startsAt: string; doctorName: string; specialty: string };

function PatientPortal({ back }: { back: () => void }) {
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [reservationCode, setReservationCode] = useState("");
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAppointments = async () => {
    const session = await fetch("/api/patient/session").then(response => response.json());
    if (!session.authenticated) { setLoading(false); return; }
    setFullName(session.patient.fullName);
    const data = await fetch("/api/patient/appointments").then(response => response.json());
    setAppointments(data.appointments ?? []);
    setLoading(false);
  };
  useEffect(() => { loadAppointments().catch(() => { setError("No fue posible cargar tus citas."); setLoading(false); }); }, []);

  const login = async () => {
    setError(""); setSaving(true);
    try {
      const response = await fetch("/api/patient/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ whatsapp, reservationCode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setFullName(data.patient.fullName);
      const appointmentsResponse = await fetch("/api/patient/appointments");
      const appointmentsData = await appointmentsResponse.json();
      setAppointments(appointmentsData.appointments ?? []);
    } catch (exception) { setError(exception instanceof Error ? exception.message : "No fue posible acceder."); }
    finally { setSaving(false); setLoading(false); }
  };
  const updateAppointment = async (id: number, status: "cancelled" | "reschedule_requested") => {
    await fetch("/api/patient/appointments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    await loadAppointments();
  };
  const logout = async () => { await fetch("/api/patient/session", { method: "DELETE" }); setFullName(""); setAppointments([]); setWhatsapp(""); setReservationCode(""); };

  const activeAppointments = appointments.filter(appointment => appointment.status !== "cancelled");
  const pendingAppointments = activeAppointments.filter(appointment => appointment.status === "pending");
  const nextAppointment = [...activeAppointments].sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  return <main><nav><b className="brand"><img src="/medicitas-mark.svg" alt="" />MediCitas</b><button onClick={back}>Ver sitio público</button></nav><section className="clinic patient-portal">
    <small>PANEL DEL PACIENTE</small><h1>{fullName ? `Hola, ${fullName}` : "Consulta tus citas"}</h1><p>{fullName ? "Aquí puedes revisar y gestionar tus reservas." : "Ingresa con el WhatsApp y el código de una de tus reservas."}</p>
    {loading ? <p>Cargando...</p> : !fullName ? <div className="settings"><label>WhatsApp<input value={whatsapp} onChange={event => setWhatsapp(event.target.value)} placeholder="Ej. 6000-0000" /></label><label>Código de reserva<input value={reservationCode} onChange={event => setReservationCode(event.target.value.toUpperCase())} placeholder="Ej. MC-30D25FF6" /></label>{error && <p className="form-error">{error}</p>}<button className="primary" disabled={saving} onClick={login}>{saving ? "Verificando..." : "Entrar a mis citas"}</button><p><small>Por ahora el código de reserva valida el acceso. Luego llegará un código temporal por WhatsApp.</small></p></div> : <><div className="patient-toolbar"><button onClick={logout}>Cerrar sesión</button><span>Tu información está protegida</span></div><div className="patient-summary"><div><b>{nextAppointment ? "1" : "0"}</b><span>Próxima cita</span></div><div><b>{pendingAppointments.length}</b><span>Pendiente{pendingAppointments.length === 1 ? "" : "s"}</span></div><div><b>{appointments.filter(appointment => appointment.status === "cancelled").length}</b><span>Cancelada{appointments.filter(appointment => appointment.status === "cancelled").length === 1 ? "" : "s"}</span></div></div>{nextAppointment && <section className="next-appointment"><small>TU PRÓXIMA CITA</small><h2>{nextAppointment.doctorName}</h2><p>{nextAppointment.specialty} · {formatLongSlot(nextAppointment.startsAt)}</p><span className={`status-pill ${statusClass(nextAppointment.status)}`}>{formatAppointmentStatus(nextAppointment.status)}</span></section>}<h2>Mis citas</h2>{appointments.length === 0 ? <p>No tienes citas registradas.</p> : appointments.map(appointment => <article className={`patient-appointment ${statusClass(appointment.status)}`} key={appointment.id}><em>{new Date(appointment.startsAt).getHours().toString().padStart(2, "0")}</em><div><small>{formatSlot(appointment.startsAt)} · {appointment.reservationCode}</small><h3>{appointment.doctorName}</h3><p>{appointment.specialty}<br/><span className={`status-pill ${statusClass(appointment.status)}`}>{formatAppointmentStatus(appointment.status)}</span></p></div>{appointment.status !== "cancelled" && <div className="patient-actions"><button onClick={() => updateAppointment(appointment.id, "reschedule_requested")}>Reprogramar</button><button className="danger" onClick={() => updateAppointment(appointment.id, "cancelled")}>Cancelar</button></div>}</article>)}<p className="patient-help">¿Necesitas ayuda con una reserva? Comunícate directamente con tu clínica.</p></>}
  </section></main>;
}

function ClinicDemo({ back, openBooking }: { back: () => void; openBooking: () => void }) {
  return <main className="demo-page">
    <nav><b className="brand"><img src="/medicitas-mark.svg" alt="" />MediCitas</b><button onClick={back}>← Volver al sitio</button></nav>
    <section className="demo-hero">
      <div><small>DEMO PARA CLÍNICAS</small><h1>Menos llamadas.<br/>Más citas confirmadas.</h1><p>MediCitas organiza la disponibilidad de tus médicos y le permite al paciente reservar en pocos pasos desde su celular.</p><div className="demo-actions"><button className="primary" onClick={openBooking}>Ver experiencia del paciente</button><button onClick={()=>document.getElementById("flow")?.scrollIntoView({behavior:"smooth"})}>Conocer cómo funciona</button></div><p className="demo-note">Diseñado para clínicas y centros médicos en Panamá.</p></div>
      <div className="dashboard-card"><div className="dash-top"><span>Clínica Demo</span><b>Hoy · 19 ago.</b></div><div className="dash-metrics"><div><strong>12</strong><small>Citas de hoy</small></div><div><strong>3</strong><small>Por confirmar</small></div><div><strong>4</strong><small>Médicos activos</small></div></div><div className="mini-list"><p><span className="dot green"/>09:00 · María González <b>Confirmada</b></p><p><span className="dot orange"/>11:15 · Carlos Herrera <b>Pendiente</b></p><p><span className="dot blue"/>15:30 · Ana Rodríguez <b>Nueva reserva</b></p></div><div className="dash-footer">Agenda clara, en un solo lugar <span>→</span></div></div>
    </section>
    <section className="proof"><div><b>24/7</b><span>Disponibilidad para reservar</span></div><div><b>3 pasos</b><span>Para completar una cita</span></div><div><b>1 agenda</b><span>Para tu equipo médico</span></div></section>
    <section className="demo-section" id="flow"><small>UN RECORRIDO MUY SIMPLE</small><h2>Así funciona MediCitas</h2><p className="section-intro">Una experiencia hecha para facilitar la coordinación, no para agregar trabajo.</p><div className="flow-grid"><article><em>01</em><h3>El paciente encuentra</h3><p>Busca especialidad, médico o clínica y ve opciones claras.</p></article><article><em>02</em><h3>Elige un horario</h3><p>Selecciona un espacio disponible y deja sus datos de contacto.</p></article><article><em>03</em><h3>La clínica gestiona</h3><p>Ve la reserva en su agenda y puede confirmar, cancelar o reprogramar.</p></article></div></section>
    <section className="showcase"><div className="phone"><div className="phone-head"><small>MEDICITAS</small><b>Encuentra tu próxima cita</b></div><div className="phone-search">🔎 Pediatría</div><div className="doctor-mini"><em>DP</em><div><small>PEDIATRÍA</small><b>Dr. Daniel Pérez</b><span>Clínica Demo</span></div></div><div className="time-mini"><small>HORARIOS DISPONIBLES</small><button>Hoy · 3:30 p.m.</button><button>Mañana · 9:00 a.m.</button></div><button className="primary">Reservar cita</button></div><div className="showcase-copy"><small>PARA EL PACIENTE</small><h2>Una reserva que se entiende de inmediato.</h2><p>Sin formularios interminables ni llamadas para confirmar el horario. La persona elige y la clínica recibe la solicitud organizada.</p><ul><li>Especialidades y médicos visibles</li><li>Horarios disponibles para elegir</li><li>Confirmación con código de reserva</li></ul></div></section>
    <section className="benefits"><div><small>PARA LA CLÍNICA</small><h2>Una operación más ordenada desde el primer día.</h2></div><div className="benefit-grid"><article><span>⌁</span><h3>Agenda centralizada</h3><p>Consolida las citas de cada médico en un panel fácil de revisar.</p></article><article><span>✓</span><h3>Menos confusiones</h3><p>Un horario reservado deja de estar disponible para otra persona.</p></article><article><span>◷</span><h3>Respuesta más rápida</h3><p>El equipo puede confirmar o solicitar reprogramación desde la agenda.</p></article><article><span>◌</span><h3>Lista para crecer</h3><p>La base permite sumar recordatorios por WhatsApp y más clínicas.</p></article></div></section>
    <section className="closing"><small>PRÓXIMO PASO</small><h2>Probemos MediCitas con tu clínica.</h2><p>Empezamos con tus médicos, especialidades y horarios de atención.</p><button className="primary" onClick={back}>Explorar el prototipo funcional</button></section>
    <footer><b className="brand"><img src="/medicitas-mark.svg" alt="" />MediCitas</b><p>La forma simple de coordinar citas médicas.</p></footer>
  </main>
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [clinic, setClinic] = useState(false);
  const [patient, setPatient] = useState(false);
  const [demo, setDemo] = useState(false);
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [reservationCode, setReservationCode] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState("");
  useEffect(() => {
    fetch("/api/catalog").then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No fue posible cargar los horarios.");
      setCatalog(data);
    }).catch(error => setCatalogError(error instanceof Error ? error.message : "No fue posible cargar los horarios."));
  }, []);
  const list = (catalog?.doctors ?? []).filter(doctor =>
    `${doctor.fullName} ${doctor.specialty} ${catalog?.clinic.name ?? ""}`.toLowerCase().includes(query.toLowerCase())
  );
  const selectedDoctor = catalog?.doctors.find(doctor => doctor.id === picked);
  const doctorSlots = (catalog?.availability ?? []).filter(slot => slot.doctorId === picked && slot.status === "available");
  if (clinic) return <Clinic back={() => setClinic(false)} />;
  if (patient) return <PatientPortal back={() => setPatient(false)} />;
  if (demo) return <ClinicDemo back={() => setDemo(false)} openBooking={() => { setDemo(false); setTimeout(() => document.getElementById("results")?.scrollIntoView({behavior:"smooth"}), 0); }} />;
  return <main>
    <nav><b className="brand"><img src="/medicitas-mark.svg" alt="" />MediCitas</b><div className="nav-actions"><button className="demo-link" onClick={() => setDemo(true)}>Demo para clínicas</button><button onClick={() => setPatient(true)}>Mis citas</button><button onClick={() => setClinic(true)}>Soy clínica</button></div></nav>
    <section className="hero">
      <small>CITAS MÉDICAS, SIN COMPLICACIONES</small><h1>Tu salud empieza<br />con una cita.</h1>
      <p>Encuentra médicos, consulta horarios reales y reserva desde tu celular.</p>
      <div className="search"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Especialidad, médico o clínica" /><button>Buscar citas</button></div>
      <aside><button onClick={() => setQuery("Medicina")}>Medicina general</button><button onClick={() => setQuery("Pediatría")}>Pediatría</button><button onClick={() => setQuery("Ginecología")}>Ginecología</button></aside>
    </section>
    <section id="results"><small>DISPONIBILIDAD EN TIEMPO REAL</small><h2>Encuentra tu próxima cita</h2><p>{catalogError || (catalog ? "Horarios consultados directamente desde la agenda de la clínica." : "Cargando médicos y horarios disponibles...")}</p>
      <div className="cards">{list.map(doctor => { const firstSlot = (catalog?.availability ?? []).find(slot => slot.doctorId === doctor.id && slot.status === "available"); return <article key={doctor.id}><em>{doctor.fullName.split(" ").slice(-2).map(part => part[0]).join("")}</em><div><small>{doctor.specialty}</small><h3>{doctor.fullName}</h3><p>{catalog?.clinic.name}<br /><strong>● {firstSlot ? formatSlot(firstSlot.startsAt) : "Sin cupos disponibles"}</strong></p></div><button disabled={!firstSlot} onClick={() => {setPicked(doctor.id);setDone(false);setError("");setFullName("");setWhatsapp("");setSelectedSlot(firstSlot?.id ?? null)}}>Ver horarios</button></article>})}</div>
    </section>
    {picked !== null && selectedDoctor && <div className="overlay"><div className="modal">{!done ? <><button className="x" onClick={() => setPicked(null)}>×</button><small>RESERVAR CITA</small><h2>{selectedDoctor.fullName}</h2><p>{selectedDoctor.specialty} · {catalog?.clinic.name}</p><div className="slots">{doctorSlots.map(slot=><button className={selectedSlot===slot.id?"chosen":""} onClick={()=>setSelectedSlot(slot.id)} key={slot.id}>{new Intl.DateTimeFormat("es-PA",{weekday:"short",day:"numeric",month:"short"}).format(new Date(slot.startsAt))}<br/><b>{new Intl.DateTimeFormat("es-PA",{hour:"numeric",minute:"2-digit"}).format(new Date(slot.startsAt))}</b></button>)}</div><p className="selected-time">Horario elegido: <b>{selectedSlot ? formatSlot(doctorSlots.find(slot => slot.id === selectedSlot)?.startsAt ?? "") : "Selecciona un horario"}</b></p><label>Nombre completo<input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Escribe tu nombre"/></label><label>WhatsApp<input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="Ej. 6000-0000"/></label>{error&&<p className="form-error">{error}</p>}<button className="primary" disabled={saving || !selectedSlot} onClick={async()=>{setError("");if(!fullName.trim()||!whatsapp.trim()||!selectedSlot){setError("Completa tus datos y selecciona un horario.");return}setSaving(true);try{const r=await fetch("/api/appointments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName,whatsapp,availabilityId:selectedSlot})});const data=await r.json();if(!r.ok)throw new Error(data.error);setReservationCode(data.reservationCode);setDone(true)}catch(e){setError(e instanceof Error?e.message:"No fue posible guardar la cita.")}finally{setSaving(false)}}}>{saving?"Guardando...":"Confirmar reserva"}</button></> : <><div className="check">✓</div><small>CITA RESERVADA</small><h2>¡Listo!</h2><p>Tu solicitud fue registrada con el código <b>{reservationCode}</b>. Recibirás los detalles por WhatsApp.</p><button className="primary" onClick={() => setPicked(null)}>Volver a MediCitas</button></>}</div></div>}
    <footer><b className="brand"><img src="/medicitas-mark.svg" alt="" />MediCitas</b><p>Una forma más simple de coordinar tu salud.</p></footer>
  </main>;
}
