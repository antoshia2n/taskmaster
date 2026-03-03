import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ChevronRight, ChevronDown, Plus, Trash2, Archive, Timer,
  Play, Pause, SkipForward, Settings, Calendar,
  Folder, Link2, Edit2, Check, X, GripVertical,
  RefreshCw, BarChart3, AlignLeft, CheckSquare,
  FolderOpen, Hash, Zap,
  CheckCircle2, Circle, AlertTriangle, Database, Wifi,
  RotateCcw, BookOpen, Loader2, Inbox, Sunrise, Type,
  ChevronLeft, MoreHorizontal
} from "lucide-react";

// ── Design Tokens ─────────────────────────────────────────────────────────────
const LIGHT = {
  bg:"#F6F4EF", bgCard:"#FFFFFF",
  bgSidebar:"#1B2337", bgSidebarHov:"#243050", bgSidebarAct:"#2E3D68",
  text:"#1A1D27", textSec:"#64748B", textMuted:"#94A3B8",
  border:"#E5E0D8", borderLight:"#EDE9E2",
  blue:"#6BAED4", blueBg:"#EBF4FA",
  lav:"#9B8EC8",  lavBg:"#F0EDF8",
  mint:"#6DB89A", mintBg:"#EAF5EF",
  peach:"#D9805F",peachBg:"#FBF0EC",
  amber:"#C9A84C",amberBg:"#FBF5E6",
};
const DARK = {
  bg:"#12151E", bgCard:"#1C2030",
  bgSidebar:"#0E1118", bgSidebarHov:"#1A1F2E", bgSidebarAct:"#222940",
  text:"#E8E6F0", textSec:"#8B96B0", textMuted:"#545E78",
  border:"#2A3045", borderLight:"#222840",
  blue:"#6BAED4", blueBg:"#1A2D3D",
  lav:"#9B8EC8",  lavBg:"#22213A",
  mint:"#6DB89A", mintBg:"#182E26",
  peach:"#D9805F",peachBg:"#2D1F18",
  amber:"#C9A84C",amberBg:"#2D2614",
};
// T is set at render time in App; components receive it via prop or use the global

