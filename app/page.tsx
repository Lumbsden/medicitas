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

function Clinic({ back }: { back: () => void }) {
  const [tab,setTab]=useState("Agenda");
  const [realAppointments,setRealAppointments]=useState<Array<{id:number;patientName:string;doctorName:string;specialty:string;startsAt:string;status:string}>>([]);
  const loadAppointments=()=>fetch("/api/appointments").then(r=>r.json()).then(data=>setRealAppointments(data.appointments??[])).catch(()=>undefined);
  useEffect(()=>{loadAppointments()},[]);
  const updateAppointment=async(id:number,status:"cancelled"|"reschedule_requested")=>{await fetch("/api/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});loadAppointments()};
  const activeAppointments = realAppointments.filter(item => item.status !== "cancelled");
  const cancelledAppointments = realAppointments.filter(item => item.status === "cancelled");
  const content=tab==="Médicos"?<><h2>Médicos activos</h2><div className="cards">{clinicDoctors.map(d=><article key={d[0]}><em>{d[4]}</em><div><small>{d[1]}</small><h3>{d[0]}</h3><p>{d[2]}<br/><strong>● Activo</strong></p></div><button>Editar</button></article>)}</div></>:tab==="Horarios"?<><h2>Horarios de atención</h2><div className="cards"><article><em>LU</em><div><small>DRA. VALERIA GÓMEZ</small><h3>Lunes a viernes</h3><p>8:00 a.m. a 4:00 p.m. · Citas de 30 minutos</p></div><button>Editar</button></article><article><em>MA</em><div><small>DR. DANIEL PÉREZ</small><h3>Lunes, miércoles y viernes</h3><p>9:00 a.m. a 2:00 p.m. · Citas de 30 minutos</p></div><button>Editar</button></article></div></>:tab==="Configuración"?<><h2>Configuración de clínica</h2><div className="settings"><label>Nombre de la clínica<input value="Clínica Demo" readOnly/></label><label>Teléfono WhatsApp<input value="+507 6000-0000" readOnly/></label><label>Dirección<input value="Dirección de demostración" readOnly/></label><button className="primary">Guardar cambios</button></div></>:null;
  return <main>
    <nav><b><i>+</i>MediCitas</b><button onClick={back}>Ver sitio público</button></nav>
    <section className="clinic">
      <small>PANEL DE CLÍNICA · DEMOSTRACIÓN</small>
      <h1>Clínica Demo</h1><p>Resumen de la operación de hoy.</p>
      <div className="stats">
        <div><b>{activeAppointments.length}</b><span>Citas activas</span></div>
        <div><b>{activeAppointments.filter(item => item.status === "pending").length}</b><span>Pendientes</span></div>
        <div><b>{clinicDoctors.length}</b><span>Médicos activos</span></div>
      </div>
      <h2>Módulos del MVP</h2>
      <div className="modules">{["Agenda","Médicos","Horarios","Configuración"].map(x=><button className={tab===x?"selected":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
      {tab==="Agenda"&&<section className="live-agenda"><h2>Agenda real</h2>{activeAppointments.length===0?<p>No hay citas activas por ahora.</p>:activeAppointments.map(item=><article key={item.id}><em>{new Date(item.startsAt).getHours().toString().padStart(2,"0")}</em><div><small>{new Date(item.startsAt).toLocaleString("es-PA")}</small><h3>{item.patientName}</h3><p>{item.doctorName} · {item.specialty}<br/><strong>● {item.status}</strong></p></div><button onClick={()=>updateAppointment(item.id,"reschedule_requested")}>Reprogramar</button><button onClick={()=>updateAppointment(item.id,"cancelled")}>Cancelar</button></article>)}{cancelledAppointments.length>0&&<><h2>Historial de cancelaciones</h2>{cancelledAppointments.map(item=><article key={item.id}><em>{new Date(item.startsAt).getHours().toString().padStart(2,"0")}</em><div><small>{new Date(item.startsAt).toLocaleString("es-PA")}</small><h3>{item.patientName}</h3><p>{item.doctorName} · {item.specialty}<br/><strong>● Cancelada</strong></p></div></article>)}</>}</section>}
      {content}
    </section>
  </main>;
}

function ClinicDemo({ back, openBooking }: { back: () => void; openBooking: () => void }) {
  return <main className="demo-page">
    <nav><b><i>+</i>MediCitas</b><button onClick={back}>← Volver al sitio</button></nav>
    <section className="demo-hero">
      <div><small>DEMO PARA CLÍNICAS</small><h1>Menos llamadas.<br/>Más citas confirmadas.</h1><p>MediCitas organiza la disponibilidad de tus médicos y le permite al paciente reservar en pocos pasos desde su celular.</p><div className="demo-actions"><button className="primary" onClick={openBooking}>Ver experiencia del paciente</button><button onClick={()=>document.getElementById("flow")?.scrollIntoView({behavior:"smooth"})}>Conocer cómo funciona</button></div><p className="demo-note">Diseñado para clínicas y centros médicos en Panamá.</p></div>
      <div className="dashboard-card"><div className="dash-top"><span>Clínica Demo</span><b>Hoy · 19 ago.</b></div><div className="dash-metrics"><div><strong>12</strong><small>Citas de hoy</small></div><div><strong>3</strong><small>Por confirmar</small></div><div><strong>4</strong><small>Médicos activos</small></div></div><div className="mini-list"><p><span className="dot green"/>09:00 · María González <b>Confirmada</b></p><p><span className="dot orange"/>11:15 · Carlos Herrera <b>Pendiente</b></p><p><span className="dot blue"/>15:30 · Ana Rodríguez <b>Nueva reserva</b></p></div><div className="dash-footer">Agenda clara, en un solo lugar <span>→</span></div></div>
    </section>
    <section className="proof"><div><b>24/7</b><span>Disponibilidad para reservar</span></div><div><b>3 pasos</b><span>Para completar una cita</span></div><div><b>1 agenda</b><span>Para tu equipo médico</span></div></section>
    <section className="demo-section" id="flow"><small>UN RECORRIDO MUY SIMPLE</small><h2>Así funciona MediCitas</h2><p className="section-intro">Una experiencia hecha para facilitar la coordinación, no para agregar trabajo.</p><div className="flow-grid"><article><em>01</em><h3>El paciente encuentra</h3><p>Busca especialidad, médico o clínica y ve opciones claras.</p></article><article><em>02</em><h3>Elige un horario</h3><p>Selecciona un espacio disponible y deja sus datos de contacto.</p></article><article><em>03</em><h3>La clínica gestiona</h3><p>Ve la reserva en su agenda y puede confirmar, cancelar o reprogramar.</p></article></div></section>
    <section className="showcase"><div className="phone"><div className="phone-head"><small>MEDICITAS</small><b>Encuentra tu próxima cita</b></div><div className="phone-search">🔎 Pediatría</div><div className="doctor-mini"><em>DP</em><div><small>PEDIATRÍA</small><b>Dr. Daniel Pérez</b><span>Clínica Demo</span></div></div><div className="time-mini"><small>HORARIOS DISPONIBLES</small><button>Hoy · 3:30 p.m.</button><button>Mañana · 9:00 a.m.</button></div><button className="primary">Reservar cita</button></div><div className="showcase-copy"><small>PARA EL PACIENTE</small><h2>Una reserva que se entiende de inmediato.</h2><p>Sin formularios interminables ni llamadas para confirmar el horario. La persona elige y la clínica recibe la solicitud organizada.</p><ul><li>Especialidades y médicos visibles</li><li>Horarios disponibles para elegir</li><li>Confirmación con código de reserva</li></ul></div></section>
    <section className="benefits"><div><small>PARA LA CLÍNICA</small><h2>Una operación más ordenada desde el primer día.</h2></div><div className="benefit-grid"><article><span>⌁</span><h3>Agenda centralizada</h3><p>Consolida las citas de cada médico en un panel fácil de revisar.</p></article><article><span>✓</span><h3>Menos confusiones</h3><p>Un horario reservado deja de estar disponible para otra persona.</p></article><article><span>◷</span><h3>Respuesta más rápida</h3><p>El equipo puede confirmar o solicitar reprogramación desde la agenda.</p></article><article><span>◌</span><h3>Lista para crecer</h3><p>La base permite sumar recordatorios por WhatsApp y más clínicas.</p></article></div></section>
    <section className="closing"><small>PRÓXIMO PASO</small><h2>Probemos MediCitas con tu clínica.</h2><p>Empezamos con tus médicos, especialidades y horarios de atención.</p><button className="primary" onClick={back}>Explorar el prototipo funcional</button></section>
    <footer><b><i>+</i>MediCitas</b><p>La forma simple de coordinar citas médicas.</p></footer>
  </main>
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [clinic, setClinic] = useState(false);
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
  if (demo) return <ClinicDemo back={() => setDemo(false)} openBooking={() => { setDemo(false); setTimeout(() => document.getElementById("results")?.scrollIntoView({behavior:"smooth"}), 0); }} />;
  return <main>
    <nav><b><i>+</i>MediCitas</b><div className="nav-actions"><button className="demo-link" onClick={() => setDemo(true)}>Demo para clínicas</button><button onClick={() => setClinic(true)}>Soy clínica</button></div></nav>
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
    <footer><b><i>+</i>MediCitas</b><p>Una forma más simple de coordinar tu salud.</p></footer>
  </main>;
}
