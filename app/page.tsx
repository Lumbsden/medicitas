"use client";
import { useEffect, useState } from "react";
import "./slot.css";

const doctors = [
  ["Dra. Valeria Gómez", "Medicina general", "Clínica Demo", "Hoy, 3:30 p.m.", "VG"],
  ["Dr. Daniel Pérez", "Pediatría", "Clínica Demo", "Mañana, 9:00 a.m.", "DP"],
  ["Dra. Elena Castillo", "Ginecología", "Clínica Demo", "Mañana, 2:15 p.m.", "EC"],
];

function Clinic({ back }: { back: () => void }) {
  const [tab,setTab]=useState("Agenda");
  const [realAppointments,setRealAppointments]=useState<Array<{id:number;patientName:string;doctorName:string;specialty:string;startsAt:string;status:string}>>([]);
  const loadAppointments=()=>fetch("/api/appointments").then(r=>r.json()).then(data=>setRealAppointments(data.appointments??[])).catch(()=>undefined);
  useEffect(()=>{loadAppointments()},[]);
  const updateAppointment=async(id:number,status:"cancelled"|"reschedule_requested")=>{await fetch("/api/appointments",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});loadAppointments()};
  const content=tab==="Médicos"?<><h2>Médicos activos</h2><div className="cards">{doctors.map(d=><article key={d[0]}><em>{d[4]}</em><div><small>{d[1]}</small><h3>{d[0]}</h3><p>{d[2]}<br/><strong>● Activo</strong></p></div><button>Editar</button></article>)}</div></>:tab==="Horarios"?<><h2>Horarios de atención</h2><div className="cards"><article><em>LU</em><div><small>DRA. VALERIA GÓMEZ</small><h3>Lunes a viernes</h3><p>8:00 a.m. a 4:00 p.m. · Citas de 30 minutos</p></div><button>Editar</button></article><article><em>MA</em><div><small>DR. DANIEL PÉREZ</small><h3>Lunes, miércoles y viernes</h3><p>9:00 a.m. a 2:00 p.m. · Citas de 30 minutos</p></div><button>Editar</button></article></div></>:tab==="Configuración"?<><h2>Configuración de clínica</h2><div className="settings"><label>Nombre de la clínica<input value="Clínica Demo" readOnly/></label><label>Teléfono WhatsApp<input value="+507 6000-0000" readOnly/></label><label>Dirección<input value="Dirección de demostración" readOnly/></label><button className="primary">Guardar cambios</button></div></>:<><h2>Agenda de hoy</h2>{[["09","9:00 A.M.","María González","Dr. Daniel Pérez · Pediatría","Confirmada"],["11","11:15 A.M.","Carmen Díaz","Dra. Valeria Gómez · Medicina general","Ver cita"],["03","3:30 P.M.","Laura Herrera","Dra. Elena Castillo · Ginecología","Confirmar"]].map(c=><article key={c[2]}><em>{c[0]}</em><div><small>{c[1]}</small><h3>{c[2]}</h3><p>{c[3]}</p></div><button>{c[4]}</button></article>)}</>;
  return <main>
    <nav><b><i>+</i>MediCitas</b><button onClick={back}>Ver sitio público</button></nav>
    <section className="clinic">
      <small>PANEL DE CLÍNICA · DEMOSTRACIÓN</small>
      <h1>Clínica Demo</h1><p>Resumen de la operación de hoy.</p>
      <div className="stats">
        <div><b>12</b><span>Citas de hoy</span></div>
        <div><b>3</b><span>Pendientes</span></div>
        <div><b>4</b><span>Médicos activos</span></div>
      </div>
      <h2>Módulos del MVP</h2>
      <div className="modules">{["Agenda","Médicos","Horarios","Configuración"].map(x=><button className={tab===x?"selected":""} onClick={()=>setTab(x)} key={x}>{x}</button>)}</div>
      {tab==="Agenda"&&<section className="live-agenda"><h2>Citas reales</h2>{realAppointments.length===0?<p>Aún no hay reservas registradas.</p>:realAppointments.map(item=><article key={item.id}><em>{new Date(item.startsAt).getHours().toString().padStart(2,"0")}</em><div><small>{new Date(item.startsAt).toLocaleString("es-PA")}</small><h3>{item.patientName}</h3><p>{item.doctorName} · {item.specialty}<br/><strong>● {item.status}</strong></p></div><button onClick={()=>updateAppointment(item.id,"reschedule_requested")}>Reprogramar</button><button onClick={()=>updateAppointment(item.id,"cancelled")}>Cancelar</button></article>)}</section>}
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
  const [selectedSlot, setSelectedSlot] = useState(0);
  useEffect(() => { fetch("/api/catalog").catch(() => undefined); }, []);
  const list = doctors.filter(d => d.join(" ").toLowerCase().includes(query.toLowerCase()));
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
    <section id="results"><small>DISPONIBILIDAD DEMOSTRATIVA</small><h2>Encuentra tu próxima cita</h2><p>Estos horarios son ejemplos para visualizar el MVP.</p>
      <div className="cards">{list.map((d,i) => <article key={d[0]}><em>{d[4]}</em><div><small>{d[1]}</small><h3>{d[0]}</h3><p>{d[2]}<br /><strong>● {d[3]}</strong></p></div><button onClick={() => {setPicked(i);setDone(false);setError("");setFullName("");setWhatsapp("");setSelectedSlot(0)}}>Ver horarios</button></article>)}</div>
    </section>
    {picked !== null && <div className="overlay"><div className="modal">{!done ? <><button className="x" onClick={() => setPicked(null)}>×</button><small>RESERVAR CITA</small><h2>{list[picked][0]}</h2><p>{list[picked][1]} · {list[picked][2]}</p><div className="slots">{["Hoy|3:30 p.m.","Mañana|9:00 a.m.","Viernes|11:15 a.m."].map((slot,index)=>{const [day,time]=slot.split("|");return <button className={selectedSlot===index?"chosen":""} onClick={()=>setSelectedSlot(index)} key={slot}>{day}<br/><b>{time}</b></button>})}</div><p className="selected-time">Horario elegido: <b>{["Hoy, 3:30 p.m.","Mañana, 9:00 a.m.","Viernes, 11:15 a.m."][selectedSlot]}</b></p><label>Nombre completo<input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Escribe tu nombre"/></label><label>WhatsApp<input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="Ej. 6000-0000"/></label>{error&&<p className="form-error">{error}</p>}<button className="primary" disabled={saving} onClick={async()=>{setError("");if(!fullName.trim()||!whatsapp.trim()){setError("Completa tu nombre y WhatsApp.");return}setSaving(true);try{const r=await fetch("/api/appointments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({fullName,whatsapp,availabilityId:picked*3+selectedSlot+1})});const data=await r.json();if(!r.ok)throw new Error(data.error);setReservationCode(data.reservationCode);setDone(true)}catch(e){setError(e instanceof Error?e.message:"No fue posible guardar la cita.")}finally{setSaving(false)}}}>{saving?"Guardando...":"Confirmar reserva"}</button></> : <><div className="check">✓</div><small>CITA RESERVADA</small><h2>¡Listo!</h2><p>Tu solicitud fue registrada con el código <b>{reservationCode}</b>. Recibirás los detalles por WhatsApp.</p><button className="primary" onClick={() => setPicked(null)}>Volver a MediCitas</button></>}</div></div>}
    <footer><b><i>+</i>MediCitas</b><p>Una forma más simple de coordinar tu salud.</p></footer>
  </main>;
}