// ── Scale ────────────────────────────────────────────────────────────────────
let T = LIGHT;
const SCALES = { large:1.18, medium:1, small:0.84 };

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const localDate = (d=new Date()) => {
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const today    = () => localDate();
const tomorrow = () => { const d=new Date(); d.setDate(d.getDate()+1); return localDate(d); };
const weekEnd  = () => { const d=new Date(); d.setDate(d.getDate()+(7-d.getDay())); return localDate(d); };
const fmtDate  = (s) => {
  if (!s) return "";
  return new Date(s+"T00:00:00").toLocaleDateString("ja-JP",{month:"short",day:"numeric",weekday:"short"});
};
const fmtDateShort = (s) => {
  if (!s) return "";
  return new Date(s+"T00:00:00").toLocaleDateString("ja-JP",{month:"short",day:"numeric"});
};
const isOverdue = (dl) => dl && dl < today();
// 旧データ（文字列）→ {url, label} に正規化
const normLink = (l) => !l ? {url:"",label:""} : typeof l === "string" ? {url:l, label:""} : (l.url !== undefined ? l : {url:"",label:""});
const normLinks = (arr) => (arr||[]).map(normLink).filter(l=>l.url);



const getWeekDays = () => {
  const days=[];
  for(let i=0;i<7;i++){
    const d=new Date();d.setDate(d.getDate()+i);
    days.push(localDate(d));
  }
  return days;
};
const nextRepeatDate = (dl, repeat) => {
  if(!repeat||!dl)return null;
  const d=new Date(dl+"T00:00:00");
  if(repeat==="daily"){d.setDate(d.getDate()+1);}
  else if(repeat==="weekday"){
    d.setDate(d.getDate()+1);
    if(d.getDay()===0)d.setDate(d.getDate()+1);
    if(d.getDay()===6)d.setDate(d.getDate()+2);
  }
  else if(repeat==="weekly"){d.setDate(d.getDate()+7);}
  else if(repeat==="monthly"){d.setMonth(d.getMonth()+1);}
  return localDate(d);
};
const PRIO = {
  high:  {label:"高",color:T.peach,bg:T.peachBg},
  medium:{label:"中",color:T.amber,bg:T.amberBg},
  low:   {label:"低",color:T.mint, bg:T.mintBg },
};
const STATUS = {
  todo:      {label:"未着手",color:T.textMuted},
  inprogress:{label:"進行中",color:T.blue},
  done:      {label:"完了",  color:T.mint},
  waiting:   {label:"待機中",color:T.amber},
};
const REPEAT_OPTS=[
  {v:"",l:"なし"},{v:"daily",l:"毎日"},{v:"weekday",l:"平日"},{v:"weekly",l:"毎週"},{v:"monthly",l:"毎月"},
];
const GROUP_COLORS=[T.blue,T.lav,T.mint,T.amber,T.peach,"#2D4A8A","#B8A9D4","#A8D4B8","#F4A261","#8ECAE6"];

// ── Default Data ──────────────────────────────────────────────────────────────
const DEF_GROUPS=[
  {id:"morning",title:"Morning",color:T.amber,order:0},
  {id:"main",   title:"Focus",  color:T.blue, order:1},
  {id:"evening",title:"Evening",color:T.lav,  order:2},
];
const DEF_TASKS=[
  {id:"t1",title:"朝のルーティン確認",status:"todo",priority:"medium",deadline:today(),goalTime:"08:00",repeat:"daily",projectId:null,groupId:"morning",subtasks:[{id:"s1",title:"ストレッチ 10分",done:false},{id:"s2",title:"日記を書く",done:false}],notes:"毎朝8時までに完了",links:[],completed:false,archived:false,order:0},
  {id:"t2",title:"プロジェクト計画書の作成",status:"inprogress",priority:"high",deadline:tomorrow(),goalTime:"12:00",repeat:"",projectId:"p1",groupId:"main",subtasks:[],notes:"要件定義から始める",links:[{url:"https://example.com",label:"参考資料"}],completed:false,archived:false,order:1},
  {id:"t3",title:"メール返信",status:"todo",priority:"low",deadline:today(),goalTime:"17:00",repeat:"daily",projectId:null,groupId:"evening",subtasks:[],notes:"",links:[],completed:false,archived:false,order:2},
];
const DEF_PROJECTS=[
  {id:"p1",title:"Webアプリ開発",    status:"inprogress",priority:"high",startDate:"2025-01-01",endDate:"2025-03-31",parentId:null,notes:"メインプロジェクト",links:[],color:T.blue,order:0,expanded:true},
  {id:"p2",title:"フロントエンド実装",status:"inprogress",priority:"high",startDate:"2025-01-15",endDate:"2025-03-15",parentId:"p1",notes:"",links:[],color:T.lav,order:1,expanded:false},
];
const DEF_POMO={workTime:25,breakTime:5,longBreakTime:15,dailyGoal:8,sessionsBeforeLong:4};
const DEF_SETTINGS={uiScale:"medium",theme:"auto"};

// ── Storage ───────────────────────────────────────────────────────────────────
async function localLoad(key,fb){try{const r=localStorage.getItem(key);return r?JSON.parse(r):fb;}catch(e){return fb;}}
async function localSave(key,val){
  try{
    localStorage.setItem(key,JSON.stringify(val));
    // Warn if storage is getting large (>3MB of ~5MB limit)
    const used=JSON.stringify(localStorage).length;
    if(used>3*1024*1024) console.warn("localStorage usage high:",Math.round(used/1024)+"KB");
  }catch(e){
    if(e.name==="QuotaExceededError") console.error("localStorage full — data not saved");
  }
}

// ── Supabase REST ─────────────────────────────────────────────────────────────
class SB{
  constructor(url,key){this.url=url?.replace(/\/$/,"");this.key=key;}
  h(){return{"Content-Type":"application/json","apikey":this.key,"Authorization":`Bearer ${this.key}`,"Prefer":"return=minimal"};}
  async get(t){const r=await fetch(`${this.url}/rest/v1/${t}?select=*`,{headers:this.h()});if(!r.ok)throw new Error();return r.json();}
  async upsert(t,row){const r=await fetch(`${this.url}/rest/v1/${t}`,{method:"POST",headers:{...this.h(),"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(row)});if(!r.ok)throw new Error();}
  async test(){const r=await fetch(`${this.url}/rest/v1/app_data?limit=1`,{headers:this.h()});return r.ok;}
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tasks,    setTasksR]    = useState(DEF_TASKS);
  const [projects, setProjectsR] = useState(DEF_PROJECTS);
  const [groups,   setGroupsR]   = useState(DEF_GROUPS);
  const [pomo,     setPomoR]     = useState(DEF_POMO);
  const [appSettings, setAppSettingsR] = useState(DEF_SETTINGS);
  const [sbCfg,    setSbCfgR]    = useState({url:"",key:""});
  const [sbStatus, setSbStatus]  = useState("disconnected");
  const [view,     setView]      = useState("today");
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [ready,    setReady]     = useState(false);
  const sbRef = useRef(null);

  const sbTimers = useRef({});
  const syncSB = useCallback((key,val) => {
    if(!sbRef.current)return;
    clearTimeout(sbTimers.current[key]);
    sbTimers.current[key]=setTimeout(async()=>{
      try{await sbRef.current.upsert("app_data",{key,value:val,updated_at:new Date().toISOString()});}
      catch(e){setSbStatus("error");}
    },800);
  },[]);

  const setTasks    = useCallback(v=>{setTasksR   (p=>{const n=typeof v==="function"?v(p):v;localSave("tm_tasks",n);   syncSB("tasks",n);   return n;});},[syncSB]);
  const setProjects = useCallback(v=>{setProjectsR(p=>{const n=typeof v==="function"?v(p):v;localSave("tm_projects",n);syncSB("projects",n);return n;});},[syncSB]);
  const setGroups   = useCallback(v=>{setGroupsR  (p=>{const n=typeof v==="function"?v(p):v;localSave("tm_groups",n); syncSB("groups",n); return n;});},[syncSB]);
  const setPomo     = useCallback(v=>{setPomoR     (p=>{const n=typeof v==="function"?v(p):v;localSave("tm_pomo",n);  syncSB("pomo",n);   return n;});},[syncSB]);
  const setAppSettings = useCallback(v=>{setAppSettingsR(p=>{const n=typeof v==="function"?v(p):v;localSave("tm_settings",n);syncSB("settings",n);return n;});},[syncSB]);
  const setSbCfg    = useCallback(v=>{setSbCfgR(p=>{const n=typeof v==="function"?v(p):v;localSave("tm_sbcfg",n);return n;});},[]);

  const connectSB = useCallback(async (url,key) => {
    setSbStatus("connecting");
    const client=new SB(url,key);
    try{
      if(!await client.test()){setSbStatus("error");return;}
      sbRef.current=client;
      const rows=await client.get("app_data");
      const rem={};rows.forEach(r=>{rem[r.key]=r.value;});
      // Merge strategy: use Supabase data silently (no flash) by batching state updates
      // Only overwrite if Supabase actually has data for that key
      if(rem.tasks)    setTasksR(rem.tasks.map(x=>({...x,links:normLinks(x.links)})));
      if(rem.projects) setProjectsR(rem.projects.map(x=>({...x,links:normLinks(x.links)})));
      if(rem.groups)   setGroupsR(rem.groups);
      if(rem.pomo)     setPomoR(rem.pomo);
      if(rem.settings) setAppSettingsR(rem.settings);
      // Push local data up to Supabase if Supabase was empty
      if(!rem.tasks)    setTasks(t=>t);
      if(!rem.projects) setProjects(p=>p);
      if(!rem.groups)   setGroups(g=>g);
      setSbStatus("connected");
    }catch(e){setSbStatus("error");}
  },[]);

  useEffect(()=>{
    (async()=>{
      const [t,p,g,pm,sb,st]=await Promise.all([
        localLoad("tm_tasks",DEF_TASKS),localLoad("tm_projects",DEF_PROJECTS),
        localLoad("tm_groups",DEF_GROUPS),localLoad("tm_pomo",DEF_POMO),
        localLoad("tm_sbcfg",{url:"",key:""}),localLoad("tm_settings",DEF_SETTINGS),
      ]);
      setTasksR(t.map(x=>({...x,links:normLinks(x.links)}))); 
      setProjectsR(p.map(x=>({...x,links:normLinks(x.links)})));
      setGroupsR(g);setPomoR(pm);setSbCfgR(sb);setAppSettingsR(st);
      // Restore today's pomodoro count (reset if new day)
      const ps=await localLoad("tm_pomo_session",{todayCount:0,date:today()});
      if(ps.date===today()) setPomS(s=>({...s,todayCount:ps.todayCount}));
      if(sb.url&&sb.key)await connectSB(sb.url,sb.key);
      setReady(true);
    })();
  },[]);

  // Pomodoro
  const [ps,setPomS]=useState({active:false,mode:"work",elapsed:0,session:0,todayCount:0,linkedId:null,startedAt:null});
  const pomInt=useRef(null);
  const actx=useRef(null);
  const beep=(freq=440,dur=0.4)=>{
    try{
      if(!actx.current)actx.current=new(window.AudioContext||window.webkitAudioContext)();
      const c=actx.current,osc=c.createOscillator(),g=c.createGain();
      osc.connect(g);g.connect(c.destination);osc.frequency.value=freq;
      g.gain.setValueAtTime(0.25,c.currentTime);g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);
      osc.start();osc.stop(c.currentTime+dur);
    }catch(e){}
  };
  useEffect(()=>{
    if(ps.active){
      pomInt.current=setInterval(()=>{
        setPomS(s=>{
          if(!s.startedAt)return s;
          const elapsed=Math.floor((Date.now()-s.startedAt)/1000)+s.elapsed;
          const lim=(s.mode==="work"?pomo.workTime:s.mode==="break"?pomo.breakTime:pomo.longBreakTime)*60;
          if(elapsed>=lim){
            beep(880,0.5);
            const ns=s.session+1,nm=s.mode==="work"?(ns%pomo.sessionsBeforeLong===0?"longbreak":"break"):"work";
            const newCount=s.mode==="work"?s.todayCount+1:s.todayCount;
            localSave("tm_pomo_session",{todayCount:newCount,date:today()});
            return{...s,elapsed:0,mode:nm,session:ns,todayCount:newCount,startedAt:Date.now()};
          }
          return{...s,elapsed};
        });
      },1000);
    }else clearInterval(pomInt.current);
    return()=>clearInterval(pomInt.current);
  },[ps.active,pomo]);

  const startPom=(id=null)=>{beep(660,0.2);setPomS(s=>({...s,active:true,linkedId:id||s.linkedId,startedAt:Date.now()}));};
  const pausePom=()=>setPomS(s=>({...s,active:false,elapsed:s.startedAt?Math.floor((Date.now()-s.startedAt)/1000)+s.elapsed:s.elapsed,startedAt:null}));
  const skipPom =()=>{beep(550,0.2);setPomS(s=>{const ns=s.session+1;return{...s,elapsed:0,mode:s.mode==="work"?(ns%pomo.sessionsBeforeLong===0?"longbreak":"break"):"work",session:ns,active:false};});};
  const resetPom=()=>setPomS(s=>({...s,elapsed:0,active:false}));

  const [confirm, setConfirm]=useState(null);
  const [searchQ,setSearchQ]=useState("");
  const [editTask,setEditTask]=useState(null);
  const [editProj,setEditProj]=useState(null);
  const doConfirm=(msg,fn)=>setConfirm({msg,fn});

  const filteredTasks=useMemo(()=>{
    const a=tasks.filter(t=>!t.archived);
    if(view==="today")   return a.filter(t=>!t.completed&&t.deadline&&t.deadline<=today());
    if(view==="tomorrow")return a.filter(t=>t.deadline===tomorrow());
    if(view==="week")    return a.filter(t=>!t.completed&&t.deadline>=today()&&t.deadline<=weekEnd());
    return a; // "all" — include completed, TaskView filters by showDone
  },[tasks,view]);

  const openProjectDetail=(pid)=>{setSelectedProjectId(pid);setView("project_detail");};

  const scale=SCALES[appSettings?.uiScale||"medium"]||1;
  const themePref=appSettings?.theme||"auto";
  const [sysDark,setSysDark]=useState(()=>typeof window!=="undefined"&&!!window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  useEffect(()=>{
    const mq=window.matchMedia?.("(prefers-color-scheme: dark)");
    if(!mq)return;
    const handler=(e)=>setSysDark(e.matches);
    mq.addEventListener("change",handler);
    return()=>mq.removeEventListener("change",handler);
  },[]);
  const isDark=themePref==="dark"||(themePref==="auto"&&sysDark);
  T = isDark ? DARK : LIGHT; // update global for module-level constants

  if(!ready)return(
    <div style={{background:T.bg,height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <Loader2 size={28} color={T.blue} style={{animation:"spin 1s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{display:"flex",height:"100vh",background:T.bg,color:T.text,fontFamily:"'Epilogue','DM Sans',system-ui,sans-serif",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700;800&family=Fraunces:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px;}
        input,textarea,select{font-family:inherit;}
        button{cursor:pointer;font-family:inherit;}
        .tr{transition:box-shadow .15s,border-color .15s;}
        .tr:hover{box-shadow:0 3px 12px rgba(0,0,0,.09)!important;border-color:${T.blue}60!important;}
        .lhbtn:hover{background:${T.bgCard}!important;box-shadow:0 1px 3px rgba(0,0,0,.07);}
        .navbtn{transition:all .15s;border-radius:8px;}
        .navbtn:hover{background:${T.bgSidebarHov}!important;}
        .navbtn.act{background:${T.bgSidebarAct}!important;}
        .modal{position:fixed;inset:0;background:rgba(26,29,39,.45);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);}
        input[type=checkbox]{accent-color:${T.blue};width:14px;height:14px;}
        input:focus,textarea:focus,select:focus{outline:2px solid ${T.blue};outline-offset:-1px;}
        @keyframes fi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fi .2s ease;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:768px){
  .sb{display:none!important;}
  .mobile-tabs{display:flex!important;}
  .main-pad{padding:16px 14px!important;}
  .tr{padding:9px 10px!important;}
  .modal .fi{width:96%!important;max-height:90vh;overflow-y:auto;}
}
@media(min-width:769px){
  .mobile-tabs{display:none!important;}
}
      `}</style>

      <Sidebar view={view} setView={v=>{setView(v);setSelectedProjectId(null);}} tasks={tasks.filter(t=>!t.archived)} sbStatus={sbStatus}/>

      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <PomoBar ps={ps} pomo={pomo} tasks={tasks} onStart={startPom} onPause={pausePom} onSkip={skipPom} onReset={resetPom}/>
        {/* Scale wrapper */}
        <div style={{flex:1,overflow:"auto",transformOrigin:"top left",zoom:scale}}>
          <div className="main-pad" style={{padding:"28px 32px",minHeight:"100%"}}>
            {(["today","tomorrow","week","all"].includes(view))&&(
              <TaskView view={view} tasks={filteredTasks} allTasks={tasks.filter(t=>!t.archived)}
                groups={groups} projects={projects}
                setTasks={setTasks} setGroups={setGroups}
                onEditTask={setEditTask} onStartPom={startPom} doConfirm={doConfirm}
                searchQ={searchQ} setSearchQ={setSearchQ}/>
            )}
            {view==="projects"&&(
              <ProjectView projects={projects} tasks={tasks.filter(t=>!t.archived)}
                setProjects={setProjects} setTasks={setTasks}
                onEditProj={setEditProj} onEditTask={setEditTask}
                doConfirm={doConfirm} onOpenDetail={openProjectDetail}/>
            )}
            {view==="project_detail"&&selectedProjectId&&(
              <ProjectDetail
                project={projects.find(p=>p.id===selectedProjectId)}
                projects={projects} tasks={tasks.filter(t=>!t.archived)}
                setTasks={setTasks} setProjects={setProjects}
                onBack={()=>setView("projects")}
                onEditTask={setEditTask} onEditProj={setEditProj}
                onOpenDetail={openProjectDetail} doConfirm={doConfirm}/>
            )}
            {view==="gantt"&&<GanttView projects={projects}/>}
            {view==="archive"&&(
              <ArchiveView tasks={tasks.filter(t=>t.archived)} projects={projects}
                onUnarchive={id=>setTasks(ts=>ts.map(t=>t.id===id?{...t,archived:false}:t))}
                onDel={id=>doConfirm("このタスクを完全に削除しますか？",()=>setTasks(ts=>ts.filter(t=>t.id!==id)))}/>
            )}
            {view==="settings"&&(
              <SettingsView pomo={pomo} setPomo={setPomo}
                appSettings={appSettings} setAppSettings={setAppSettings}
                sbCfg={sbCfg} setSbCfg={setSbCfg}
                sbStatus={sbStatus} onConnect={(u,k)=>{setSbCfg({url:u,key:k});connectSB(u,k);}}/>
            )}
          </div>
        </div>
      </div>

      {editTask!==null&&(
        <TaskModal task={editTask==="new"?null:editTask} projects={projects} groups={groups}
          onSave={t=>{!editTask?.id?setTasks(ts=>[...ts,{...t,id:uid(),order:ts.length,completed:false,archived:false}]):setTasks(ts=>ts.map(x=>x.id===t.id?t:x));setEditTask(null);}}
          onClose={()=>setEditTask(null)}/>
      )}
      {editProj!==null&&(
        <ProjectModal project={editProj?.id?editProj:null} defaults={editProj?.id?null:editProj} projects={projects}
          onSave={p=>{editProj?.id?setProjects(ps=>ps.map(x=>x.id===p.id?p:x)):setProjects(ps=>[...ps,{...p,id:uid(),order:ps.length,expanded:true}]);setEditProj(null);}}
          onClose={()=>setEditProj(null)}/>
      )}
      {confirm&&(
        <div className="modal" onClick={()=>setConfirm(null)}>
          <div className="fi" onClick={e=>e.stopPropagation()} style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:16,padding:28,maxWidth:360,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,.12)"}}>
            <div style={{fontSize:15,lineHeight:1.65,color:T.text,marginBottom:22}}>{confirm.msg}</div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button className="lhbtn" onClick={()=>setConfirm(null)} style={{padding:"8px 18px",background:"transparent",border:`1.5px solid ${T.border}`,borderRadius:8,color:T.textSec,fontSize:13}}>キャンセル</button>
              <button onClick={()=>{confirm.fn();setConfirm(null);}} style={{padding:"8px 18px",background:T.peach,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700}}>実行</button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile bottom tab bar */}
      <div className="mobile-tabs" style={{
        position:"fixed",bottom:0,left:0,right:0,
        background:T.bgSidebar,
        borderTop:`1px solid rgba(255,255,255,.08)`,
        display:"flex",
        zIndex:150,
        paddingBottom:"env(safe-area-inset-bottom,0px)"
      }}>
        {[
          {id:"today",   icon:<Zap size={18}/>,      label:"Today"},
          {id:"week",    icon:<Calendar size={18}/>,  label:"Week"},
          {id:"projects",icon:<Folder size={18}/>,   label:"Projects"},
          {id:"archive", icon:<Archive size={18}/>,  label:"Archive"},
          {id:"settings",icon:<Settings size={18}/>, label:"Settings"},
        ].map(item=>{
          const active=view===item.id||(item.id==="projects"&&view==="project_detail");
          return(
            <button key={item.id} onClick={()=>{setView(item.id);setSelectedProjectId(null);}}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",gap:3,padding:"10px 4px",background:"none",border:"none",
                color:active?"#FFFFFF":"rgba(255,255,255,.45)",cursor:"pointer",
                borderTop:active?`2px solid ${T.blue}`:"2px solid transparent",
                transition:"color .15s"}}>
              {item.icon}
              <span style={{fontSize:9,fontWeight:active?700:400,letterSpacing:.3}}>{item.label}</span>
            </button>
          );
        })}
      </div>
      {/* Bottom padding for mobile tab bar */}
      <style>{`@media(max-width:768px){.main-pad{padding-bottom:72px!important;}}`}</style>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({view,setView,tasks,sbStatus}){
  const td=tasks.filter(t=>!t.completed&&t.deadline===today()).length;
  const ip=tasks.filter(t=>t.status==="inprogress").length;
  const nav=[
    [{id:"today",icon:<Zap size={16}/>,label:"Today",badge:td},{id:"tomorrow",icon:<Sunrise size={16}/>,label:"Tomorrow"},{id:"week",icon:<Calendar size={16}/>,label:"This Week"},{id:"all",icon:<Inbox size={16}/>,label:"All Tasks",badge:ip}],
    [{id:"projects",icon:<Folder size={16}/>,label:"Projects"},{id:"gantt",icon:<BarChart3 size={16}/>,label:"Gantt Chart"}],
    [{id:"archive",icon:<Archive size={16}/>,label:"Archive"},{id:"settings",icon:<Settings size={16}/>,label:"Settings"}],
  ];
  const sbC={connected:T.mint,connecting:T.amber,error:T.peach,disconnected:"#64748B"}[sbStatus];
  const sbL={connected:"Supabase sync",connecting:"接続中...",error:"エラー",disconnected:"ローカル保存"}[sbStatus];
  const isActive=(id)=>view===id||(id==="projects"&&view==="project_detail");

  return(
    <div className="sb" style={{width:220,background:T.bgSidebar,display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"2px 0 12px rgba(0,0,0,.08)"}}>
      <div style={{padding:"22px 20px 18px",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,background:`linear-gradient(135deg,${T.blue},${T.lav})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 12px ${T.blue}40`}}>
            <CheckSquare size={15} color="#fff" strokeWidth={2.5}/>
          </div>
          <span className="logotxt" style={{fontFamily:"'Fraunces',serif",fontWeight:700,fontSize:16,color:"#F0EDE8",letterSpacing:-.3}}>TaskMaster</span>
        </div>
      </div>
      <nav style={{flex:1,padding:"14px 10px",overflow:"auto",display:"flex",flexDirection:"column",gap:4}}>
        {nav.map((sec,si)=>(
          <div key={si}>
            {si>0&&<div style={{height:1,background:"rgba(255,255,255,.06)",margin:"6px 4px"}}/>}
            {sec.map(item=>(
              <button key={item.id} className={`navbtn ${isActive(item.id)?"act":""}`} onClick={()=>setView(item.id)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"transparent",border:"none",color:isActive(item.id)?"#F0EDE8":"rgba(255,255,255,.42)",fontSize:13,fontWeight:500,textAlign:"left"}}>
                <span style={{opacity:isActive(item.id)?1:.8}}>{item.icon}</span>
                <span className="nbl" style={{flex:1}}>{item.label}</span>
                {item.badge>0&&<span style={{background:isActive(item.id)?T.blue:"rgba(255,255,255,.1)",color:isActive(item.id)?"#fff":"rgba(255,255,255,.5)",fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:10,fontFamily:"JetBrains Mono,monospace"}}>{item.badge}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sbft" style={{padding:"12px 18px 16px",borderTop:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:sbC,flexShrink:0}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.28)",fontFamily:"JetBrains Mono,monospace"}}>{sbL}</span>
        </div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.18)",fontFamily:"JetBrains Mono,monospace"}}>
          {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",weekday:"short"})}
        </div>
      </div>
    </div>
  );
}

// ── Pomo Bar ──────────────────────────────────────────────────────────────────
function PomoBar({ps,pomo,tasks,onStart,onPause,onSkip,onReset}){
  const{active,mode,elapsed,session,todayCount,linkedId}=ps;
  const lim=(mode==="work"?pomo.workTime:mode==="break"?pomo.breakTime:pomo.longBreakTime)*60;
  const rem=lim-elapsed;
  const min=String(Math.floor(rem/60)).padStart(2,"0"),sec=String(rem%60).padStart(2,"0");
  const prog=elapsed/lim;
  const accent={work:T.blue,break:T.mint,longbreak:T.lav}[mode];
  const modeL={work:"Focus",break:"Break",longbreak:"Long break"}[mode];
  const linkedTask=tasks.find(t=>t.id===linkedId);
  const r=16,circ=2*Math.PI*r;
  return(
    <div style={{background:T.bgCard,borderBottom:`1.5px solid ${T.border}`,padding:"10px 32px",display:"flex",alignItems:"center",gap:18,flexShrink:0,boxShadow:"0 1px 6px rgba(0,0,0,.04)"}}>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{position:"relative",width:42,height:42,flexShrink:0}}>
          <svg width="42" height="42" style={{transform:"rotate(-90deg)"}}>
            <circle cx="21" cy="21" r={r} fill="none" stroke={T.borderLight} strokeWidth="3"/>
            <circle cx="21" cy="21" r={r} fill="none" stroke={accent} strokeWidth="3"
              strokeDasharray={circ} strokeDashoffset={circ*(1-prog)}
              strokeLinecap="round" style={{transition:"stroke-dashoffset 1s linear"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}><Timer size={13} color={accent}/></div>
        </div>
        <div>
          <div style={{fontFamily:"JetBrains Mono,monospace",fontSize:22,fontWeight:500,color:T.text,lineHeight:1}}>{min}:{sec}</div>
          <div style={{fontSize:11,color:T.textMuted,marginTop:2,display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:accent,fontWeight:600}}>{modeL}</span>
            <span>{todayCount}/{pomo.dailyGoal} pomos</span>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:7}}>
        {active
          ?<button className="lhbtn" onClick={onPause} style={{background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"7px 14px",color:T.text,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Pause size={13}/> Pause</button>
          :<button onClick={()=>onStart()} style={{background:accent,border:"none",borderRadius:8,padding:"7px 16px",color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5,boxShadow:`0 3px 10px ${accent}40`}}><Play size={13}/> Start</button>
        }
        <button className="lhbtn" onClick={onSkip}  style={{background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"7px 10px",color:T.textSec}}><SkipForward size={13}/></button>
        <button className="lhbtn" onClick={onReset} style={{background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"7px 10px",color:T.textSec}}><RotateCcw size={13}/></button>
      </div>
      {linkedTask&&(
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",background:T.bg,borderRadius:8,border:`1.5px solid ${T.border}`}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:accent,flexShrink:0}}/>
          <span style={{fontSize:12,color:T.textSec,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{linkedTask.title}</span>
        </div>
      )}
      <div style={{marginLeft:"auto",display:"flex",gap:5,alignItems:"center"}}>
        {Array.from({length:pomo.sessionsBeforeLong}).map((_,i)=>(
          <div key={i} style={{width:8,height:8,borderRadius:"50%",background:i<(session%pomo.sessionsBeforeLong)?accent:T.borderLight,transition:"background .3s",boxShadow:i<(session%pomo.sessionsBeforeLong)?`0 0 6px ${accent}70`:undefined}}/>
        ))}
      </div>
    </div>
  );
}

// ── Task View ─────────────────────────────────────────────────────────────────
function TaskView({view,tasks,allTasks,groups,projects,setTasks,setGroups,onEditTask,onStartPom,doConfirm,searchQ,setSearchQ}){
  const [ntg,setNtg]=useState(null),[ntt,setNtt]=useState("");
  const [showDone,setShowDone]=useState(false);
  const [dragOverTaskId,setDragOverTaskId]=useState(null);
  const [dragTask,setDragTask]=useState(null);
  const [dragOverGroup,setDragOverGroup]=useState(null);
  const [dragGroup,setDragGroup]=useState(null);
  const [dragOverGroupTarget,setDragOverGroupTarget]=useState(null);
  const [showAG,setShowAG]=useState(false),[ngn,setNgn]=useState("");
  const [editGroupId,setEditGroupId]=useState(null);
  const ngComposing=useRef(false);

  const undone=tasks.filter(t=>!t.completed).length;
  const searchFiltered=searchQ.trim()?tasks.filter(t=>t.title.toLowerCase().includes(searchQ.toLowerCase())||(t.notes||"").toLowerCase().includes(searchQ.toLowerCase())):tasks;
  const visibleTasks=view==="all"&&!showDone?searchFiltered.filter(t=>!t.completed):searchFiltered;
  const byG=groups.reduce((a,g)=>{a[g.id]=visibleTasks.filter(t=>t.groupId===g.id).sort((a,b)=>a.order-b.order);return a;},{});
  const ung=visibleTasks.filter(t=>!groups.find(g=>g.id===t.groupId)).sort((a,b)=>a.order-b.order);
  const sortedGroups=[...groups].sort((a,b)=>a.order-b.order);
  const vl={today:"Today",tomorrow:"Tomorrow",week:"This Week",all:"All Tasks"};

  const addQ=(gid)=>{
    if(!ntt.trim())return;
    const dl=view==="today"?today():view==="tomorrow"?tomorrow():today();
    setTasks(ts=>[...ts,{id:uid(),title:ntt.trim(),status:"todo",priority:"medium",deadline:dl,goalTime:"",repeat:"",projectId:null,groupId:gid,subtasks:[],notes:"",links:[],completed:false,archived:false,order:ts.length}]);
    setNtt("");setNtg(null);
  };
  const addG=()=>{
    if(!ngn.trim())return;
    setGroups(gs=>[...gs,{id:uid(),title:ngn.trim(),color:GROUP_COLORS[gs.length%GROUP_COLORS.length],order:gs.length}]);
    setNgn("");setShowAG(false);
  };
  const delG=(id)=>doConfirm("このグループを削除しますか？（タスクは未分類になります）",()=>{
    setGroups(gs=>gs.filter(g=>g.id!==id));
    setTasks(ts=>ts.map(t=>t.groupId===id?{...t,groupId:null}:t));
  });

  const handleTaskDS=(e,t)=>{setDragTask(t);e.dataTransfer.effectAllowed="move";};
  const handleTaskDO=(e,id)=>{if(!dragGroup){e.preventDefault();setDragOverGroup(id);}};
  const handleTaskDrop=(e,id)=>{e.preventDefault();setDragOverGroup(null);setDragOverTaskId(null);
    if(!dragTask)return;
    setTasks(ts=>{
      const isTask=ts.some(t=>t.id===id);
      // Drop on group header → just move to that group
      if(!isTask) return ts.map(t=>t.id===dragTask.id?{...t,groupId:id}:t);
      const target=ts.find(t=>t.id===id);
      if(!target||target.id===dragTask.id)return ts;
      // Drop on task → reorder within target's group
      const gid=target.groupId;
      // Build ordered list of that group excluding the dragged task
      const inGroup=ts
        .filter(t=>t.groupId===gid&&t.id!==dragTask.id)
        .sort((a,b)=>a.order-b.order);
      // Insert dragged task before target
      const insertAt=inGroup.findIndex(t=>t.id===id);
      inGroup.splice(insertAt,0,dragTask);
      // Assign fresh order values
      const orderMap={};
      inGroup.forEach((t,i)=>{orderMap[t.id]=i;});
      // Apply: update groupId and order for all affected tasks
      return ts.map(t=>{
        if(t.id===dragTask.id) return{...t,groupId:gid,order:orderMap[t.id]??t.order};
        if(orderMap[t.id]!==undefined) return{...t,order:orderMap[t.id]};
        return t;
      });
    });
    setDragTask(null);
  };
  const handleGroupDS=(e,g)=>{e.stopPropagation();setDragGroup(g);e.dataTransfer.effectAllowed="move";};
  const handleGroupDO=(e,id)=>{if(dragGroup){e.preventDefault();e.stopPropagation();setDragOverGroupTarget(id);}};
  const handleGroupDrop=(e,targetId)=>{
    e.preventDefault();e.stopPropagation();
    if(dragGroup&&dragGroup.id!==targetId){
      setGroups(gs=>{
        const s=[...gs].sort((a,b)=>a.order-b.order);
        const fi=s.findIndex(g=>g.id===dragGroup.id),ti=s.findIndex(g=>g.id===targetId);
        if(fi<0||ti<0)return gs;
        const m=s.splice(fi,1)[0];s.splice(ti,0,m);
        return s.map((g,i)=>({...g,order:i}));
      });
    }
    setDragGroup(null);setDragOverGroupTarget(null);
  };

  const editingGroup=editGroupId?groups.find(g=>g.id===editGroupId):null;

  return(
    <div className="fi">
      <div style={{marginBottom:28}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
              <h1 style={{fontFamily:"'Fraunces',serif",fontSize:30,fontWeight:700,letterSpacing:-.5,color:T.text,lineHeight:1}}>{vl[view]||"Tasks"}</h1>
              {undone>0&&<span style={{color:T.blue,fontWeight:700,background:T.blueBg,padding:"3px 10px",borderRadius:20,fontSize:12}}>{undone} remaining</span>}
            </div>
            <div style={{fontSize:12,color:T.textMuted,marginTop:6}}>{new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:4}}>
            {view==="all"&&<button onClick={()=>setShowDone(v=>!v)} className="lhbtn" style={{background:showDone?T.blueBg:T.bgCard,border:`1.5px solid ${showDone?T.blue:T.border}`,borderRadius:9,padding:"8px 14px",color:showDone?T.blue:T.textSec,fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><CheckCircle2 size={13}/> {showDone?"完了を隠す":"完了を表示"}</button>}
            <button onClick={()=>setShowAG(v=>!v)} className="lhbtn" style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:9,padding:"8px 14px",color:T.textSec,fontSize:12,fontWeight:500,display:"flex",alignItems:"center",gap:6}}><Hash size={13}/> Add Group</button>
            <button onClick={()=>onEditTask("new")} style={{background:T.blue,border:"none",borderRadius:9,padding:"8px 18px",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,boxShadow:`0 4px 14px ${T.blue}35`}}><Plus size={14}/> Add Task</button>
          </div>
        </div>
        {/* Search bar */}
        <div style={{position:"relative"}}>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
            placeholder="タスクを検索..."
            style={{width:"100%",background:T.bgCard,border:`1.5px solid ${searchQ?T.blue:T.border}`,borderRadius:9,
              padding:"8px 32px 8px 12px",color:T.text,fontSize:13,outline:"none",transition:"border-color .15s"}}/>
          {searchQ&&<button onClick={()=>setSearchQ("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.textMuted,cursor:"pointer",display:"flex",padding:2}}><X size={13}/></button>}
        </div>
      </div>

      {showAG&&(
        <div style={{display:"flex",gap:8,marginBottom:18}}>
          <input value={ngn} onChange={e=>setNgn(e.target.value)}
            onCompositionStart={()=>{ngComposing.current=true;}} onCompositionEnd={()=>{ngComposing.current=false;}}
            onKeyDown={e=>{if(e.key==="Enter"&&!ngComposing.current)addG();if(e.key==="Escape")setShowAG(false);}}
            placeholder="Group name..." autoFocus
            style={{flex:1,background:T.bgCard,border:`1.5px solid ${T.blue}`,borderRadius:9,padding:"9px 14px",color:T.text,fontSize:13}}/>
          <button onClick={addG} style={{background:T.blue,border:"none",borderRadius:9,padding:"9px 18px",color:"#fff",fontWeight:700,fontSize:13,boxShadow:`0 3px 10px ${T.blue}30`}}>Add</button>
          <button onClick={()=>setShowAG(false)} className="lhbtn" style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:9,padding:"9px 12px",color:T.textSec}}><X size={14}/></button>
        </div>
      )}

      {/* Week view: render by day instead of group */}
      {view==="week"&&(()=>{
        const days=getWeekDays();
        return days.map(d=>{
          const dayTasks=visibleTasks.filter(t=>t.deadline===d).sort((a,b)=>a.order-b.order);
          if(dayTasks.length===0)return null;
          const label=d===today()?"Today":d===tomorrow()?"Tomorrow":
            new Date(d+"T00:00:00").toLocaleDateString("ja-JP",{month:"short",day:"numeric",weekday:"short"});
          return(
            <div key={d} style={{marginBottom:24}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:11,fontWeight:700,color:d===today()?T.blue:T.textSec,
                  letterSpacing:.5,textTransform:"uppercase"}}>{label}</span>
                <span style={{fontSize:11,color:T.textMuted,fontFamily:"JetBrains Mono,monospace"}}>{dayTasks.filter(t=>t.completed).length}/{dayTasks.length}</span>
                <div style={{height:1,flex:1,background:T.borderLight}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {dayTasks.map(t=>(
                  <TRow key={t.id} task={t} projects={projects}
                    onDS={handleTaskDS} onToggle={id=>setTasks(ts=>{
                      const t2=ts.find(x=>x.id===id);if(!t2)return ts;
                      const nowDone=!t2.completed;
                      const updated=ts.map(x=>x.id===id?{...x,completed:nowDone,status:nowDone?"done":"todo"}:x);
                      if(nowDone&&t2.repeat){const nd=nextRepeatDate(t2.deadline,t2.repeat);if(nd)return[...updated,{...t2,id:uid(),deadline:nd,completed:false,status:"todo",order:ts.length}];}
                      return updated;
                    })}
                    onEdit={onEditTask}
                    onDel={id=>doConfirm("このタスクを削除しますか？",()=>setTasks(ts=>ts.filter(t=>t.id!==id)))}
                    onArc={id=>doConfirm("このタスクをアーカイブしますか？",()=>setTasks(ts=>ts.map(t=>t.id===id?{...t,archived:true}:t)))}
                    onPom={onStartPom}/>
                ))}
              </div>
            </div>
          );
        });
      })()}

      {/* Normal group view for non-week views */}
      {view!=="week"&&sortedGroups.map(g=>(
        <TGroup key={g.id} group={g} tasks={byG[g.id]||[]} projects={projects}
          isDragOver={dragOverGroup===g.id} isGroupDragOver={dragOverGroupTarget===g.id}
          onTaskDS={handleTaskDS} onTaskDO={handleTaskDO} onTaskDrop={handleTaskDrop}
          onGroupDS={handleGroupDS} onGroupDO={handleGroupDO} onGroupDrop={handleGroupDrop}
          dragOverTaskId={dragOverTaskId} setDragOverTaskId={setDragOverTaskId}
          onToggle={id=>setTasks(ts=>{
            const t=ts.find(x=>x.id===id);if(!t)return ts;
            const nowDone=!t.completed;
            const updated=ts.map(x=>x.id===id?{...x,completed:nowDone,status:nowDone?"done":"todo"}:x);
            if(nowDone&&t.repeat){
              const nd=nextRepeatDate(t.deadline,t.repeat);
              if(nd) return [...updated,{...t,id:uid(),deadline:nd,completed:false,status:"todo",order:ts.length}];
            }
            return updated;
          })}
          onEdit={onEditTask}
          onDel={id=>doConfirm("このタスクを削除しますか？",()=>setTasks(ts=>ts.filter(t=>t.id!==id)))}
          onArc={id=>doConfirm("このタスクをアーカイブしますか？",()=>setTasks(ts=>ts.map(t=>t.id===id?{...t,archived:true}:t)))}
          onPom={onStartPom} onMoveToday={id=>setTasks(ts=>ts.map(t=>t.id===id?{...t,deadline:today()}:t))} onDelG={delG} onEditG={id=>setEditGroupId(id)}
          ntg={ntg} setNtg={setNtg} ntt={ntt} setNtt={setNtt} addQ={addQ}
        />
      ))}

      {view!=="week"&&ung.length>0&&(
        <TGroup group={{id:null,title:"Ungrouped",color:T.textMuted}} tasks={ung} projects={projects}
          isDragOver={dragOverGroup===null} isGroupDragOver={false}
          onTaskDS={handleTaskDS} onTaskDO={handleTaskDO} onTaskDrop={handleTaskDrop}
          onGroupDS={()=>{}} onGroupDO={()=>{}} onGroupDrop={()=>{}}
          dragOverTaskId={dragOverTaskId} setDragOverTaskId={setDragOverTaskId}
          onToggle={id=>setTasks(ts=>{
            const t=ts.find(x=>x.id===id);if(!t)return ts;
            const nowDone=!t.completed;
            const updated=ts.map(x=>x.id===id?{...x,completed:nowDone,status:nowDone?"done":"todo"}:x);
            if(nowDone&&t.repeat){
              const nd=nextRepeatDate(t.deadline,t.repeat);
              if(nd) return [...updated,{...t,id:uid(),deadline:nd,completed:false,status:"todo",order:ts.length}];
            }
            return updated;
          })}
          onEdit={onEditTask}
          onDel={id=>doConfirm("このタスクを削除しますか？",()=>setTasks(ts=>ts.filter(t=>t.id!==id)))}
          onArc={id=>doConfirm("このタスクをアーカイブしますか？",()=>setTasks(ts=>ts.map(t=>t.id===id?{...t,archived:true}:t)))}
          onPom={onStartPom} onMoveToday={id=>setTasks(ts=>ts.map(t=>t.id===id?{...t,deadline:today()}:t))} onDelG={()=>{}} onEditG={()=>{}}
          ntg={ntg} setNtg={setNtg} ntt={ntt} setNtt={setNtt} addQ={addQ}
        />
      )}

      {tasks.length===0&&(
        <div style={{textAlign:"center",padding:"80px 20px",color:T.textMuted}}>
          <CheckSquare size={36} style={{margin:"0 auto 14px",opacity:.3}}/>
          <div style={{fontSize:15,fontWeight:600,color:T.textSec,marginBottom:6}}>No tasks here</div>
          <div style={{fontSize:13}}>Add a task with the button above</div>
        </div>
      )}

      {/* Group edit modal */}
      {editingGroup&&(
        <GroupEditModal group={editingGroup}
          onSave={g=>{ setGroups(gs=>gs.map(x=>x.id===g.id?g:x)); setEditGroupId(null); }}
          onClose={()=>setEditGroupId(null)}/>
      )}
    </div>
  );
}

// ── Group Edit Modal ──────────────────────────────────────────────────────────
function GroupEditModal({group,onSave,onClose}){
  const [form,setForm]=useState({...group});
  const inp={background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:9,padding:"9px 13px",color:T.text,fontSize:13,width:"100%"};
  return(
    <div className="modal" onClick={onClose}>
      <div className="fi" onClick={e=>e.stopPropagation()} style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:16,padding:26,width:"min(380px,95vw)",boxShadow:"0 20px 60px rgba(0,0,0,.14)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <h3 style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,color:T.text}}>Edit Group</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer"}}><X size={18}/></button>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:T.textMuted,marginBottom:5,textTransform:"uppercase",letterSpacing:.5,fontWeight:600}}>Group Name</div>
          <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={inp}/>
        </div>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:11,color:T.textMuted,marginBottom:8,textTransform:"uppercase",letterSpacing:.5,fontWeight:600}}>Color</div>
          <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
            {GROUP_COLORS.map(c=>(
              <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                style={{width:28,height:28,borderRadius:"50%",background:c,border:form.color===c?`3px solid ${T.text}`:"3px solid transparent",cursor:"pointer",transition:"transform .15s",transform:form.color===c?"scale(1.15)":"scale(1)"}}/>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} className="lhbtn" style={{padding:"9px 18px",background:"transparent",border:`1.5px solid ${T.border}`,borderRadius:8,color:T.textSec,fontSize:13}}>Cancel</button>
          <button onClick={()=>{if(!form.title?.trim())return;onSave(form);}} style={{padding:"9px 22px",background:form.title?.trim()?T.blue:T.textMuted,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,boxShadow:form.title?.trim()?`0 4px 14px ${T.blue}35`:"none",cursor:form.title?.trim()?"pointer":"not-allowed"}}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Task Group ────────────────────────────────────────────────────────────────
function TGroup({group,tasks,projects,isDragOver,isGroupDragOver,
  onTaskDS,onTaskDO,onTaskDrop,onGroupDS,onGroupDO,onGroupDrop,
  dragOverTaskId,setDragOverTaskId,
  onToggle,onEdit,onDel,onArc,onPom,onMoveToday,onDelG,onEditG,ntg,setNtg,ntt,setNtt,addQ}){
  const [coll,setColl]=useState(false);
  const done=tasks.filter(t=>t.completed).length;
  const addComposing=useRef(false);

  return(
    <div style={{marginBottom:24,opacity:isGroupDragOver?.7:1,transition:"opacity .15s"}}
      onDragOver={e=>{onTaskDO(e,group.id);onGroupDO(e,group.id);}}
      onDrop={e=>{onTaskDrop(e,group.id);onGroupDrop(e,group.id);}}>

      {/* Group header */}
      <div draggable={!!group.id} onDragStart={e=>onGroupDS(e,group)}
        style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"4px 4px",cursor:group.id?"grab":"default"}}>
        {group.id&&<GripVertical size={13} color={T.textMuted} style={{flexShrink:0,opacity:.5}}/>}
        <button onClick={()=>setColl(c=>!c)} style={{background:"none",border:"none",color:T.textMuted,display:"flex",alignItems:"center",padding:2,borderRadius:4,cursor:"pointer"}}>
          {coll?<ChevronRight size={14}/>:<ChevronDown size={14}/>}
        </button>
        <div style={{width:9,height:9,borderRadius:"50%",background:group.color,flexShrink:0}}/>
        <span style={{fontSize:11,fontWeight:700,color:T.textSec,letterSpacing:.5,textTransform:"uppercase"}}>{group.title}</span>
        <span style={{fontSize:11,color:T.textMuted,fontFamily:"JetBrains Mono,monospace"}}>{done}/{tasks.length}</span>
        {tasks.length>0&&<div style={{height:3,flex:1,background:T.borderLight,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${done/tasks.length*100}%`,background:group.color,borderRadius:2,transition:"width .4s ease"}}/></div>}
        {group.id&&(
          <div style={{display:"flex",gap:2}}>
            <button onClick={()=>{setNtg(group.id);setNtt("");}} className="lhbtn" style={{background:"none",border:"none",color:T.textMuted,padding:"3px 6px",borderRadius:5,display:"flex",alignItems:"center",cursor:"pointer"}}><Plus size={13}/></button>
            <button onClick={()=>onEditG(group.id)} className="lhbtn" style={{background:"none",border:"none",color:T.textMuted,padding:"3px 6px",borderRadius:5,display:"flex",alignItems:"center",cursor:"pointer"}}><Edit2 size={12}/></button>
            <button onClick={()=>onDelG(group.id)} className="lhbtn" style={{background:"none",border:"none",color:T.textMuted,padding:"3px 6px",borderRadius:5,cursor:"pointer"}}><X size={12}/></button>
          </div>
        )}
      </div>

      {/* Task cards */}
      {!coll&&(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {tasks.map(t=>(
            <TRow key={t.id} task={t} projects={projects}
              onDS={onTaskDS} onToggle={onToggle} onEdit={onEdit}
              onDel={onDel} onArc={onArc} onPom={onPom}
              onMoveToday={onMoveToday}
              onDrop={onTaskDrop}
              isDragOverThis={dragOverTaskId===t.id}
              onDragOver={e=>{e.preventDefault();setDragOverTaskId(t.id);}}
              onDragLeave={()=>setDragOverTaskId(null)}/>
          ))}
          {tasks.length===0&&!ntg&&(
            <div style={{padding:"12px 16px",color:T.textMuted,fontSize:12,textAlign:"center",background:T.bgCard,borderRadius:10,border:`1.5px dashed ${T.borderLight}`}}>No tasks</div>
          )}
          {/* Add task */}
          <div style={{borderRadius:10,overflow:"hidden"}}>
            {ntg===group.id?(
              <div style={{display:"flex",gap:7,background:T.bgCard,border:`1.5px solid ${T.blue}`,borderRadius:10,padding:"8px 10px"}}>
                <input value={ntt} onChange={e=>setNtt(e.target.value)}
                  onCompositionStart={()=>{addComposing.current=true;}} onCompositionEnd={()=>{addComposing.current=false;}}
                  onKeyDown={e=>{if(e.key==="Enter"&&!addComposing.current)addQ(group.id);if(e.key==="Escape")setNtg(null);}}
                  placeholder="Task name, then press Enter..." autoFocus
                  style={{flex:1,background:"transparent",border:"none",outline:"none",color:T.text,fontSize:13}}/>
                <button onClick={()=>addQ(group.id)} style={{background:T.blue,border:"none",borderRadius:7,padding:"5px 12px",color:"#fff",fontWeight:700,fontSize:12}}>Add</button>
                <button onClick={()=>setNtg(null)} className="lhbtn" style={{background:"none",border:"none",padding:"5px 7px",color:T.textSec,cursor:"pointer",borderRadius:6,display:"flex"}}><X size={13}/></button>
              </div>
            ):(
              <button onClick={()=>{setNtg(group.id);setNtt("");}} className="lhbtn"
                style={{width:"100%",background:"transparent",border:`1.5px dashed ${T.borderLight}`,borderRadius:10,padding:"8px",color:T.textMuted,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:5,cursor:"pointer"}}>
                <Plus size={13}/> Add task
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────
function TRow({task,projects,onDS,onDrop,onToggle,onEdit,onDel,onArc,onPom,onMoveToday,isDragOverThis,onDragOver,onDragLeave}){
  const[exp,setExp]=useState(false);
  const[menuOpen,setMenuOpen]=useState(false);
  const menuRef=useRef(null);
  const p=PRIO[task.priority]||PRIO.medium,s=STATUS[task.status]||STATUS.todo;
  const proj=projects.find(x=>x.id===task.projectId);
  const overdue=isOverdue(task.deadline)&&!task.completed;
  const hs=task.subtasks?.length>0,ds=task.subtasks?.filter(x=>x.done).length||0;

  useEffect(()=>{
    if(!menuOpen)return;
    const handler=(e)=>{if(menuRef.current&&!menuRef.current.contains(e.target))setMenuOpen(false);};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[menuOpen]);

  return(
    <>
      <div className="tr" draggable onDragStart={e=>onDS(e,task)}
        onDragOver={onDragOver} onDragLeave={onDragLeave}
        onDrop={e=>{if(onDrop)onDrop(e,task.id);}}
        style={{background:T.bgCard,border:`1.5px solid ${isDragOverThis?T.blue:T.border}`,borderRadius:12,
          padding:"11px 14px",display:"flex",alignItems:"center",gap:10,
          boxShadow:"0 1px 4px rgba(0,0,0,.04)",cursor:"grab",
          opacity:task.completed?.5:1,transition:"box-shadow .15s,border-color .15s"}}>

        {/* Grip + Check */}
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          <GripVertical size={11} color={T.textMuted} style={{cursor:"grab",opacity:.5}}/>
          <button onClick={()=>onToggle(task.id)}
            style={{background:"none",border:"none",padding:0,cursor:"pointer",display:"flex",color:task.completed?T.mint:T.textMuted}}>
            {task.completed?<CheckCircle2 size={17} color={T.mint}/>:<Circle size={17}/>}
          </button>
        </div>

        {/* Subtask toggle */}
        {hs&&(
          <button onClick={()=>setExp(e=>!e)}
            style={{background:"none",border:"none",color:T.textMuted,padding:"2px 0",cursor:"pointer",flexShrink:0,display:"flex"}}>
            {exp?<ChevronDown size={13}/>:<ChevronRight size={13}/>}
          </button>
        )}

        {/* Content */}
        <div style={{flex:1,minWidth:0}}>
          {/* Title */}
          <span onClick={()=>onEdit(task)} style={{
            fontSize:13,fontWeight:600,
            color:task.completed?T.textMuted:T.text,
            textDecoration:task.completed?"line-through":"none",
            cursor:"pointer",
            display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",
            overflow:"hidden",wordBreak:"break-word",lineHeight:1.4,
          }}>{task.title}</span>

          {/* Meta row */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:5,flexWrap:"wrap"}}>
            {task.deadline&&(
              <span style={{display:"flex",alignItems:"center",gap:3,fontSize:11,
                color:overdue?T.peach:T.textMuted,fontFamily:"JetBrains Mono,monospace"}}>
                {overdue&&<AlertTriangle size={9}/>}{fmtDate(task.deadline)}
              </span>
            )}
            {task.goalTime&&<span style={{fontSize:11,color:T.textMuted,fontFamily:"JetBrains Mono,monospace"}}>{task.goalTime}</span>}
            <span style={{fontSize:10,color:p.color,background:p.bg,padding:"1px 6px",borderRadius:8,fontWeight:700}}>{p.label}</span>
            <span style={{fontSize:10,color:s.color,fontWeight:600}}>{s.label}</span>
            {proj&&<span style={{fontSize:10,color:proj.color||T.blue,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90}}>{proj.title}</span>}
            {task.repeat&&<RefreshCw size={9} color={T.textMuted}/>}
            {task.notes&&<AlignLeft size={9} color={T.textMuted}/>}
            {hs&&<span style={{fontSize:10,color:T.textMuted,fontFamily:"JetBrains Mono,monospace"}}>{ds}/{task.subtasks.length}</span>}
          </div>
        </div>

        {/* Actions */}
        <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
          {task.links?.length>0&&(()=>{const lk=normLink(task.links[0]);return(
            <a href={lk.url} target="_blank" rel="noopener noreferrer"
              style={{display:"flex",alignItems:"center",gap:3,background:T.mintBg,border:`1px solid ${T.mint}30`,
                borderRadius:6,color:T.mint,padding:"4px 8px",textDecoration:"none",fontSize:11,fontWeight:600,flexShrink:0,
                maxWidth:72,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}
              title={lk.url}>
              <Link2 size={10}/><span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{lk.label||"Link"}</span>
            </a>
          );})()}
          <button onClick={()=>onPom(task.id)} title="Start pomodoro"
            style={{background:T.blueBg,border:`1px solid ${T.blue}30`,borderRadius:6,
              color:T.blue,padding:"5px 6px",display:"flex",alignItems:"center",cursor:"pointer"}}>
            <Play size={11} strokeWidth={2.5}/>
          </button>
          <div ref={menuRef} style={{position:"relative"}}>
            <button onClick={e=>{e.stopPropagation();setMenuOpen(o=>!o);}} className="lhbtn"
              style={{background:"none",border:"none",color:T.textMuted,padding:"5px 5px",borderRadius:5,cursor:"pointer",display:"flex"}}>
              <MoreHorizontal size={14}/>
            </button>
            {menuOpen&&(
              <div style={{position:"absolute",right:0,top:"calc(100% + 4px)",background:T.bgCard,
                border:`1.5px solid ${T.border}`,borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,.13)",
                zIndex:100,minWidth:130,overflow:"hidden"}}>
                <button onClick={()=>{setMenuOpen(false);onEdit(task);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"none",border:"none",color:T.text,fontSize:13,cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <Edit2 size={13} color={T.blue}/> Edit
                </button>
                {task.deadline!==today()&&onMoveToday&&(
                  <button onClick={()=>{setMenuOpen(false);onMoveToday(task.id);}}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"none",border:"none",color:T.text,fontSize:13,cursor:"pointer"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bg} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <Zap size={13} color={T.amber}/> 今日に移動
                  </button>
                )}
                <button onClick={()=>{setMenuOpen(false);onArc(task.id);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"none",border:"none",color:T.text,fontSize:13,cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.bg} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <Archive size={13} color={T.amber}/> Archive
                </button>
                <div style={{height:1,background:T.borderLight}}/>
                <button onClick={()=>{setMenuOpen(false);onDel(task.id);}}
                  style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"none",border:"none",color:T.peach,fontSize:13,cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background=T.peachBg} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                  <Trash2 size={13}/> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtasks */}
      {exp&&hs&&(
        <div style={{marginTop:-2,background:`${T.blue}05`,border:`1.5px solid ${T.border}`,borderTop:"none",borderRadius:"0 0 10px 10px",padding:"6px 14px 8px 44px"}}>
          {task.subtasks.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:9,padding:"5px 0",borderBottom:`1px solid ${T.borderLight}`}}>
              <input type="checkbox" checked={s.done} readOnly/>
              <span style={{fontSize:12,color:s.done?T.textMuted:T.textSec,textDecoration:s.done?"line-through":"none"}}>{s.title}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Task Modal ────────────────────────────────────────────────────────────────
function TaskModal({task,projects,groups,onSave,onClose}){
  const [form,setForm]=useState(task||{title:"",status:"todo",priority:"medium",deadline:today(),goalTime:"",repeat:"",projectId:"",groupId:groups[0]?.id||"",subtasks:[],notes:"",links:[]});
  const [ns,setNs]=useState(""),[nlUrl,setNlUrl]=useState(""),[nlLabel,setNlLabel]=useState("");
  const subC=useRef(false),linkC=useRef(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const inp={background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:9,padding:"9px 13px",color:T.text,fontSize:13,width:"100%"};
  const lbl={fontSize:11,color:T.textMuted,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:.5,fontWeight:600};
  const addSub=()=>{if(!ns.trim())return;set("subtasks",[...(form.subtasks||[]),{id:uid(),title:ns.trim(),done:false}]);setNs("");};
  const addLink=()=>{if(!nlUrl.trim())return;set("links",[...(form.links||[]),{url:nlUrl.trim(),label:nlLabel.trim()}]);setNlUrl("");setNlLabel("");};
  return(
    <div className="modal" onClick={onClose}>
      <div className="fi" onClick={e=>e.stopPropagation()} style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:18,padding:30,width:"min(700px,95vw)",maxHeight:"90vh",overflow:"auto",boxShadow:"0 30px 80px rgba(0,0,0,.14)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
          <h2 style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:T.text}}>{task?"Edit Task":"New Task"}</h2>
          <button onClick={onClose} className="lhbtn" style={{background:"none",border:"none",color:T.textMuted,borderRadius:6,padding:4,cursor:"pointer"}}><X size={18}/></button>
        </div>
        <div style={{marginBottom:16}}>
          <label style={lbl}>Task Name</label>
          <input value={form.title} onChange={e=>set("title",e.target.value)} style={{...inp,fontSize:15,fontWeight:600}} placeholder="Task name..."/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
          <div><label style={lbl}>Status</label><select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label style={lbl}>Priority</label><select value={form.priority} onChange={e=>set("priority",e.target.value)} style={inp}>{Object.entries(PRIO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label style={lbl}>Repeat</label><select value={form.repeat} onChange={e=>set("repeat",e.target.value)} style={inp}>{REPEAT_OPTS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
          <div><label style={lbl}>Due Date</label><input type="date" value={form.deadline} onChange={e=>set("deadline",e.target.value)} style={inp}/></div>
          <div><label style={lbl}>Goal Time</label><input type="time" value={form.goalTime} onChange={e=>set("goalTime",e.target.value)} style={inp}/></div>
          <div><label style={lbl}>Group</label><select value={form.groupId||""} onChange={e=>set("groupId",e.target.value||null)} style={inp}><option value="">Ungrouped</option>{groups.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={lbl}>Project</label>
          <select value={form.projectId||""} onChange={e=>set("projectId",e.target.value||null)} style={inp}><option value="">None</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select>
        </div>
        <div style={{marginBottom:16}}>
          <label style={lbl}>Subtasks</label>
          <div style={{background:T.bg,borderRadius:9,border:`1.5px solid ${T.border}`,overflow:"hidden"}}>
            {(form.subtasks||[]).map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderBottom:`1px solid ${T.borderLight}`}}>
                <input type="checkbox" checked={s.done} onChange={()=>set("subtasks",form.subtasks.map(x=>x.id===s.id?{...x,done:!x.done}:x))}/>
                <span style={{flex:1,fontSize:13,color:s.done?T.textMuted:T.text,textDecoration:s.done?"line-through":"none"}}>{s.title}</span>
                <button onClick={()=>set("subtasks",form.subtasks.filter(x=>x.id!==s.id))} style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer",display:"flex"}}><X size={12}/></button>
              </div>
            ))}
            <div style={{display:"flex"}}>
              <input value={ns} onChange={e=>setNs(e.target.value)}
                onCompositionStart={()=>{subC.current=true;}} onCompositionEnd={()=>{subC.current=false;}}
                onKeyDown={e=>{if(e.key==="Enter"&&!subC.current)addSub();}}
                placeholder="Add subtask..." style={{flex:1,background:"transparent",border:"none",padding:"9px 12px",color:T.text,fontSize:13,outline:"none"}}/>
              <button onClick={addSub} style={{background:"none",border:"none",borderLeft:`1px solid ${T.borderLight}`,color:T.blue,padding:"0 14px",cursor:"pointer",display:"flex",alignItems:"center"}}><Plus size={14}/></button>
            </div>
          </div>
        </div>
        <div style={{marginBottom:16}}>
          <label style={lbl}>Notes / Steps</label>
          <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} style={{...inp,height:90,resize:"vertical"}} placeholder="Details, steps, etc..."/>
        </div>
        <div>
          <label style={lbl}>Reference Links</label>
          {(form.links||[]).map((lk,i)=>{const l=normLink(lk);return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${T.borderLight}`}}>
              <a href={l.url} target="_blank" rel="noopener noreferrer"
                style={{display:"flex",alignItems:"center",gap:5,background:T.mintBg,border:`1px solid ${T.mint}30`,borderRadius:6,padding:"3px 9px",color:T.mint,fontSize:12,fontWeight:600,textDecoration:"none",flexShrink:0,maxWidth:120,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}
                title={l.url}>
                <Link2 size={11}/>{l.label||"Link"}
              </a>
              <span style={{flex:1,fontSize:11,color:T.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.url}</span>
              <button onClick={()=>set("links",form.links.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer",display:"flex"}}><X size={12}/></button>
            </div>
          );})}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:6,marginTop:8}}>
            <input value={nlUrl} onChange={e=>setNlUrl(e.target.value)}
              onCompositionStart={()=>{linkC.current=true;}} onCompositionEnd={()=>{linkC.current=false;}}
              onKeyDown={e=>{if(e.key==="Enter"&&!linkC.current&&nlUrl.trim())addLink();}}
              placeholder="https://..." style={{...inp}}/>
            <input value={nlLabel} onChange={e=>setNlLabel(e.target.value)}
              onCompositionStart={()=>{linkC.current=true;}} onCompositionEnd={()=>{linkC.current=false;}}
              onKeyDown={e=>{if(e.key==="Enter"&&!linkC.current&&nlUrl.trim())addLink();}}
              placeholder="ボタン名（省略可）" style={{...inp}}/>
            <button onClick={addLink} style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:9,padding:"9px 14px",color:T.textSec,fontWeight:600,fontSize:13,cursor:"pointer"}}>+</button>
          </div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:24,paddingTop:20,borderTop:`1px solid ${T.borderLight}`}}>
          <button onClick={onClose} className="lhbtn" style={{padding:"10px 22px",background:"transparent",border:`1.5px solid ${T.border}`,borderRadius:9,color:T.textSec,fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>onSave(form)} style={{padding:"10px 26px",background:T.blue,border:"none",borderRadius:9,color:"#fff",fontSize:13,fontWeight:700,boxShadow:`0 4px 14px ${T.blue}35`,cursor:"pointer"}}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Project View ──────────────────────────────────────────────────────────────
function ProjectView({projects,tasks,setProjects,setTasks,onEditProj,onEditTask,doConfirm,onOpenDetail}){
  const roots=projects.filter(p=>!p.parentId).sort((a,b)=>a.order-b.order);
  const toggle=id=>setProjects(ps=>ps.map(p=>p.id===id?{...p,expanded:!p.expanded}:p));
  const delP=id=>doConfirm("このプロジェクトを削除しますか？",()=>{
    setProjects(ps=>ps.filter(p=>p.id!==id&&p.parentId!==id));
    setTasks(ts=>ts.map(t=>t.projectId===id?{...t,projectId:null}:t));
  });
  const getProg=id=>{const pt=tasks.filter(t=>t.projectId===id);return pt.length?Math.round(pt.filter(t=>t.completed).length/pt.length*100):0;};
  const handleAddTask=proj=>onEditTask({id:null,title:"",status:"todo",priority:"medium",deadline:today(),goalTime:"",repeat:"",projectId:proj.id,groupId:null,subtasks:[],notes:"",links:[],completed:false,archived:false});

  const Card=({proj,depth=0})=>{
    const ch=projects.filter(p=>p.parentId===proj.id).sort((a,b)=>a.order-b.order);
    const pt=tasks.filter(t=>t.projectId===proj.id),prog=getProg(proj.id);
    const pi=PRIO[proj.priority]||PRIO.medium,si=STATUS[proj.status]||STATUS.todo;
    const period=proj.startDate&&proj.endDate?`${fmtDateShort(proj.startDate)} → ${fmtDateShort(proj.endDate)}`:proj.endDate?`〜 ${fmtDateShort(proj.endDate)}`:"";
    return(
      <div style={{marginLeft:depth*24,marginBottom:10}}>
        <div style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:14,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
          <div style={{height:3,background:T.borderLight}}><div style={{height:"100%",width:`${prog}%`,background:proj.color||T.blue,transition:"width .5s ease"}}/></div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px"}}>
            <button onClick={()=>toggle(proj.id)} style={{background:"none",border:"none",color:T.textMuted,padding:0,cursor:"pointer",display:"flex"}}>{proj.expanded?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</button>
            <div style={{width:10,height:10,borderRadius:"50%",background:proj.color||T.blue,flexShrink:0}}/>
            <div style={{flex:1,overflow:"hidden",cursor:"pointer"}} onClick={()=>onOpenDetail(proj.id)}>
              <div style={{fontWeight:700,fontSize:14,color:T.blue,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:"underline",textDecorationColor:`${T.blue}50`}}>{proj.title}</div>
              <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{pt.length} tasks · {pt.filter(t=>t.completed).length} done{period&&` · ${period}`}</div>
            </div>
            <span style={{fontSize:11,color:pi.color,background:pi.bg,padding:"2px 8px",borderRadius:10,fontWeight:600,flexShrink:0}}>{pi.label}</span>
            <span style={{fontSize:11,color:si.color,fontWeight:500,flexShrink:0}}>{si.label}</span>
            <span style={{fontFamily:"JetBrains Mono,monospace",fontSize:13,fontWeight:700,color:prog===100?T.mint:T.blue,flexShrink:0}}>{prog}%</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>onEditProj(proj)} className="lhbtn" style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,color:T.textMuted,padding:"5px 7px",display:"flex",cursor:"pointer"}}><Edit2 size={12}/></button>
              <button onClick={()=>delP(proj.id)} className="lhbtn" style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,color:T.textMuted,padding:"5px 7px",display:"flex",cursor:"pointer"}}><Trash2 size={12}/></button>
            </div>
          </div>
          {proj.expanded&&(
            <div style={{padding:"0 18px 16px",borderTop:`1px solid ${T.borderLight}`,paddingTop:14}}>
              {proj.notes&&<p style={{fontSize:12,color:T.textSec,marginBottom:12,lineHeight:1.7}}>{proj.notes}</p>}
              {pt.length>0&&(
                <div style={{marginBottom:14}}>
                  {pt.slice(0,4).map(t=>(
                    <div key={t.id} style={{display:"flex",alignItems:"center",gap:9,padding:"5px 0",borderBottom:`1px solid ${T.borderLight}`}}>
                      {t.completed?<CheckCircle2 size={13} color={T.mint}/>:<Circle size={13} color={T.textMuted}/>}
                      <span onClick={()=>onEditTask(t)} style={{fontSize:12,color:t.completed?T.textMuted:T.textSec,flex:1,cursor:"pointer"}}>{t.title}</span>
                      <span style={{fontSize:10,color:T.textMuted,fontFamily:"JetBrains Mono,monospace"}}>{fmtDate(t.deadline)}</span>
                    </div>
                  ))}
                  {pt.length>4&&<button onClick={()=>onOpenDetail(proj.id)} style={{fontSize:11,color:T.blue,background:"none",border:"none",marginTop:5,cursor:"pointer",padding:0}}>+{pt.length-4} more → view all</button>}
                </div>
              )}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>handleAddTask(proj)} className="lhbtn" style={{background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"7px 13px",color:T.textSec,fontSize:12,display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><Plus size={13}/> Add Task</button>
                <button onClick={()=>onEditProj({parentId:proj.id})} className="lhbtn" style={{background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"7px 13px",color:T.textSec,fontSize:12,display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><FolderOpen size={13}/> Sub-project</button>
                <button onClick={()=>onOpenDetail(proj.id)} className="lhbtn" style={{background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"7px 13px",color:T.blue,fontSize:12,display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><ChevronRight size={13}/> Detail</button>
                {(proj.links||[]).slice(0,3).map((lk,i)=>{const l=normLink(lk);return(
                  <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                    style={{display:"flex",alignItems:"center",gap:5,background:T.mintBg,border:`1.5px solid ${T.mint}30`,borderRadius:8,padding:"7px 12px",color:T.mint,fontSize:12,fontWeight:600,textDecoration:"none"}}
                    title={l.url}>
                    <Link2 size={12}/>{l.label||"Link"}
                  </a>
                );})}
              </div>
            </div>
          )}
        </div>
        {proj.expanded&&ch.map(c=><Card key={c.id} proj={c} depth={depth+1}/>)}
      </div>
    );
  };

  return(
    <div className="fi">
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
        <h1 style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:700,letterSpacing:-.5,color:T.text}}>Projects</h1>
        <button onClick={()=>onEditProj({})} style={{background:T.blue,border:"none",borderRadius:9,padding:"9px 18px",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:6,boxShadow:`0 4px 14px ${T.blue}35`,cursor:"pointer"}}><Plus size={14}/> Add Project</button>
      </div>
      {roots.map(p=><Card key={p.id} proj={p}/>)}
      {roots.length===0&&(
        <div style={{textAlign:"center",padding:"80px 20px",color:T.textMuted}}>
          <Folder size={36} style={{margin:"0 auto 14px",opacity:.3}}/>
          <div style={{fontSize:15,fontWeight:600,color:T.textSec,marginBottom:6}}>No projects yet</div>
        </div>
      )}
    </div>
  );
}

// ── Project Detail ────────────────────────────────────────────────────────────
function ProjectDetail({project,projects,tasks,setTasks,setProjects,onBack,onEditTask,onEditProj,onOpenDetail,doConfirm}){
  if(!project)return null;
  const pt=tasks.filter(t=>{const ids=[];const collect=p=>{ids.push(p.id);projects.filter(c=>c.parentId===p.id).forEach(collect);};collect(project);return ids.includes(t.projectId);});
  const done=pt.filter(t=>t.completed).length;
  const prog=pt.length?Math.round(done/pt.length*100):0;
  const pi=PRIO[project.priority]||PRIO.medium,si=STATUS[project.status]||STATUS.todo;
  const children=projects.filter(p=>p.parentId===project.id);
  const period=project.startDate&&project.endDate?`${fmtDate(project.startDate)} → ${fmtDate(project.endDate)}`:project.endDate?`〜 ${fmtDate(project.endDate)}`:"";
  const handleAddTask=()=>onEditTask({id:null,title:"",status:"todo",priority:"medium",deadline:today(),goalTime:"",repeat:"",projectId:project.id,groupId:null,subtasks:[],notes:"",links:[],completed:false,archived:false});

  return(
    <div className="fi">
      {/* Back */}
      <button onClick={onBack} className="lhbtn" style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:T.textSec,fontSize:13,marginBottom:20,padding:"4px 0",cursor:"pointer"}}>
        <ChevronLeft size={16}/> Back to Projects
      </button>

      {/* Header */}
      <div style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:16,overflow:"hidden",marginBottom:20,boxShadow:"0 2px 8px rgba(0,0,0,.05)"}}>
        <div style={{height:4,background:T.borderLight}}><div style={{height:"100%",width:`${prog}%`,background:project.color||T.blue,transition:"width .5s"}}/></div>
        <div style={{padding:"22px 24px"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:14,height:14,borderRadius:"50%",background:project.color||T.blue,flexShrink:0,marginTop:2}}/>
              <h1 style={{fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:700,color:T.text,letterSpacing:-.3}}>{project.title}</h1>
            </div>
            <button onClick={()=>onEditProj(project)} style={{background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"7px 14px",color:T.textSec,fontSize:12,display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}><Edit2 size={13}/> Edit</button>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:project.notes?12:0}}>
            <span style={{fontSize:11,color:pi.color,background:pi.bg,padding:"3px 10px",borderRadius:10,fontWeight:600}}>{pi.label}</span>
            <span style={{fontSize:12,color:si.color,fontWeight:600}}>{si.label}</span>
            {period&&<span style={{fontSize:12,color:T.textMuted,fontFamily:"JetBrains Mono,monospace"}}>{period}</span>}
            <span style={{fontSize:12,fontWeight:700,color:prog===100?T.mint:T.blue,fontFamily:"JetBrains Mono,monospace"}}>{prog}% complete</span>
          </div>
          {project.notes&&<p style={{fontSize:13,color:T.textSec,lineHeight:1.7,marginTop:8,whiteSpace:"pre-wrap"}}>{project.notes}</p>}
          {project.links&&project.links.length>0&&(
            <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
              {project.links.map((lk,i)=>{const l=normLink(lk);return(
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.mint,background:T.mintBg,padding:"5px 12px",borderRadius:8,textDecoration:"none",fontWeight:600}}>
                  <Link2 size={11}/>{l.label||"Link"}
                </a>
              );})}
            </div>
          )}
          {/* Progress bar detail */}
          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1,height:8,background:T.borderLight,borderRadius:4,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${prog}%`,background:project.color||T.blue,borderRadius:4,transition:"width .5s"}}/>
            </div>
            <span style={{fontSize:12,color:T.textMuted,fontFamily:"JetBrains Mono,monospace",flexShrink:0}}>{done}/{pt.length} tasks</span>
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:16}}>
        {/* Task list */}
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <h2 style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:T.text}}>Tasks</h2>
            <button onClick={handleAddTask} style={{background:T.blue,border:"none",borderRadius:8,padding:"7px 14px",color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5,cursor:"pointer",boxShadow:`0 3px 10px ${T.blue}30`}}><Plus size={13}/> Add Task</button>
          </div>
          <div style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
            {pt.length===0&&<div style={{padding:24,textAlign:"center",color:T.textMuted,fontSize:13}}>No tasks yet</div>}
            {pt.map(t=>{
              const p=PRIO[t.priority]||PRIO.medium,s=STATUS[t.status]||STATUS.todo;
              const overdue=isOverdue(t.deadline)&&!t.completed;
              return(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderBottom:`1px solid ${T.borderLight}`,opacity:t.completed?.55:1}}>
                  <button onClick={()=>setTasks(ts=>ts.map(x=>x.id===t.id?{...x,completed:!x.completed,status:!x.completed?"done":"todo"}:x))}
                    style={{background:"none",border:"none",cursor:"pointer",display:"flex",padding:0,color:t.completed?T.mint:T.textMuted,flexShrink:0}}>
                    {t.completed?<CheckCircle2 size={16} color={T.mint}/>:<Circle size={16}/>}
                  </button>
                  <span onClick={()=>onEditTask(t)} style={{flex:1,fontSize:13,fontWeight:500,color:t.completed?T.textMuted:T.text,textDecoration:t.completed?"line-through":"none",cursor:"pointer"}}>{t.title}</span>
                  {t.deadline&&<span style={{fontSize:11,color:overdue?T.peach:T.textMuted,fontFamily:"JetBrains Mono,monospace",whiteSpace:"nowrap"}}>{fmtDate(t.deadline)}</span>}
                  <span style={{fontSize:11,color:p.color,background:p.bg,padding:"2px 7px",borderRadius:10,fontWeight:600,flexShrink:0}}>{p.label}</span>
                  <span style={{fontSize:11,color:s.color,fontWeight:500,flexShrink:0,minWidth:42}}>{s.label}</span>
                  <button onClick={()=>doConfirm("削除しますか？",()=>setTasks(ts=>ts.filter(x=>x.id!==t.id)))}
                    className="lhbtn" style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer",display:"flex",padding:"3px 4px",borderRadius:4,flexShrink:0}}><Trash2 size={12}/></button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sub-projects */}
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <h2 style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:700,color:T.text}}>Sub-projects</h2>
            <button onClick={()=>onEditProj({parentId:project.id})} className="lhbtn" style={{background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"6px 12px",color:T.textSec,fontSize:12,display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><Plus size={12}/> Add</button>
          </div>
          {children.length===0&&<div style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:12,padding:20,textAlign:"center",color:T.textMuted,fontSize:13}}>No sub-projects</div>}
          {children.map(c=>{
            const cp=tasks.filter(t=>t.projectId===c.id);
            const cprog=cp.length?Math.round(cp.filter(t=>t.completed).length/cp.length*100):0;
            return(
              <div key={c.id} onClick={()=>onOpenDetail(c.id)} style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:12,padding:"12px 16px",marginBottom:8,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:c.color||T.lav,flexShrink:0}}/>
                  <span style={{fontSize:13,fontWeight:600,color:T.blue,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</span>
                  <span style={{fontSize:12,fontWeight:700,color:T.blue,fontFamily:"JetBrains Mono,monospace"}}>{cprog}%</span>
                </div>
                <div style={{height:4,background:T.borderLight,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${cprog}%`,background:c.color||T.lav,borderRadius:2}}/>
                </div>
                <div style={{fontSize:11,color:T.textMuted,marginTop:5}}>{cp.length} tasks</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Project Modal ─────────────────────────────────────────────────────────────
function ProjectModal({project,projects,defaults,onSave,onClose}){
  const EMPTY={title:"",status:"todo",priority:"medium",startDate:"",endDate:"",parentId:null,notes:"",links:[],color:T.blue,expanded:true};
  const [form,setForm]=useState(project||{...EMPTY,...(defaults||{})});
  const[nlUrl,setNlUrl]=useState(""),[nlLabel,setNlLabel]=useState("");
  const linkC=useRef(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const inp={background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:9,padding:"9px 13px",color:T.text,fontSize:13,width:"100%"};
  const lbl={fontSize:11,color:T.textMuted,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:.5,fontWeight:600};
  const colors=[T.blue,T.lav,T.mint,T.amber,T.peach,"#2D4A8A","#B8A9D4","#A8D4B8","#F4A261","#8ECAE6"];
  const addLink=()=>{if(!nlUrl.trim())return;set("links",[...(form.links||[]),{url:nlUrl.trim(),label:nlLabel.trim()}]);setNlUrl("");setNlLabel("");};
  return(
    <div className="modal" onClick={onClose}>
      <div className="fi" onClick={e=>e.stopPropagation()} style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:18,padding:30,width:"min(580px,95vw)",maxHeight:"88vh",overflow:"auto",boxShadow:"0 30px 80px rgba(0,0,0,.14)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <h2 style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:700,color:T.text}}>{project?"Edit Project":"New Project"}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer"}}><X size={18}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Project Name</label><input value={form.title} onChange={e=>set("title",e.target.value)} style={{...inp,fontSize:15,fontWeight:600}} placeholder="Project name..."/></div>
          <div><label style={lbl}>Status</label><select value={form.status} onChange={e=>set("status",e.target.value)} style={inp}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label style={lbl}>Priority</label><select value={form.priority} onChange={e=>set("priority",e.target.value)} style={inp}>{Object.entries(PRIO).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></div>
          {/* Period: start + end date */}
          <div>
            <label style={lbl}>Start Date</label>
            <input type="date" value={form.startDate||""} onChange={e=>set("startDate",e.target.value)} style={inp}/>
          </div>
          <div>
            <label style={lbl}>End Date (Deadline)</label>
            <input type="date" value={form.endDate||""} onChange={e=>set("endDate",e.target.value)} style={inp}/>
          </div>
          <div><label style={lbl}>Parent Project</label><select value={form.parentId||""} onChange={e=>set("parentId",e.target.value||null)} style={inp}><option value="">None (root)</option>{projects.filter(p=>!p.parentId&&p.id!==form.id).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Color</label>
            <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
              {colors.map(c=><button key={c} onClick={()=>set("color",c)} style={{width:26,height:26,borderRadius:"50%",background:c,border:form.color===c?`3px solid ${T.text}`:"3px solid transparent",cursor:"pointer",transition:"transform .15s",transform:form.color===c?"scale(1.15)":"scale(1)"}}/>)}
            </div>
          </div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} style={{...inp,height:80,resize:"vertical",whiteSpace:"pre-wrap"}} placeholder="Description, goals..."/></div>
          <div style={{gridColumn:"1/-1"}}>
            <label style={lbl}>Reference Links</label>
            {(form.links||[]).map((lk,i)=>{const l=normLink(lk);return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:`1px solid ${T.borderLight}`}}>
                <a href={l.url} target="_blank" rel="noopener noreferrer"
                  style={{display:"flex",alignItems:"center",gap:5,background:T.mintBg,border:`1px solid ${T.mint}30`,borderRadius:6,padding:"3px 9px",color:T.mint,fontSize:12,fontWeight:600,textDecoration:"none",flexShrink:0,maxWidth:120,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}
                  title={l.url}>
                  <Link2 size={11}/>{l.label||"Link"}
                </a>
                <span style={{flex:1,fontSize:11,color:T.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.url}</span>
                <button onClick={()=>set("links",form.links.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer",display:"flex"}}><X size={12}/></button>
              </div>
            );})}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:6,marginTop:8}}>
              <input value={nlUrl} onChange={e=>setNlUrl(e.target.value)}
                onCompositionStart={()=>{linkC.current=true;}} onCompositionEnd={()=>{linkC.current=false;}}
                onKeyDown={e=>{if(e.key==="Enter"&&!linkC.current&&nlUrl.trim())addLink();}}
                placeholder="https://..." style={{...inp}}/>
              <input value={nlLabel} onChange={e=>setNlLabel(e.target.value)}
                onCompositionStart={()=>{linkC.current=true;}} onCompositionEnd={()=>{linkC.current=false;}}
                onKeyDown={e=>{if(e.key==="Enter"&&!linkC.current&&nlUrl.trim())addLink();}}
                placeholder="ボタン名（省略可）" style={{...inp}}/>
              <button onClick={addLink} style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:9,padding:"9px 14px",color:T.textSec,fontWeight:600,fontSize:13,cursor:"pointer"}}>+</button>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:24,paddingTop:20,borderTop:`1px solid ${T.borderLight}`}}>
          <button onClick={onClose} className="lhbtn" style={{padding:"10px 20px",background:"transparent",border:`1.5px solid ${T.border}`,borderRadius:9,color:T.textSec,fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>{if(!form.title?.trim())return;onSave(form);}} style={{padding:"10px 26px",background:form.title?.trim()?T.blue:T.textMuted,border:"none",borderRadius:9,color:"#fff",fontSize:13,fontWeight:700,boxShadow:form.title?.trim()?`0 4px 14px ${T.blue}35`:"none",cursor:form.title?.trim()?"pointer":"not-allowed"}}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Archive View ──────────────────────────────────────────────────────────────
function ArchiveView({tasks,projects,onUnarchive,onDel}){
  return(
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:700,color:T.text,marginBottom:4}}>Archive</h1>
        <div style={{fontSize:13,color:T.textMuted}}>{tasks.length} archived tasks</div>
      </div>

      {tasks.length===0?(
        <div style={{textAlign:"center",padding:"80px 20px",color:T.textMuted}}>
          <Archive size={36} style={{margin:"0 auto 14px",opacity:.3}}/>
          <div style={{fontSize:15,fontWeight:600,color:T.textSec,marginBottom:6}}>アーカイブは空です</div>
          <div style={{fontSize:13}}>タスクをアーカイブするとここに表示されます</div>
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {tasks.map(t=>{
            const proj=projects.find(x=>x.id===t.projectId);
            const p=PRIO[t.priority]||PRIO.medium;
            return(
              <div key={t.id} style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:12,
                padding:"11px 14px",display:"flex",alignItems:"center",gap:12,
                boxShadow:"0 1px 4px rgba(0,0,0,.04)",opacity:.75}}>
                <CheckCircle2 size={17} color={T.textMuted}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.textMuted,textDecoration:"line-through",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4,flexWrap:"wrap"}}>
                    {t.deadline&&<span style={{fontSize:11,color:T.textMuted,fontFamily:"JetBrains Mono,monospace"}}>{fmtDate(t.deadline)}</span>}
                    <span style={{fontSize:10,color:p.color,background:p.bg,padding:"1px 6px",borderRadius:8,fontWeight:700}}>{p.label}</span>
                    {proj&&<span style={{fontSize:10,color:proj.color||T.blue,fontWeight:500}}>{proj.title}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <button onClick={()=>onUnarchive(t.id)} title="復元"
                    style={{background:T.mintBg,border:`1px solid ${T.mint}30`,borderRadius:7,
                      color:T.mint,padding:"5px 10px",fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                    <RotateCcw size={11}/> 復元
                  </button>
                  <button onClick={()=>onDel(t.id)} title="完全に削除"
                    style={{background:"none",border:`1px solid ${T.border}`,borderRadius:7,
                      color:T.textMuted,padding:"5px 8px",display:"flex",alignItems:"center",cursor:"pointer"}}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Gantt View (Projects only, with period bars) ───────────────────────────────
function GanttView({projects}){
  const now=new Date();
  // Compute visible range: earliest startDate - 7d to latest endDate + 14d
  const allDates=[...projects.map(p=>p.startDate).filter(Boolean),...projects.map(p=>p.endDate).filter(Boolean)];
  const minD=allDates.length?new Date(Math.min(...allDates.map(d=>new Date(d+"T00:00:00")))):new Date(now.getFullYear(),now.getMonth(),1);
  const maxD=allDates.length?new Date(Math.max(...allDates.map(d=>new Date(d+"T00:00:00")))):new Date(now.getFullYear(),now.getMonth()+2,0);
  minD.setDate(minD.getDate()-7);maxD.setDate(maxD.getDate()+14);
  const total=Math.ceil((maxD-minD)/86400000)||60;
  const todayL=Math.max(0,Math.ceil((now-minD)/86400000));
  const gl=s=>s?Math.max(0,Math.ceil((new Date(s+"T00:00:00")-minD)/86400000)):null;

  // Week headers
  const dh=[];
  for(let i=0;i<=total;i+=7){
    const d=new Date(minD);d.setDate(d.getDate()+i);
    dh.push({l:i,lb:d.toLocaleDateString("en-US",{month:"short",day:"numeric"})});
  }

  // Build hierarchical display
  const rows=[];
  const renderProj=(proj,depth=0)=>{
    rows.push({proj,depth});
    if(proj.expanded){
      projects.filter(p=>p.parentId===proj.id).sort((a,b)=>a.order-b.order).forEach(c=>renderProj(c,depth+1));
    }
  };
  projects.filter(p=>!p.parentId).sort((a,b)=>a.order-b.order).forEach(p=>renderProj(p));

  return(
    <div className="fi">
      <h1 style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:700,letterSpacing:-.5,marginBottom:8,color:T.text}}>Gantt Chart</h1>
      <div style={{fontSize:12,color:T.textMuted,marginBottom:24}}>プロジェクトの期間を一覧で確認できます</div>
      <div style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:14,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,.05)"}}>
        <div style={{overflowX:"auto"}}>
          <div style={{minWidth:900}}>
            {/* Header */}
            <div style={{display:"flex",borderBottom:`1.5px solid ${T.border}`,background:T.bg}}>
              <div style={{width:260,flexShrink:0,padding:"9px 18px",fontSize:10,color:T.textMuted,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",borderRight:`1.5px solid ${T.border}`}}>Project</div>
              <div style={{flex:1,position:"relative",height:34}}>
                {/* Grid lines */}
                {dh.map((d,i)=>(
                  <div key={i} style={{position:"absolute",left:`${(d.l/total)*100}%`,top:0,bottom:0,borderLeft:"1px solid "+T.borderLight,height:"100%"}}/>
                ))}
                {dh.map((d,i)=>(
                  <div key={`l${i}`} style={{position:"absolute",left:`${(d.l/total)*100}%`,top:"50%",transform:"translateY(-50%)",fontSize:10,color:T.textMuted,fontFamily:"JetBrains Mono,monospace",whiteSpace:"nowrap",paddingLeft:4}}>{d.lb}</div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {rows.map(({proj,depth})=>{
              const leftIdx=gl(proj.startDate);
              const rightIdx=gl(proj.endDate);
              const barLeft=leftIdx!==null?leftIdx:rightIdx!==null?rightIdx:null;
              const barWidth=leftIdx!==null&&rightIdx!==null?Math.max(1,rightIdx-leftIdx):3;
              const isOverdueProj=proj.endDate&&proj.endDate<today();
              return(
                <div key={proj.id} style={{display:"flex",borderBottom:`1px solid ${T.borderLight}`,minHeight:36}}>
                  <div style={{width:260,flexShrink:0,padding:"7px 18px 7px "+(18+depth*16)+"px",fontSize:12,color:T.text,borderRight:`1.5px solid ${T.borderLight}`,display:"flex",alignItems:"center",gap:8,overflow:"hidden"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:proj.color||T.blue,flexShrink:0}}/>
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:depth===0?600:400}}>{proj.title}</span>
                    {isOverdueProj&&<AlertTriangle size={11} color={T.peach} style={{flexShrink:0}}/>}
                  </div>
                  <div style={{flex:1,position:"relative",minHeight:36}}>
                    {/* Grid lines */}
                    {dh.map((d,i)=>(
                      <div key={i} style={{position:"absolute",left:`${(d.l/total)*100}%`,top:0,bottom:0,borderLeft:"1px solid "+T.borderLight}}/>
                    ))}
                    {/* Today line */}
                    <div style={{position:"absolute",left:`${(todayL/total)*100}%`,top:0,bottom:0,width:2,background:`${T.blue}40`,zIndex:2}}/>
                    {/* Bar */}
                    {barLeft!==null&&(
                      <div style={{
                        position:"absolute",
                        left:`${(barLeft/total)*100}%`,
                        top:8,height:20,
                        width:`${Math.max(.5,barWidth/total*100)}%`,
                        minWidth:8,
                        background:proj.color||T.blue,
                        borderRadius:4,
                        opacity:.85,
                        zIndex:1,
                        display:"flex",alignItems:"center",paddingLeft:6,
                        overflow:"hidden",
                      }} title={`${proj.title} (${proj.startDate||""}〜${proj.endDate||""})`}>
                        {barWidth>10&&<span style={{fontSize:10,color:"#fff",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{proj.title}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
function SettingsView({pomo,setPomo,appSettings,setAppSettings,sbCfg,setSbCfg,sbStatus,onConnect}){
  const [pf,setPf]=useState(pomo),[sbf,setSbf]=useState(sbCfg),[testing,setTesting]=useState(false);
  const sp=(k,v)=>setPf(f=>({...f,[k]:v}));
  const inp={background:T.bg,border:`1.5px solid ${T.border}`,borderRadius:9,padding:"9px 13px",color:T.text,fontSize:14,width:"100%"};
  const lbl={fontSize:11,color:T.textMuted,marginBottom:5,display:"block",textTransform:"uppercase",letterSpacing:.5,fontWeight:600};
  const sbI={connected:{c:T.mint,l:"Connected"},connecting:{c:T.amber,l:"Connecting..."},error:{c:T.peach,l:"Error"},disconnected:{c:T.textMuted,l:"Disconnected"}}[sbStatus];
  const handleConn=async()=>{setTesting(true);await onConnect(sbf.url,sbf.key);setTesting(false);};

  const currentScale=appSettings?.uiScale||"medium";

  return(
    <div className="fi" style={{maxWidth:660}}>
      <h1 style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:700,letterSpacing:-.5,marginBottom:28,color:T.text}}>Settings</h1>

      {/* UI Scale */}
      <div style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:14,padding:24,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <div style={{width:34,height:34,background:T.lavBg,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><Type size={16} color={T.lav}/></div>
          <div><div style={{fontWeight:700,fontSize:14,color:T.text}}>Display Size</div><div style={{fontSize:12,color:T.textMuted}}>全体の表示サイズを変更します</div></div>
        </div>
        <div style={{display:"flex",gap:10}}>
          {[{k:"small",l:"小",desc:"Compact"},{k:"medium",l:"中",desc:"Standard"},{k:"large",l:"大",desc:"Comfortable"}].map(({k,l,desc})=>(
            <button key={k} onClick={()=>setAppSettings(s=>({...s,uiScale:k}))}
              style={{flex:1,padding:"14px 10px",borderRadius:10,border:`2px solid ${currentScale===k?T.blue:T.border}`,background:currentScale===k?T.blueBg:"transparent",cursor:"pointer",transition:"all .15s"}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:currentScale===k?22:18,fontWeight:700,color:currentScale===k?T.blue:T.textSec,marginBottom:4}}>{l}</div>
              <div style={{fontSize:11,color:currentScale===k?T.blue:T.textMuted}}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:14,padding:24,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <div style={{width:34,height:34,background:T.amberBg,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><BookOpen size={16} color={T.amber}/></div>
          <div><div style={{fontWeight:700,fontSize:14,color:T.text}}>テーマ</div><div style={{fontSize:12,color:T.textMuted}}>ライト / ダーク / OS自動追従</div></div>
        </div>
        <div style={{display:"flex",gap:10}}>
          {[{k:"light",l:"☀️ Light"},{k:"auto",l:"💻 Auto"},{k:"dark",l:"🌙 Dark"}].map(({k,l})=>{
            const cur=appSettings?.theme||"auto";
            return(
              <button key={k} onClick={()=>setAppSettings(s=>({...s,theme:k}))}
                style={{flex:1,padding:"12px 10px",borderRadius:10,border:`2px solid ${cur===k?T.blue:T.border}`,
                  background:cur===k?T.blueBg:"transparent",cursor:"pointer",transition:"all .15s",
                  color:cur===k?T.blue:T.textSec,fontSize:13,fontWeight:cur===k?700:500}}>
                {l}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pomodoro */}
      <div style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:14,padding:24,marginBottom:16,boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <div style={{width:34,height:34,background:T.blueBg,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><Timer size={16} color={T.blue}/></div>
          <div><div style={{fontWeight:700,fontSize:14,color:T.text}}>Pomodoro Timer</div><div style={{fontSize:12,color:T.textMuted}}>Focus & break durations</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {[{k:"workTime",l:"Work (min)"},{k:"breakTime",l:"Break (min)"},{k:"longBreakTime",l:"Long break (min)"},{k:"sessionsBeforeLong",l:"Sets before long break"},{k:"dailyGoal",l:"Daily pomodoro goal"}].map(({k,l})=>(
            <div key={k}><label style={lbl}>{l}</label><input type="number" min="1" max="120" value={pf[k]} onChange={e=>sp(k,parseInt(e.target.value)||1)} style={inp}/></div>
          ))}
        </div>
        <button onClick={()=>setPomo(pf)} style={{marginTop:20,background:T.blue,border:"none",borderRadius:9,padding:"10px 26px",color:"#fff",fontSize:13,fontWeight:700,boxShadow:`0 4px 14px ${T.blue}35`,cursor:"pointer"}}>Save</button>
      </div>

      {/* Supabase */}
      <div style={{background:T.bgCard,border:`1.5px solid ${T.border}`,borderRadius:14,padding:24,boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,background:T.mintBg,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><Database size={16} color={T.mint}/></div>
            <div><div style={{fontWeight:700,fontSize:14,color:T.text}}>Supabase Sync</div><div style={{fontSize:12,color:T.textMuted}}>Multi-device support</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 12px",background:`${sbI.c}14`,border:`1px solid ${sbI.c}30`,borderRadius:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:sbI.c}}/>
            <span style={{fontSize:12,color:sbI.c,fontWeight:600}}>{sbI.l}</span>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><label style={lbl}>Supabase URL</label><input value={sbf.url} onChange={e=>setSbf(f=>({...f,url:e.target.value}))} placeholder="https://xxxxxxxxxx.supabase.co" style={inp}/></div>
          <div><label style={lbl}>Anon Key</label><input type="password" value={sbf.key} onChange={e=>setSbf(f=>({...f,key:e.target.value}))} placeholder="eyJhbGci..." style={inp}/></div>
        </div>
        <button onClick={handleConn} disabled={testing||!sbf.url||!sbf.key}
          style={{marginTop:18,background:sbStatus==="connected"?T.mint:T.blue,border:"none",borderRadius:9,padding:"10px 26px",color:"#fff",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:7,opacity:(!sbf.url||!sbf.key)?.5:1,cursor:"pointer",boxShadow:`0 4px 14px ${T.blue}35`}}>
          {testing?<><Loader2 size={14} style={{animation:"spin 1s linear infinite"}}/> Connecting...</>:sbStatus==="connected"?<><Check size={14}/> Reconnect</>:<><Wifi size={14}/> Connect</>}
        </button>
        <div style={{marginTop:20,padding:16,background:T.bg,borderRadius:10,border:`1px solid ${T.borderLight}`}}>
          <div style={{fontSize:12,fontWeight:700,color:T.textSec,marginBottom:10,display:"flex",alignItems:"center",gap:6}}><BookOpen size={12}/> SQL Setup</div>
          <pre style={{fontSize:11,color:T.textMuted,fontFamily:"JetBrains Mono,monospace",lineHeight:1.8,overflow:"auto",whiteSpace:"pre-wrap"}}>{`CREATE TABLE app_data (\n  key TEXT PRIMARY KEY,\n  value JSONB NOT NULL,\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nALTER TABLE app_data ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Allow all" ON app_data FOR ALL USING (true);`}</pre>
        </div>
      </div>
    </div>
  );
}
